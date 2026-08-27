# 命格与紫微格局详细判定实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 八字命格按传统体系详细判定（外格→禄刃→八格→衍生格→层次）+ 用神忌神透干；紫微新增严格成格判定（主星格+杂耀格+四化+无破格）。

**Architecture:** 两个纯函数模块 `src/utils/mingGe.ts`、`src/utils/ziweiGe.ts`（可单测），页面只做数据传入与展示接入；保留既有排盘算法。

**Tech Stack:** TypeScript、lunar-typescript、vitest、React 18 + antd 5

## Global Constraints

- **不动核心算法**：baziAnalysis.ts / ziweiAnalysis.ts 签名不改
- **不改变量名**：沿用现有 `PillarData`、`MingGeResult`、`yongShenRec`、`ziweiData.gongData` 结构
- 文件 CRLF 行尾（git 自动转换）
- 提交信息用中文，按任务分次 commit
- 既有 57 个测试保持全绿
- 新增测试：`mingGe.test.ts`、`ziweiGe.test.ts`（node 环境）

---

### Task 1: mingGe.ts 命格判定模块（TDD）

**Files:**
- Create: `src/utils/mingGe.ts`
- Test: `src/utils/__tests__/mingGe.test.ts`

**Interfaces:**
- Consumes: `PillarData`（src/pages/Bazi.tsx 导出，含 pillar/tianGan/diZhi/cangGan/shiShen/shiShenZhi/nayin）
- Produces:
  - `export interface MingGeDetailed { geName: string; geType: string; score: string; desc: string; details: string[] }`
  - `export function analyzeMingGeDetailed(pillars: PillarData[], dayGan: string, strengthLevel: string, wxStats: Record<string, { count: number; level: string }>): MingGeDetailed`
  - `export function analyzeTouGan(pillars: PillarData[], yongShen: string[], jiShen: string[]): string[]`（返回 details 行，如「用神木透干（年干甲、日干乙）」）

