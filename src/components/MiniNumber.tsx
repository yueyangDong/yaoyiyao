import { type ComponentProps, type FocusEvent } from 'react';
import { InputNumber } from 'antd';

/**
 * 生日类「数字小格」（年/月/日/时/分）统一控件。
 *
 * 两个坑都在这一个组件里收口，页面不要再各自写 InputNumber：
 *
 * 1）**关掉步进箭头**（`controls={false}`）。arrow 常驻右侧约 28px
 *    （`.ant-input-number-input-wrap` = wrap − 28），字段窄到 60px 以下时
 *    它就能把输入区挤成 0 字宽——框里看不见任何字符，用户报「无法输入」。
 *
 * 2）**聚焦即全选**。生日框常带预填值（时 12、分 0）。手机端点进去直接敲键，
 *    光标落在末尾 → rc-input-number 拿到的是**追加**结果（12 + "8" = "812"）。
 *    而它对越界值**不触发 onChange**（只更新显示），失焦才夹回上限（"812"→23）
 *    —— 用户敲进去的值被静默吞掉。聚焦全选后，"敲 8"= 8。
 *
 * ⚠️ 配套：承载它的 `Col` 不要写死 `span={4}` 这类窄值，用
 *    `flex="1 1 104px"`（见 Bazi / ChartCompare 的生日行）——容器宽度不随视口走
 *    （对比页两张卡并排后每张只有约 334px），按 xs/sm 断点给宽度会在
 *    「768px 视口 + 480px 容器」这类组合下失效。
 *
 * 为什么定 104px：一行能放几格由**容器**决定，不由视口决定，所以只能用「最低宽度 + 自动换行」。
 * 下限要同时满足两处最窄的行：对比页一行约 334px 要放得下 3 格（104×3=312 ≤ 334），
 * 八字页一行约 710px 要放得下 6 格（104×6=624 ≤ 710）。再大就会掉成 2 格一行 / 末格单独换行。
 * 换算：`Col` 是 border-box，gutter 又占掉 10px，故内层宽 = 104−10 = 94px，
 * antd InputNumber 再固定留 30px，input ≈ 64px（内容宽 42px，放得下「1998」）。
 */
export const MINI_NUMBER_MIN_WIDTH = '104px';

export function MiniNumber(props: ComponentProps<typeof InputNumber>) {
  const selectAllOnFocus = (e: FocusEvent<HTMLInputElement>) => e.currentTarget.select();
  return <InputNumber controls={false} onFocus={selectAllOnFocus} style={{ width: '100%' }} {...props} />;
}

export default MiniNumber;
