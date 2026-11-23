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

### 已知遗留（低优先，未处理）

- **`utils/renderWithTerms.tsx`** 引 `components/TermPopover`：
  渲染层工具坐在判据层。架构测试里已豁免并注明，迁出后应删豁免。

## 四、可复跑

```bash
npx vitest run src/utils/__tests__/chartIntegrity.test.ts
npx vitest run src/utils/__tests__/hepanSymmetry.test.ts
npx vitest run src/utils/__tests__/pageJudgement.test.ts
npx vitest run src/__tests__/architecture.test.ts
```

这四组是"结构性"测试：它们不检查具体某张盘的结论，而是检查
**结论之间的关系**。改判据时它们最可能先红——这正是它们存在的意义。