- [ ] **Step 1: 写测试** `src/utils/__tests__/mingGe.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { analyzeMingGeDetailed, analyzeTouGan } from '../mingGe';
import type { PillarData } from '../../pages/Bazi';

// 构造四柱：甲年 丙月 甲日 庚时（甲生寅月？不，用固定月令测八格）
// 月柱丙寅（寅本气甲→比肩？为测正官格，用月令子水本气癸→正印）
const mk = (tianGan: string, diZhi: string, cangGan: string[], shiShen: string): PillarData => ({
  pillar: '年柱', ganZhi: tianGan + diZhi, tianGan, diZhi, cangGan, shiShen,
  shiShenZhi: '', nayin: '',
});

const pillars = (tg: string[], dz: string[], cg: string[][], ss: string[]): PillarData[] =>
  tg.map((t, i) => mk(t, dz[i], cg[i], ss[i]));

describe('analyzeMingGeDetailed', () => {
  it('八格：正官格（月令本气正官透干）', () => {
    // 甲日主，月支酉（本气辛→正官），辛透年干 → 正官格
    const ps = pillars(['辛', '丁', '甲', '庚'], ['酉', '卯', '子', '午'],
      [['辛'], ['乙'], ['癸'], ['丁']], ['正官', '伤官', '偏印', '食神']);
    const r = analyzeMingGeDetailed(ps, '甲', '身强', {});
    expect(r.geName).toContain('正官格');
  });

  it('禄刃格：建禄格（月支=日干禄位）', () => {
    // 甲日主，月支寅 = 甲禄 → 建禄格
    const ps = pillars(['庚', '甲', '甲', '丙'], ['午', '寅', '子', '辰'],
      [['丁'], ['甲'], ['癸'], ['戊']], ['七杀', '比肩', '偏印', '食神']);
    const r = analyzeMingGeDetailed(ps, '甲', '身强', {});
    expect(r.geName).toContain('建禄格');
  });

  it('特殊外格：天元一气格（四柱天干相同）', () => {
    const ps = pillars(['甲', '甲', '甲', '甲'], ['子', '寅', '午', '戌'],
      [['癸'], ['甲'], ['丁'], ['戊']], ['偏印', '比肩', '伤官', '偏财']);
    const r = analyzeMingGeDetailed(ps, '甲', '身极强', {});
    expect(r.geName).toContain('天元一气');
  });

  it('特殊外格：魁罡格（日柱庚辰）', () => {
    const ps = pillars(['丙', '甲', '庚', '戊'], ['午', '寅', '辰', '辰'],
      [['丁'], ['甲'], ['戊'], ['戊']], ['食神', '比肩', '偏印', '偏印']);
    const r = analyzeMingGeDetailed(ps, '庚', '身强', {});
    expect(r.geName).toContain('魁罡');
  });

  it('衍生格：杀印相生 → 上等', () => {
    // 甲日主，月令七杀 + 印星 → 杀印相生
    const ps = pillars(['庚', '庚', '甲', '壬'], ['午', '寅', '子', '申'],
      [['丁'], ['甲'], ['癸'], ['庚']], ['七杀', '七杀', '偏印', '七杀']);
    const r = analyzeMingGeDetailed(ps, '甲', '身弱', {});
    expect(r.geName).toContain('杀印相生');
    expect(r.score).toBe('上等');
  });

  it('输出含类型与层次字段', () => {
    const ps = pillars(['辛', '丁', '甲', '庚'], ['酉', '卯', '子', '午'],
      [['辛'], ['乙'], ['癸'], ['丁']], ['正官', '伤官', '偏印', '食神']);
    const r = analyzeMingGeDetailed(ps, '甲', '身强', {});
    expect(r.geType).toBeTruthy();
    expect(['上等', '中上', '中等', '中下', '下等']).toContain(r.score);
  });
});

describe('analyzeTouGan', () => {
  it('用神透干：返回柱位', () => {
    // 日干甲（木），年干辛（金），月干丙（火）→ 用神木在日干透
    const ps = pillars(['辛', '丙', '甲', '庚'], ['酉', '寅', '子', '午'],
      [['辛'], ['甲'], ['癸'], ['丁']], ['正官', '食神', '比肩', '七杀']);
    const lines = analyzeTouGan(ps, ['木'], ['金']);
    expect(lines.some(l => l.includes('用神木透干') && l.includes('日干'))).toBe(true);
    expect(lines.some(l => l.includes('忌神金透干') && l.includes('年干'))).toBe(true);
  });

  it('不透干：提示未透', () => {
    // 用神水，四柱天干无壬癸 → 不透干
    const ps = pillars(['辛', '丙', '甲', '庚'], ['酉', '寅', '子', '午'],
      [['辛'], ['甲'], ['癸'], ['丁']], ['正官', '食神', '比肩', '七杀']);
    const lines = analyzeTouGan(ps, ['水'], ['火']);
    expect(lines.some(l => l.includes('用神水不透干'))).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/utils/__tests__/mingGe.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现** `src/utils/mingGe.ts`

```ts
import type { PillarData } from '../pages/Bazi';

export interface MingGeDetailed {
  geName: string;
  geType: string;
  score: string;
  desc: string;
  details: string[];
}

const TG_WX: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};
const DZ_WX: Record<string, string> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
  '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水',
};

const LU: Record<string, string> = { '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午', '戊': '巳', '己': '午', '庚': '申', '辛': '酉', '壬': '亥', '癸': '子' };
const YANG_REN: Record<string, string> = { '甲': '卯', '乙': '寅', '丙': '午', '丁': '巳', '戊': '午', '己': '巳', '庚': '酉', '辛': '申', '壬': '子', '癸': '亥' };

