# 收费功能 MVP 实施方案（兑换码版）

> 目标：以最小成本验证付费意愿。验证期用**密钥兑换码**收款（零资质要求），
> 跑通「卖码 → 兑换 → 解锁」闭环；验证通过后接支付宝正式支付，兑换码降级为运营工具。

## 一、产品矩阵

| 功能 | 免费层 | 付费层 | 定价 |
|---|---|---|---|
| 八字 | 排盘 + 基础总览 | 详批解读（十神/格局/大运流年/喜用神） | ¥9.9 / 盘 |
| 紫微斗数 | 排盘 + 宫位基础信息 | 深度解读（四化联动/成格/十二宫详批） | ¥9.9 / 盘 |
| 情侣合盘 | 无（直接付费） | 完整合盘报告 | ¥19.9 / 次 |
| 六爻/梅花/灵签/解梦/风水/每日运势/纳音 | 每功能每日免费 1 次 | 单日畅玩码（当日全部按次功能不限次） | ¥3.9 / 天 |

设计要点：
- **权益绑定命盘**：八字/紫微解读码兑换时锁定当前命盘（`target_key = bazi:<chart_hash>`），换盘重新解锁——这是刻意的定价设计
- **合盘绑定组合**：`target_key = hepan:<两人信息hash>`，换人重新付费
- **六爻暂不单独收费**：大师解读文案只覆盖 10/64 卦，深度不够，先归入每日 1 次梯队；54 卦文案补齐后再评估
- 每日 1 次限制：登录用户走服务端 `daily_usage` 表；未登录用户本地 localStorage 计数（可绕过，MVP 接受）

## 二、卡密体系

### 卡密类型（product_code）
| code | 权益 | 面额 |
|---|---|---|
| `report_bazi` | 八字详批单盘解锁 | ¥9.9 |
| `report_ziwei` | 紫微解读单盘解锁 | ¥9.9 |
| `report_hepan` | 合盘单次解锁 | ¥19.9 |
| `day_pass` | 单日畅玩（当日 24:00 过期） | ¥3.9 |

### 卡密规则
- 格式：`XXXX-XXXX-XXXX`（12 位大写字母数字，去掉 0/O/1/I 防混淆）
- 单次使用，兑换后绑定账号，不可转赠
- 批次生成（batch 字段），方便对账：卖了多少、兑换了多少
- 生成工具：一个本地脚本批量生成码 → 插入 redeem_codes 表 → 导出文本发货

### 售卖渠道（验证期）
- 微信群/朋友圈/小红书私信，个人收款码收款，手动发卡密
- 闲鱼/淘宝虚拟商品（注意类目措辞：文化研究工具）
- 兑换码也是天然的增长工具：前 100 名用户送码、社群活动发码

## 三、技术架构

```
客户端 (React)                Supabase
    │                           │
    ├─ ① 付费墙点「输入兑换码」  │
    ├─ ② redeem-code (Edge Fn) ─┤
    │      ├─ 校验码有效/未用    │
    │      ├─ 标记已兑换(事务)   │
    │      └─ 写 entitlements    │
    │        (target=当前命盘)   │
    ├─ ③ 重新读 entitlements ──→│
    └─ ④ 解锁报告                │
```

比支付方案简单得多：没有回调验签、没有异步状态机，一个 Edge Function 同步完成。
**安全原则不变**：兑换和发放只在服务端事务内完成，客户端只读结果。

### 数据库（见 supabase_payments_migration.sql）
- `redeem_codes`：卡密表，code 唯一，状态机 unused → redeemed / disabled
- `entitlements`：权益表（复用），day_pass 用 expires_at 当日 24:00
- `daily_usage`：每日次数计数，`(user_id, module, use_date)` 唯一
- `redeem_code()`：SECURITY DEFINER，事务内核销+发权益，幂等
- `consume_daily_quota()`：SECURITY DEFINER，原子扣减当日次数，返回是否允许

### 前端改动清单
- `src/lib/payment.ts`：兑换、查权益、每日次数封装的统一入口
- `src/components/PayWall.tsx`（新增）：通用付费墙组件（模糊预览 + 兑换码输入框）
- `src/pages/Bazi.tsx` / `Ziwei.tsx`：解读区套 PayWall
- `src/pages/HePan.tsx`：整页结果套 PayWall
- 各按次功能页：起卦/起课按钮前接 `consume_daily_quota` 检查
- `src/pages/Profile.tsx`：我的权益 + 兑换码入口

## 四、合规口径（全端统一）

- 避免「算命、改运、预测祸福、最准」等绝对化表述（六爻页"最准"已修正）
- 统一口径：「传统文化研究工具」「内容仅供娱乐参考」
- 报告页底部固定免责声明
- 卡密销售话术同样守此口径；个人收款验证期金额小无碍，月入过万即启动商户号申请（届时接支付宝正式支付）

## 五、任务拆解与落地状态

| 阶段 | 内容 | 状态 |
|---|---|---|
| Phase 1 | 迁移 SQL + 卡密生成脚本 `scripts/generate-redeem-codes.ts` | ✅ 代码完成，待执行 SQL |
| Phase 2 | `supabase/functions/redeem-code` + `src/lib/payment.ts` | ✅ 代码完成，待部署 Function |
| Phase 3 | `PayWall.tsx` + 八字/紫微/合盘接入 + `EntitlementCard`（Profile 页） | ✅ 完成 |
| Phase 4 | `useDailyQuota` + 六爻/梅花/灵签/解梦/风水接入 | ✅ 完成（每日运势本身按天生成、纳音为查询工具，不设限） |
| Phase 5 | 八字/紫微付费版解读内容深化 | ✅ 已完成一轮（性格画像/64卦文案/合盘双画像），持续迭代 |
| 并行 | 申请支付宝商户号 + ICP 备案（为正式支付铺路） | ⏳ 线下 1–2 周 |

### 上线前部署清单（代码均已就绪，按序执行）
1. Supabase SQL Editor 执行 `supabase_payments_migration.sql`
2. 部署 Edge Function：`supabase functions deploy redeem-code`（需先 `supabase link`）
3. 本地 `.env.local` 放入 `SUPABASE_SERVICE_ROLE_KEY`（仅本地，绝不提交）
4. 生成首批卡密：`node scripts/generate-redeem-codes.ts --product report_bazi --count 50 --batch B001`
5. 自测：兑换 → 解锁 → 换盘验证重新上锁 → day_pass 验证按次功能放行

## 六、从兑换码迁移到正式支付（验证通过后）

架构已预留：entitlements 是唯一权益来源，卡密和支付只是两种"发放入口"。
接支付宝时只需：加回 `orders` 表 + create-order/payment-notify 两个 Edge Function +
PayWall 组件加「在线购买」按钮。已发出去的卡密权益完全不受影响。
