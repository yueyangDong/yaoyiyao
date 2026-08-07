# 爻一爻 UI 与交互优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成爻一爻八字/紫微页的响应式适配、表单校验、结果区交互优化，并新增每日运势页系统定位天气，重新打包 APK。

**Architecture:** 在现有 React 18 + antd 5 + Capacitor 8 应用上做针对性增量修改：先加定位能力（@capacitor/geolocation）与可测的纯函数（日期校验），再逐页改响应式布局（isMobile 分支）与交互（表单 rules、折叠策略、去随机），最后构建打包。

**Tech Stack:** React 18、antd 5、lunar-typescript、@ziweijs/core、@capacitor/geolocation（新增）、vitest

## Global Constraints

- **不动核心算法**：`src/utils/baziAnalysis.ts`、`src/utils/ziweiAnalysis.ts` 导出函数签名不改；排盘核心调用（`ziwei.bySolar`、`Lunar.fromYmdHms` 等）不改
- **包名 `com.yaoyiyao.app`、应用名「爻一爻」不变**
- **测试用 vitest**（已接入，15 个既有测试须保持全绿）
- **环境**：Windows + Git Bash、node v24；JDK 21 在 `C:\tools\jdk-21.0.12+8`；Android SDK 在 `%LOCALAPPDATA%\Android\Sdk`
- **APK 构建命令**：`npm run build:android`（= `tsc && vite build --base=./ --mode android && npx cap sync android`）后 `cd android && ./gradlew assembleDebug`（需 export JAVA_HOME/ANDROID_HOME）
- **文件是 CRLF 行尾**：修改大文件时用补丁脚本（读入归一化 `\r\n→\n`，写回 `\r\n`，锚点唯一性断言）
- 提交信息用中文，按任务分次 commit
- 工作区存在未跟踪调试残留（`dist-apk-test/`、`icon-preview.png`、`scripts/img-info.py`），本计划完成后清理

---

### Task 1: 定位天气基础（@capacitor/geolocation + getPositionNative）

**Files:**
- Modify: `package.json`（依赖）
- Create: `src/utils/__tests__/position.test.ts`
- Modify: `src/utils/weatherApi.ts`

**Interfaces:**
- Consumes: 现有 `GeoPosition { lat: number; lng: number; city?: string }`
- Produces:
  - `export async function getPositionNative(): Promise<GeoPosition>` — 原生（Android/iOS）走 `@capacitor/geolocation` 的 `Geolocation.getCurrentPosition()`，Web 走该插件内置的浏览器实现；返回 `{ lat, lng }`，不反查城市（城市反查由调用方用现有 `reverseGeocode` 完成）
  - `export async function getPositionWithCity(): Promise<GeoPosition>` — 调用 `getPositionNative()` 后附 `reverseGeocode(lat, lng)` 城市名

- [ ] **Step 1: 安装插件**

```bash
npm install @capacitor/geolocation
```

- [ ] **Step 2: 先写测试** `src/utils/__tests__/position.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@capacitor/geolocation', () => ({
  Geolocation: {
    getCurrentPosition: vi.fn(),
  },
}));

import { Geolocation } from '@capacitor/geolocation';
import { getPositionNative, getPositionWithCity } from '../weatherApi';

describe('getPositionNative', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (Geolocation.getCurrentPosition as any).mockResolvedValue({
      coords: { latitude: 31.2, longitude: 121.5 },
    });
  });

  it('returns lat/lng from geolocation plugin', async () => {
    const pos = await getPositionNative();
    expect(pos.lat).toBeCloseTo(31.2);
    expect(pos.lng).toBeCloseTo(121.5);
  });

  it('throws when geolocation fails', async () => {
    (Geolocation.getCurrentPosition as any).mockRejectedValue(new Error('denied'));
    await expect(getPositionNative()).rejects.toThrow('denied');
  });

  it('getPositionWithCity attaches city via reverseGeocode', async () => {
    const pos = await getPositionWithCity();
    expect(pos.lat).toBeCloseTo(31.2);
    expect(pos.city).toBeTruthy();
  });
});
```