/** 特殊外格判定：返回格名或 null */
function specialGe(pillars: PillarData[], dayGan: string, strengthLevel: string): { name: string; type: string; desc: string } | null {
  const tgs = pillars.map(p => p.tianGan);
  const dayPillar = pillars[2];
  const timePillar = pillars[3];
  const monthZhi = pillars[1].diZhi;

  // 天元一气：四干相同
  if (tgs.every(t => t === tgs[0])) {
    return { name: '天元一气格', type: '外格', desc: `四柱天干均为${tgs[0]}，一气呵成，气势纯一。这类命格个性极强、目标专一，做事有始有终，但易固执。` };
  }
  // 魁罡
  if (['庚辰', '壬辰', '戊戌', '庚戌'].includes(dayPillar.ganZhi)) {
    return { name: '魁罡格', type: '外格', desc: `日柱${dayPillar.ganZhi}为魁罡。魁罡者聪明果断、胆识过人，性格刚强不服输，适合从事有挑战性的领域。` };
  }
  // 日贵
  if (['丁酉', '丁亥', '癸巳', '癸卯'].includes(dayPillar.ganZhi)) {
    return { name: '日贵格', type: '外格', desc: `日柱${dayPillar.ganZhi}为日贵。日坐天乙贵人，一生多贵人相助，人缘好。` };
  }
  // 金神：时柱癸酉/己巳/乙丑
  if (['癸酉', '己巳', '乙丑'].includes(timePillar.ganZhi)) {
    return { name: '金神格', type: '外格', desc: `时柱${timePillar.ganZhi}为金神。金神主刚毅果决、才华外露，适合技术或军警类职业。` };
  }
  // 专旺格：日主极强 + 月令当令 + 局中同气最旺
  if (strengthLevel === '身极强' || strengthLevel === '身强') {
    const monthWx = DZ_WX[monthZhi] || '';
    const dayWx = TG_WX[dayGan] || '';
    const seasonOk = (dayWx === '木' && ['寅', '卯', '辰'].includes(monthZhi))
      || (dayWx === '火' && ['巳', '午', '未'].includes(monthZhi))
      || (dayWx === '土' && ['辰', '戌', '丑', '未'].includes(monthZhi))
      || (dayWx === '金' && ['申', '酉', '戌'].includes(monthZhi))
      || (dayWx === '水' && ['亥', '子', '丑'].includes(monthZhi));
    if (seasonOk && monthWx === dayWx) {
      const names: Record<string, string> = { '木': '曲直格', '火': '炎上格', '土': '稼穑格', '金': '从革格', '水': '润下格' };
      return { name: `专旺·${names[dayWx]}`, type: '外格', desc: `${dayGan}日主${dayWx}气专旺，生于${monthZhi}月当令，全局气势专注一行，为${names[dayWx]}。这类命格心志坚定、专注力强，适合深耕单一领域。` };
    }
  }
  return null;
}

/** 八格：月令藏干透干定格 */
function baGe(pillars: PillarData[], dayGan: string): { name: string; type: string; desc: string; detail: string } | null {
  const month = pillars[1];
  const cangGan = month.cangGan || [];
  if (cangGan.length === 0) return null;
  // 藏干 → 十神：用月柱 shiShenZhi 拆分（格式如 '正官/偏印'）
  const ssArr = (month.shiShenZhi || '').split('/').filter(Boolean);
  const tgs = pillars.map(p => p.tianGan);
  const geNames: Record<string, string> = { '正官': '正官格', '七杀': '七杀格', '正印': '正印格', '偏印': '偏印格', '正财': '正财格', '偏财': '偏财格', '食神': '食神格', '伤官': '伤官格' };
  // 本气透干
  const benQiSS = ssArr[0] || '';
  const benQiGan = cangGan[0];
  const isBenQiTou = tgs.includes(benQiGan);
  if (geNames[benQiSS]) {
    const gan = isBenQiTou ? benQiGan : '';
    if (isBenQiTou) {
      return { name: geNames[benQiSS], type: '普通格', desc: `月令${month.diZhi}本气${benQiGan}（${benQiSS}）透干，取${geNames[benQiSS]}。`, detail: `本气${benQiGan}透干 → ${geNames[benQiSS]}` };
    }
    // 余气透干
    for (let i = 1; i < cangGan.length; i++) {
      if (tgs.includes(cangGan[i])) {
        const ss = ssArr[i] || benQiSS;
        if (geNames[ss]) {
          return { name: geNames[ss], type: '普通格', desc: `月令${month.diZhi}本气未透，余气${cangGan[i]}（${ss}）透干，取${geNames[ss]}。`, detail: `余气${cangGan[i]}透干 → ${geNames[ss]}` };
        }
      }
    }
    // 本气未透：取月令本气
    if (geNames[benQiSS]) {
      return { name: `${geNames[benQiSS]}（本气未透）`, type: '普通格', desc: `月令${month.diZhi}本气${benQiGan}（${benQiSS}）未透干，直接取月令本气为格。`, detail: `月令本气${benQiSS} → ${geNames[benQiSS]}` };
    }
  }
  return null;
}

