-- ========== 收费功能 MVP（兑换码版）：在 Supabase SQL Editor 中执行 ==========
-- 依赖：已执行 supabase_migration.sql（auth.users 已存在）
-- 模型：redeem_codes（卡密）→ 兑换 → entitlements（权益）→ 前端只读权益解锁
-- 接正式支付时再加 orders 表，entitlements 不受影响

-- 权益表
CREATE TABLE IF NOT EXISTS entitlements (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  product_code TEXT NOT NULL,                 -- report_bazi / report_ziwei / report_hepan / day_pass
  target_key TEXT NOT NULL DEFAULT '',        -- bazi:<chart_hash> / hepan:<双人hash> / 日期
  source TEXT NOT NULL DEFAULT 'redeem',      -- redeem / order（预留正式支付）
  expires_at TIMESTAMPTZ,                     -- NULL = 永久；day_pass 为当日 24:00
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, product_code, target_key)
);

-- 卡密表
CREATE TABLE IF NOT EXISTS redeem_codes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,                  -- 如 YYYY-XXXX-XXXX（去掉 0/O/1/I）
  product_code TEXT NOT NULL,
  batch TEXT NOT NULL DEFAULT '',             -- 批次号，便于对账
  status TEXT NOT NULL DEFAULT 'unused',      -- unused / redeemed / disabled
  redeemed_by UUID REFERENCES auth.users,
  redeemed_at TIMESTAMPTZ,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 每日免费次数表
CREATE TABLE IF NOT EXISTS daily_usage (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  module TEXT NOT NULL,                       -- liuyao / meihua / lingqian / dream / fengshui / ...
  use_date DATE NOT NULL DEFAULT CURRENT_DATE,
  use_count INT NOT NULL DEFAULT 0,
  UNIQUE (user_id, module, use_date)
);

CREATE INDEX IF NOT EXISTS idx_entitlements_user ON entitlements (user_id);
CREATE INDEX IF NOT EXISTS idx_redeem_codes_status ON redeem_codes (product_code, status);

-- RLS
ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE redeem_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own entitlements" ON entitlements;
DROP POLICY IF EXISTS "Users can read own daily usage" ON daily_usage;

-- 用户只读自己的权益和用量；卡密表对用户完全不可见（防枚举）
-- 所有写操作仅 service role（Edge Function）
CREATE POLICY "Users can read own entitlements" ON entitlements
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can read own daily usage" ON daily_usage
  FOR SELECT USING (auth.uid() = user_id);

-- 兑换卡密：事务内核销 + 发放权益，天然幂等（并发抢兑只有一人成功）
-- p_target_key：兑换时绑定的目标（当前命盘 hash / 合盘组合 hash；day_pass 传当天日期）
-- 返回：ok / invalid_code / already_redeemed / disabled
CREATE OR REPLACE FUNCTION redeem_code(
  p_code TEXT,
  p_user_id UUID,
  p_target_key TEXT DEFAULT ''
)
RETURNS TEXT AS $$
DECLARE
  v_code redeem_codes%ROWTYPE;
  v_expires TIMESTAMPTZ;
BEGIN
  -- 规格化：去空格转大写
  p_code := UPPER(REGEXP_REPLACE(p_code, '\s', '', 'g'));

  SELECT * INTO v_code FROM redeem_codes WHERE code = p_code FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'invalid_code';
  END IF;
  IF v_code.status = 'redeemed' THEN
    RETURN 'already_redeemed';
  END IF;
  IF v_code.status = 'disabled' THEN
    RETURN 'disabled';
  END IF;

  -- day_pass 当日 24:00 过期，其余永久
  IF v_code.product_code = 'day_pass' THEN
    v_expires := (CURRENT_DATE + 1)::TIMESTAMPTZ;
    p_target_key := CURRENT_DATE::TEXT;
  ELSE
    v_expires := NULL;
  END IF;

  UPDATE redeem_codes
  SET status = 'redeemed', redeemed_by = p_user_id, redeemed_at = NOW()
  WHERE id = v_code.id;

  INSERT INTO entitlements (user_id, product_code, target_key, source, expires_at)
  VALUES (p_user_id, v_code.product_code, p_target_key, 'redeem', v_expires)
  ON CONFLICT (user_id, product_code, target_key) DO NOTHING;

  RETURN 'ok';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 扣减每日免费次数：原子操作，返回是否允许本次使用
-- 每个模块每天免费 1 次；持有当日 day_pass 的用户直接放行
CREATE OR REPLACE FUNCTION consume_daily_quota(
  p_user_id UUID,
  p_module TEXT,
  p_free_limit INT DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INT;
  v_has_pass BOOLEAN;
BEGIN
  -- 登录用户只能扣自己的额度（service role 调用时 auth.uid() 为 NULL，放行）
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'forbidden: cannot consume quota for another user';
  END IF;

  -- 有当日畅玩码直接放行
  SELECT EXISTS (
    SELECT 1 FROM entitlements
    WHERE user_id = p_user_id
      AND product_code = 'day_pass'
      AND expires_at > NOW()
  ) INTO v_has_pass;
  IF v_has_pass THEN
    RETURN TRUE;
  END IF;

  INSERT INTO daily_usage (user_id, module, use_date, use_count)
  VALUES (p_user_id, p_module, CURRENT_DATE, 1)
  ON CONFLICT (user_id, module, use_date)
  DO UPDATE SET use_count = daily_usage.use_count + 1
  RETURNING use_count INTO v_count;

  RETURN v_count <= p_free_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 权限收口：默认收回，按需授权
-- redeem_code 只能由 Edge Function（service role）调用，前端不可直连（防伪造 user_id 抢兑）
REVOKE EXECUTE ON FUNCTION redeem_code(TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION redeem_code(TEXT, UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION redeem_code(TEXT, UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION redeem_code(TEXT, UUID, TEXT) TO service_role;

-- consume_daily_quota 允许登录用户从前端直接 RPC（函数内校验只能扣自己的额度）
REVOKE EXECUTE ON FUNCTION consume_daily_quota(UUID, TEXT, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION consume_daily_quota(UUID, TEXT, INT) FROM anon;
GRANT EXECUTE ON FUNCTION consume_daily_quota(UUID, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION consume_daily_quota(UUID, TEXT, INT) TO service_role;
