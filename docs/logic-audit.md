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

- ~~**空宫借宫有两套独立实现**：`ziweiPalaceDeep.OPPOSITE` 与 `ziweiAnalysis` 的借宫逻辑
  各维护一张对宫表。目前一致，但没有测试守住「两表必须同源」。~~
  **已处理（2026-11-23）**，见下节。

### 第三轮：把「三份抄本」收敛成一份（2026-11-23）

用户要求「修全部 bug」后做的一次系统性排查。当时 `tsc`、874 条测试全绿，所以问题只能是
**测试看不见的那类**。查下来有两类，都不是运行时错误：

#### 3.1 紫微十二宫的空间关系被抄了 4 份

| 表 | 副本数 | 位置 |
|---|---|---|
| 对宫（六冲） | **3** | `hepan.ZW_OPPOSITE_PALACE` / `ziweiAnalysis.OPPOSITE_MAP` / `ziweiPalaceDeep.OPPOSITE` |
| 十二宫顺序 | **4** | `ziweiAnalysis`（还是死代码）/ `ziweiPalaceDeep` / `ziweiSihuaDeep` / `ziweiSihuaPalaceContent.PALACE_NAMES` |
| 三合 | **2** | `ziweiAnalysis.TRIANGLE_MAP` / `ziweiPalaceDeep.TRIANGLE` |

三份表在 240 盘上恰好一致，所以**没有任何断言会红**——改错一处，空宫借宫（`hepan` 合盘）、
命无正曜解读（`ziweiAnalysis`）、宫位深度解读（`ziweiPalaceDeep`）会各说各话，页面照常渲染。

收敛到 `utils/ziweiPalaceRelations.ts`：
- `GONG_ORDER` = 唯一一份布局；`OPPOSITE_OF` **由布局推导**（相隔 6 位），单值映射没有顺序问题；
- `TRIANGLE_OF` **刻意保留字面量**：两个元素的先后由历史文案决定且各宫不统一
  （命宫是 `[官禄,财帛]`、夫妻是 `[迁移,福德]`），推导会静默改变三个宫的正文顺序。

守卫 `ziweiPalaceRelations.test.ts`（6 条）不拿表比表，而是用布局反推：
对宫 `index+6`、三合集合 `{+4,+8}`、对宫的对宫是自己、三合互指、对宫不在三合里、
三合顺序钉值（文案契约）、内容库覆盖全十二宫。另钉死 `GONG_ORDER` 的**顺序**——
它是一切推导的根，只钉「12 个且以命宫开头」的话，把布局改逆时针会全绿而全站借宫全错。

**反向验证**：故意把「命宫」的三合改错一个 → 2 条红；把对宫偏移改成 +5 →
「对宫应是迁移，实际是疾厄」红。守卫有效。

#### 3.2 页面层藏着一份重复的十二长生（且从未被渲染）

`Bazi.tsx` 自带 `DZ_ORDER + YANG_START/YIN_START + getChangSheng12`，与判据层的真源
`shenShaPower.changShengOf` 逐字等价；`useMemo` 算出来挂到 `changShengMap` 后，
**从 v1.0 起没有任何渲染入口引用它**（`git log -S` 只有一个初始提交，说明是出生即死）。

删除，并留注释指向真源。同类问题一并处理：页面层的 `SHISHEN_PLAIN`（十神白话，
`termDictionary` 已有覆盖）、`ziweiAnalysis` 的 `MINOR_STAR_DESC`（辅星描述库，无引用）。

#### 3.3 打开 `noUnusedLocals`：死代码不该靠人眼发现

上面的复制品之所以能活几个月，是因为 `tsconfig` 里 `noUnusedLocals: false`——
**没有任何机制会指出「这份表没人读」**。打开后一次暴露 **59 处**未使用声明，
逐类处理：无用导入 ~30、算完就丢的变量 ~12（如 `analyzeFamily` 里四个已废弃的五行量）、
无人调用的函数 5（`hasShenShaOnPillar` / `describePillarRelations` / `hasSpecificSihua` /
`extractSihua` / 测试里的 `themeOf`）、内容表 2。

`noUnusedParameters` 保持关闭：不少签名是为可读性保留的占位（如 `analyzeFamily` 的
`gender` 缺省时用不到），开它只会逼人写 `_x` 噪声。

**产物验证**：删完重构建，逐个 chunk 比对中文串多重集——**0 个新增句子**，
只有被删的表消失（`新独有 0`）。首屏 317,099 → **317,101 B**（+2 B），
说明这些死代码本来就被 tree-shake 掉了：删的是源码噪音，不是运行时负担。

> ⚠️ 比对脚本本身踩过一个坑：产物里有 3 个 `index-*.js`（24/288/717 kB），
> 按「去 hash 名」建 Map 会互相覆盖，比出来的「1748 条新独有」全是假的。
> 正确做法是分组后再按体积配对。

## 四、可复跑

```bash
npx vitest run src/utils/__tests__/chartIntegrity.test.ts
npx vitest run src/utils/__tests__/hepanSymmetry.test.ts
npx vitest run src/utils/__tests__/pageJudgement.test.ts
npx vitest run src/__tests__/architecture.test.ts
npx vitest run src/utils/__tests__/lateStageWording.test.ts
npx vitest run src/utils/__tests__/ziweiPalaceDistribution.test.ts
npx vitest run src/utils/__tests__/ziweiPalaceRelations.test.ts
```

这六组是"结构性"测试：它们不检查具体某张盘的结论，而是检查
**结论之间的关系**与**跨盘分布**。改判据时它们最可能先红——这正是它们存在的意义。