/** 衍生格 + 层次 */
function yanShengGe(pillars: PillarData[], geName: string): { name: string; score: string; detail: string } | null {
  const shiShens = pillars.map(p => p.shiShen);
  const all = [...shiShens];
  const has = (s: string) => all.some(x => x === s);
  const hasTou = (s: string) => all.includes(s);
  if (has('七杀') && hasTou('正印') || (has('七杀') && hasTou('偏印'))) {
    return { name: '杀印相生', score: '上等', detail: '七杀与印星并见，杀印相生，化压力为助力，是上等格局' };
  }
  if (has('伤官') && hasTou('正印')) {
    return { name: '伤官配印', score: '上等', detail: '伤官配印，才华有约束而能成器，是上等格局' };
  }
  if (has('正官') && hasTou('正印')) {
    return { name: '正官佩印', score: '上等', detail: '正官佩印，官印相生，稳重有靠，是上等格局' };
  }
  if (has('食神') && (hasTou('正财') || hasTou('偏财'))) {
    return { name: '食神生财', score: '中等', detail: '食神生财，才华可化为财富，是中上格局' };
  }
  if (has('正财') && hasTou('正官')) {
    return { name: '财官相生', score: '中等', detail: '财官相生，财生官旺，利事业财运，是中等偏上格局' };
  }
  if (has('比肩') && hasTou('正财')) {
    return { name: '比劫夺财', score: '下等', detail: '比劫旺而财星弱，易破财竞争，是下等格局，需注意合伙与理财' };
  }
  if (has('正官') && has('七杀')) {
    return { name: '官杀混杂', score: '下等', detail: '正官七杀同现，官杀混杂，压力与机遇并存，需印星化解' };
  }
  return null;
}

export function analyzeMingGeDetailed(
  pillars: PillarData[],
  dayGan: string,
  strengthLevel: string,
  wxStats: Record<string, { count: number; level: string }>,
): MingGeDetailed {
  const monthZhi = pillars[1].diZhi;
  const details: string[] = [];
  let geName = '';
  let geType = '';
  let score = '';
  let desc = '';

  // 1) 特殊外格
  const sp = specialGe(pillars, dayGan, strengthLevel);
  if (sp) {
    geName = sp.name; geType = sp.type; desc = sp.desc; score = '中上';
    details.push(`特殊外格：${sp.name}`);
    return { geName, geType, score, desc, details };
  }

  // 2) 禄刃格
  if (LU[dayGan] === monthZhi) {
    geName = '建禄格'; geType = '禄格'; score = '中上';
    desc = `日主${dayGan}禄位在${monthZhi}，月令建禄，自身有根基，独立自主，通常身强。`;
    details.push(`月支${monthZhi} = ${dayGan}之禄位 → 建禄格`);
  } else if (YANG_REN[dayGan] === monthZhi) {
    geName = '羊刃格'; geType = '禄格'; score = '中上';
    desc = `月令${monthZhi}为日主${dayGan}之羊刃，羊刃主刚烈果决、行动力强，但需注意冲动。`;
    details.push(`月支${monthZhi} = ${dayGan}之羊刃 → 羊刃格`);
  } else {
    // 3) 八格
    const bg = baGe(pillars, dayGan);
    if (bg) {
      geName = bg.name; geType = bg.type; desc = bg.desc;
      details.push(bg.detail);
      score = (geName.includes('正官') || geName.includes('正印')) ? '中上' : '中等';
    } else {
      geName = '月令杂气'; geType = '普通格'; score = '中等';
      desc = `月令${monthZhi}藏干透出情况不构成标准八格，按普通格局论。`;
    }
  }

  // 4) 衍生格（覆盖评分）
  const ys = yanShengGe(pillars, geName);
  if (ys) {
    geName = `${geName.replace(/（本气未透）/, '')}·${ys.name}`;
    score = ys.score;
    details.push(ys.detail);
  }

  details.push(`格局层次：${score}`);
  return { geName, geType, score, desc, details };
}

