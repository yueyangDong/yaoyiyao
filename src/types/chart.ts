/**
 * 命盘领域类型（纯数据，无任何运行时依赖）。
 *
 * 为什么单独放一个目录：
 *   这些类型原本定义在 `pages/Bazi.tsx` 里，于是 14 个**判据层**模块
 *   （personChart / mingGe / congGe / shenSha* / dayunReading / liunianInteraction …）
 *   全都写成 `import type { PillarData } from '../pages/Bazi'`。
 *   后果有三个：
 *     1) 层次倒置——纯计算依赖页面组件；
 *     2) 隐患——`import type` 编译后被擦除，一旦有人误写成 `import { PillarData }`，
 *        立刻形成 `utils ↔ pages` 循环依赖，Bazi.tsx 的模块级副作用会被提前执行；
 *     3) 复用受限——想脱离 React 跑判据（CLI / 批量标定 / 服务端）必须拖上整页。
 *   类型下沉到这里后，`utils` 与 `pages` 之间不再有边。
 *
 * ⚠️ 新增字段请同步 `pages/Bazi.tsx` 的 `toPillarData()` 与
 *    `utils/personChart.buildRawChart`（四柱的唯一出口）。
 */

/**
 * 一柱（年/月/日/时）的展示与判据数据。
 *
 * ⚠️ `pillar` 的值（'年柱' / '月柱' / '日柱' / '时柱'）被大量用作 Record key
 *    （`PILLAR_INDEX`、`shenShaByPillar`、领域宫位映射等），改值会静默失效。
 *    需要更细的语义请新增字段，不要改这个字段的值。
 */
export interface PillarData {
  pillar: string;
  ganZhi: string;
  tianGan: string;
  diZhi: string;
  cangGan: string[];
  shiShen: string;
  /** 地支十神 = 自坐X */
  shiShenZhi: string;
  nayin: string;
  /**
   * 时柱为推定值（用户不知出生时辰，按午时 12:00 排盘）。
   * 注意：pillar 字段的值必须保持 '时柱' 不变——baziAnalysis 的 PILLAR_INDEX、
   * shenShaByPillar 等大量以 pillar 名做等值比较，改值会静默失效。
   */
  unknown?: boolean;
}
