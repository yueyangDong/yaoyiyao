# 逻辑审计（2026-11）

> 本文记录**这一轮实际查过什么、怎么查的、结论是什么**。
> 规则与不变量写在 `docs/architecture.md`；本文只记一次性的事实与判断，
> 不重复抄规则。可复跑的审计在 `src/utils/__tests__/chartIntegrity.test.ts`
> 与 `hepanSymmetry.test.ts`。

## 一、审计方法

不复用被测代码的判断，而是按定义另算一遍再对账。原因很直接：
取柱时把某柱的天干/藏干错位、把 mine/partner 写反、阈值抄错一位，
这些错误**都不会抛异常**，只会算出一张看起来正常的错盘。
唯一的验证方式是「独立实现 + 大量样本 + 断言不变量」。

三类检查：

1. **定义级对账**：十神按「日主五行 × 阴阳」独立实现，逐柱比对；
   五行生克用独立表比对。
2. **不变量**：用神∩忌神=∅、合盘分数对称、总分=逐项和、档位单调、
   神煞名必须在登记表内。
3. **边界**：立春换年、节气换月、晚子时两派、真太阳时跨日、农历闰月、
   起运前的童限段。

样本：确定性伪随机（固定 seed）120 盘 + 60 对合盘，避免 flaky。

## 二、结论：判据层未发现计算错误

以下全部通过（`chartIntegrity.test.ts` 13 条 + `hepanSymmetry.test.ts` 4 条）：

| 检查项 | 结果 |
|---|---|
| 四柱干支自洽、藏干合法、纳音非空 | 120 盘通过 |
| 天干十神 vs 独立实现 | 120 盘 × 4 柱一致 |
| 地支藏干十神 vs 独立实现 | 80 盘一致 |
| 用神 ∩ 忌神 | 150 盘，恒为空 |
| 立春换年（1990-01-20 己巳 / 02-20 庚午） | 正确 |
| 节气换月（丑月→寅月） | 正确 |
| 晚子时 23:30 两派日柱可切、非子时不分歧 | 正确 |
| 真太阳时 dayOffset 推到次日 | 正确 |
| 农历闰四月 vs 平四月 | 正确 |
| 大运：阳男/阳女/阴男/阴女 四种顺逆 + 干支连推 + 年龄连续 | 正确 |
| 神煞名均在 `SHENSHA_PLAIN` | 60 盘通过 |
| 合盘总分对称、逐项对称、0–200、档位单调 | 40+25+30+60 对通过 |
| 同一输入重复计算一致（无状态泄漏） | 20 盘通过 |

**值得记的两个易错点**（都已写成断言）：

- `EightChar ↔ Lunar` 是**循环引用**，`JSON.stringify(PersonChart)` 会抛
  "Converting circular structure to JSON"。要比较两张盘得显式投影字段。
- 大运 `dayunStepsOf` 返回 **11 段**（第 1 段是起运前童限，干支为 `'—'`），
  不是 10。按 10 断言会失败；按 11 断言时要跳过第 1 段。

## 三、发现的问题

### 已修

1. **`pages/Liuyao.tsx` 自带一份五行生克判据**
   （原 274–286 行）。页面就地定义 `WX_SHENG`/`WX_KE`，判断世应生克并生成白话，
   而 `liuyaoReading.analyzeProbe` 里另有一份同样逻辑、负责计分。
   两份可以给出相反印象：页面写「外部环境在滋养你」，计分把这条算成扣分。
   → 抽出唯一出口 `liuyaoReading.shiYingRelationOf(chart)`，
   计分只取 `weight`、页面只取 `rel/plain`。权重表逐字保持原值
   （应生世 +1、应克世 −2、世生应 −1、世克应/比和 0），**未改动分数分布**。

2. **`pages/Ziwei.tsx` 自带星曜吉凶判据**
   （原 67–98 行）。页面私有的 `JI_STARS`/`XIONG_STARS` 与阈值 ±2/−1，
   而 `ziweiGe.ts` 另有一套 `JI_STARS`（只收辅星、供格局用）。
   两套同名不同义，后人极易拿错。
   → 下沉为 `utils/ziweiPalaceScore.palaceScoreOf`，常量加 `PALACE_` 前缀区分，
   并在注释里写明它**不是** `verdictOf` 那把尺子。判据逐行照搬，未改阈值。