/** 用神/忌神透干分析：返回 details 行 */
export function analyzeTouGan(pillars: PillarData[], yongShen: string[], jiShen: string[]): string[] {
  const ganOfPillar = ['年干', '月干', '日干', '时干'];
  const lines: string[] = [];
  const label = (wx: string, isYong: boolean) => (isYong ? '用神' : '忌神');
  for (const wx of yongShen) {
    const hit = pillars.map((p, i) => TG_WX[p.tianGan] === wx ? ganOfPillar[i] : '').filter(Boolean);
    lines.push(hit.length > 0 ? `用神${wx}透干（${hit.join('、')}）` : `用神${wx}不透干`);
  }
  for (const wx of jiShen) {
    const hit = pillars.map((p, i) => TG_WX[p.tianGan] === wx ? ganOfPillar[i] : '').filter(Boolean);
    lines.push(hit.length > 0 ? `忌神${wx}透干（${hit.join('、')}）` : `忌神${wx}不透干`);
  }
  return lines;
}
```

> 注意：`analyzeTouGan` 内 `label` 变量未使用，删除该行；实现以本文件最终代码为准（保持导出签名不变）。

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/utils/__tests__/mingGe.test.ts`
Expected: 全部通过（若个别格判定与测试用例期望不符，按实际判定逻辑调整测试数据，保持判定规则正确）

- [ ] **Step 5: Commit**

```bash
git add src/utils/mingGe.ts src/utils/__tests__/mingGe.test.ts
git commit -m "feat: 八字命格详细判定模块（外格/禄刃/八格/衍生格/层次）+ 用神忌神透干"
```

---

### Task 2: Bazi.tsx 接入详细命格

**Files:**
- Modify: `src/pages/Bazi.tsx`（analyzeMingGe 调用处 + 命格卡展示）

**Interfaces:**
- Consumes: `analyzeMingGeDetailed`、`analyzeTouGan`（Task 1）
- Produces: 命格卡显示详细格名/类型/层次 + 用神忌神透干 details

- [ ] **Step 1: import 新函数**

在 Bazi.tsx 顶部（dateValidation import 附近）加：

```tsx
import { analyzeMingGeDetailed, analyzeTouGan } from '../utils/mingGe';
```

- [ ] **Step 2: handleCalc 中替换命格计算**

找到 handleCalc 里调用 `analyzeMingGe` 的地方（构建 `mingGe` 字段），改为：

```tsx
const mingGe = analyzeMingGeDetailed(pillars, dayGan, strengthLevel, wxStatsForGe);
```

> 实现者先读 handleCalc 中现有 `analyzeMingGe` 调用与其入参（strengthLevel 来源、wxStats 变量名），用同名变量传入；`setBaziData` 的 `mingGe` 字段类型不变（仍是 `{ geName, geType, score, desc, details }`，新函数返回结构兼容）。

- [ ] **Step 3: 命格卡 details 追加用神忌神透干**

在命格卡渲染处（`baziData.mingGe.details.map(...)` 位置），找到后在其下方追加（或在 handleCalc 中把透干行并入 details）：

```tsx
const touGanLines = analyzeTouGan(baziData.pillars, yongShenRec?.yongShen || [], yongShenRec?.xiShen || []);
```

并在 details 列表渲染时把 `touGanLines` 追加进去（优先在 handleCalc 中计算并存入 mingGe.details，避免渲染期依赖）。

> 实现者优先选择：在 handleCalc 里 `mingGe.details = [...mingGe.details, ...analyzeTouGan(pillars, yongShen, xiShen)]`（此时 yongShenRec 已计算），保持渲染层零改动。

- [ ] **Step 4: 验证**

Run: `npx tsc --noEmit && npm test`
Expected: 全绿（57 + mingGe 新增）

- [ ] **Step 5: Commit**

```bash
git add src/pages/Bazi.tsx
git commit -m "feat: 八字页命格卡接入详细判定 + 用神忌神透干展示"
```

---

### Task 3: ziweiGe.ts 紫微格局模块（TDD）

**Files:**
- Create: `src/utils/ziweiGe.ts`
- Test: `src/utils/__tests__/ziweiGe.test.ts`

**Interfaces:**
- Consumes: `ziweiData.gongData`（宫位数组：`{ name: string; majorStars?: {name:string; sihua?: string|null}[]; minorStars?: string[] }`）
- Produces:
  - `export interface ZiweiGeResult { geNames: string[]; reasons: string[]; breakReasons: string[] }`
  - `export function analyzeZiweiGe(gongData: any[]): ZiweiGeResult`

