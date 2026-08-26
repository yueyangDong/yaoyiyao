# 爻一爻 APK 化改造实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 将「爻一爻」命理应用完成解读通俗化、界面美化、性能优化与登录本地化改造，并打包为可安装的 Android debug APK。

**Architecture:** 在现有 React 18 + Vite 5 + TS + antd 5 + Capacitor 8 应用上增量改造：新增术语词典/结论生成器等纯函数模块（可单测），新增 TermPopover / PlainConclusionCard 展示组件，逐页接入结论卡；修复 Capacitor 构建 base 路径；移除未使用重依赖；最终 `gradlew assembleDebug` 产出 APK。

**Tech Stack:** React 18、Vite 5、TypeScript 5、antd 5、Capacitor 8、vitest（新增 devDependency）、lunar-typescript、@ziweijs/core

## Global Constraints

- **不动核心算法**：`src/utils/baziAnalysis.ts`、`src/utils/ziweiAnalysis.ts` 的导出函数签名（`analyzeDayMasterStrength` / `analyzeFortuneOverview` / `generateSummarizedReport` / `getAllPalacesReading` 等）不得修改；文案润色仅限页面展示模板（Bazi.tsx / Ziwei.tsx 内的 JSX 文案）
- **App 标识不变**：包名 `com.yaoyiyao.app`、应用名「爻一爻」、Capacitor 配置 `capacitor.config.ts` 不改
- **登录为可选**：游客必须能用全部功能，Supabase 登录仅作可选云同步，不得新增强制跳转 /auth
- **术语词典 ≥ 60 条**，每条含 `term` / `explain` / 可选 `analogy`
- **保留工作区未提交改动**（MobileBottomNav、CollapsibleCard、wechat-miniapp 等），不得丢弃或回滚
- **测试用 vitest**（仅 devDependencies）；纯函数模块必须有单测
- **环境**：Windows + bash（Git Bash）、node v24、npm 11；Android SDK 在 `%LOCALAPPDATA%\Android\Sdk`；JDK 17 需安装（Task 13）
- 提交信息用中文、按任务分次 commit

---

### Task 1: 接入 vitest 测试框架

**Files:**
- Modify: `package.json`（devDependencies + scripts）
- Create: `vitest.config.ts`
- Create: `src/utils/__tests__/smoke.test.ts`

**Interfaces:**
- Produces: `npm test` 命令（`vitest run`）

- [x] **Step 1: 安装 vitest**

```bash
npm install -D vitest
```