3. **`PillarData` 层次倒置**（见 `architecture.md`，commit `8aded115`）。

### 已按「全部整改」处理（2026-11-23）

1. **`ProfileDrawer` / `UserModal` 不可达 → 已删除**
   `Layout` 里没有入口能打开它们（全仓只有 `setDrawerOpen(false)`），
   功能由 `pages/Profile.tsx` 的编辑/创建档案表单承担。
   连带收益：`Layout` 不再需要为它们调 `Form.useForm()`，
   antd `Form` + `rc-field-form` 随页面走 → 首屏 index **240 → 223 KB gzip**（实测 −17.4 KB）。

2. **大六壬「随机起课」月将随机 → 已改为只抽占时**
   `buildRandomKe` 不再传 `jiangZhi`，月将由 `buildKe` 按该日期的中气取。
   理由：月将是太阳所在星次，是天文事实，不是可选项；它决定四课旺衰与应期落季，
   抽错等于拿冬天的旺衰断夏天的事，而应期层又用当日日干推日子——同一盘里两套时间基准打架且不报错。
   页面文案同步改为「只随机抽占时……月将仍按今天的中气取，所以盘面自洽」。
   新增 3 条测试：40 次抽取月将恒定、占时确实随机、随机课与正时起课同占时下盘面一致。

3. **`ziweiGe` 总闸 → 复核为「早已修完」，不改代码**
   原记录把**修复前**的诊断（67.8% 无格局）当成了待办。实测 3024 盘：
   **有格率 64.3%**（无格 35.7%），25 个格全有命中、无死格。
   已把分布固化成 `ziweiGeDistribution.test.ts`（有格率 40%~90%、格种 ≥18、
   高频格不为零、稀有格至少命中一种），并把复核结论写进 `docs/ziwei-ge-audit.md` §九。
   这一条的正确整改动作不是改判据，而是**把过期的记忆改对，并让分布可测**。

### 第二轮：按模块深挖（2026-11-23）

范围：已覆盖排盘/合盘/神煞/紫微格局/占卜四板块之后，剩余两个未系统审过的模块——
**大运流年的语气与分档**、**紫微十二宫的宫位判据**。

两者的共同点是：**失效方式不是报错，而是静默**。前者是同一条规定散落在多个出口、
各出口单测都能过；后者是少一个宫、少走一个分支都不影响页面渲染。

#### 11.1 晚年语气：两个出口漏了年龄

`dayunReading` 与 `baziDomainDeep` 早就按 60 岁分档（60+ 禁提事业/晋升/创业/KPI/副业/
扩张/合伙人），但**结论卡 `plainConclusion` 完全没有年龄参数**——对 68 岁的人照样输出
「同辈是你的杠杆」「这十年宜主动出手」。

修法：
- `BaziConclusionInput` 新增 `nominalAge`（与 `dayunReading.toNominalAge` 同口径的**虚岁**），
  `part3` 的五组动作句与「用神上/不在用神」两句按 `LATE_AGE=60` 分档。
- 不传时退回「按大运区间中点推定」——那只是兜底：**一步运跨过 60**（例：58~67 岁）
  会被整体判成晚年，49 岁的人会被判成中年后段，所以 `Bazi.tsx` 必须把虚岁传进去。
- `baziDomainDeep.ageClause` 的 60+ career 句去掉「往上走」。新守卫用统一词表扫三个
  出口，它分不清「否定式引用」和「鼓励式使用」；与其为一句开例外（守卫一脆就没人维护），
  不如改写句子。

守卫 `utils/__tests__/lateStageWording.test.ts`（6 条）的关键设计：
- **词表分两级**：`HARD`（晋升/创业/融资/KPI/副业/扩张/合伙人/往上走…）在所有出口禁用；
  `SOFT`（事业/人脉）只在「该怎么做」的语境禁用，领域导航语境**必须放行**——
  career 段标题本身就叫「事业格局的发动机」。对领域解读套 SOFT 词表是**判错**而非更严。