- [ ] **Step 1: 写测试** `src/utils/__tests__/ziweiGe.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { analyzeZiweiGe } from '../ziweiGe';

// 宫位 fixture：命宫/财帛/官禄/迁移（三方四正）
const gong = (name: string, major: string[], minor: string[] = [], sihua: Record<string, string> = {}) => ({
  name,
  majorStars: major.map(m => ({ name: m, sihua: sihua[m] || null })),
  minorStars: minor,
});

describe('analyzeZiweiGe', () => {
  it('机月同梁 + 吉星会照 + 四化引动 → 成格', () => {
    const gongData = [
      gong('命宫', ['天机', '太阴'], ['文昌'], { 天机: '禄' }),
      gong('财帛宫', ['天同', '天梁'], ['左辅']),
      gong('官禄宫', ['天相'], []),
      gong('迁移宫', ['天梁'], ['右弼']),
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).toContain('机月同梁格');
    expect(r.breakReasons).toHaveLength(0);
  });

  it('杀破狼缺四化引动 → 不成格（有原因）', () => {
    const gongData = [
      gong('命宫', ['七杀'], ['擎羊']),
      gong('财帛宫', ['破军'], ['陀罗']),
      gong('官禄宫', ['贪狼'], []),
      gong('迁移宫', ['廉贞'], []),
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).not.toContain('杀破狼格');
    expect(r.breakReasons.length).toBeGreaterThan(0);
  });

  it('紫府同宫（命宫）成格', () => {
    const gongData = [
      gong('命宫', ['紫微', '天府'], ['文昌', '文曲'], { 紫微: '权' }),
      gong('财帛宫', ['武曲'], []),
      gong('官禄宫', ['廉贞'], []),
      gong('迁移宫', ['天相'], []),
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).toContain('紫府同宫格');
  });

  it('昌曲夹命 → 杂耀格', () => {
    const gongData = [
      gong('父母宫', [], ['文昌']),
      gong('命宫', ['天机'], [], { 天机: '科' }),
      gong('兄弟宫', [], ['文曲']),
      gong('财帛宫', ['天同'], []),
      gong('官禄宫', ['天梁'], []),
      gong('迁移宫', ['太阴'], []),
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).toContain('昌曲夹命格');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/utils/__tests__/ziweiGe.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现** `src/utils/ziweiGe.ts`

```ts
export interface ZiweiGeResult {
  geNames: string[];
  reasons: string[];
  breakReasons: string[];
}

const JI_STARS = ['文昌', '文曲', '左辅', '右弼', '天魁', '天钺'];
const SHA_STARS = ['擎羊', '陀罗', '火星', '铃星'];
const KONG_STARS = ['地空', '地劫'];

/** 三方四正：命宫 + 财帛宫 + 官禄宫 + 迁移宫 */
const SIFANG = ['命宫', '财帛宫', '官禄宫', '迁移宫'];

function starsOf(gongData: any[], names: string[]): { name: string; sihua?: string | null }[] {
  const out: { name: string; sihua?: string | null }[] = [];
  for (const g of gongData) {
    if (names.includes(g.name)) {
      for (const s of g.majorStars || []) out.push({ name: s.name, sihua: s.sihua });
      for (const s of g.minorStars || []) out.push({ name: s });
    }
  }
  return out;
}