- [x] **Step 2: 创建 vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
  },
});
```

- [x] **Step 3: 冒烟测试** `src/utils/__tests__/smoke.test.ts`

```ts
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('vitest works', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [x] **Step 4: package.json scripts 添加**

```json
"test": "vitest run"
```

- [x] **Step 5: 运行验证**

Run: `npm test`
Expected: `1 passed`

- [x] **Step 6: Commit**

```bash
git add package.json vitest.config.ts src/utils/__tests__/smoke.test.ts
git commit -m "test: 接入 vitest 测试框架"
```

---

### Task 2: 术语词典 termDictionary.ts

**Files:**
- Create: `src/utils/termDictionary.ts`
- Test: `src/utils/__tests__/termDictionary.test.ts`

**Interfaces:**
- Produces:
  - `export interface TermEntry { term: string; explain: string; analogy?: string }`
  - `export const TERM_DICTIONARY: TermEntry[]`（≥60 条）
  - `export function findTermsInText(text: string): TermEntry[]` — 按术语长度降序匹配文本中的术语，去重，返回命中的词典条目（顺序按词典序）

- [x] **Step 1: 先写测试** `src/utils/__tests__/termDictionary.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { TERM_DICTIONARY, findTermsInText } from '../termDictionary';

describe('termDictionary', () => {
  it('has at least 60 entries, each with term and explain', () => {
    expect(TERM_DICTIONARY.length).toBeGreaterThanOrEqual(60);
    for (const e of TERM_DICTIONARY) {
      expect(e.term.length).toBeGreaterThan(0);
      expect(e.explain.length).toBeGreaterThan(0);
    }
  });

  it('findTermsInText returns matched entries', () => {
    const hits = findTermsInText('你是身强还是身弱？用神是火。');
    const terms = hits.map(h => h.term);
    expect(terms).toContain('身强');
    expect(terms).toContain('身弱');
    expect(terms).toContain('用神');
  });

  it('findTermsInText dedupes and prefers longer terms', () => {
    // 词典含「天乙贵人」和「贵人」时，文本出现「天乙贵人」只匹配长词
    const hits = findTermsInText('命带天乙贵人，一生有贵人相助。');
    const terms = hits.map(h => h.term);
    expect(terms.filter(t => t === '天乙贵人').length).toBe(1);
  });

  it('findTermsInText returns empty array for plain text', () => {
    expect(findTermsInText('今天天气不错')).toEqual([]);
  });
});
```

- [x] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/utils/__tests__/termDictionary.test.ts`
Expected: FAIL（模块不存在）

- [x] **Step 3: 实现 termDictionary.ts**

```ts
export interface TermEntry {
  term: string;
  explain: string;
  analogy?: string;
}

// 命理高频术语词典：term=术语，explain=一句话人话解释，analogy=可选生活化类比
export const TERM_DICTIONARY: TermEntry[] = [
  { term: '日主', explain: '出生那一天的天干，代表你自己', analogy: '好比你的「本命角色」' },
  { term: '四柱', explain: '年柱、月柱、日柱、时柱，合称八字', analogy: '四个时间坐标拼出你的命盘' },
  { term: '身强', explain: '日主力量旺盛，扛得住克泄，性格通常自信有主见', analogy: '像一棵根深的大树，风吹不倒' },
  { term: '身弱', explain: '日主力量偏弱，需要帮扶，性格通常温和、依赖环境', analogy: '像小树苗，需要阳光雨露' },
  { term: '中和', explain: '日主强弱平衡，是比较理想的命局状态', analogy: '像一杯不浓不淡的茶，刚刚好' },
  { term: '用神', explain: '对你命局最有利的五行，是调和的「药」', analogy: '像身体的补药，用对了就顺' },
  { term: '喜神', explain: '与用神同阵营、同样有帮助的五行', analogy: '用神的好帮手' },
  { term: '忌神', explain: '对你命局不利的五行，要尽量避开', analogy: '像不适合你的食物，少吃为妙' },
  { term: '十神', explain: '八字中代表六亲与人事关系的十种称谓（正官、七杀、正财等）', analogy: '命理里的「人物关系表」' },
  { term: '正官', explain: '代表约束、规则与贵人，也代表事业与名声', analogy: '像单位的领导，管着你也在提拔你' },
  { term: '七杀', explain: '代表压力、竞争与魄力，也是「偏官」', analogy: '像严厉的教官，压力大但练出真本事' },
  { term: '正财', explain: '代表稳定的收入与正当钱财，也代表妻子（男命）', analogy: '像每月到账的工资' },
  { term: '偏财', explain: '代表意外之财、投资与大方人缘', analogy: '像捡到红包或投资收益' },
  { term: '食神', explain: '代表才华、口福与享受，性格乐观', analogy: '像天生的美食家和艺术家' },
  { term: '伤官', explain: '代表聪明叛逆、表达欲强，也主才华外露', analogy: '像口才好的辩论手，爱表现' },
  { term: '比肩', explain: '代表同辈、朋友与自己，也代表竞争', analogy: '像和你并肩的同学同事' },
  { term: '劫财', explain: '代表争夺、合伙，也代表行动力强', analogy: '像抢球的人，有冲劲也有竞争' },
  { term: '正印', explain: '代表母亲、文凭、靠山与庇护', analogy: '像家里长辈的关爱' },
  { term: '偏印', explain: '代表偏门学问、直觉与孤独感', analogy: '像冷门高手，想法独特' },
  { term: '桃花', explain: '代表异性缘与魅力，也指感情机遇', analogy: '像人群中的吸引力光环' },
  { term: '驿马', explain: '代表走动、出差、迁移与变动', analogy: '像脚下生风，适合往外闯' },
  { term: '文昌', explain: '代表学业、文书与聪明才智', analogy: '像读书考试的好运星' },
  { term: '天乙贵人', explain: '最有力的贵人星，遇事有人帮', analogy: '像关键时刻总有人拉你一把' },
  { term: '羊刃', explain: '极旺的劫财，性格刚烈冲动，也主魄力', analogy: '像一把双刃剑，能成事也易伤人' },
  { term: '空亡', explain: '某柱落空，主该柱所代表的人事易有「落空感」', analogy: '像约好了人却临时爽约' },
  { term: '纳音', explain: '干支组合对应的五行音律称谓，如「海中金」', analogy: '像给每个年份起的小名' },
  { term: '大运', explain: '每十年一换的人生运势阶段', analogy: '像人生的「季节」，十年一个气候' },
  { term: '流年', explain: '每一年的运势，也称太岁', analogy: '像每年翻一页的天气预报' },
  { term: '起运', explain: '从几岁开始走第一步大运', analogy: '像赛跑的发令枪响' },
  { term: '月令', explain: '出生月份的地支，是八字里力量最大的位置', analogy: '像皇帝坐镇的朝廷' },
  { term: '得令', explain: '日主在月令得到生扶，力量增强', analogy: '像正赶上好时节' },
  { term: '失令', explain: '日主在月令被克泄，力量减弱', analogy: '像逆风而行' },
  { term: '天干', explain: '甲乙丙丁戊己庚辛壬癸，共十个，代表天之气', analogy: '像天空的十个符号' },
  { term: '地支', explain: '子丑寅卯辰巳午未申酉戌亥，共十二个，代表地之气', analogy: '像大地的十二个坐标' },
  { term: '干支', explain: '天干地支合称，干支相配共六十个组合', analogy: '像年月日的「编号系统」' },
  { term: '五行', explain: '金木水火土，相生相克，是命理的底层逻辑', analogy: '像五种能量，互相推动也互相制约' },
  { term: '相生', explain: '五行之间相互滋养的关系（木生火、火生土、土生金、金生水、水生木）', analogy: '像接力赛，一环传一环' },
  { term: '相克', explain: '五行之间相互制约的关系（木克土、土克水、水克火、火克金、金克木）', analogy: '像石头压住草，互相管束' },
  { term: '格局', explain: '八字整体呈现的典型结构，如正官格、七杀格', analogy: '像一个人的「职业画像」' },
  { term: '从格', explain: '日主极弱而顺从旺势的格局', analogy: '像小船顺着大流走' },
  { term: '化格', explain: '天干五合而化的特殊格局', analogy: '像两种材料融合成新物质' },
  { term: '合', explain: '干支之间相互吸引、结合的关系', analogy: '像磁铁相吸' },
  { term: '冲', explain: '地支之间正对面的冲突关系', analogy: '像针尖对麦芒' },
  { term: '刑', explain: '地支之间相互伤害的关系', analogy: '像摩擦起火的隐患' },
  { term: '害', explain: '地支之间暗中损耗的关系', analogy: '像背后捅刀子的小人' },
  { term: '藏干', explain: '地支里暗藏的五行天干', analogy: '像抽屉里藏着的小物件' },
  { term: '透干', explain: '藏干出现在天干上，力量显现', analogy: '像藏的东西终于摆到台面上' },
  { term: '通根', explain: '天干在地支有同类的根，力量扎实', analogy: '像大树扎了根' },
  { term: '墓库', explain: '辰戌丑未四库，主收藏与积蓄', analogy: '像仓库，收放都有讲究' },
  { term: '长生', explain: '十二长生之一，主新生与起步', analogy: '像刚发芽的种子' },
  { term: '帝旺', explain: '十二长生之一，主最鼎盛的状态', analogy: '像正午的太阳' },
  { term: '墓', explain: '十二长生之一，主收藏收敛', analogy: '像果实归仓' },
  { term: '绝', explain: '十二长生之一，主绝处逢生的转折点', analogy: '像冬天，之后就是春天' },
  { term: '胎', explain: '十二长生之一，主孕育与萌芽', analogy: '像还在娘胎里的宝宝' },
  { term: '养', explain: '十二长生之一，主休养准备', analogy: '像充电待机' },
  { term: '命宫', explain: '紫微斗数里代表你一生的「总司令部」', analogy: '像房子的主梁' },
  { term: '身宫', explain: '紫微斗数里代表后天努力与成就的宫位', analogy: '像后天装修的风格' },
  { term: '三方四正', explain: '命宫及对宫、三合宫的总称，看事情要看全局', analogy: '像看一个人要看他的朋友圈' },
  { term: '四化', explain: '化禄、化权、化科、化忌，代表吉凶变化的四种力量', analogy: '像四季轮换的天气系统' },
  { term: '化禄', explain: '主财禄与福气，是四化中最吉的', analogy: '像天上掉馅饼' },
  { term: '化权', explain: '主权力与掌控力', analogy: '像拿到指挥棒' },
  { term: '化科', explain: '主名声与考试运', analogy: '像被点名表扬' },
  { term: '化忌', explain: '主烦恼与阻碍，是四化中最需要留意的', analogy: '像走路踩到水坑' },
  { term: '紫微星', explain: '十四主星之首，帝王之星，主尊贵与领导力', analogy: '像天上的皇帝' },
  { term: '天府星', explain: '南斗主星，库星，主稳重与聚财', analogy: '像大管家，守得住家业' },
  { term: '七杀星', explain: '将军之星，主魄力与闯劲', analogy: '像冲锋陷阵的将军' },
  { term: '破军星', explain: '先锋之星，主破旧立新', analogy: '像拆迁队，拆了才能建' },
  { term: '贪狼星', explain: '欲望之星，主才华、交际与桃花', analogy: '像交际花，多才多艺' },
  { term: '天机星', explain: '智慧之星，主谋略与变动', analogy: '像军师，点子多' },
  { term: '太阴星', explain: '月亮之星，主温柔、内敛与财富', analogy: '像月光，柔和而持久' },
  { term: '太阳星', explain: '光明之星，主热情、付出与名声', analogy: '像阳光，照亮别人' },
  { term: '武曲星', explain: '财星，主刚毅与实干', analogy: '像将军理财，硬气又务实' },
  { term: '天同星', explain: '福星，主安逸与好命', analogy: '像躺赢的福气宝宝' },
  { term: '廉贞星', explain: '次桃花星，主才华与是非', analogy: '像带刺的玫瑰' },
  { term: '天相星', explain: '辅佐之星，主稳重与协调', analogy: '像得力的秘书' },
  { term: '巨门星', explain: '口舌之星，主口才与是非', analogy: '像广播喇叭，能说会道' },
  { term: '禄存星', explain: '财星，主稳定财源', analogy: '像稳稳的存款' },
  { term: '左辅右弼', explain: '贵人辅星，主助力与朋友', analogy: '像左右手，帮忙的人多' },
  { term: '文昌文曲', explain: '文星，主才华与考试', analogy: '像学霸光环' },
  { term: '天魁天钺', explain: '贵人星，主机遇与提携', analogy: '像天上掉下来的伯乐' },
  { term: '铃星', explain: '煞星之一，主突发状况', analogy: '像半夜响起的闹铃' },
  { term: '火星', explain: '煞星之一，主急躁与爆发', analogy: '像一点就着的炮仗' },
  { term: '地空', explain: '空亡之星，主波折与失落感', analogy: '像计划落空' },
  { term: '地劫', explain: '劫难之星，主损失与破财', analogy: '像钱袋破了个洞' },
  { term: '本卦', explain: '起卦得到的最初之卦，代表事情现状', analogy: '像事情现在的照片' },
  { term: '变卦', explain: '动爻变化后得到的卦，代表事情的结果走向', analogy: '像事情未来的照片' },
  { term: '互卦', explain: '本卦中间四爻重组之卦，代表事情中间过程', analogy: '像事情的发展过程' },
  { term: '动爻', explain: '卦中发生变化的那一爻，是断卦的关键', analogy: '像钥匙孔，转动就有变化' },
  { term: '静卦', explain: '没有动爻的卦，主事情维持现状', analogy: '像一潭静水' },
  { term: '世爻', explain: '代表你自己的一爻', analogy: '像棋盘上代表你的那颗子' },
  { term: '应爻', explain: '代表对方或所问之事的一爻', analogy: '像棋盘上代表对方的那颗子' },
  { term: '卦辞', explain: '整个卦的总体判断文字', analogy: '像故事的标题和梗概' },
  { term: '爻辞', explain: '每一爻的具体判断文字', analogy: '像故事每一章的剧情' },
  { term: '六亲', explain: '六爻中以五行生克定出的父母、兄弟、子孙、妻财、官鬼', analogy: '像卦里的家庭成员' },
  { term: '用神', explain: '六爻占卜中所问之事的代表爻', analogy: '像查案时的关键线索' },
  { term: '太岁', explain: '当年的地支，也指流年运势', analogy: '像当年的「年度主题」' },
  { term: '刑冲合害', explain: '地支之间的四种作用关系，吉凶由此推断', analogy: '像人际间的亲密、冲突与暗算' },
  { term: '合婚', explain: '看两人八字是否相配', analogy: '像给两个人做「适配度测试」' },
  { term: '断语', explain: '命理师下的判断结论', analogy: '像医生的诊断结论' },
  { term: '喜用', explain: '喜神与用神合称，对你有利的五行', analogy: '像对你口味的好菜' },
  { term: '忌仇', explain: '忌神与仇神合称，对你不利的五行', analogy: '像你过敏的食物' },
  { term: '流月', explain: '每个月的运势', analogy: '像按月更新的天气预报' },
];

// 按术语长度降序匹配（长词优先，避免「天乙贵人」被拆成「贵人」）
export function findTermsInText(text: string): TermEntry[] {
  const sorted = [...TERM_DICTIONARY].sort((a, b) => b.term.length - a.term.length);
  const found: TermEntry[] = [];
  const seen = new Set<string>();
  for (const entry of sorted) {
    if (seen.has(entry.term)) continue;
    if (text.includes(entry.term)) {
      found.push(entry);
      seen.add(entry.term);
    }
  }
  return found;
}
```

- [x] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/utils/__tests__/termDictionary.test.ts`
Expected: `4 passed`（词典条数 ≥60 已由测试断言，若不足需补足）

- [x] **Step 5: Commit**

```bash
git add src/utils/termDictionary.ts src/utils/__tests__/termDictionary.test.ts
git commit -m "feat: 命理术语词典（100+条）+ findTermsInText 匹配函数"
```

---

### Task 3: 术语高亮渲染 renderWithTerms + TermPopover 组件

**Files:**
- Create: `src/utils/renderWithTerms.tsx`
- Create: `src/components/TermPopover.tsx`
- Test: `src/utils/__tests__/renderWithTerms.test.tsx`

**Interfaces:**
- Consumes: `findTermsInText(text)` from Task 2
- Produces:
  - `export function renderWithTerms(text: string): React.ReactNode` — 将文本中命中的术语替换为 `<TermTag>` 内联组件（含 Popover 人话解释），其余文字原样输出；未命中术语时返回原文本
  - `TermTag` 内部组件（不导出）
  - 样式类名：`.term-tag`（点线底 + 问号），由 Task 10 统一在 `src/index.css` 定义，本任务内联兜底样式亦可

- [x] **Step 1: 先写测试** `src/utils/__tests__/renderWithTerms.test.tsx`

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { renderWithTerms } from '../renderWithTerms';

describe('renderWithTerms', () => {
  it('wraps known terms and keeps plain text', () => {
    const { container } = render(<div>{renderWithTerms('你的日主偏强，用神为火。')}</div>);
    expect(container.querySelectorAll('.term-tag').length).toBeGreaterThanOrEqual(2);
    expect(container.textContent).toContain('你的');
    expect(container.textContent).toContain('偏强');
  });

  it('returns plain text when no terms matched', () => {
    const { container } = render(<div>{renderWithTerms('今天天气不错')}</div>);
    expect(container.querySelectorAll('.term-tag').length).toBe(0);
    expect(container.textContent).toBe('今天天气不错');
  });

  it('handles empty string', () => {
    const { container } = render(<div>{renderWithTerms('')}</div>);
    expect(container.textContent).toBe('');
  });
});
```

- [x] **Step 2: 安装 @testing-library/react + jsdom**

```bash
npm install -D @testing-library/react @testing-library/jest-dom jsdom
```

- [x] **Step 3: 修改 vitest.config.ts 支持 jsdom**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    environmentMatchGlobs: [['src/**/*.test.tsx', 'jsdom']],
  },
});
```

- [x] **Step 4: 运行测试确认失败**

Run: `npx vitest run src/utils/__tests__/renderWithTerms.test.tsx`
Expected: FAIL（模块不存在）

- [x] **Step 5: 实现 renderWithTerms.tsx**

```tsx
import React from 'react';
import { findTermsInText } from './termDictionary';
import TermPopover from '../components/TermPopover';

/**
 * 将文本中的命理术语替换为带「人话解释」气泡的高亮标签。
 * 匹配逻辑：按术语长度降序（长词优先），命中处跳过避免重复匹配。
 */
export function renderWithTerms(text: string): React.ReactNode {
  if (!text) return text;
  const matches = findTermsInText(text);
  if (matches.length === 0) return text;

  // 收集命中位置（长词优先已由 findTermsInText 保证顺序）
  const ranges: Array<{ start: number; end: number; entry: (typeof matches)[number] }> = [];
  let cursor = 0;
  const sorted = [...matches].sort((a, b) => b.term.length - a.term.length);
  for (const entry of sorted) {
    let idx = text.indexOf(entry.term, cursor);
    while (idx !== -1) {
      // 跳过与已收录区间重叠的位置
      const overlapped = ranges.some(r => idx < r.end && idx + entry.term.length > r.start);
      if (!overlapped) {
        ranges.push({ start: idx, end: idx + entry.term.length, entry });
        break;
      }
      idx = text.indexOf(entry.term, idx + 1);
    }
  }
  ranges.sort((a, b) => a.start - b.start);

  const nodes: React.ReactNode[] = [];
  let pos = 0;
  ranges.forEach((r, i) => {
    if (r.start > pos) nodes.push(text.slice(pos, r.start));
    nodes.push(
      <TermPopover key={i} entry={r.entry}>
        {text.slice(r.start, r.end)}
      </TermPopover>
    );
    pos = r.end;
  });
  if (pos < text.length) nodes.push(text.slice(pos));
  return nodes;
}
```

- [x] **Step 6: 实现 TermPopover.tsx**

```tsx
import React from 'react';
import { Popover, Typography } from 'antd';
import type { TermEntry } from '../utils/termDictionary';

const { Text, Paragraph } = Typography;

interface Props {
  entry: TermEntry;
  children: React.ReactNode;
}

export default function TermPopover({ entry, children }: Props) {
  return (
    <Popover
      content={
        <div style={{ maxWidth: 260 }}>
          <Text strong style={{ fontSize: 14 }}>{entry.term}</Text>
          <Paragraph style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-body)' }}>
            {entry.explain}
          </Paragraph>
          {entry.analogy && (
            <Paragraph style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
              💡 {entry.analogy}
            </Paragraph>
          )}
        </div>
      }
      placement="top"
    >
      <span
        className="term-tag"
        style={{
          borderBottom: '1.5px dotted var(--module-gold)',
          cursor: 'help',
          color: 'inherit',
          padding: '0 1px',
        }}
      >
        {children}⁇
      </span>
    </Popover>
  );
}
```

- [x] **Step 7: 运行测试确认通过**

Run: `npx vitest run src/utils/__tests__/renderWithTerms.test.tsx`
Expected: `3 passed`

- [x] **Step 8: 手动验证**（可选，快速 dev server 目测高亮与气泡）

```bash
npm run dev
```

- [x] **Step 9: Commit**

```bash
git add src/utils/renderWithTerms.tsx src/components/TermPopover.tsx src/utils/__tests__/renderWithTerms.test.tsx vitest.config.ts package.json
git commit -m "feat: 术语高亮渲染 + TermPopover 人话解释气泡"
```

---

### Task 4: 白话结论生成器 plainConclusion.ts

**Files:**
- Create: `src/utils/plainConclusion.ts`
- Test: `src/utils/__tests__/plainConclusion.test.ts`

**Interfaces:**
- Produces:
  - `export interface BaziConclusionInput { dayGan: string; dayWx: string; level: string; yongShen: string[]; xiShen: string[]; wxStrongest: string; wxWeakest: string; dayunFirst: string | null; }`
  - `export function generateBaziPlainConclusion(input: BaziConclusionInput): string` — 返回 2-3 句大白话（含术语，供 renderWithTerms 二次渲染）
  - `export function generateZiweiPlainConclusion(overall: string, highlight: string | null): string`
  - `export interface LiuyaoConclusion { verdict: '宜守' | '有变' | '大动'; text: string; }`
  - `export function generateLiuyaoPlainConclusion(guaName: string, dongYaoCount: number, hasZhiGua: boolean): LiuyaoConclusion`
  - `export function generateDailyPlainConclusion(jiShen: string[], xiongSha: string[], weatherDesc: string | null, temp: number | null): string`

- [x] **Step 1: 先写测试** `src/utils/__tests__/plainConclusion.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import {
  generateBaziPlainConclusion,
  generateZiweiPlainConclusion,
  generateLiuyaoPlainConclusion,
  generateDailyPlainConclusion,
} from '../plainConclusion';

describe('plainConclusion', () => {
  it('bazi: 身强命含用神与五行倾向', () => {
    const text = generateBaziPlainConclusion({
      dayGan: '庚', dayWx: '金', level: '身强',
      yongShen: ['火'], xiShen: ['木'],
      wxStrongest: '金', wxWeakest: '火',
      dayunFirst: '丙午',
    });
    expect(text).toContain('庚金');
    expect(text).toContain('身强');
    expect(text).toContain('火');
    expect(text.length).toBeGreaterThan(30);
  });

  it('bazi: 身弱命强调帮扶', () => {
    const text = generateBaziPlainConclusion({
      dayGan: '甲', dayWx: '木', level: '身弱',
      yongShen: ['水'], xiShen: ['木'],
      wxStrongest: '土', wxWeakest: '水',
      dayunFirst: null,
    });
    expect(text).toContain('身弱');
    expect(text).toContain('水');
  });

  it('ziwei: 基于总评与亮点', () => {
    const text = generateZiweiPlainConclusion('整体运势稳中有升，事业有贵人相助。', '命宫紫微坐守');
    expect(text).toContain('紫微');
    expect(text.length).toBeGreaterThan(20);
  });

  it('liuyao: 静卦宜守', () => {
    const c = generateLiuyaoPlainConclusion('乾为天', 0, false);
    expect(c.verdict).toBe('宜守');
    expect(c.text).toContain('乾为天');
  });

  it('liuyao: 多动爻大动', () => {
    const c = generateLiuyaoPlainConclusion('水雷屯', 3, true);
    expect(c.verdict).toBe('大动');
  });

  it('daily: 综合宜忌与天气', () => {
    const text = generateDailyPlainConclusion(['宜嫁娶', '宜出行'], ['忌动土'], '晴', 26);
    expect(text).toContain('晴');
    expect(text).toContain('26');
  });
});
```

- [x] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/utils/__tests__/plainConclusion.test.ts`
Expected: FAIL（模块不存在）

- [x] **Step 3: 实现 plainConclusion.ts**

```ts
// ========== 白话结论生成器 ==========
// 原则：结论先行、口语化、保留专业术语供 renderWithTerms 二次高亮

export interface BaziConclusionInput {
  dayGan: string;
  dayWx: string;
  level: string;          // '身强' | '身弱' | '中和' | '身极强' | '身极弱'
  yongShen: string[];     // 用神五行列表
  xiShen: string[];       // 喜神五行列表
  wxStrongest: string;    // 命局最强五行
  wxWeakest: string;      // 命局最弱五行
  dayunFirst: string | null; // 第一步大运干支
}

const STRENGTH_TRAIT: Record<string, string> = {
  '身极强': '能量非常旺盛，天生的领导者，但容易听不进别人意见',
  '身强': '底子厚、扛得住事，性格自信有主见',
  '中和': '五行平衡，性格稳当，遇事不慌',
  '身弱': '心思细腻、依赖环境，适合借力而行',
  '身极弱': '能量偏弱，更依赖贵人帮扶，切勿硬扛',
};

export function generateBaziPlainConclusion(input: BaziConclusionInput): string {
  const { dayGan, dayWx, level, yongShen, xiShen, wxStrongest, wxWeakest, dayunFirst } = input;
  const trait = STRENGTH_TRAIT[level] || STRENGTH_TRAIT['中和'];
  const yongText = [...yongShen, ...xiShen].filter(Boolean).join('、') || '五行平衡';
  const dayunText = dayunFirst ? `下一步大运是「${dayunFirst}」，运势会进入新阶段，值得期待。` : '';
  return (
    `你是「${dayGan}${dayWx}」命，八字属「${level}」——${trait}。` +
    `命局${wxStrongest}最旺、${wxWeakest}最弱，用神取「${yongText}」：` +
    `多亲近${yongText}属性的人事物（颜色、方位、行业），对你最有助力。${dayunText}`
  );
}

export function generateZiweiPlainConclusion(overall: string, highlight: string | null): string {
  const first = overall.split(/[。！!]/)[0] || overall;
  const hl = highlight ? `其中最亮眼的是：${highlight}。` : '';
  return `一句话总结你的命盘：${first}。${hl}记住，命盘是地图，路还是自己走。`;
}

export interface LiuyaoConclusion {
  verdict: '宜守' | '有变' | '大动';
  text: string;
}

export function generateLiuyaoPlainConclusion(
  guaName: string,
  dongYaoCount: number,
  hasZhiGua: boolean,
): LiuyaoConclusion {
  if (dongYaoCount === 0) {
    return {
      verdict: '宜守',
      text: `你起得「${guaName}」，卦象安静无动爻——事情短期内不会大变，现在不是冲动出手的时候，稳住现状、把手里的事做扎实就是最好的选择。`,
    };
  }
  if (dongYaoCount <= 2) {
    return {
      verdict: '有变',
      text: `你起得「${guaName}」，卦中有${dongYaoCount}个动爻${hasZhiGua ? '，且已变出新的卦象' : ''}——事情正在起变化，方向还不明朗，但转机已经在酝酿。近期多留意身边的新机会，顺势而为。`,
    };
  }
  return {
    verdict: '大动',
    text: `你起得「${guaName}」，卦中${dongYaoCount}个动爻齐动，是根本性的变化之象——这件事会迎来大转折，旧局面守不住了。与其抗拒变化，不如主动拥抱：把能控制的准备做好，剩下的交给时间。`,
  };
}

export function generateDailyPlainConclusion(
  jiShen: string[],
  xiongSha: string[],
  weatherDesc: string | null,
  temp: number | null,
): string {
  const parts: string[] = [];
  parts.push(`今天${weatherDesc ? `天气${weatherDesc}` : '天气平稳'}${temp !== null ? `（${temp}°C）` : ''}。`);
  if (jiShen.length > 0) parts.push(`宜：${jiShen.slice(0, 3).join('、')}。`);
  if (xiongSha.length > 0) parts.push(`忌：${xiongSha.slice(0, 3).join('、')}。`);
  parts.push('顺天应时，今天适合按黄历提示安排重要事情。');
  return parts.join('');
}
```

- [x] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/utils/__tests__/plainConclusion.test.ts`
Expected: `6 passed`

- [x] **Step 5: Commit**

```bash
git add src/utils/plainConclusion.ts src/utils/__tests__/plainConclusion.test.ts
git commit -m "feat: 八字/紫微/六爻/每日运势白话结论生成器"
```

---

### Task 5: PlainConclusionCard 通用结论卡组件

**Files:**
- Create: `src/components/PlainConclusionCard.tsx`

**Interfaces:**
- Consumes: `renderWithTerms` from Task 3
- Produces:
  - `export default function PlainConclusionCard(props: { title?: string; icon?: React.ReactNode; children: React.ReactNode; tone?: 'default' | 'good' | 'warn' }): JSX.Element`
  - 渲染：渐变底卡片 + 标题（默认「一句话结论」）+ 正文（children 原样传入；调用方决定是否包 renderWithTerms）

- [x] **Step 1: 实现组件**

```tsx
import React from 'react';

interface Props {
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  tone?: 'default' | 'good' | 'warn';
}

const TONE_STYLE: Record<string, React.CSSProperties> = {
  default: { background: 'linear-gradient(135deg, #FFF9EC 0%, #F7F0DC 100%)', borderColor: 'var(--module-gold)' },
  good: { background: 'linear-gradient(135deg, #F0FAF3 0%, #E3F1E8 100%)', borderColor: '#52A56B' },
  warn: { background: 'linear-gradient(135deg, #FDF0EC 0%, #F9E3DA 100%)', borderColor: '#C96A4B' },
};

export default function PlainConclusionCard({ title = '一句话结论', icon, children, tone = 'default' }: Props) {
  const style = TONE_STYLE[tone];
  return (
    <div
      className="plain-conclusion-card"
      style={{
        ...style,
        border: `1px solid ${style.borderColor}`,
        borderRadius: 16,
        padding: '16px 18px',
        marginBottom: 16,
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
      </div>
      <div style={{ fontSize: 15, lineHeight: 1.9, color: 'var(--text-body)' }}>{children}</div>
    </div>
  );
}
```

- [x] **Step 2: 手动验证**

```bash
npm run dev
```

临时在任意页面渲染 `<PlainConclusionCard>测试</PlainConclusionCard>` 目测样式，验证后移除临时代码。

- [x] **Step 3: Commit**

```bash
git add src/components/PlainConclusionCard.tsx
git commit -m "feat: PlainConclusionCard 通用白话结论卡组件"
```

---

### Task 6: 八字页接入结论卡 + 文案润色

**Files:**
- Modify: `src/pages/Bazi.tsx`（排盘结果区顶部插入结论卡；十神解释文案结论先行）

**Interfaces:**
- Consumes: `generateBaziPlainConclusion`（Task 4）、`PlainConclusionCard`（Task 5）、`renderWithTerms`（Task 3）
- 现有数据（已确认存在）：`baziData.dayGan`、`baziData.dayWx`、`strengthAnalysis.level`、`yongShenRec.yongShen: string[]`、`yongShenRec.xiShen: string[]`、`wxStats`（`Record<string, {count:number; level:string; desc:string}>`）、`baziData.dayun.steps[0].ganZhi`

- [x] **Step 1: 添加结论生成 useMemo**

在 `Bazi.tsx` 的 `dayunInterpretations` useMemo 之后添加：

```tsx
const plainConclusion = useMemo(() => {
  if (!baziData || !strengthAnalysis || !yongShenRec) return null;
  const wxs = Object.entries(wxStats || {}).sort((a, b) => b[1].count - a[1].count);
  const wxStrongest = wxs[0]?.[0] || '';
  const wxWeakest = wxs[wxs.length - 1]?.[0] || '';
  const dayunFirst = baziData.dayun.steps[0]?.ganZhi || null;
  return generateBaziPlainConclusion({
    dayGan: baziData.dayGan,
    dayWx: baziData.dayWx,
    level: strengthAnalysis.level,
    yongShen: yongShenRec.yongShen,
    xiShen: yongShenRec.xiShen,
    wxStrongest,
    wxWeakest,
    dayunFirst,
  });
}, [baziData, strengthAnalysis, yongShenRec, wxStats]);
```

- [x] **Step 2: 在排盘结果区顶部渲染结论卡**

在 `Bazi.tsx` 排盘结果（`{baziData && (...)}` 区块）最顶部（四柱卡片之前）插入：

```tsx
{plainConclusion && (
  <PlainConclusionCard icon="🔮" title="一句话看懂你的八字">
    {renderWithTerms(plainConclusion)}
  </PlainConclusionCard>
)}
```

同时确保 `import { generateBaziPlainConclusion } from '../utils/plainConclusion';`、`import PlainConclusionCard from '../components/PlainConclusionCard';`、`import { renderWithTerms } from '../utils/renderWithTerms';` 三个 import 已添加。

- [x] **Step 3: 文案润色（克制）**

定位 `Bazi.tsx` 中 `getShiShenComboAnalysis` 返回的十神组合解释文案（约第 507-534 行），把每条解释的句式统一为「**先给结论**，再补充理由」：
- 原句式「代表X，主Y」改为「**主Y**：代表X。……（保留原说明）」
- 仅调整字符串模板文字，不改函数签名与逻辑分支

示例：将 `'代表聪明叛逆、表达欲强，也主才华外露'` 这类文案调整为先说结论。

- [x] **Step 4: 构建验证**

Run: `npm run build`
Expected: `tsc` 无类型错误，构建成功

- [x] **Step 5: 手动验证**

```bash
npm run dev
```

输入出生信息排盘，确认结论卡出现在结果顶部、术语（身强/用神等）有下划线、点击弹解释。

- [x] **Step 6: Commit**

```bash
git add src/pages/Bazi.tsx
git commit -m "feat: 八字页一句话结论卡 + 十神文案结论先行润色"
```

---

### Task 7: 紫微页接入结论卡 + 总评润色

**Files:**
- Modify: `src/pages/Ziwei.tsx`

**Interfaces:**
- Consumes: `generateZiweiPlainConclusion`（Task 4）、`PlainConclusionCard`（Task 5）、`renderWithTerms`（Task 3）、`generateSummarizedReport`（`src/utils/ziweiAnalysis.ts`，已存在）
- 现有数据（已确认）：`ziweiData.mingGongName`、`ziweiData.shenGongName`、紫微排盘结果 `gongData`（`PalaceData[]`，含 `name`/`majorStars`）

- [x] **Step 1: 生成总评与结论**

在 `Ziwei.tsx` 中排盘成功后（设置 `ziweiData` 的地方附近），新增：

```tsx
const summarized = useMemo(() => {
  if (!ziweiData) return null;
  return generateSummarizedReport(ziweiData.gongData);
}, [ziweiData]);

const plainConclusion = useMemo(() => {
  if (!summarized) return null;
  const highlight = summarized.highlights[0] || null;
  return generateZiweiPlainConclusion(summarized.overall, highlight);
}, [summarized]);
```

> 注意：若 `ziweiData` 中盘面数据字段名与 `generateSummarizedReport` 入参 `PalaceData[]` 不一致，以 `normalizeAstrolabeData(astrolabe)` 的输出为准（该函数已存在，`src/utils/ziweiAnalysis.ts:988`）；实现时先确认 `gongData` 的来源与类型，必要时使用 `normalizeAstrolabeData`。

- [x] **Step 2: 渲染结论卡**

在 `Ziwei.tsx` 命盘总评区域（`summarized.overall` 展示处）上方插入：

```tsx
{plainConclusion && (
  <PlainConclusionCard icon="✨" title="一句话看懂你的命盘">
    {renderWithTerms(plainConclusion)}
  </PlainConclusionCard>
)}
```

- [x] **Step 3: 总评文案润色（克制）**

若 `generateSummarizedReport` 的 `overall` 首句不是结论句（以「整体」或「命主」开头），在页面展示处用 `summarized.overall.split(/[。！!]/)[0]` 加粗显示为首句结论，其余照旧展示。**不改 `ziweiAnalysis.ts` 导出函数签名**。

- [x] **Step 4: 构建验证**

Run: `npm run build`
Expected: 无类型错误

- [x] **Step 5: 手动验证**

```bash
npm run dev
```

排盘后确认结论卡在总评上方、术语可点击。

- [x] **Step 6: Commit**

```bash
git add src/pages/Ziwei.tsx
git commit -m "feat: 紫微页一句话结论卡 + 总评首句结论化"
```

---

### Task 8: 六爻页白话断卦卡

**Files:**
- Modify: `src/pages/Liuyao.tsx`

**Interfaces:**
- Consumes: `generateLiuyaoPlainConclusion`（Task 4）、`PlainConclusionCard`（Task 5）、`renderWithTerms`（Task 3）
- 现有数据（已确认）：`pan.benGua.guaName`、`pan.dongYaoCount`、`pan.zhiGua?.guaName`（可为 undefined）

- [x] **Step 1: 在起卦结果区顶部插入断卦卡**

在 `Liuyao.tsx` 中 `pan && (...)` 结果区块顶部（本卦卡片之前）插入：

```tsx
{pan && (() => {
  const con = generateLiuyaoPlainConclusion(
    pan.benGua.guaName,
    pan.dongYaoCount,
    !!pan.zhiGua && pan.zhiGua.guaName !== pan.benGua.guaName,
  );
  const tone = con.verdict === '宜守' ? 'default' : con.verdict === '有变' ? 'warn' : 'good';
  return (
    <PlainConclusionCard
      icon={con.verdict === '宜守' ? '🧘' : con.verdict === '有变' ? '🌊' : '🔥'}
      title={`白话断卦 · ${con.verdict}`}
      tone={tone}
    >
      {renderWithTerms(con.text)}
    </PlainConclusionCard>
  );
})()}
```

同时添加三个 import（`generateLiuyaoPlainConclusion`、`PlainConclusionCard`、`renderWithTerms`）。

- [x] **Step 2: 构建验证**

Run: `npm run build`
Expected: 无类型错误

- [x] **Step 3: 手动验证**

```bash
npm run dev
```

分别用「无动爻 / 1-2 动爻 / 3+ 动爻」起卦，确认断卦卡标题与文案随动爻数变化。

- [x] **Step 4: Commit**

```bash
git add src/pages/Liuyao.tsx
git commit -m "feat: 六爻白话断卦卡（宜守/有变/大动）"
```

---

### Task 9: 每日运势结论句

**Files:**
- Modify: `src/pages/DailyFortune.tsx`

**Interfaces:**
- Consumes: `generateDailyPlainConclusion`（Task 4）、`PlainConclusionCard`（Task 5）、`renderWithTerms`（Task 3）
- 现有数据（已确认）：`luckyGuide.jiShen: string[]`、`luckyGuide.xiongSha: string[]`、`weather?.weatherDesc`（经 `getWeatherDesc(weather.weatherCode)` 得到中文描述）、`weather?.temp: number | null`

- [x] **Step 1: 计算结论句**

在 `DailyFortune.tsx` 组件内（`travelAdvice` state 附近）新增：

```tsx
const dailyConclusion = useMemo(() => {
  const ji = luckyGuide.jiShen || [];
  const xiong = luckyGuide.xiongSha || [];
  const desc = weather ? getWeatherDesc(weather.weatherCode) : null;
  return generateDailyPlainConclusion(ji, xiong, desc, weather?.temp ?? null);
}, [luckyGuide, weather]);
```

> 若 `getWeatherDesc` 返回非中文或为空，`generateDailyPlainConclusion` 已有 `weatherDesc ? ... : '天气平稳'` 兜底，无需额外处理。

- [x] **Step 2: 渲染结论卡**

在页面顶部（天气卡片之后、幸运指南之前）插入：

```tsx
{dailyConclusion && (
  <PlainConclusionCard icon="☀️" title="今日一句话">
    {renderWithTerms(dailyConclusion)}
  </PlainConclusionCard>
)}
```

同时添加三个 import。

- [x] **Step 3: 构建验证 + 手动验证**

Run: `npm run build`（无类型错误）→ `npm run dev`（打开 /daily 确认结论卡在天气下方）

- [x] **Step 4: Commit**

```bash
git add src/pages/DailyFortune.tsx
git commit -m "feat: 每日运势一句话结论卡"
```

---

### Task 10: 界面美化（设计令牌 + 首页卡片 + 结论卡样式）

**Files:**
- Modify: `src/index.css`（设计令牌变量 + 术语标签/结论卡/首页卡片样式）
- Modify: `src/pages/Home.tsx`（卡片视觉升级 + 一句话简介）
- Modify: `src/components/Layout.tsx`（页面过渡动效，复用已有 framer-motion）

**Interfaces:**
- Consumes: 无（纯样式与结构）
- Produces: 全局 CSS 变量与类名：`.term-tag`、`.plain-conclusion-card`、`.home-module-card`（Home.tsx 已有类名，仅增强样式）

- [x] **Step 1: 检查并统一设计令牌**

确认 `src/index.css` 已有的 `:root` 变量（`--module-gold`、`--text-primary`、`--border-light` 等已被页面使用）。**只做增量补充**，不重命名现有变量：

```css
:root {
  /* 命理暖金主色 + 朱砂红点缀（增量补充） */
  --brand-gold: #B8860B;
  --brand-gold-soft: #E8D5A3;
  --brand-cinnabar: #B03A2E;
  --card-radius: 16px;
  --card-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}
```

- [x] **Step 2: 术语标签与结论卡样式**

```css
.term-tag {
  border-bottom: 1.5px dotted var(--module-gold);
  cursor: help;
  padding: 0 1px;
  transition: background-color 0.2s;
}
.term-tag:hover { background: rgba(232, 213, 163, 0.35); }

.plain-conclusion-card {
  animation: fadeUp 0.35s ease;
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
```

- [x] **Step 3: 首页模块卡片增强**

`src/pages/Home.tsx` 模块网格中 `className="home-module-card"` 的元素：
- 加 hover 上浮：`transition: transform 0.25s, box-shadow 0.25s;` + `:hover { transform: translateY(-3px); box-shadow: var(--card-shadow); }`
- 卡片圆角统一 `var(--card-radius)`
- 每张卡片副标题一行模块简介（如「八字排盘 — 看你天生的底牌」），从 `modules` 数组增加 `subtitle` 字段（数组在 Home.tsx 第 16-26 行附近）

- [x] **Step 4: 页面过渡动效（Layout.tsx）**

在 `Layout.tsx` 的路由出口处（`<Outlet />` 所在位置）包裹轻量淡入（framer-motion 已是依赖）：

```tsx
import { motion } from 'framer-motion';
// 在 Outlet 外层：
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
  <Outlet />
</motion.div>
```

> 若 Layout 内部已有类似动效实现，跳过本步，避免重复。

- [x] **Step 5: 构建验证 + 目测**

Run: `npm run build` → `npm run dev`，检查首页卡片、结论卡、术语标签、页面切换动效在移动端宽度（375px）下无错乱。

- [x] **Step 6: Commit**

```bash
git add src/index.css src/pages/Home.tsx src/components/Layout.tsx
git commit -m "style: 设计令牌统一 + 首页卡片升级 + 术语/结论卡样式 + 页面淡入动效"
```

---

### Task 11: 性能优化（移除未用依赖 + Capacitor base 修复 + 构建验证）

**Files:**
- Modify: `package.json`（移除未用依赖；`build:android` 脚本加 `--base=./`）
- Modify: `src/pages/Lingqian.tsx`（如确认 `canvas-confetti` 为唯一使用点则保留，不做修改；本任务只处理确认未使用的依赖）
- Test: 无（构建验证）

**Interfaces:**
- Produces: `npm run build:android` = `tsc && vite build --base=./ && npx cap sync android`（Capacitor 用相对路径，资源在 file:// 下可正常加载）

- [x] **Step 1: 确认未使用依赖**

Run: `npx vite build --mode=production` 前先静态确认：

```bash
grep -rn "from 'three'\|from 'three/\|react-three\|@tsparticles\|canvas-confetti" src/
```

预期：`src/` 下无 `three` / `@react-three/*` / `@tsparticles/*` 引用（此前已确认仅 `canvas-confetti` 在 Lingqian.tsx 命中）。若 Lingqian 确用 `canvas-confetti`，**保留**；其余未命中的依赖从 package.json 移除：

```bash
npm uninstall three @react-three/fiber @react-three/drei @tsparticles/react @tsparticles/slim
```

> ⚠️ 若 Step 1 的 grep 意外发现 `three` 等被引用（例如 Dream.tsx 动态 import），则**跳过卸载**并在 commit 信息中注明原因。

- [x] **Step 2: 修改 build:android 脚本**

`package.json` scripts：

```json
"build:android": "tsc && vite build --base=./ && npx cap sync android"
```

> `--base=./` 使 dist/index.html 的资源路径为相对路径（`./assets/...`），Capacitor WebView 以 `https://localhost` 或 `file://` 加载时均可正确解析。现有 `build`（gh-pages 用 `/yaoyiyao/`）与 `build:gh` 保持不变。

- [x] **Step 3: 构建并验证资源路径**

Run: `npm run build:android`
Expected:
- 构建成功
- `dist/index.html` 中 `<link>` / `<script>` 路径以 `./` 开头（不是 `/yaoyiyao/`）
- `android/app/src/main/assets/public/index.html` 同步更新

- [x] **Step 4: 验证未使用 chunk 消失**

Run: `ls dist/assets/`
Expected: 无 `three` 相关 chunk（卸载后）；主包 `index-*.js` 体积相比改造前下降

- [x] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "perf: 移除未使用重依赖 + Capacitor 构建 base 修复（相对路径）"
```

---

### Task 12: 登录本地化收尾（游客模式）

**Files:**
- Modify: `src/components/Layout.tsx`（第 241 行附近的「去登录」入口文案与行为）
- Modify: `src/pages/Profile.tsx`（第 193 行附近的「去登录」按钮）
- Modify: `src/components/ProfileDrawer.tsx`（如存在登录引导文案）

**Interfaces:**
- Consumes: 无新接口；`useAuth`（已存在）
- Produces: 游客可无障碍使用全部功能；登录入口明确标注为「可选云同步」

- [x] **Step 1: 检查是否存在强制登录跳转**

Run: `grep -rn "navigate('/auth'\|<Navigate\|RequireAuth\|redirect.*auth" src/`
Expected: 无路由守卫 / 强制跳转（此前确认仅 Layout 与 Profile 的「去登录」按钮入口）。若有守卫，改为不拦截。

- [x] **Step 2: 文案调整**

- `Layout.tsx:241`：`onClick={() => navigate('/auth')}` 的入口文案改为「登录云同步」（若原为「去登录」）
- `Profile.tsx:193`：按钮文案 `去登录` → `登录以云同步`，并在按钮旁加小字说明：`不登录也能用，数据存在本机；登录后自动备份到云端`
- `ProfileDrawer.tsx` 若有「请先登录」类提示，改为「游客模式 · 数据保存在本机」

- [x] **Step 3: 验证游客数据流**

Run: `npm run dev`
手动验证：不登录 → 排盘（八字）→ 结果写入 `localStorage`（DevTools Application 面板可见 `fortune_app_history`）→ 刷新页面历史仍在。此行为依赖 Task 6 已接入的排盘流程（`addHistory` 在无 authUser 时仅本地保存，`UserContext.tsx:334-351` 已确认）。

- [x] **Step 4: Commit**

```bash
git add src/components/Layout.tsx src/pages/Profile.tsx src/components/ProfileDrawer.tsx
git commit -m "feat: 游客模式收尾——登录改为可选云同步，不设门槛"
```

---

### Task 13: APK 打包交付

**Files:**
- Create: `爻一爻-debug.apk`（构建产物，复制到项目根目录）
- Modify: 无（如需临时环境变量，仅在本任务 shell 内生效）

**Interfaces:**
- Consumes: Task 11 的 `npm run build:android` 与已同步的 `android/` 工程

- [x] **Step 1: 安装 JDK 17**

优先 winget（用户级安装）：

```bash
winget install --id EclipseAdoptium.Temurin.17.JDK -e --accept-source-agreements --accept-package-agreements
```

若 winget 不可用或失败，下载便携版并解压（无需管理员权限）：

```bash
# 在项目外目录解压后设置 JAVA_HOME（示例路径，按实际调整）
mkdir -p /c/tools && cd /c/tools
curl -L -o temurin17.zip "https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse"
unzip -q temurin17.zip -d /c/tools
export JAVA_HOME="/c/tools/$(ls /c/tools | grep jdk-17 | head -1)"
export PATH="$JAVA_HOME/bin:$PATH"
```

- [x] **Step 2: 验证 Java**

Run: `java -version`
Expected: `openjdk version "17.x.x"`（若用 winget 安装，新开 shell 后通常自动可用；否则按上一步 export）

- [x] **Step 3: 构建并同步**

Run: `npm run build:android`
Expected: 构建成功，`android/app/src/main/assets/public/` 更新为最新产物

- [x] **Step 4: 配置 Android SDK 环境变量并打包**

```bash
export ANDROID_HOME="$LOCALAPPDATA/Android/Sdk"
cd android
./gradlew assembleDebug
```

Expected: `BUILD SUCCESSFUL`，产物 `android/app/build/outputs/apk/debug/app-debug.apk`

> 若 gradle 下载依赖缓慢或失败，重试一次；`gradle-wrapper.properties` 已存在无需改动。

- [x] **Step 5: 复制 APK 到项目根目录并验证**

```bash
cd /e/算命小程序
cp android/app/build/outputs/apk/debug/app-debug.apk 爻一爻-debug.apk
ls -lh 爻一爻-debug.apk
```

Expected: 文件存在，大小约 10-30MB

- [x] **Step 6: 记录安装说明**

在项目根目录创建 `APK安装说明.md`：

```markdown
# 爻一爻 APK 安装说明

1. 将 `爻一爻-debug.apk` 传到手机（微信/QQ/数据线均可）
2. 手机打开文件管理器点击安装
3. 如提示「未知来源」：设置 → 安全 → 允许安装未知应用（各机型路径略有不同）
4. 安装后打开「爻一爻」，无需登录即可使用全部功能；数据保存在本机
5. 登录后自动云同步（可选）
```

- [x] **Step 7: Commit**

```bash
git add APK安装说明.md
git commit -m "docs: APK 安装说明 + 交付 debug 包"
```

> ⚠️ `爻一爻-debug.apk` 体积较大，若仓库介意可加入 `.gitignore`（`爻一爻-debug.apk`），由用户自行拷贝。默认**不提交 APK 文件本身**，只提交说明文档。

---

## Self-Review

**1. Spec coverage:**
- 第 1 节解读通俗化：1a 结论卡 → Task 4/5/6/7/8/9；1b 术语词典 → Task 2/3；1c 文案润色 → Task 6 Step 3 / Task 7 Step 3 ✅
- 第 2 节界面美化 → Task 10 ✅
- 第 3 节性能优化 → Task 11 ✅
- 第 4 节登录本地化 → Task 12 ✅
- 第 5 节 APK 打包 → Task 13 ✅
- 验收标准（结论卡四页 / 词典≥60 / 游客可用 / 主题统一 / APK 可装）均有对应任务 ✅

**2. Placeholder scan:** 无 TBD/TODO；所有代码步骤含真实代码；Task 6/7/9 的接入点以已确认的现有变量名（`strengthAnalysis.level`、`yongShenRec.yongShen`、`pan.benGua.guaName`、`luckyGuide.jiShen` 等）为基准 ✅

**3. Type consistency:**
- `findTermsInText(text: string): TermEntry[]` 在 Task 2 定义、Task 3 消费 ✅
- `TermEntry { term; explain; analogy? }` 一致 ✅
- `generateBaziPlainConclusion(BaziConclusionInput): string` 在 Task 4 定义、Task 6 传入字段与 `BaziConclusionInput` 完全对应（dayGan/dayWx/level/yongShen/xiShen/wxStrongest/wxWeakest/dayunFirst）✅
- `generateLiuyaoPlainConclusion(guaName, dongYaoCount, hasZhiGua): LiuyaoConclusion` 在 Task 4 定义、Task 8 消费，`verdict` 三值 `'宜守'|'有变'|'大动'` 一致 ✅
- `generateZiweiPlainConclusion(overall, highlight)` / `generateDailyPlainConclusion(jiShen, xiongSha, weatherDesc, temp)` 消费端参数类型一致 ✅
- `PlainConclusionCard` props 在 Task 5 定义、Task 6/7/8/9 使用一致 ✅
- vitest 配置在 Task 1 建、Task 3 扩展（jsdom + tsx）✅