- [ ] **Step 3: 运行测试确认失败**

Run: `npx vitest run src/utils/__tests__/position.test.ts`
Expected: FAIL（weatherApi 无 getPositionNative 导出）

- [ ] **Step 4: 实现 weatherApi.ts 追加**

在 `getUserPosition` 之后追加：

```ts
import { Geolocation } from '@capacitor/geolocation';

/**
 * 系统定位（统一 API）：Android/iOS 走 Capacitor 原生定位（自动请求运行时权限），
 * Web 走该插件内置的浏览器 navigator.geolocation 实现。
 */
export async function getPositionNative(): Promise<GeoPosition> {
  const pos = await Geolocation.getCurrentPosition({
    enableHighAccuracy: false,
    timeout: 10000,
  });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}

/** 定位 + 城市反查（近似判断） */
export async function getPositionWithCity(): Promise<GeoPosition> {
  const pos = await getPositionNative();
  const city = await reverseGeocode(pos.lat, pos.lng);
  return { ...pos, city };
}
```

注意：`import { Geolocation } from '@capacitor/geolocation'` 放在文件顶部 import 区（与其他 import 一起），不要放在函数内。

- [ ] **Step 5: 运行测试确认通过**

Run: `npx vitest run src/utils/__tests__/position.test.ts`
Expected: `3 passed`

- [ ] **Step 6: 全量测试 + Commit**

Run: `npm test`（15+3 = 18 passed）

```bash
git add package.json package-lock.json src/utils/weatherApi.ts src/utils/__tests__/position.test.ts
git commit -m "feat: 系统定位 getPositionNative + @capacitor/geolocation"
```

---

### Task 2: 每日运势页接入系统定位

**Files:**
- Modify: `src/pages/DailyFortune.tsx`（`handleGetLocation` 函数区，约 86-96 行）

**Interfaces:**
- Consumes: `getPositionWithCity`（Task 1）
- Produces: 定位按钮链路改用系统定位；权限拒绝提示含 Android 引导文案

- [ ] **Step 1: 修改 import**

`src/pages/DailyFortune.tsx` 第 9 行 import 中，把 `getUserPosition` 替换为 `getPositionWithCity`：

```tsx
import { getWeather, getWeatherIcon, getWeatherDesc, getPositionWithCity, type WeatherData, type GeoPosition } from '../utils/weatherApi';
```

- [ ] **Step 2: 修改 handleGetLocation**

将 `const pos = await getUserPosition();` 改为 `const pos = await getPositionWithCity();`；错误提示改为：

```tsx
const handleGetLocation = async () => {
  try {
    message.loading({ content: '获取位置中...', key: 'geo' });
    const pos = await getPositionWithCity();
    message.success({ content: `已定位到 ${pos.city || '当前位置'}`, key: 'geo' });
    await loadWeather(pos.lat, pos.lng, pos.city);
  } catch (e: any) {
    message.error({
      content: '定位失败。请在系统设置中允许「爻一爻」使用定位权限后重试。',
      key: 'geo',
      duration: 4,
    });
  }
};
```

- [ ] **Step 3: 构建验证 + 手动验证**

Run: `npm run build`
Expected: tsc 无错误

Run: `npm run dev`
打开 /daily 点击定位按钮：桌面浏览器应弹位置授权并显示城市；拒绝时应显示新提示文案。

- [ ] **Step 4: Commit**

```bash
git add src/pages/DailyFortune.tsx
git commit -m "feat: 每日运势页接入系统定位 + 权限引导提示"
```

---

### Task 3: 八字页移动端响应式（竖表隐藏 + 流日 7 列）

**Files:**
- Modify: `src/pages/Bazi.tsx`（竖表区约 1720-1745；流日区约 2198-2220）
- Modify: `src/index.css`（流日 7 列样式）