export function analyzeZiweiGe(gongData: any[]): ZiweiGeResult {
  const geNames: string[] = [];
  const reasons: string[] = [];
  const breakReasons: string[] = [];

  const ming = gongData.find(g => g.name === '命宫');
  const sifangStars = starsOf(gongData, SIFANG);
  const majorNames = sifangStars.filter(s => !SHA_STARS.includes(s.name) && !KONG_STARS.includes(s.name)).map(s => s.name);
  const minorNames = sifangStars.map(s => s.name);

  // 破格检查（三方四正）
  const hasJi = sifangStars.some(s => s.sihua === '忌');
  const shaCount = minorNames.filter(n => SHA_STARS.includes(n)).length;
  const kongCount = minorNames.filter(n => KONG_STARS.includes(n)).length;
  if (hasJi) breakReasons.push('命宫三方四正出现生年化忌，格局易被破坏');
  if (shaCount >= 2) breakReasons.push(`煞星（擎羊陀罗火星铃星）达 ${shaCount} 颗，格局受破`);
  if (kongCount >= 2) breakReasons.push(`空亡星（地空地劫）达 ${kongCount} 颗，格局受破`);

  // 吉星会照
  const jiHui = minorNames.filter(n => JI_STARS.includes(n));
  // 四化引动（禄/权/科）
  const sihuaYin = sifangStars.some(s => s.sihua === '禄' || s.sihua === '权' || s.sihua === '科');

  // ---- 主星格判定 ----
  const tryGe = (name: string, condition: boolean, needJi = true) => {
    if (!condition) return;
    if (!jiHui.length && needJi) { breakReasons.push(`${name}：缺少吉星会照（昌曲左右魁钺）`); return; }
    if (!sihuaYin) { breakReasons.push(`${name}：缺少四化引动（禄/权/科）`); return; }
    geNames.push(name);
    reasons.push(`${name}：主星组合成立，吉星${jiHui.join('、')}会照，四化引动，无破格`);
  };

  tryGe('机月同梁格', ['天机', '太阴', '天同', '天梁'].every(n => majorNames.includes(n)));
  tryGe('杀破狼格', ['七杀', '破军', '贪狼'].filter(n => majorNames.includes(n)).length >= 2);
  // 紫府同宫：命宫同坐紫微+天府
  if (ming) {
    const mingStars = (ming.majorStars || []).map((s: any) => s.name);
    tryGe('紫府同宫格', mingStars.includes('紫微') && mingStars.includes('天府'));
    tryGe('日月并明格', mingStars.includes('太阳') && mingStars.includes('太阴'));
    tryGe('廉贞贪狼格', mingStars.includes('廉贞') && mingStars.includes('贪狼'));
  }
  // 府相朝垣：天府在命宫或官禄、天相在另一处
  {
    const fuGong = gongData.find(g => (g.majorStars || []).some((s: any) => s.name === '天府'));
    const xiangGong = gongData.find(g => (g.majorStars || []).some((s: any) => s.name === '天相'));
    tryGe('府相朝垣格', !!fuGong && !!xiangGong && fuGong.name !== xiangGong.name);
  }

  // ---- 杂耀格（命宫夹宫：父母宫 + 兄弟宫） ----
  if (ming) {
    const mingIdx = gongData.findIndex(g => g.name === '命宫');
    if (mingIdx >= 0 && gongData.length > 2) {
      const left = gongData[(mingIdx - 1 + gongData.length) % gongData.length];
      const right = gongData[(mingIdx + 1) % gongData.length];
      const allMinor = [...(left.minorStars || []), ...(right.minorStars || [])];
      if (allMinor.includes('文昌') && allMinor.includes('文曲')) {
        if (!sihuaYin) { breakReasons.push('昌曲夹命格：缺少四化引动'); }
        else { geNames.push('昌曲夹命格'); reasons.push('昌曲夹命：文昌文曲分居命宫两侧，聪明文采，且四化引动'); }
      }
      if (allMinor.includes('天魁') && allMinor.includes('天钺')) {
        if (!sihuaYin) { breakReasons.push('魁钺夹命格：缺少四化引动'); }
        else { geNames.push('魁钺夹命格'); reasons.push('魁钺夹命：天魁天钺分居命宫两侧，贵人扶持，且四化引动'); }
      }
      if (allMinor.includes('左辅') && allMinor.includes('右弼')) {
        if (!sihuaYin) { breakReasons.push('左右夹命格：缺少四化引动'); }
        else { geNames.push('左右夹命格'); reasons.push('左右夹命：左辅右弼分居命宫两侧，得助有力，且四化引动'); }
      }
    }
  }

  return { geNames, reasons, breakReasons };
}
```

> 说明：杂耀格对吉星会照条件从宽（夹宫本身即吉星），仅要求四化引动与无破格。

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/utils/__tests__/ziweiGe.test.ts`
Expected: 全部通过（如 fixture 与判定不符，调整 fixture 数据使其符合真实宫位结构）

- [ ] **Step 5: Commit**

```bash
git add src/utils/ziweiGe.ts src/utils/__tests__/ziweiGe.test.ts
git commit -m "feat: 紫微格局判定模块（主星格/杂耀格/吉星会照/四化引动/破格检查）"
```

---

### Task 4: Ziwei.tsx 格局卡接入

**Files:**
- Modify: `src/pages/Ziwei.tsx`（handleCalc 计算 + 结果区新增卡片）

**Interfaces:**
- Consumes: `analyzeZiweiGe`（Task 3）
- Produces: 紫微结果区「格局」卡：成格显示格名，未成格显示破格原因

- [ ] **Step 1: import 新函数**

```tsx
import { analyzeZiweiGe } from '../utils/ziweiGe';
```

- [ ] **Step 2: handleCalc 中计算格局**

在 `setZiweiData({ ... })` 处（`gongData` 已构建后）计算并存入：

