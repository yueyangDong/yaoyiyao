/**
 * 生成中国区县级中心坐标库 countyGeo.ts
 * 数据源：阿里云 DataV.GeoAtlas（免费、无需 key、民政部区划代码）
 * 结构：省级 full.json 为直辖市→区县 / 普通省→地级市，地级市需再拉一层
 * 用法：node scripts/generate-county-geo.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const BASE = 'https://geo.datav.aliyun.com/areas_v3/bound';
const OUT = path.resolve('src/data/countyGeo.ts');
const SLEEP_MS = 60;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function fetchJson(url: string, retries = 2): Promise<any> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 404) return null; // 无此区域数据（如台湾省），跳过
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i === retries) throw err;
      await sleep(SLEEP_MS * (i + 1));
    }
  }
  return null;
}

interface CountyEntry { key: string; lng: number; lat: number; }

async function main(): Promise<void> {
  // 1) 省级列表
  const national = await fetchJson(`${BASE}/100000_full.json`);
  const provinces = national.features
    .filter((f: any) => f.properties.level === 'province')
    .map((f: any) => ({ adcode: String(f.properties.adcode), name: f.properties.name as string }));

  // 2) 逐省拉取区县（普通省需经地级市二级请求）
  const entries: CountyEntry[] = [];
  for (const prov of provinces) {
    const json = await fetchJson(`${BASE}/${prov.adcode}_full.json`);
    if (!json) { console.warn(`  ⚠ ${prov.name}: 无数据，跳过`); continue; }

    const cities = json.features.filter((f: any) => f.properties.level === 'city');
    if (cities.length > 0) {
      // 普通省：逐市拉区县
      for (const city of cities) {
        const cityJson = await fetchJson(`${BASE}/${city.properties.adcode}_full.json`);
        if (!cityJson) continue;
        for (const f of cityJson.features) {
          const p = f.properties;
          if (p.level !== 'district') continue;
          entries.push({ key: `${prov.name},${city.properties.name},${p.name}`, lng: p.center[0], lat: p.center[1] });
        }
        await sleep(SLEEP_MS);
      }
    } else {
      // 直辖市/省直管：features 直接是区县
      for (const f of json.features) {
        const p = f.properties;
        if (p.level !== 'district') continue;
        const cityName = (p.parent && p.parent.name) || prov.name;
        entries.push({ key: `${prov.name},${cityName},${p.name}`, lng: p.center[0], lat: p.center[1] });
      }
    }
    console.log(`  ${prov.name}: 区县累计 ${entries.length}`);
  }

  // 3) 去重 + 排序 + 输出
  const uniq = new Map<string, CountyEntry>();
  for (const e of entries) uniq.set(e.key, e);
  const sorted = [...uniq.values()].sort((a, b) => a.key.localeCompare(b.key, 'zh'));

  const lines: string[] = [];
  lines.push('// 中国区县级中心坐标库（GCJ-02，自动生成）');
  lines.push('// 数据源：阿里云 DataV.GeoAtlas 行政区划接口（免费）');
  lines.push('// 键：\'省,市,区县\'；值：[经度, 纬度]');
  lines.push('// 用于经纬度 → 区县反查（每日运势定位显示）');
  lines.push('');
  lines.push('export const COUNTY_GEO: Record<string, [number, number]> = {');
  for (const e of sorted) {
    lines.push(`  '${e.key}':[${e.lng.toFixed(6)},${e.lat.toFixed(6)}],`);
  }
  lines.push('};');
  lines.push('');

  fs.writeFileSync(OUT, lines.join('\n'), 'utf-8');
  console.log(`✅ 区县总数: ${sorted.length}`);
  console.log(`📄 已写入: ${OUT}`);
}

main().catch((err) => { console.error('生成失败:', err); process.exit(1); });