**Interfaces:**
- Consumes: 既有 `isMobile` state（`window.innerWidth <= 768`，约 934-940 行）
- Produces: 375px 下八字页无横向滚动

- [ ] **Step 1: 隐藏手机端竖表**

定位四柱竖表渲染区（约 1720 行 `overflowX: 'auto'` 包裹、`minWidth: 480` 的表）。在其外层条件改为仅桌面渲染：

```tsx
{!isMobile && (
  <div style={{ overflowX: 'auto' }}>
    {/* 原有竖表内容原样保留 */}
  </div>
)}
```

若竖表与 2×2 卡片同在一个 Card 内，用 `isMobile` 三目切换两个区块的渲染（`isMobile ? 2x2卡片 : 竖表`）。

- [ ] **Step 2: 流日区改 7 列周历**

定位流日网格（约 2208-2215 行：外层 `maxHeight: 400, overflow: 'auto'`，内层 `Row` + `Col span={3} minWidth:80`）。移动端改为 CSS Grid 7 列：

```tsx
<div style={{
  maxHeight: 400,
  overflowY: 'auto',
  display: 'grid',
  gridTemplateColumns: isMobile ? 'repeat(7, 1fr)' : undefined,
  gap: 4,
}}>
  {/* 原 Col 内容改为普通 div；桌面端保持原有 Row/Col 结构 */}
</div>
```

> 实现提示：若改动 Row/Col 结构风险大，可在外层包一个 `isMobile` 分支——移动端渲染一套 7 列 Grid 版本，桌面端保留原 Row/Col。两套内容的渲染数据源相同（同一数组 map），先读通该区代码再选最小改法。

- [ ] **Step 3: 构建验证**

Run: `npm run build`
Expected: 无类型错误

- [ ] **Step 4: 手动验证**

Run: `npm run dev`
375px 宽度（DevTools 设备模拟）下：四柱无横向滚动条；流日区单行 7 个、仅纵向滚动。

- [ ] **Step 5: Commit**

```bash
git add src/pages/Bazi.tsx src/index.css
git commit -m "fix: 八字页移动端隐藏四柱竖表 + 流日改 7 列周历"
```

---

### Task 4: 日期校验纯函数（dateValidation.ts，TDD）

**Files:**
- Create: `src/utils/dateValidation.ts`
- Test: `src/utils/__tests__/dateValidation.test.ts`

**Interfaces:**
- Consumes: 无
- Produces:
  - `export function isValidSolarDate(year: number, month: number, day: number): boolean` — 公历日期合法性（含闰年 2 月）
  - `export function isValidLunarDate(year: number, month: number, day: number, isLeap: boolean): boolean` — 农历日期合法性：month 1-12、day 1-30、闰月仅当该年存在对应闰月（用 lunar-typescript 的 `Lunar.fromYmdHms` 探测，year 范围 1900-2100 内直接构造判断；year 越界返回 false）
  - `export function getLunarLeapMonth(year: number): number` — 返回该农历年闰月月份（0 = 无闰月），用 `Lunar.fromYmdHms(year, 1, 1).getLeapMonth()`（lunar-typescript 的 Solar/Lunar API 需实现者确认方法名，若为 `getLeapMonth()` 不存在则用 `Lunar.fromYmd(year,1,1).getLeapMonth()` 类似形式，以 lunar-typescript 实际 API 为准并保持签名不变）

