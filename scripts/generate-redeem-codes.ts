/**
 * 卡密批量生成脚本（爻一爻 · 收费 MVP）
 *
 * 用法（Node >= 22.18，直接跑 TS）：
 *   node scripts/generate-redeem-codes.ts --product report_bazi --count 20 --batch B20260905
 *
 * 必填环境变量（可在 .env.local 或 shell 里设置）：
 *   SUPABASE_URL               项目地址，如 https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY  service_role 密钥（仅本地持有，绝不进前端/仓库）
 *
 * 参数：
 *   --product  report_bazi | report_ziwei | report_hepan | day_pass
 *   --count    生成数量（默认 10，单次上限 500）
 *   --batch    批次号（默认当天日期，如 B20260905），用于对账
 *   --note     备注（可选），写入 redeem_codes.note
 *   --dry-run  只生成不写库，用于预览
 *
 * 产出：
 *   1. 卡密插入 Supabase redeem_codes 表（status=unused）
 *   2. 发货文本 outputs/redeem-codes/<batch>_<product>.txt（一行一码，直接发给买家）
 */
import { randomInt } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ---------- 参数解析 ----------
function arg(name: string, fallback = ''): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const PRODUCTS = ['report_bazi', 'report_ziwei', 'report_hepan', 'day_pass'] as const;
type Product = (typeof PRODUCTS)[number];

const product = arg('product') as Product;
const count = Math.min(parseInt(arg('count', '10'), 10) || 10, 500);
const today = new Date();
const defaultBatch = `B${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
const batch = arg('batch', defaultBatch);
const note = arg('note');
const dryRun = process.argv.includes('--dry-run');

if (!PRODUCTS.includes(product)) {
  console.error(`❌ --product 必填，可选：${PRODUCTS.join(' / ')}`);
  process.exit(1);
}

// ---------- 环境变量（支持从 .env.local 读取） ----------
function loadEnv(key: string): string {
  if (process.env[key]) return process.env[key]!;
  for (const f of ['.env.local', '.env']) {
    const p = resolve(ROOT, f);
    if (!existsSync(p)) continue;
    const m = readFileSync(p, 'utf8').match(new RegExp(`^${key}=(.+)$`, 'm'));
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  return '';
}
const SUPABASE_URL = loadEnv('SUPABASE_URL') || loadEnv('VITE_SUPABASE_URL');
const SERVICE_KEY = loadEnv('SUPABASE_SERVICE_ROLE_KEY');

// ---------- 卡密生成：XXXX-XXXX-XXXX，去掉 0/O/1/I 防混淆 ----------
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function genCode(): string {
  const seg = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
  return `${seg()}-${seg()}-${seg()}`;
}
function genCodes(n: number): string[] {
  const set = new Set<string>();
  while (set.size < n) set.add(genCode());
  return [...set];
}

// ---------- 主流程 ----------
async function main() {
  const codes = genCodes(count);
  console.log(`产品：${product}  批次：${batch}  数量：${codes.length}${dryRun ? '（dry-run，不写库）' : ''}`);

  if (!dryRun) {
    if (!SUPABASE_URL || !SERVICE_KEY) {
      console.error('❌ 缺少 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY（可放 .env.local）');
      process.exit(1);
    }
    const rows = codes.map(code => ({ code, product_code: product, batch, note }));
    const res = await fetch(`${SUPABASE_URL}/rest/v1/redeem_codes`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(rows),
    });
    if (!res.ok) {
      console.error(`❌ 写库失败 ${res.status}：${await res.text()}`);
      process.exit(1);
    }
    console.log(`✅ 已写入 redeem_codes 表`);
  }

  const outDir = resolve(ROOT, 'outputs', 'redeem-codes');
  mkdirSync(outDir, { recursive: true });
  const outFile = resolve(outDir, `${batch}_${product}.txt`);
  writeFileSync(outFile, codes.join('\n') + '\n', 'utf8');
  console.log(`✅ 发货文本：${outFile}`);
  console.log(`预览前 3 枚：${codes.slice(0, 3).join('  ')}`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
