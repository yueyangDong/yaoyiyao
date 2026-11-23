/**
 * 命盘旁参卡片（展示层）。
 *
 * 放在占卜页结果区的末尾：先看这一问的答案，再往下看「你自己这个人」。
 * 数据与文案全部来自 `utils/mingPanAside.buildMingPanAside`，这里只排版。
 *
 * ⚠️ 档案里没出生信息就返回 null（整块不渲染），不做「去填写」的空状态引导——
 *    占卜页的主角是卦，不是档案。
 */
import { useMemo } from 'react';
import { Row, Col } from 'antd';
import CollapsibleCard from './CollapsibleCard';
import { useUser } from '../context/UserContext';
import { correctSolarTime } from '../utils/solarTime';
import { buildMingPanAside } from '../utils/mingPanAside';

export default function MingPanAside() {
  const { currentUser } = useUser();

  const data = useMemo(() => {
    const u = currentUser;
    if (!u?.birthYear || !u.birthMonth || !u.birthDay) return null;

    const calendar: 'solar' | 'lunar' = u.birthCalendar === 'lunar' ? 'lunar' : 'solar';
    // StoredUser 的 birthHour 是 number（不是 null），0 点就是子时，照实算
    const hourKnown = Number.isFinite(u.birthHour);
    const lng = u.birthplace?.longitude;

    // 真太阳时校正：有出生时辰、且档案里有出生地经度时才做。
    // 时辰未知时跳过——基准本身是推定的，再校正只是制造假精确（与八字页同口径）。
    let trueSolar: { hour: number; minute: number; dayOffset: number } | null = null;
    if (hourKnown && lng && Number.isFinite(lng)) {
      trueSolar = correctSolarTime({
        year: u.birthYear, month: u.birthMonth, day: u.birthDay,
        hour: u.birthHour, minute: u.birthMinute ?? 0,
        lng, calendar, isLeap: calendar === 'lunar' && u.isLeapMonth === true,
      });
    }

    // 晚子时流派固定取默认 2，与八字页表单的 initialValue 一致。
    // ⚠️ 若用户在八字页手动改过流派，23:00–24:00 出生的人两处会差一天——已知范围，不追。
    return buildMingPanAside({
      year: u.birthYear, month: u.birthMonth, day: u.birthDay,
      hour: u.birthHour, minute: u.birthMinute,
      gender: u.gender, calendar,
      isLeap: calendar === 'lunar' && u.isLeapMonth === true,
      trueSolar,
    });
  }, [currentUser]);

  if (!data) return null;

  const d = data;

  return (
    <CollapsibleCard
      title="旁参 · 你的命盘"
      summary={`${d.dayGan}${d.dayWx} · ${d.strengthPlain}`}
      style={{ marginBottom: 16, borderColor: 'var(--border-light)' }}
    >
      <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 12 }}>
        这一块跟上面那一问没有因果，只是把你自己的盘摆出来做对照——
        看盘面说的事，和你这个人当下的路子对不对得上。
      </div>

      {/* 四柱：用 maxWidth 收口，不用 xs/sm 断点——
          卡片宽度不随视口等比变化，拿断点判会错配（踩过两次）。 */}
      <Row gutter={8} style={{ maxWidth: 560 }}>
        {d.pillars.map((p) => (
          <Col span={6} key={p.label}>
            <div style={{
              textAlign: 'center', padding: '8px 4px',
              border: '1px solid var(--border-light)', borderRadius: 10,
              background: 'rgba(0,0,0,0.015)',
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>
                {p.label}柱{p.guessed ? '（推定）' : ''}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, lineHeight: 1.3 }}>
                <span style={{ color: p.ganColor }}>{p.gan}</span>
                <span style={{ color: p.zhiColor }}>{p.zhi}</span>
              </div>
            </div>
          </Col>
        ))}
      </Row>

      {/* 日主 / 喜忌 / 运 */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '4px 18px',
        marginTop: 12, fontSize: 13, lineHeight: 1.9, color: 'var(--text-body)',
      }}>
        <span>
          日主 <b style={{ color: d.pillars[2]?.ganColor || 'var(--text-primary)' }}>{d.dayGan}</b>
          （{d.dayWx}）· {d.strengthPlain}
        </span>
        {d.yongShen.length > 0 && <span>喜 {d.yongShen.join('、')}</span>}
        {d.jiShen.length > 0 && <span>忌 {d.jiShen.join('、')}</span>}
        {d.dayun && (
          <span>
            当前大运 <b>{d.dayun.ganZhi}</b>
            <span style={{ color: 'var(--text-secondary)' }}>（虚岁 {d.dayun.startAge}–{d.dayun.endAge}）</span>
          </span>
        )}
        <span>
          今年 <b>{d.liunian.ganZhi}</b>
          <span style={{ color: 'var(--text-secondary)' }}>（{d.liunian.year}）</span>
        </span>
      </div>

      <div style={{
        marginTop: 12, paddingTop: 10,
        borderTop: '1px solid var(--border-light)',
        fontSize: 11.5, color: 'var(--text-tertiary)', lineHeight: 1.8,
      }}>
        这一块不参与上面的判读，也不改吉凶——它没有分数，也不给建议。
        强弱只是结构描述，不分好坏：偏弱不等于命差。
        {d.hourGuessed ? '出生时辰没填，时柱按午时推定，仅供参考。' : ''}
      </div>
    </CollapsibleCard>
  );
}