- [ ] **Step 1: 先写测试** `src/utils/__tests__/dateValidation.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { isValidSolarDate, isValidLunarDate, getLunarLeapMonth } from '../dateValidation';

describe('isValidSolarDate', () => {
  it('accepts normal dates', () => {
    expect(isValidSolarDate(2024, 3, 15)).toBe(true);
  });
  it('rejects invalid dates', () => {
    expect(isValidSolarDate(2024, 2, 30)).toBe(false);
    expect(isValidSolarDate(2024, 13, 1)).toBe(false);
    expect(isValidSolarDate(2023, 2, 29)).toBe(false); // 非闰年
  });
  it('accepts leap year Feb 29', () => {
    expect(isValidSolarDate(2024, 2, 29)).toBe(true);
  });
});

describe('isValidLunarDate', () => {
  it('accepts normal lunar dates', () => {
    expect(isValidLunarDate(2024, 1, 15, false)).toBe(true);
  });
  it('rejects out-of-range', () => {
    expect(isValidLunarDate(2024, 13, 1, false)).toBe(false);
    expect(isValidLunarDate(2024, 1, 31, false)).toBe(false); // 农历最大 30 天
  });
  it('accepts leap month only when year has it', () => {
    // 2025 年农历有闰六月；2024 无闰月
    expect(getLunarLeapMonth(2025)).toBe(6);
    expect(getLunarLeapMonth(2024)).toBe(0);
    expect(isValidLunarDate(2025, 6, 15, true)).toBe(true);
    expect(isValidLunarDate(2024, 6, 15, true)).toBe(false);
  });
});

describe('getLunarLeapMonth', () => {
  it('returns 0 for no leap month', () => {
    expect(getLunarLeapMonth(2024)).toBe(0);
  });
});
```

> ⚠️ 若 lunar-typescript 对 2025 闰六月等具体值与本测试不符（农历数据以库为准），实现者以库实际返回为准调整测试期望值，并在 commit 信息注明。

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/utils/__tests__/dateValidation.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 dateValidation.ts**

```ts
import { Lunar } from 'lunar-typescript';

export function isValidSolarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  const daysInMonth = new Date(year, month, 0).getDate();
  return day <= daysInMonth;
}

export function getLunarLeapMonth(year: number): number {
  if (year < 1900 || year > 2100) return 0;
  try {
    return Lunar.fromYmd(year, 1, 1).getLeapMonth();
  } catch {
    return 0;
  }
}

export function isValidLunarDate(year: number, month: number, day: number, isLeap: boolean): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 30) return false;
  if (isLeap && getLunarLeapMonth(year) !== month) return false;
  try {
    // 构造验证：库能成功构造即合法
    Lunar.fromYmdHms(year, month, day, 0, 0, 0, isLeap);
    return true;
  } catch {
    return false;
  }
}
```

> ⚠️ `Lunar.fromYmdHms` 的闰月参数签名以 lunar-typescript 实际 API 为准（可能是第 7 参 `isLeap` 或 `Lunar.fromYmd(year, month, day, isLeap)`）；实现者先查 `node_modules/lunar-typescript` 的 API 再写，保持 `isValidLunarDate` 签名不变。

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/utils/__tests__/dateValidation.test.ts`
Expected: 全绿（或按库实际调整的期望值全绿）

- [ ] **Step 5: Commit**

```bash
git add src/utils/dateValidation.ts src/utils/__tests__/dateValidation.test.ts
git commit -m "feat: 公历/农历日期合法性校验纯函数"
```

---

### Task 5: 八字页表单校验（rules + 闰月）

**Files:**
- Modify: `src/pages/Bazi.tsx`（表单区约 1489-1545；handleCalc 约 1005-1030）

**Interfaces:**
- Consumes: `isValidSolarDate`、`isValidLunarDate`、`getLunarLeapMonth`（Task 4）
- Produces: 表单非法日期红字提示；农历模式闰月选择；handleCalc 前校验

- [ ] **Step 1: 农历模式加闰月**

表单「输入方式」Radio 下方（约 1492 行附近），`inputMode === 'lunar'` 时显示闰月选项：

```tsx
{inputMode === 'lunar' && (
  <Form.Item label="闰月" style={{ marginBottom: 12 }}>
    <Select
      allowClear
      placeholder="如有闰月请选择"
      style={{ width: 160 }}
      value={leapMonth ?? undefined}
      onChange={(v) => setLeapMonth(v ?? null)}
      options={getLunarLeapMonth(form.getFieldValue('year'))
        ? [{ value: getLunarLeapMonth(form.getFieldValue('year')), label: `闰${getLunarLeapMonth(form.getFieldValue('year'))}月` }]
        : []}
    />
  </Form.Item>
)}
```

在组件内新增 state：`const [leapMonth, setLeapMonth] = useState<number | null>(null);`（放 `inputMode` state 附近）。`handleCalc` 里把 `leapMonth` 并入农历转换调用（实现者先读 handleCalc 的农历→公历转换代码，确认传参点；若该年无闰月则忽略）。

- [ ] **Step 2: 表单 rules 加日期合法性**

给 year/month/day 三个 Form.Item 的 rules 增加自定义校验（以 month/day 为例，year 1900-2100 由 InputNumber min/max 保证）：

```tsx
<Form.Item
  name="day"
  label="日"
  rules={[
    { required: true },
    ({ getFieldValue }) => ({
      validator: (_, value) => {
        if (!value) return Promise.resolve();
        const y = getFieldValue('year');
        const m = getFieldValue('month');
        const ok = inputMode === 'lunar'
          ? isValidLunarDate(y, m, value, leapMonth === m)
          : isValidSolarDate(y, m, value);
        return ok ? Promise.resolve() : Promise.reject(new Error(inputMode === 'lunar' ? '农历日期无效（注意闰月）' : '该月没有这一天'));
      },
    }),
  ]}
