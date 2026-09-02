import { describe, it, expect } from 'vitest';
import { analyzeHePan, type HePanInput } from '../hepan';
import type { PillarData } from '../../pages/Bazi';

const mk = (tianGan: string, diZhi: string): PillarData => ({
  pillar: '年柱', ganZhi: tianGan + diZhi, tianGan, diZhi,
  cangGan: [], shiShen: '', shiShenZhi: '', nayin: '',
});

function input(over: Partial<HePanInput> = {}): HePanInput {
  const base = {
    mine: {
      pillars: [mk('壬', '子'), mk('癸', '丑'), mk('癸', '酉'), mk('壬', '戌')],
      dayWx: '水', zodiac: '鼠', nayin: '剑锋金', yongShen: ['木', '火'],
    },
    partner: {
      pillars: [mk('甲', '寅'), mk('乙', '卯'), mk('甲', '午'), mk('丙', '辰')],
      dayWx: '木', zodiac: '牛', nayin: '炉中火', yongShen: ['水', '金'],
    },
  };
  return { ...base, ...over } as HePanInput;
}

describe('analyzeHePan', () => {
  it('五行相生：水我 + 木对方 → 日主五行分高', () => {
    const r = analyzeHePan(input());
    const item = r.items.find(i => i.title.includes('日主'));
    expect(item).toBeTruthy();
    expect(item!.score).toBeGreaterThanOrEqual(14);
  });

  it('五行相克：水我 + 土对方 → 日主五行分低', () => {
    const r = analyzeHePan(input({ partner: { ...input().partner, dayWx: '土' } }));
    const item = r.items.find(i => i.title.includes('日主'));
    expect(item!.score).toBeLessThanOrEqual(10);
  });

  it('生肖六合（鼠牛）→ 满分；六冲（鼠马）→ 低分', () => {
    const he = analyzeHePan(input());
    const heItem = he.items.find(i => i.title.includes('生肖'));
    expect(heItem!.score).toBeGreaterThanOrEqual(16);

    const chong = analyzeHePan(input({ partner: { ...input().partner, zodiac: '马' } }));
    const chongItem = chong.items.find(i => i.title.includes('生肖'));
    expect(chongItem!.score).toBeLessThanOrEqual(8);
  });

  it('喜用神互补：对方日主=我方用神 → 满分', () => {
    // 我方用神含木，对方日主木
    const r = analyzeHePan(input());
    const item = r.items.find(i => i.title.includes('喜用'));
    expect(item!.score).toBe(20);
  });

  it('总分档位与 items 数量正确', () => {
    const r = analyzeHePan(input());
    expect(r.totalScore).toBeGreaterThanOrEqual(0);
    expect(r.totalScore).toBeLessThanOrEqual(100);
    expect(r.items.length).toBe(7); // 八字5项 + 紫微2项
    expect(['天作之合', '良缘', '平常', '需磨合']).toContain(r.level);
  });

  it('desc 由数据生成且非空（无固定模板）', () => {
    const a = analyzeHePan(input());
    const b = analyzeHePan(input({ partner: { ...input().partner, zodiac: '马', dayWx: '火' } }));
    expect(a.summary.length).toBeGreaterThan(0);
    expect(a.summary).not.toBe(b.summary);
  });

  // ========== 对称合盘 v2：交换不变性（男+女 vs 女+男）==========
  // 回归背景：v1 中"日主五行/纳音/喜用互补"单向打分，交换输入总分最多差 4~6 分。
  it('交换输入（男+女 vs 女+男）→ 总分、档位、各分项分数完全一致', () => {
    const ziweiA = [{ name: '命宫', majorStars: [{ name: '紫微' }, { name: '天府' }] }];
    const ziweiB = [{ name: '命宫', majorStars: [{ name: '太阳' }, { name: '天梁' }] }];
    const cases: HePanInput[] = [
      input(), // 相生：水(我) / 木(对方)
      input({ partner: { ...input().partner, dayWx: '土', nayin: '城头土' } }), // 相克：土克水
      input({ partner: { ...input().partner, dayWx: '水', nayin: '大海水' } }), // 比和：水/水
      input({ mine: { ...input().mine, ziwei: ziweiA }, partner: { ...input().partner, ziwei: ziweiB } }),
      input({ mine: { ...input().mine, yongShen: ['金', '土'] } }), // 喜用单向：对方木不补我、我水补对方
    ];
    for (const c of cases) {
      const r1 = analyzeHePan(c);
      const r2 = analyzeHePan({ mine: c.partner, partner: c.mine });
      expect(r2.totalScore).toBe(r1.totalScore);
      expect(r2.level).toBe(r1.level);
      expect(r2.items.map(i => i.score)).toEqual(r1.items.map(i => i.score));
    }
  });

  it('双视角随人走：交换输入后 perspectives 内容互换而非错乱', () => {
    // 给双方命名（真实应用中 buildPerson 会带"男方/女方"或用户昵称），
    // 视角文字以名字为主语，交换输入后应随"人"互换而非随"位置"错乱
    const c = input({
      mine: { ...input().mine, name: '甲' } as any,
      partner: { ...input().partner, name: '乙' } as any,
    });
    const r1 = analyzeHePan(c);
    const r2 = analyzeHePan({ mine: c.partner, partner: c.mine });
    expect(r2.perspectives!.mine).toBe(r1.perspectives!.partner);
    expect(r2.perspectives!.partner).toBe(r1.perspectives!.mine);
    expect(r2.perspectives!.mine).toContain('「乙」');
  });

  it('单向生克打分：我生对方与对方生我 → 分项均分一致（19 分）', () => {
    const shengForward = analyzeHePan(input()); // 水生木：我生对方
    const shengBackward = analyzeHePan({ mine: input().partner, partner: input().mine }); // 木见水：对方生我（视角反转）
    const f = shengForward.items.find(i => i.title.includes('日主'))!;
    const b = shengBackward.items.find(i => i.title.includes('日主'))!;
    expect(f.score).toBe(19); // (20 + 18) / 2
    expect(b.score).toBe(19);
  });

  it('相克对打分：克与被克 → 均分 7 分（v1 中被克方向曾误记 12 分）', () => {
    const r = analyzeHePan(input({ partner: { ...input().partner, dayWx: '土', nayin: '大林木' } }));
    const wxItem = r.items.find(i => i.title.includes('日主'))!;
    expect(wxItem.score).toBe(7); // 日主 土克水：(8 + 6) / 2
    const nyItem = r.items.find(i => i.title.includes('纳音'))!;
    expect(nyItem.score).toBe(7); // 纳音 金(剑锋金)克木(大林木)：(8 + 6) / 2
  });
});
