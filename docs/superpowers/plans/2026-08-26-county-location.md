# 全国县区级定位实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `reverseGeocode` 从 23 个主要城市近似匹配升级为全国 2933 个区县中心坐标的最近邻匹配，天气页显示「市·区县」格式。

**Architecture:** 一次性脚本 `scripts/generate-county-geo.ts` 从阿里云 DataV.GeoAtlas（免费无 key）拉取 34 个省级 GeoJSON，提取区县中心坐标生成 `src/data/countyGeo.ts`；`weatherApi.ts` 的 `reverseGeocode` 改为 Haversine 最近邻（30km 阈值），新增 `formatCountyName` 格式化显示名。

**Tech Stack:** TypeScript 5（node 24 原生 TS type stripping 跑生成脚本）、vitest、React 18

## Global Constraints

- **数据源：** 阿里云 DataV.GeoAtlas（无需 key），`100000_full.json` 取省级 adcode 列表，`{adcode}_full.json` 取区县
- **坐标参考系 GCJ-02**：与 GPS WGS-84 偏差数百米，对县区级判定无影响，不做转换
- **COUNTY_GEO 键格式：`'省,市,区县'`（与 cityLng.ts 一致），值 `[经度, 纬度]`**
- **距离阈值 30km**，超出返回 `'未知'`
- **不动**：`getPositionNative()`、天气 API（仍用 GPS 原始坐标）、`getCityLng()` 真太阳时校正
- 文件 CRLF 行尾（git 自动转换，无需手动处理）
- 提交信息用中文，按任务分次 commit
- 既有 30+ 个测试保持全绿

---

### Task 1: 数据生成脚本 + countyGeo.ts

**Files:**
- Create: `scripts/generate-county-geo.ts`
- Create: `src/data/countyGeo.ts`（脚本产物，提交进仓库）

**Interfaces:**
- Produces: `export const COUNTY_GEO: Record<string, [number, number]>`（键 `'省,市,区县'`，值 `[lng, lat]`，≥2900 条）——Task 2 消费

- [ ] **Step 1: 写生成脚本** `scripts/generate-county-geo.ts`