>
```

month 的 rules 类似（校验 1-12 由 InputNumber 保证，可只加 day 的校验；若实现方便 month 也加）。

- [ ] **Step 3: handleCalc 前校验（保留现有 toast 兜底）**

在 `handleCalc` 现有 `if (!year || !month ...)` 之后、`try` 之前追加：

```tsx
const dateOk = inputMode === 'lunar'
  ? isValidLunarDate(year, month, day, leapMonth === month)
  : isValidSolarDate(year, month, day);
if (!dateOk) {
  message.warning(inputMode === 'lunar' ? '农历日期无效，请检查月份与闰月' : '日期无效，请检查');
  return;
}
```

- [ ] **Step 4: 构建验证 + 手动验证**

Run: `npm run build`（无类型错误）→ `npm run dev`：公历输入 2024-02-30 应红字提示；农历输入 2024 年选闰月应无选项/2025 年可选闰六月。

- [ ] **Step 5: Commit**

```bash
git add src/pages/Bazi.tsx
git commit -m "feat: 八字页表单闰月支持 + 日期合法性内联校验"
```

---

### Task 6: 八字页结果区交互（折叠策略 + 流月去双入口 + 修改信息锚点 + 神煞弹层）

**Files:**
- Modify: `src/pages/Bazi.tsx`（折叠卡区约 1580-2300；神煞区约 1899；流月区约 2160-2175；结果区顶部）

**Interfaces:**
- Consumes: 无新接口
- Produces: 大运卡默认展开；折叠卡可多开；流月无双入口；结果顶部「修改信息」按钮；神煞点击弹解释

- [ ] **Step 1: 折叠策略**

在 Bazi.tsx 中所有 `CollapsibleCard` 使用处：
- 删除 `accordionGroup="bazi-analysis"`（或现有分组名）传参 → 允许多开
- 「大运」卡加 `defaultOpen`（若大运卡内容由结果计算后渲染，且组件挂载时才展开——确认大运卡渲染条件，defaultOpen 直接传 true）

- [ ] **Step 2: 流月去双入口**

定位流月区（约 2160-2175 行）：InputNumber 的 `onChange` 已触发 `handleLiuYue`，删除旁边「查看流月」按钮及其 onClick（保留 InputNumber 选择即算）。

- [ ] **Step 3: 「修改信息」锚点**

结果区顶部（一句话结论卡之后，约 1545 行附近）加：

```tsx
<Button
  type="text"
  size="small"
  icon={<span style={{ marginRight: 4 }}>✏️</span>}
  onClick={() => {
    document.getElementById('bazi-form-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }}
  style={{ marginBottom: 8 }}
>
  修改信息
</Button>
```

给表单 Card（约 1487 行 `<Card ...>`）加 `id="bazi-form-card"`（或已有的 Card 加 id；若 Card 无该 prop 则包一层 div）。

- [ ] **Step 4: 神煞 Tooltip → Popover**

定位神煞解释 Tooltip（约 1899 行）：`Tooltip title={...}` 改为 `Popover content={...} trigger="click"`（antd Popover 需从 antd import 中确认已引入，未引入则补）。移动端点击生效，桌面端点击同样可用。

- [ ] **Step 5: 构建验证 + 手动验证**

Run: `npm run build` → `npm run dev`：多个折叠卡可同时展开；大运卡默认展开；流月区无重复按钮；结果顶部可滚回表单；神煞点击弹解释。

- [ ] **Step 6: Commit**

```bash
git add src/pages/Bazi.tsx
git commit -m "feat: 八字页折叠策略优化 + 流月去双入口 + 修改信息锚点 + 神煞点击弹层"
```

---

### Task 7: 紫微页移动端响应式（宫格 2 列 + isMobile）

**Files:**
- Modify: `src/pages/Ziwei.tsx`（组件顶部 state 区约 274-285；宫格区约 852-990）

**Interfaces:**
- Consumes: 无
- Produces: 375px 下十二宫详解 2 列可读；≥768px 保持 4 列

- [ ] **Step 1: 新增 isMobile state**

在 `export default function Ziwei() {` 内（约 276 行 `const { profile... }` 之后）加：

```tsx
const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
useEffect(() => {
  const onResize = () => setIsMobile(window.innerWidth <= 768);
  window.addEventListener('resize', onResize);
  return () => window.removeEventListener('resize', onResize);
}, []);
```

（`useState`/`useEffect` 已 import，确认即可。）

- [ ] **Step 2: 宫格 2 列**

定位十二宫详解 Grid（约 852-857 行 `gridTemplateColumns: '1fr 1fr 1fr 1fr'`），改为：

```tsx
gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr',
```

卡片内字号/间距如溢出（标题 + 星曜 Tag 换行），给卡片内容容器加 `minWidth: 0` 与 `overflow: 'hidden'`，Tag 字号在 isMobile 时降 1px（`fontSize: isMobile ? 11 : 12`）。

- [ ] **Step 3: 构建验证 + 手动验证**

Run: `npm run build` → `npm run dev` 375px：宫格 2 列无横向溢出；768px+ 仍 4 列。

- [ ] **Step 4: Commit**

```bash
git add src/pages/Ziwei.tsx
git commit -m "fix: 紫微页十二宫详解移动端 2 列布局"
```

---

### Task 8: 紫微页表单（rules + 闰月合法性 + 出生地/真太阳时）

**Files:**
- Modify: `src/pages/Ziwei.tsx`（表单区约 589-660；排盘区约 345-360）

**Interfaces:**
- Consumes: `isValidSolarDate`、`isValidLunarDate`、`getLunarLeapMonth`（Task 4）；`getCityLng`（`src/context/UserContext.tsx` 已导出，八字页在用）
- Produces: 紫微页可输出生地并做真太阳时校正；表单日期合法性校验；闰月与月份匹配校验

- [ ] **Step 1: 补出生地 Cascader**

在表单「分」列之后（约 660 行 Button 之前）加：

```tsx
<Row gutter={16}>
  <Col xs={24} sm={12}>
    <Form.Item name="birthplace" label="出生地（真太阳时校正）">
      <Cascader
        options={pcaCode}
        fieldNames={{ label: 'n', value: 'c', children: 'ch' }}
        placeholder="请选择省市区（可选）"
        changeOnSelect
        style={{ width: '100%' }}
      />
    </Form.Item>
  </Col>
</Row>
```

import 补：`import { pcaCode } from 'cn-division';`、`import { getCityLng, getTrueSolarHour } from '../context/UserContext';`（先确认这两个函数已从 UserContext 导出——八字页已用 `getCityLng` 与 `getTrueSolarHour`，见 Bazi.tsx import）。

- [ ] **Step 2: 排盘用出生地经度 + 真太阳时**

在排盘函数（约 345-360 行）中，`longitude: 120` 改为按出生地计算：

```tsx
const birthplace = form.getFieldValue('birthplace');
const lng = birthplace ? getCityLng(birthplace[birthplace.length - 1]) : 120;
// 真太阳时校正（仿八字页 handleCalc）：
let realHour = hour, realMinute = minute;
if (birthplace && lng) {
  const corrected = getTrueSolarHour(hour, minute, lng);
  realHour = corrected.hour;
  realMinute = corrected.minute;
}
```

然后用 `realHour/realMinute` 构造 `birthDate`（替换原 `hour/minute` 用法），`longitude: lng`。实现者先读排盘函数完整代码确认 `birthDate` 构造方式，保持其余逻辑不变。

- [ ] **Step 3: 闰月合法性 + 日期 rules**

- 闰月 Checkbox 改为只在 `getLunarLeapMonth(选中年份) === 选中月份` 时可勾选：在 Checkbox 处加 `disabled={calendarType !== 'lunar' || getLunarLeapMonth(form.getFieldValue('year')) !== (form.getFieldValue('month') as number)}`
- day 的 rules 加自定义 validator（同 Task 5 Step 2 模式，用 `isValidSolarDate/isValidLunarDate`，`isLeap = isLeapMonth && m === month`）
- 排盘函数开头（现有 `if (!gender...)` 校验后）补：

```tsx
const dateOk = calendarType === 'lunar'
  ? isValidLunarDate(year, month, day, isLeapMonth && month === (form.getFieldValue('month') as number))
  : isValidSolarDate(year, month, day);
if (!dateOk) {
  message.warning('日期无效，请检查（注意闰月）');
  return;
}
```

（`year/month/day` 从现有 `getFieldsValue` 取值处获取；实现者先读排盘函数确认变量名。）

- [ ] **Step 4: 构建验证 + 手动验证**

Run: `npm run build` → `npm run dev`：选出生地后排盘，结果区出生时间卡应显示校正后信息（与八字页口径一致）；非法日期红字提示。

- [ ] **Step 5: Commit**

```bash
git add src/pages/Ziwei.tsx
git commit -m "feat: 紫微页出生地+真太阳时校正 + 日期校验与闰月匹配"
```

---

### Task 9: 紫微页交互（切换保留月日 + 去随机解读）

**Files:**
- Modify: `src/pages/Ziwei.tsx`（Radio 切换约 574-578；解读约 500-510）

**Interfaces:**
- Consumes: 无
- Produces: 公历/农历切换不清空月日；折叠重开解读文案不变

- [ ] **Step 1: 切换保留月日**

约 574 行 `onChange={(e) => { setCalendarType(e.target.value); form.resetFields(['month', 'day']); }}` 改为：

```tsx
onChange={(e) => { setCalendarType(e.target.value); }}
```

（保留已填 month/day 值；月选项 label 的闰月标注已由 `isLeapMonth && i === ...` 动态处理。）

- [ ] **Step 2: 解读 verdict 去随机**

约 500-510 行 `const verdict = verdictList[Math.floor(Math.random() * verdictList.length)];` 改为确定性选择：

```tsx
// 按宫位名哈希确定性选择，保证折叠重开文案稳定
const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
const verdict = verdictList[hash(gong.name) % verdictList.length];
```

（`gong` 为当前宫位对象；实现者确认该作用域内宫位变量名。）

- [ ] **Step 3: 构建验证 + 手动验证**

Run: `npm run build` → `npm run dev`：切换公历/农历月日保留；同一宫折叠重开解读文字不变。

- [ ] **Step 4: Commit**

```bash
git add src/pages/Ziwei.tsx
git commit -m "fix: 紫微页切换日历保留月日 + 解读文案确定性"
```

---

### Task 10: 全量验证 + 打包 APK + 清理

**Files:**
- Create: 无（产物 `爻一爻-debug.apk` 覆盖根目录既有文件）

**Interfaces:**
- Consumes: 全部前述任务
- Produces: `爻一爻-debug.apk`（含 UI 优化 + 定位天气）

- [ ] **Step 1: 全量测试**

Run: `npm test`
Expected: 全部通过（18 + dateValidation 新增用例）

- [ ] **Step 2: 构建并同步**

Run: `npm run build:android`
Expected: 构建成功、cap sync 完成、android assets 更新

- [ ] **Step 3: 打包 APK**

```bash
cd /e/算命小程序/android
export JAVA_HOME="/c/tools/jdk-21.0.12+8"
export PATH="$JAVA_HOME/bin:$PATH"
export ANDROID_HOME='C:\Users\dyy\AppData\Local\Android\Sdk'
./gradlew assembleDebug --no-daemon
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 4: 复制交付物并验证**

```bash
cd /e/算命小程序
cp android/app/build/outputs/apk/debug/app-debug.apk 爻一爻-debug.apk
unzip -p 爻一爻-debug.apk assets/public/index.html | grep -c "boot-status"   # 应 ≥1
unzip -p 爻一爻-debug.apk AndroidManifest.xml >/dev/null 2>&1 || unzip -l 爻一爻-debug.apk | grep -c "geolocation" || true
```

Expected: APK 6.9-7.5MB；`aapt2 dump badging` 显示包名 `com.yaoyiyao.app`、`ACCESS_FINE_LOCATION` 权限（`aapt2 dump permissions` 或 badging 输出含 permission 行）。

- [ ] **Step 5: 清理调试残留**

```bash
cd /e/算命小程序
rm -rf dist-apk-test icon-preview.png scripts/img-info.py
```

（`scripts/gen-icons.py` 保留——图标再生成工具。）

- [ ] **Step 6: Commit（如有代码残留改动）**

```bash
git add -A
git commit -m "chore: 清理调试残留"
```

---

## Self-Review

**1. Spec coverage:**
- 第 1 节响应式：竖表隐藏 + 流日 7 列 → Task 3；紫微宫格 2 列 → Task 7 ✅
- 第 2 节表单校验：rules + 闰月 + 紫微出生地/真太阳时 → Task 4/5/8 ✅
- 第 3 节结果区交互：折叠策略 → Task 6；流月去双入口 → Task 6；修改信息锚点 → Task 6；神煞弹层 → Task 6；切换保留月日 → Task 9；去随机 → Task 9 ✅
- 第 5 节定位天气：插件 + 原生定位 → Task 1/2 ✅
- 验收 1-9：Task 3/7 覆盖 1-2；Task 5/8 覆盖 3-4；Task 6 覆盖 5；Task 9 覆盖 6；Task 6 覆盖 7；Task 10 覆盖 8-9 ✅

**2. Placeholder scan:** 无 TBD/TODO；所有步骤给出锚点行号与代码形态；Task 3/5/8/9 中标注了"实现者先读代码确认"的开放点（lunar-typescript API、变量名），均给出明确回退策略 ✅

**3. Type consistency:**
- `getPositionNative(): Promise<GeoPosition>` 与 `getPositionWithCity(): Promise<GeoPosition>` 在 Task 1 定义、Task 2 消费 ✅
- `isValidSolarDate(year, month, day)` / `isValidLunarDate(year, month, day, isLeap)` / `getLunarLeapMonth(year): number` 在 Task 4 定义、Task 5/8 消费，参数顺序一致 ✅
- `isMobile` 布尔在 Task 3/7 各自组件内定义，无跨任务依赖 ✅