- **年龄隔离**：固定大运干支与起止年龄，只改 `nominalAge`。第一版同时改了
  `startAge/endAge`，「30 岁 vs 68 岁文案不同」的差异全部来自正文打印的年龄数字，
  是**假通过**。
- 分档范围：career / health 的「眼下这步运」随年龄变；love / family / social /
  personality 必须**不变**（多改反而是错）。

#### 11.2 紫微十二宫：空宫有两条出口，「缺一条」和「走错一条」要分开判

`ziweiPalaceDistribution.test.ts` 首版断言「空宫的首段标题必须含『空宫借对宫论』」
——**红了 5 个宫**，标题都是「这个宫位的底色」。

查清后确认是**断言写错**，不是判据错：空宫有两条合法出口。
`generatePalaceDeepReading` 先调 `generateSihuaDeepReading`，宫内有**辅星**带生年四化
或自化（文昌/文曲/左辅/右弼 常见）就直接返回，根本到不了空宫分支。

实测分布（240 盘 × 12 宫 = 2880 宫）：

| | 数量 | 占比 | 出口 |
|---|---|---|---|
| 空宫 | 474 | 16.5% | — |
| ├ 有辅星四化 | 36 | 1.3% | `ziweiSihuaDeep`（正文讲那颗辅星的四化） |
| └ 无四化 | 438 | 15.2% | 本模块空宫分支，**100% 命中借对宫**，「空而无借」0 次 |

空宫率 16.5% 与 `hepan.ts` 里 1728 组实测的 16% 同口径，互相印证。
那 36 个宫不提借宫**不是缺口**：宫位卡片（`Ziwei.tsx`「空宫·借对宫论」小字）
与命宫解读已各标一次。断言因此改为只钉**会静默退化**的那条分支，
并把两条出口的占比都锚住——**缺任何一条就是分支塌了**。

同一测试顺带补了一条通用守卫：**正文不得含 `undefined` / `NaN` / `[object Object]`**。
`GONG_DOMAIN` / `STAR_NATURE` / `GONG_JI_PAIN` 都按名字索引，宫名少个「宫」、星名换个别名，
查不到就是 `undefined` 拼进正文，页面照常渲染、单测也不报——只有扫全文才抓得到。

### 已知遗留

- ~~**`utils/renderWithTerms.tsx`** 引 `components/TermPopover`：渲染层工具坐在判据层。~~
  **已处理（2026-11-23）**：整体迁到 `components/renderWithTerms.tsx`（测试同步迁到
  `components/__tests__/renderWithTerms.test.tsx`），三个页面改引用路径，
  `architecture.test.ts` 里的 `ALLOW` 豁免**连机制一起删掉**。
  纯函数（术语表与匹配）仍留在 `utils/termDictionary.ts`，判据层依旧不碰 React。

- **空宫借宫有两套独立实现**：`ziweiPalaceDeep.OPPOSITE` 与 `ziweiAnalysis` 的借宫逻辑
  各维护一张对宫表。目前一致，但没有测试守住「两表必须同源」。
  真要动的话，收敛到一个出口比加断言更划算（`hepan.ts` 的 `zwPalaceStarsBorrow` 是第三份）。

## 四、可复跑

```bash
npx vitest run src/utils/__tests__/chartIntegrity.test.ts
npx vitest run src/utils/__tests__/hepanSymmetry.test.ts
npx vitest run src/utils/__tests__/pageJudgement.test.ts
npx vitest run src/__tests__/architecture.test.ts
npx vitest run src/utils/__tests__/lateStageWording.test.ts
npx vitest run src/utils/__tests__/ziweiPalaceDistribution.test.ts
```

这六组是"结构性"测试：它们不检查具体某张盘的结论，而是检查
**结论之间的关系**与**跨盘分布**。改判据时它们最可能先红——这正是它们存在的意义。
