// redeem-code Edge Function（爻一爻 · 收费 MVP）
// 职责：校验登录态 → 事务内核销卡密 → 发放权益
// 安全原则：user_id 只从 JWT 解析，绝不信任客户端传参
//
// 部署：supabase functions deploy redeem-code
// 调用：POST /functions/v1/redeem-code
//   Headers: Authorization: Bearer <用户 access_token>
//   Body: { "code": "XXXX-XXXX-XXXX", "targetKey": "bazi:戊辰-甲寅-丙午-壬辰-male" }
// 返回：{ ok: true, productCode } | { ok: false, reason }

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const REASON_TEXT: Record<string, string> = {
  invalid_code: '兑换码不存在，请核对后重试',
  already_redeemed: '该兑换码已被使用',
  disabled: '该兑换码已失效',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, reason: 'method_not_allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ ok: false, reason: 'unauthorized' }, 401);

    const { code, targetKey } = await req.json().catch(() => ({}));
    if (!code || typeof code !== 'string') {
      return json({ ok: false, reason: 'invalid_code' });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // 1. 用用户 JWT 解析身份（不信任 body 里的任何 user 字段）
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ ok: false, reason: 'unauthorized' }, 401);

    // 2. service role 调 SECURITY DEFINER 函数，事务内核销 + 发权益
    const admin = createClient(supabaseUrl, serviceKey);
    const { data, error } = await admin.rpc('redeem_code', {
      p_code: code,
      p_user_id: user.id,
      p_target_key: typeof targetKey === 'string' ? targetKey.slice(0, 200) : '',
    });
    if (error) {
      console.error('redeem_code rpc error:', error);
      return json({ ok: false, reason: 'server_error' }, 500);
    }

    if (data !== 'ok') {
      return json({ ok: false, reason: data, message: REASON_TEXT[data] || '兑换失败' });
    }

    // 3. 查出刚发放的权益返回给前端（前端随后会整体刷新权益列表，这里仅回传产品类型便于提示）
    const normalized = code.toUpperCase().replace(/\s/g, '');
    const { data: codeRow } = await admin
      .from('redeem_codes')
      .select('product_code')
      .eq('code', normalized)
      .single();

    return json({ ok: true, productCode: codeRow?.product_code || '' });
  } catch (e) {
    console.error('redeem-code error:', e);
    return json({ ok: false, reason: 'server_error' }, 500);
  }
});