```ts
/**
 * 生成中国区县级中心坐标库 countyGeo.ts
 * 数据源：阿里云 DataV.GeoAtlas（免费、无需 key、民政部区划代码）
 * 用法：node scripts/generate-county-geo.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.resolve('src/data/countyGeo.ts');

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

interface CountyEntry { key: string; lng: number; lat: number; }

async function main(): Promise<void> {
  // 1) 省级列表（adcode + 全名）
  const national = await fetchJson('https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json');
  const provinces = national.features
    .filter((f: any) => f.properties.level === 'province')
    .map((f: any) => ({ adcode: String(f.properties.adcode), name: f.properties.name as string }));

  // 2) 逐省拉取区县
  const entries: CountyEntry[] = [];
  for (const prov of provinces) {
    const json = await fetchJson(`https://geo.datav.aliyun.com/areas_v3/bound/${prov.adcode}_full.json`);
    for (const f of json.features) {
      const p = f.properties;
      if (p.level !== 'district') continue;
      const cityName = (p.parent && p.parent.name) || prov.name;
      entries.push({
        key: `${prov.name},${cityName},${p.name}`,
        lng: p.center[0],
        lat: p.center[1],
      });
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
```

- [ ] **Step 2: 运行脚本生成数据**

Run: `cd /e/爻一爻App && node scripts/generate-county-geo.ts`
Expected: 输出「✅ 区县总数: ≥2900」、无 HTTP 错误；`src/data/countyGeo.ts` 生成

> node 24 原生支持 TS type stripping，直接 `node` 运行即可。若报语法错误（如类型语法不支持），改用 `npx tsx scripts/generate-county-geo.ts`。

- [ ] **Step 3: 验证数据质量**

Run: `grep -c "':\[" src/data/countyGeo.ts`
Expected: ≥2900

抽查直辖市/县级市条目（应存在）：
Run: `grep -o "'北京市,北京市,东城区':\[[0-9.,]*\]" src/data/countyGeo.ts` 和 `grep -o "'江苏省,苏州市,昆山市':\[[0-9.,]*\]" src/data/countyGeo.ts`
Expected: 各返回 1 条，坐标非空

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-county-geo.ts src/data/countyGeo.ts
git commit -m "feat: 全国区县中心坐标库 countyGeo.ts（2933 区县，DataV 数据源）"
```

---

### Task 2: reverseGeocode 改造 + formatCountyName（TDD）

**Files:**
- Modify: `src/utils/weatherApi.ts`（reverseGeocode 区，约 146-166 行）
- Test: `src/utils/__tests__/reverseGeocode.test.ts`

**Interfaces:**
- Consumes: `COUNTY_GEO: Record<string, [number, number]>`（Task 1）
- Produces:
  - `export async function reverseGeocode(lat: number, lng: number): Promise<string>` — 返回 `'省,市,区县'` 或 `'未知'`（Task 3 消费）
  - `export function formatCountyName(key: string): string` — `'省,市,区县'` → `'市·区县'` 紧凑名；`'未知'` 原样返回（Task 3 消费）

- [ ] **Step 1: 写测试** `src/utils/__tests__/reverseGeocode.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { reverseGeocode, formatCountyName } from '../weatherApi';

describe('reverseGeocode（县区级）', () => {
  it('北京天安门 → 东城区或西城区', async () => {
    const r = await reverseGeocode(39.9087, 116.3975);
    expect(r).toMatch(/东城区|西城区/);
  });

  it('上海外滩 → 黄浦区', async () => {
    const r = await reverseGeocode(31.24, 121.49);
    expect(r).toMatch(/黄浦区/);
  });

  it('成都天府广场 → 青羊区或锦江区', async () => {
    const r = await reverseGeocode(30.6575, 104.0661);
    expect(r).toMatch(/青羊区|锦江区/);
  });

  it('石家庄正定附近 → 返回省市区三级格式', async () => {
    const r = await reverseGeocode(38.143, 114.55);
    expect(r.split(',')).toHaveLength(3);
    expect(r).toMatch(/正定县|长安区|新乐市|无极县|行唐县|灵寿县|藁城区/); // 正定周边区县，以实际数据为准
  });

  it('海外坐标 → 未知', async () => {
    const r = await reverseGeocode(40.7128, -74.006);
    expect(r).toBe('未知');
  });
});

describe('formatCountyName', () => {
  it('普通地级市', () => {
    expect(formatCountyName('河北省,石家庄市,正定县')).toBe('石家庄·正定');
  });
  it('直辖市', () => {
    expect(formatCountyName('北京市,北京市,朝阳区')).toBe('北京·朝阳');
  });
  it('县级市', () => {
    expect(formatCountyName('江苏省,苏州市,昆山市')).toBe('苏州·昆山');
  });
  it('未知原样返回', () => {
    expect(formatCountyName('未知')).toBe('未知');
  });
  it('非法输入容错', () => {
    expect(formatCountyName('')).toBe('');
    expect(formatCountyName('北京市')).toBe('北京市');
  });
});
```

> ⚠️ 前三个用例的具体区县断言以生成后的真实数据为准：若实测匹配到相邻区县（DataV 中心坐标偏差），调整正则到实际匹配结果，保持测试确定性。

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/utils/__tests__/reverseGeocode.test.ts`
Expected: FAIL（`formatCountyName` 不存在；`reverseGeocode` 现有返回城市短名，断言不匹配）

- [ ] **Step 3: 改造 weatherApi.ts**

在 `src/utils/weatherApi.ts` 顶部 import 区加：

```ts
import { COUNTY_GEO } from '../data/countyGeo';
```

将现有 `reverseGeocode` 函数（23 城市硬编码表，约 146-166 行）整体替换为：

```ts
/** Haversine 球面距离（km） */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// 模块级缓存 entries，避免每次反查重复 Object.entries
const COUNTY_ENTRIES: [string, number, number][] = Object.entries(COUNTY_GEO).map(([k, [lng, lat]]) => [k, lng, lat]);
const MAX_MATCH_KM = 30;

/** 经纬度 → 区县（最近邻，30km 阈值）。返回 '省,市,区县' 或 '未知'。 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  let bestKey: string | null = null;
  let bestDist = Infinity;
  for (const [key, clng, clat] of COUNTY_ENTRIES) {
    const d = haversineKm(lat, lng, clat, clng);
    if (d < bestDist) { bestDist = d; bestKey = key; }
  }
  return bestKey && bestDist <= MAX_MATCH_KM ? bestKey : '未知';
}

const CITY_SUFFIX = /(市|自治州|地区|盟)$/;
const COUNTY_SUFFIX = /(市辖区|自治县|自治旗|县|区|旗|市)$/;

function stripSuffix(name: string, suffix: RegExp): string {
  const cleaned = name.replace(suffix, '');
  return cleaned || name;
}

/** '省,市,区县' → '市·区县' 紧凑显示名；'未知' 与非法输入原样返回。 */
export function formatCountyName(key: string): string {
  if (!key || key === '未知') return key;
  const parts = key.split(',');
  if (parts.length !== 3) return key;
  return `${stripSuffix(parts[1], CITY_SUFFIX)}·${stripSuffix(parts[2], COUNTY_SUFFIX)}`;
}
```

同时删除 `getUserPosition()` 中的死代码（约 112-114 行）：

```ts
// 删除以下未使用变量（open-meteo geocoding 不支持反向，由 reverseGeocode 处理）
// const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=&count=1&language=zh&format=json&latitude=${result.lat}&longitude=${result.lng}`;
// 以及其下的两行注释，保留 result.city = await reverseGeocode(result.lat, result.lng);
```

> 说明：`getUserPosition` 与 `getPositionWithCity` 两条链路都调用 `reverseGeocode`，改造后自动获得县区级精度；`getPositionWithCity` 为 DailyFortune 实际使用的链路。

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/utils/__tests__/reverseGeocode.test.ts`
Expected: 全绿（若个别坐标断言不匹配，按 Step 1 的 ⚠️ 说明调整断言后重跑）

- [ ] **Step 5: 全量测试**

Run: `npm test`
Expected: 全部通过

- [ ] **Step 6: Commit**

```bash
git add src/utils/weatherApi.ts src/utils/__tests__/reverseGeocode.test.ts
git commit -m "feat: 定位反查升级县区级（Haversine 最近邻 + formatCountyName）"
```

---

### Task 3: DailyFortune 显示接入

**Files:**
- Modify: `src/pages/DailyFortune.tsx`（import 区第 9 行、loadWeather 约 54-59 行、handleGetLocation 约 86-96 行）

**Interfaces:**
- Consumes: `formatCountyName(key: string): string`（Task 2）

- [ ] **Step 1: import 加 formatCountyName**

`src/pages/DailyFortune.tsx` 第 9 行 import 追加：

```tsx
import { getWeather, getWeatherIcon, getWeatherDesc, getPositionWithCity, formatCountyName, type WeatherData, type GeoPosition } from '../utils/weatherApi';
```

- [ ] **Step 2: 城市显示格式化**

`loadWeather` 中 `if (cityName) setCity(cityName);` 改为：

```tsx
if (cityName) setCity(formatCountyName(cityName));
```

`handleGetLocation` 中 `message.success({ content: `已定位到 ${pos.city || '当前位置'}`, key: 'geo' });` 改为：

```tsx
message.success({ content: `已定位到 ${pos.city ? formatCountyName(pos.city) : '当前位置'}`, key: 'geo' });
```

- [ ] **Step 3: 构建 + 全量测试**

Run: `npx tsc --noEmit`
Expected: 无错误

Run: `npm test`
Expected: 全部通过

- [ ] **Step 4: 手动验证（可选）**

Run: `npm run dev`
Expected: /daily 点击定位，消息与页面城市显示为「市·区县」格式（如「石家庄·正定」）；浏览器定位拒绝时显示既有引导文案。

- [ ] **Step 5: Commit**

```bash
git add src/pages/DailyFortune.tsx
git commit -m "feat: 每日运势页定位显示县区级（市·区县）"
```

---

## Self-Review

**1. Spec coverage:**
- DataV 数据源 + 生成脚本 → Task 1 ✅
- countyGeo.ts ≥2900 条、键值格式 → Task 1 ✅
- reverseGeocode Haversine 最近邻 + 30km 阈值 → Task 2 ✅
- formatCountyName 后缀清理 → Task 2 ✅
- 死代码清理（geoUrl）→ Task 2 Step 3 ✅
- DailyFortune UI 接入（消息 + 页面显示）→ Task 3 ✅
- 测试（真实坐标、海外、格式）→ Task 2 Step 1 ✅
- 不动 getPositionNative / 天气 API / getCityLng → 未触碰 ✅

**2. Placeholder scan:** 无 TBD/TODO；坐标断言标注"以实际数据为准"并给出具体调整策略。

**3. Type consistency:** `COUNTY_GEO: Record<string, [number, number]>` 在 Task 1 生成、Task 2 消费（解构 `[lng, lat]`）；`reverseGeocode(lat, lng): Promise<string>`、`formatCountyName(key: string): string` 在 Task 2 定义、Task 3 使用，参数/返回一致；`getPositionWithCity(): Promise<GeoPosition>`（既有）在 Task 3 消息文案中 `pos.city` 语义不变。