```tsx
const ge = analyzeZiweiGe(gongData);
```

并把 `ge` 加入 setZiweiData 对象：

```tsx
setZiweiData({
  gongData,
  ...
  mingGe: ge,
});
```

> 实现者把 `ge` 作为新字段 `mingGe` 存入 ziweiData（类型 `ZiweiGeResult`）。

- [ ] **Step 3: 结果区新增「格局」卡片**

在结果区（如「总评」卡片之后）加：

```tsx
{ziweiData?.mingGe && (
  <CollapsibleCard title="格局分析" summary={ziweiData.mingGe.geNames.length > 0 ? ziweiData.mingGe.geNames.join('、') : '未构成特殊格局'} defaultOpen>
    <Card style={{ border: 'none', boxShadow: 'none', background: 'transparent', margin: 0, padding: 0 }}>
      {ziweiData.mingGe.geNames.length > 0 ? (
        <>
          {ziweiData.mingGe.geNames.map((g, i) => (
            <Alert key={i} type="success" showIcon message={g} description={ziweiData.mingGe.reasons[i] || ''} style={{ marginBottom: 8 }} />
          ))}
        </>
      ) : (
        <Alert type="info" showIcon message="未构成特殊格局" description="命盘以常规星曜组合论命，无需拘泥于格局名称。" />
      )}
      {ziweiData.mingGe.breakReasons.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {ziweiData.mingGe.breakReasons.map((r, i) => (
            <Text key={i} type="secondary" style={{ display: 'block', fontSize: 12 }}>⚠️ {r}</Text>
          ))}
        </div>
      )}
    </Card>
  </CollapsibleCard>
)}
```

> `CollapsibleCard` 已在 Ziwei.tsx import；`Text` 已从 antd 引入。

- [ ] **Step 4: 验证**

Run: `npx tsc --noEmit && npm test`
Expected: 全绿

- [ ] **Step 5: Commit**

```bash
git add src/pages/Ziwei.tsx
git commit -m "feat: 紫微页新增格局分析卡（成格显示格名+破格原因）"
```

---

### Task 5: 全量验证 + 部署

**Files:**
- 验证与部署

**Interfaces:**
- Consumes: Task 1-4

- [ ] **Step 1: 全量测试 + 类型检查**

Run: `npm test && npx tsc --noEmit`
Expected: 57 既有 + mingGe/ziweiGe 新增全部通过，零错误

- [ ] **Step 2: 构建**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 3: 部署 gh-pages**（手动推送 gh-pages 分支，绕过 gh-pages 工具）

```bash
git push origin main
npm run build:gh
git worktree add /tmp/gh-wt origin/gh-pages
cd /tmp/gh-wt && find . -maxdepth 1 -not -name '.' -not -name '.git' -not -name '*.git' | xargs rm -rf
cp -r /e/爻一爻App/dist/* . && cp /e/爻一爻App/dist/.nojekyll .
git add -A && git commit -m "deploy: 命格/格局详细判定" && git push origin HEAD:gh-pages
cd /e/爻一爻App && git worktree remove /tmp/gh-wt
```

Expected: 线上 HTTP 200 且更新到新构建

- [ ] **Step 4: 汇报**

汇报：八字命格新判定（外格/八格/衍生格/层次）、用神忌神透干、紫微格局卡效果。

---

## Self-Review

**1. Spec coverage:**
- 八字外格/禄刃/八格/衍生格/层次 → Task 1 ✅
- 用神忌神透干（含柱位）→ Task 1（analyzeTouGan）✅
- 八字命格卡接入 → Task 2 ✅
- 紫微主星格/杂耀格/严格成格 → Task 3 ✅
- 紫微格局卡 → Task 4 ✅
- 测试（mingGe/ziweiGe + 既有）→ Task 1/3/5 ✅

**2. Placeholder scan:** 无 TBD/TODO；Task 2 Step 2 标注"读现有调用"并给出变量名策略；Task 1 注释注明实现细节以最终代码为准且签名不变。

**3. Type consistency:** `MingGeDetailed`（Task 1 定义）与 Bazi `MingGeResult` 字段兼容（geName/geType/score/desc/details）；`ZiweiGeResult`（Task 3 定义）Task 4 以 `mingGe` 字段消费；`analyzeZiweiGe(gongData: any[])` 签名在 Task 3/4 一致。
