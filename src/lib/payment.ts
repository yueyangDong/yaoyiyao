/**
 * 收费功能统一入口（兑换码版 MVP）
 *
 * 权益模型：
 *   - entitlements 是唯一权益来源，前端只读，发放只在服务端（redeem-code Edge Function）
 *   - 报告类权益绑定命盘（targetKey），换盘需重新解锁（刻意的定价设计）
 *   - day_pass 当日 24:00 过期，放行所有按次功能
 *
 * 降级策略：
 *   - 未配置 Supabase（纯本地模式）：付费功能不可用，hasEntitlement 恒 false
 *   - 未登录用户每日次数：localStorage 计数（可绕过，MVP 接受）
 */
import { supabase } from './supabase';

// ---------- 全站免费开关 ----------
// 运营期临时放开所有付费/配额限制：true = 全部功能免费（按次不计数、报告直接解锁）。
// 恢复收费时只需改回 false，其余代码（权益/兑换/配额）原样生效。
export const FREE_MODE = true;

// ---------- 产品定义 ----------
export type ProductCode = 'report_bazi' | 'report_ziwei' | 'report_hepan' | 'day_pass';

export const PRODUCT_INFO: Record<ProductCode, { name: string; price: number; desc: string }> = {
  report_bazi: { name: '八字详批解读', price: 9.9, desc: '解锁当前命盘的完整详批（性格画像/十神/格局/大运流年/六大领域）' },
  report_ziwei: { name: '紫微深度解读', price: 9.9, desc: '解锁当前命盘的深度解读（命宫画像/四化联动/成格/十二宫详批）' },
  report_hepan: { name: '情侣合盘报告', price: 19.9, desc: '解锁本次合盘完整报告（缘分评分/性格互动/双向视角/相处建议）' },
  day_pass: { name: '单日畅玩码', price: 3.9, desc: '当日 24 点前，六爻/梅花/灵签/解梦等按次功能不限次数' },
};

export interface Entitlement {
  id: number;
  user_id: string;
  product_code: ProductCode;
  target_key: string;
  source: string;
  expires_at: string | null;
  created_at: string;
}

// ---------- targetKey 生成（权益绑定的"命盘指纹"） ----------
export interface PillarLike {
  ganZhi: string;
}

/** 八字/紫微：四柱干支 + 性别，稳定且与历法输入方式无关 */
export function chartTargetKey(prefix: 'bazi' | 'ziwei', pillars: PillarLike[], gender: string): string {
  return `${prefix}:${pillars.map(p => p.ganZhi).join('-')}-${gender}`;
}

/** 合盘：双方四柱指纹（我方在前），换人/换盘即变 */
export function hepanTargetKey(minePillars: PillarLike[], partnerPillars: PillarLike[]): string {
  const fp = (ps: PillarLike[]) => ps.map(p => p.ganZhi).join('');
  return `hepan:${fp(minePillars)}|${fp(partnerPillars)}`;
}

// ---------- 权益查询 ----------
export async function fetchEntitlements(userId: string): Promise<Entitlement[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('entitlements')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('[payment] fetchEntitlements failed:', error.message);
    return [];
  }
  return (data || []) as Entitlement[];
}

/** 是否持有某产品在指定 target 上的有效权益（day_pass 查当日） */
export function hasEntitlement(
  entitlements: Entitlement[],
  product: ProductCode,
  targetKey = '',
): boolean {
  if (FREE_MODE) return true; // 全站免费期：报告类内容直接解锁
  const now = Date.now();
  return entitlements.some(e => {
    if (e.product_code !== product) return false;
    if (e.expires_at && new Date(e.expires_at).getTime() <= now) return false;
    if (product === 'day_pass') return true; // 未过期即有效（target_key 为日期，由服务端写死）
    return e.target_key === targetKey;
  });
}

// ---------- 兑换 ----------
export interface RedeemResult {
  ok: boolean;
  message: string;
  productCode?: string;
}

export async function redeemCode(code: string, targetKey = ''): Promise<RedeemResult> {
  if (!supabase) return { ok: false, message: '云同步未配置，当前为本地模式，无法兑换' };
  const trimmed = code.trim().toUpperCase();
  if (!/^[A-Z2-9]{4}-?[A-Z2-9]{4}-?[A-Z2-9]{4}$/.test(trimmed)) {
    return { ok: false, message: '兑换码格式不正确（形如 XXXX-XXXX-XXXX）' };
  }
  try {
    const { data, error } = await supabase.functions.invoke('redeem-code', {
      body: { code: trimmed, targetKey },
    });
    if (error) return { ok: false, message: '网络异常，请稍后重试' };
    if (!data?.ok) return { ok: false, message: data?.message || '兑换失败，请重试' };
    const name = PRODUCT_INFO[data.productCode as ProductCode]?.name || '权益';
    return { ok: true, message: `兑换成功，已解锁「${name}」`, productCode: data.productCode };
  } catch (e: any) {
    return { ok: false, message: e.message || '兑换失败，请检查网络' };
  }
}

// ---------- 每日免费次数 ----------
const LOCAL_QUOTA_KEY = 'yaoyiyao_daily_quota';

interface LocalQuota {
  date: string;
  usage: Record<string, number>;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function readLocalQuota(): LocalQuota {
  try {
    const raw = localStorage.getItem(LOCAL_QUOTA_KEY);
    if (raw) {
      const q = JSON.parse(raw) as LocalQuota;
      if (q.date === todayStr()) return q;
    }
  } catch { /* ignore */ }
  return { date: todayStr(), usage: {} };
}

/** 本地模式扣减（未登录/未配置 Supabase）：返回是否允许本次使用 */
function consumeLocalQuota(module: string, freeLimit = 1): boolean {
  const q = readLocalQuota();
  const used = (q.usage[module] || 0) + 1;
  q.usage[module] = used;
  try { localStorage.setItem(LOCAL_QUOTA_KEY, JSON.stringify(q)); } catch { /* ignore */ }
  return used <= freeLimit;
}

/**
 * 扣减一次每日免费额度，返回是否允许本次使用。
 * 登录用户：服务端 consume_daily_quota（原子、防刷，持 day_pass 自动放行）
 * 未登录/本地模式：localStorage 计数
 */
export async function consumeDailyQuota(
  userId: string | null,
  module: string,
  freeLimit = 1,
): Promise<boolean> {
  if (FREE_MODE) return true; // 全站免费期：按次功能不限次、不计数
  if (supabase && userId) {
    try {
      const { data, error } = await supabase.rpc('consume_daily_quota', {
        p_user_id: userId,
        p_module: module,
        p_free_limit: freeLimit,
      });
      if (error) {
        console.warn('[payment] consume_daily_quota failed, fallback local:', error.message);
        return consumeLocalQuota(module, freeLimit);
      }
      return data === true;
    } catch {
      return consumeLocalQuota(module, freeLimit);
    }
  }
  return consumeLocalQuota(module, freeLimit);
}

/** 查询某模块今日剩余免费次数（仅用于展示，不做拦截依据） */
export function getLocalRemaining(module: string, freeLimit = 1): number {
  const q = readLocalQuota();
  return Math.max(0, freeLimit - (q.usage[module] || 0));
}
