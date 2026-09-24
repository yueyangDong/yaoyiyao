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
    // 满分 140 = 八字五项各 20 + 紫微两项各 20（v3 起紫微与八字同权重）
    expect(r.totalScore).toBeLessThanOrEqual(140);
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

  // ========== 紫微合盘 v3：升为 20 分制 + 命宫地支合冲 + 取消基础分兜底 ==========
  it('紫微命宫：日月经典互补配 → 满分 20（v3 与八字五项同权重）', () => {
    const ziweiSun = [{ name: '命宫', majorStars: [{ name: '太阳' }] }];
    const ziweiMoon = [{ name: '命宫', majorStars: [{ name: '太阴' }] }];
    const r = analyzeHePan(input({
      mine: { ...input().mine, ziwei: ziweiSun },
      partner: { ...input().partner, ziwei: ziweiMoon },
    }));
    const item = r.items.find(i => i.title.includes('紫微命宫'))!;
    expect(item.score).toBe(20); // 太阳+太阴 经典配对 10 → ×2
    expect(item.desc).toContain('太阳');
  });

  it('紫微命宫：夫妻宫互参命中 → 加分', () => {
    const ziweiA = [
      { name: '命宫', majorStars: [{ name: '紫微' }] },
      { name: '夫妻', majorStars: [{ name: '太阴' }] },
    ];
    const ziweiB = [{ name: '命宫', majorStars: [{ name: '太阴' }] }];
    const r = analyzeHePan(input({
      mine: { ...input().mine, ziwei: ziweiA },
      partner: { ...input().partner, ziwei: ziweiB },
    }));
    const item = r.items.find(i => i.title.includes('紫微命宫'))!;
    // 紫微(领导型) vs 太阴(智谋型)：异组 16；对方命星落我夫妻宫 +4 → ab=20, ba=16 → 18
    expect(item.score).toBe(18);
    expect(item.desc).toContain('夫妻宫');
  });

  it('紫微命宫：命宫地支六合 → 加分；六冲 → 扣分（紫微合盘的标准判法）', () => {
    const mkZw = (branch: string, star: string) => [{ name: '命宫', branch, majorStars: [{ name: star }] }];
    // 子丑六合（且紫微 vs 太阴 异组 16）
    const he = analyzeHePan(input({
      mine: { ...input().mine, ziwei: mkZw('子', '紫微') },
      partner: { ...input().partner, ziwei: mkZw('丑', '太阴') },
    }));
    const heItem = he.items.find(i => i.title.includes('紫微命宫'))!;
    expect(heItem.score).toBe(18); // 16 + 2（六合）
    expect(heItem.desc).toContain('六合');
    // 子午六冲
    const chong = analyzeHePan(input({
      mine: { ...input().mine, ziwei: mkZw('子', '紫微') },
      partner: { ...input().partner, ziwei: mkZw('午', '太阴') },
    }));
    const chongItem = chong.items.find(i => i.title.includes('紫微命宫'))!;
    expect(chongItem.score).toBe(12); // 16 − 4（六冲）
    expect(chongItem.desc).toContain('相冲');
    // 无合无冲：不增不减
    const ping = analyzeHePan(input({
      mine: { ...input().mine, ziwei: mkZw('子', '紫微') },
      partner: { ...input().partner, ziwei: mkZw('寅', '太阴') },
    }));
    expect(ping.items.find(i => i.title.includes('紫微命宫'))!.score).toBe(16);
  });

  it('紫微两项：无紫微盘时按中性分并明确说明（不再给"基础缘分分"）', () => {
    const r = analyzeHePan(input()); // 未传 ziwei
    const zw = r.items.find(i => i.title.includes('紫微命宫'))!;
    const sh = r.items.find(i => i.title.includes('四化互动'))!;
    expect(zw.score).toBe(10);
    expect(sh.score).toBe(10);
    expect(zw.desc).toContain('未能取得');
    expect(sh.desc).toContain('未能取得');
    expect(zw.desc).not.toContain('基础缘分分');
    expect(sh.desc).not.toContain('基础缘分分');
  });

  // 回归：命宫不见十四主星（「命无正曜」）是正常命盘状态，实测占出生数据约 16%（双方任一空宫 ≈ 三成）。
  // 曾因只判 majorStars.length > 0，把这类盘误报为「出生信息不足，补齐双方出生时辰」。
  it('命无正曜：命宫空宫 → 借对宫（迁移）主星论，不得误判为数据缺失', () => {
    const emptyMingA = [
      { name: '命宫', branch: '亥', majorStars: [] },
      { name: '迁移', branch: '巳', majorStars: [{ name: '太阳' }] },
      { name: '夫妻', branch: '酉', majorStars: [] },
      { name: '官禄', branch: '卯', majorStars: [{ name: '天机' }] },
    ];
    const normalB = [{ name: '命宫', branch: '子', majorStars: [{ name: '太阴' }] }];
    const r = analyzeHePan(input({
      mine: { ...input().mine, ziwei: emptyMingA },
      partner: { ...input().partner, ziwei: normalB },
    }));
    const zw = r.items.find(i => i.title.includes('紫微命宫'))!;
    const sh = r.items.find(i => i.title.includes('四化互动'))!;
    // 不得再落「出生信息不足」兜底
    expect(zw.desc).not.toContain('未能取得');
    expect(zw.desc).not.toContain('出生信息不足');
    expect(sh.desc).not.toContain('未能取得');
    expect(sh.desc).not.toContain('出生信息不足');
    // 借宫说明要写明借自哪个宫
    expect(zw.desc).toContain('空宫');
    expect(zw.desc).toContain('迁移');
    // 借得太阳 vs 太阴 → 经典互补配对 20；命宫地支亥子无合无冲 → 不减
    expect(zw.score).toBe(20);
  });

  it('命宫与对宫皆空（空而无借）→ 中性分，措辞不得写成缺数据', () => {
    const bothEmpty = [
      { name: '命宫', branch: '亥', majorStars: [] },
      { name: '迁移', branch: '巳', majorStars: [] },
    ];
    const r = analyzeHePan(input({
      mine: { ...input().mine, ziwei: bothEmpty },
      partner: { ...input().partner, ziwei: [{ name: '命宫', branch: '子', majorStars: [{ name: '太阴' }] }] },
    }));
    const zw = r.items.find(i => i.title.includes('紫微命宫'))!;
    expect(zw.score).toBe(10);
    expect(zw.desc).toContain('空而无借');
    expect(zw.desc).not.toContain('出生信息不足');
  });

  it('四化互动：我年干化禄星正坐对方命宫 → 高分且对称', () => {
    // mine 年干壬 → 天梁化禄；partner 命宫坐天梁
    const ziweiA = [{ name: '命宫', majorStars: [{ name: '紫微' }] }];
    const ziweiB = [{ name: '命宫', majorStars: [{ name: '天梁' }] }];
    const over = {
      mine: { ...input().mine, ziwei: ziweiA },
      partner: { ...input().partner, ziwei: ziweiB },
    };
    const r1 = analyzeHePan(input(over));
    const item1 = r1.items.find(i => i.title.includes('四化互动'))!;
    // ab：壬→天梁化禄坐对方命=20；ba：甲→廉贞/破军/武曲/太阳均不在[紫微]=10 → 均分 15
    expect(item1.score).toBe(15);
    expect(item1.desc).toContain('化禄');
    // 交换输入分项分不变（对称性）
    const r2 = analyzeHePan({ mine: over.partner, partner: over.mine });
    const item2 = r2.items.find(i => i.title.includes('四化互动'))!;
    expect(item2.score).toBe(item1.score);
  });

  it('四化互动：年干化忌星坐对方命宫 → 低分预警', () => {
    // mine 年干壬 → 武曲化忌；partner 命宫坐武曲
    const ziweiA = [{ name: '命宫', majorStars: [{ name: '紫微' }] }];
    const ziweiB = [{ name: '命宫', majorStars: [{ name: '武曲' }] }];
    const r = analyzeHePan(input({
      mine: { ...input().mine, ziwei: ziweiA },
      partner: { ...input().partner, ziwei: ziweiB },
    }));
    const item = r.items.find(i => i.title.includes('四化互动'))!;
    // ab=6（忌坐命），ba=10（甲干四化不涉紫微）→ 均分 8
    expect(item.score).toBe(8);
    expect(item.desc).toContain('化忌');
  });
});
