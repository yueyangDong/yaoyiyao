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
    // 满分 160 = 八字六项各 20 + 紫微两项各 20（v4 起新增「神煞共振」；紫微自 v3 与八字同权重）
    expect(r.totalScore).toBeLessThanOrEqual(160);
    expect(r.items.length).toBe(8); // 八字6项 + 紫微2项
    expect(['天作之合', '良缘', '平常', '需磨合']).toContain(r.level);
  });

  // ========== 神煞共振（v4，2026-10-04）==========
  // 背景：旧口径若按"神煞名集合求交集"来判，实测任意两盘平均共享 6 颗神煞，
  // "共同神煞 ≥3 即高重合"会把 93.9% 的盘对判成高重合（判别力≈0）。
  // 故改为 shenShaPower 力量加权后的加权 Jaccard，再映射到 20 分制。
  describe('神煞共振', () => {
    const itemOf = (r: ReturnType<typeof analyzeHePan>) => r.items.find(i => i.title === '神煞共振')!;

    it('双方命盘完全相同 → 相似度 1 → 神煞共振满分 20', () => {
      const r = analyzeHePan(input({ partner: input().mine }));
      expect(itemOf(r).score).toBe(20);
    });

    it('分数落在 0~20，desc 非空且与具体命盘挂钩', () => {
      const r = analyzeHePan(input());
      const item = itemOf(r);
      expect(item.score).toBeGreaterThanOrEqual(0);
      expect(item.score).toBeLessThanOrEqual(20);
      expect(item.desc.length).toBeGreaterThan(0);
      expect(item.desc).toMatch(/神煞/);
    });

    it('交换输入后分数不变（对称合盘口径）', () => {
      const a = analyzeHePan(input());
      const b = analyzeHePan({ mine: input().partner, partner: input().mine } as HePanInput);
      expect(itemOf(b).score).toBe(itemOf(a).score);
    });

    it('未传 shenSha 时按 pillars 兜底自算，不得出现"缺数据"式措辞', () => {
      // input() 没传 shenSha：走 calcShenSha(pillars) 兜底（元辰/勾绞因无性别跳过）
      const item = itemOf(analyzeHePan(input()));
      expect(item.desc).not.toContain('未能取得');
      expect(item.desc).not.toContain('信息不足');
      expect(item.desc).not.toContain('出生信息');
    });

    it('传入的 shenSha 优先于兜底（用于区分不同命盘）', () => {
      const withSha = analyzeHePan(input({
        mine: { ...input().mine, shenSha: [{ name: '天乙贵人', pillar: '日柱', type: '吉' }] },
        partner: { ...input().partner, shenSha: [{ name: '天乙贵人', pillar: '日柱', type: '吉' }] },
      }));
      // 双方神煞完全相同 → 共振满分
      expect(itemOf(withSha).score).toBe(20);

      const diff = analyzeHePan(input({
        mine: { ...input().mine, shenSha: [{ name: '天乙贵人', pillar: '日柱', type: '吉' }] },
        partner: { ...input().partner, shenSha: [] },
      }));
      expect(itemOf(diff).score).toBeLessThan(20);
    });
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

  // ========== 喜忌判定 v5（2026-10-07）==========
  // 背景：v4 的「日主五行」只按生克定吉凶（相生一律给高分），「喜用互补」只比
  // "对方日主是否在我用神列表里"——两者都不看旺衰与忌神，于是身强者被对方所生
  // （印比助旺）也被写成"被滋养"，对方日主正好是我的忌神时最多只说"非你喜用"、不扣分。
  describe('v5 喜忌判定', () => {
    const itemOf = (r: ReturnType<typeof analyzeHePan>, title: string) =>
      r.items.find((i) => i.title === title)!;

    it('日主五行：同是相生，"身强受生"被扣分（相生≠得利）', () => {
      // 对：我 癸水 ／ 对方 金（金生水）。修正项是**双向**的，所以要测"身强受生被扣"，
      // 必须让反向不产生修正，否则两个方向一正一负会互相抵消（这正是本用例初版的坑：
      // 对方若把"水"列进自己用神，我生她这一向会 +2，把我要验的 −2 抵消掉，两个盘都返回 19）。
      // 故：对方用神刻意不含"水"→ xiJiAdjust(partner, '水') = 0，只留我这一侧的信号。
      const base = {
        mine: { ...input().mine, dayGan: '癸', dayWx: '水', yongShen: ['火', '土', '木'] },
        partner: { ...input().partner, dayWx: '金', yongShen: ['土', '木'] },
      };
      const noStrength = analyzeHePan(input(base as any));
      const withStrength = analyzeHePan(input({
        mine: { ...base.mine, strengthLevel: '身强' },
        partner: { ...base.partner, strengthLevel: '身强' },
      } as any));
      const a = itemOf(noStrength, '日主五行');
      const b = itemOf(withStrength, '日主五行');
      // 我 水身强 → 忌 金（印）/ 水（比劫）；对方日主金落我忌神 → −2
      expect(a.score).toBe(19); // 未传旺衰：退化为 v4 口径，只有生克分
      expect(b.score).toBe(17);
      expect(b.score).toBeLessThan(a.score);
      expect(b.desc).toContain('忌神');
      expect(b.desc).toContain('帮身过头');
    });

    it('喜用互补：对方日主落在我的忌神上 → 扣分并写明"一进一出"', () => {
      const r = analyzeHePan(input({
        mine: { ...input().mine, dayGan: '癸', dayWx: '水', strengthLevel: '身强', yongShen: ['火', '土', '木'] },
        partner: { ...input().partner, dayGan: '辛', dayWx: '金', strengthLevel: '身强', yongShen: ['水', '木', '火'] },
      } as any));
      const item = itemOf(r, '喜用互补');
      // 我旺对方（+6：水在对方用神）／对方是我忌神（−6：金在水命身强之忌）→ 8
      expect(item.score).toBe(8);
      expect(item.desc).toContain('一进一出');
      expect(item.desc).toContain('忌神');
    });

    it('喜用互补：双方日主互为对方忌神 → 0 分（v5 新增的最低档）', () => {
      const r = analyzeHePan(input({
        // 水身强忌金水；金身弱忌火木水（水为食伤）→ 互为忌神
        mine: { ...input().mine, dayGan: '癸', dayWx: '水', strengthLevel: '身强', yongShen: ['火'] },
        partner: { ...input().partner, dayGan: '辛', dayWx: '金', strengthLevel: '身弱', yongShen: ['土', '金'] },
      } as any));
      const item = itemOf(r, '喜用互补');
      expect(item.score).toBe(0);
      expect(item.desc).toContain('互为忌神');
    });

    it('地支合冲：跨盘三合/三会局必须被识别（单支配对看不出）', () => {
      const r = analyzeHePan(input({
        mine: {
          ...input().mine, dayWx: '水', strengthLevel: '身强', yongShen: ['火', '土', '木'],
          pillars: [mk('壬', '午'), mk('癸', '子'), mk('癸', '酉'), mk('壬', '戌')],
        },
        partner: {
          ...input().partner, dayWx: '金', strengthLevel: '身强', yongShen: ['水', '木', '火'],
          pillars: [mk('甲', '申'), mk('壬', '申'), mk('辛', '未'), mk('癸', '巳')],
        },
      } as any));
      const item = itemOf(r, '地支合冲');
      expect(item.desc).toContain('成局');
      expect(item.desc).toContain('申酉戌'); // 三会金局：乙申 + 甲酉 + 甲戌
      expect(item.desc).toContain('巳午未'); // 三会火局：乙巳 + 甲午 + 乙未
      expect(item.desc).toContain('三会');
      expect(item.desc).toContain('共同忌神'); // 金局对双方都是忌
    });

    it('单盘内的成局不计入跨盘成局（避免把本盘结构算成两人缘分）', () => {
      // 我：亥卯未（自足三合木局）／对方：巳酉丑（自足三合金局）。
      // 两个局各自**完整地长在一个人身上**，没有任何一支需要对方来补——
      // 而双方之间确实存在跨盘两两配对（卯酉、巳亥、未丑三处六冲），
      // 正好用来分辨"两两配对"与"成局"是两层判定。
      // ⚠️ 夹具要点：双方地支必须**完全不相交**（这里刻意避开了 申酉戌子辰巳寅午 等
      //    会与对方凑成半合/半会的支）。初版夹具给双方都配了申酉戌，那实际上每个局
      //    都横跨了两人，代码报"成局"是对的、是断言错了（夹具前提自相矛盾）。
      const r = analyzeHePan(input({
        mine: { ...input().mine, pillars: [mk('甲', '亥'), mk('乙', '卯'), mk('丙', '未'), mk('丁', '辰')] },
        partner: { ...input().partner, pillars: [mk('甲', '巳'), mk('乙', '酉'), mk('丙', '丑'), mk('丁', '戌')] },
      }));
      const dz = itemOf(r, '地支合冲');
      expect(dz.desc).not.toContain('成局');
      expect(dz.desc).toContain('冲刑'); // 卯酉/巳亥/未丑六冲仍在两两配对层被算出
    });
  });

  // ========== 地支合冲「表键」回归（v5.1，2026-10-07）==========
  // 背景：分项循环曾拿**地支**去查**生肖键**的表（LIU_HE 的键是 '鼠'/'牛'…），
  // 查出来恒为 undefined → 六合/三合/六冲三种关系在这一层**全部静默失效**，
  // dzScore 退化成"常数 10 + 成局修正"，而 desc 照旧输出"无大合也无大冲"。
  // 之所以长期没被发现：**症状与"这个功能没写"完全一致**，不报错、不抛异常，
  // 除非夹具刻意造一对只有六合（或只有六冲）的盘、并且断言 desc 措辞。
  // 下面两条夹具刻意让"唯一的跨盘地支关系"就是六合 / 六冲：
  // 一旦表键再写错，分数会塌回 10 分、措辞会变成"无大合也无大冲"，两条同时红。
  describe('v5.1 地支合冲表键回归', () => {
    const dzOf = (r: ReturnType<typeof analyzeHePan>) =>
      r.items.find((i) => i.title === '地支合冲')!;
    // 四个柱位分别用同一支，保证 16 个配对全部命中同一关系，扣分/加分幅度足够大
    const four = (d: string) => [mk('甲', d), mk('乙', d), mk('丙', d), mk('丁', d)];

    it('六合（辰×酉）必须生效：16 对 × +2 → 封顶 20 分', () => {
      const r = analyzeHePan(input({
        mine: { ...input().mine, pillars: four('辰') },
        partner: { ...input().partner, pillars: four('酉') },
      }));
      const dz = dzOf(r);
      expect(dz.score).toBe(20);
      expect(dz.desc).toContain('六合');
      expect(dz.desc).toContain('辰');
      expect(dz.desc).not.toContain('无大合也无大冲');
    });

    it('六冲（午×子）必须生效：16 对 × −2 → 归零 0 分', () => {
      const r = analyzeHePan(input({
        mine: { ...input().mine, pillars: four('午') },
        partner: { ...input().partner, pillars: four('子') },
      }));
      const dz = dzOf(r);
      expect(dz.score).toBe(0);
      expect(dz.desc).toContain('六冲');
      expect(dz.desc).not.toContain('无大合也无大冲');
    });
  });
});
