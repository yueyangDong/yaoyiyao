import { describe, it, expect } from 'vitest';
import { GONG_ORDER, OPPOSITE_OF, TRIANGLE_OF } from '../ziweiPalaceRelations';
import { BIRTH_SIHUA_PALACE, SELF_SIHUA_PALACE, PALACE_NAMES } from '../ziweiSihuaPalaceContent';

/**
 * 紫微十二宫的空间关系：唯一真源的守卫。
 *
 * 背景：对宫此前有**三份**（hepan / ziweiAnalysis / ziweiPalaceDeep），十二宫顺序在四个
 * 生产文件里各抄一遍，三合有两份。三份表在 240 盘上恰好一致，**没有任何测试会红**——
 * 于是「改错一处」不会报错，只会让空宫借宫、命无正邪合盘、宫位深度解读各说各话。
 *
 * 这里刻意**不拿表比表**（那只是把副本换个地方放），而是用「十二宫布局」这个原始事实
 * 反推：对宫相隔 6 位、三合相隔 4 位。表若被人手改成别的值，这里立刻能算出差在哪。
 */

const IDX = (name: string) => GONG_ORDER.indexOf(name as (typeof GONG_ORDER)[number]);

describe('紫微十二宫空间关系：唯一真源', () => {
  it('布局本身：十二宫、无重复、命宫居首', () => {
    expect(GONG_ORDER.length).toBe(12);
    expect(new Set(GONG_ORDER).size, '十二宫里有重复宫名').toBe(12);
    expect(GONG_ORDER[0]).toBe('命宫');
  });

  it('布局的**顺序**必须钉死：它是所有推导的根', () => {
    // ⚠️ 这条不能省。对宫由 GONG_ORDER 推导，三合的集合校验也是从 GONG_ORDER 算的——
    // 一旦有人在布局上「换个方向排」（比如改成逆时针），推导和对宫会一起变，
    // 上面那条"相隔 6 位"永远为真，而全站每一张盘的借宫与三方四正都会错。
    // 三合的顺序 pin 会先红，但根因在这里，所以把根也钉住。
    expect([...GONG_ORDER]).toEqual([
      '命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄',
      '迁移', '交友', '官禄', '田宅', '福德', '父母',
    ]);
  });

  it('对宫 = 布局上相隔 6 位（由布局反推，不比表）', () => {
    for (const name of GONG_ORDER) {
      const opp = OPPOSITE_OF[name];
      expect(opp, `${name} 没有对宫`).toBeTruthy();
      expect(IDX(opp), `${name} 的对宫应是 ${GONG_ORDER[(IDX(name) + 6) % 12]}，实际是 ${opp}`)
        .toBe((IDX(name) + 6) % 12);
      // 对宫的对宫必须是自己：单向写错（只改一半）会让借宫方向不一致
      expect(OPPOSITE_OF[opp], `${name} ↔ ${opp} 不是互指`).toBe(name);
      expect(opp, `${name} 不能以自己为对宫`).not.toBe(name);
    }
    expect(Object.keys(OPPOSITE_OF).length).toBe(12);
  });

  it('三合 = 布局上相隔 4 位（查集合，不查顺序）', () => {
    for (const name of GONG_ORDER) {
      const tri = TRIANGLE_OF[name];
      expect(tri, `${name} 没有三合`).toHaveLength(2);
      const expected = new Set([
        GONG_ORDER[(IDX(name) + 4) % 12],
        GONG_ORDER[(IDX(name) + 8) % 12],
      ]);
      expect(new Set(tri), `${name} 的三合应是 ${[...expected].join('、')}，实际是 ${tri.join('、')}`)
        .toEqual(expected);
      // 互指：B 在 A 的三合里，A 也必须在 B 的三合里
      for (const t of tri) {
        expect(TRIANGLE_OF[t], `${name} 的三合 ${t} 没有回指`).toContain(name);
      }
      // 对宫不是三合（三方四正 = 本宫 + 对宫 + 两个三合，混了就是判据错）
      expect(tri, `${name} 的三合里混进了对宫`).not.toContain(OPPOSITE_OF[name]);
      expect(tri, `${name} 的三合里混进了自己`).not.toContain(name);
    }
    expect(Object.keys(TRIANGLE_OF).length).toBe(12);
  });

  it('三合的顺序是文案契约：会被「，」连进正文，改动等于改用户可见输出', () => {
    // ⚠️ 这张 pin 表不是重复——它是**顺序契约**。上面的集合断言放得过「两个宫换了先后」，
    // 而 ziweiPalaceDeep 会把这两个宫名用「，」拼进解读正文。
    // 历史上各宫顺序并不统一（命宫 +8,+4；夫妻 +4,+8），所以不能按单一规则推导。
    const PINNED: Record<string, [string, string]> = {
      命宫: ['官禄', '财帛'], 兄弟: ['田宅', '疾厄'], 夫妻: ['迁移', '福德'],
      子女: ['交友', '父母'], 财帛: ['命宫', '官禄'], 疾厄: ['兄弟', '田宅'],
      迁移: ['夫妻', '福德'], 交友: ['子女', '父母'], 官禄: ['财帛', '命宫'],
      田宅: ['疾厄', '兄弟'], 福德: ['迁移', '夫妻'], 父母: ['子女', '交友'],
    };
    for (const name of GONG_ORDER) {
      expect(TRIANGLE_OF[name], `${name} 的三合顺序变了（用户可见文案会跟着变）`).toEqual(PINNED[name]);
    }
  });

  it('内容库覆盖全十二宫，且宫名清单与布局同源', () => {
    expect([...PALACE_NAMES]).toEqual([...GONG_ORDER]);
    const birth = Object.keys(BIRTH_SIHUA_PALACE).sort();
    const self = Object.keys(SELF_SIHUA_PALACE).sort();
    const expected = [...GONG_ORDER].sort();
    expect(birth, `生年四化落宫内容缺宫：${expected.filter((n) => !birth.includes(n)).join('、')}`)
      .toEqual(expected);
    expect(self, `自化落宫内容缺宫：${expected.filter((n) => !self.includes(n)).join('、')}`)
      .toEqual(expected);
  });
});
