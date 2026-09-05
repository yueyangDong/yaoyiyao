import { useState, useRef } from 'react';
import {
  Card, Form, InputNumber, Button, Radio, Row, Col, Typography, Tag, Progress, Alert, message, Space, Cascader, Checkbox,
} from 'antd';
import { Lunar, Solar } from 'lunar-typescript';
import { ziwei } from '@ziweijs/core';
import { pcaCode } from 'cn-division';
import { useUser, getCityLng, getTrueSolarHour } from '../context/UserContext';
import DivinationOverlay from '../components/DivinationOverlay';
import ShareButton from '../components/ShareButton';
import hepanArt from '../assets/hepan-art.png';
import { analyzeHePan } from '../utils/hepan';
import { isValidSolarDate, isSolarFuture, isValidLunarDate, isLunarFuture } from '../utils/dateValidation';

const { Title, Text, Paragraph } = Typography;

const TG_WX: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};
const WX_SHENG: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
const WX_KE: Record<string, string> = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' };

/**
 * 为合盘双方排紫微命盘（轻量版：只保留合盘需要的宫位名/主星/生年四化）。
 * 排盘失败时返回 undefined，合盘自动降级为基础分，不影响主流程。
 */
function buildZiweiChart(solar: any, gender: string): any[] | undefined {
  try {
    const date = new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay(), solar.getHour(), solar.getMinute(), 0);
    const result = ziwei.bySolar({
      name: '',
      gender: gender === 'male' ? 'male' : 'female',
      date,
      language: 'zh-CN',
    } as any);
    return (result.palaces || []).map((p: any) => ({
      name: p.name,
      majorStars: (p.majorStars || []).map((s: any) => ({
        name: s.name,
        sihua: s.YT?.name || null,
      })),
    }));
  } catch {
    return undefined;
  }
}

/** 从出生信息生成合盘输入。calendar：出生日期的历法；isLeap：农历闰月；dayOffset：真太阳时校正跨午夜时的日历日偏移 */
function buildPerson(year: number, month: number, day: number, hour: number, minute: number, gender: string, dayOffset = 0, calendar: 'solar' | 'lunar' = 'solar', isLeap = false) {
  let solar = calendar === 'lunar'
    ? Lunar.fromYmdHms(year, isLeap ? -month : month, day, hour, minute, 0).getSolar()
    : Solar.fromYmdHms(year, month, day, hour, minute, 0);
  if (dayOffset !== 0) solar = solar.next(dayOffset);
  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();
  const pillars = [
    { pillar: '年柱', ganZhi: ec.getYear(), tianGan: ec.getYearGan(), diZhi: ec.getYearZhi(), cangGan: ec.getYearHideGan(), shiShen: ec.getYearShiShenGan(), shiShenZhi: (ec.getYearShiShenZhi() || []).join('/'), nayin: ec.getYearNaYin() },
    { pillar: '月柱', ganZhi: ec.getMonth(), tianGan: ec.getMonthGan(), diZhi: ec.getMonthZhi(), cangGan: ec.getMonthHideGan(), shiShen: ec.getMonthShiShenGan(), shiShenZhi: (ec.getMonthShiShenZhi() || []).join('/'), nayin: ec.getMonthNaYin() },
    { pillar: '日柱', ganZhi: ec.getDay(), tianGan: ec.getDayGan(), diZhi: ec.getDayZhi(), cangGan: ec.getDayHideGan(), shiShen: ec.getDayShiShenGan(), shiShenZhi: (ec.getDayShiShenZhi() || []).join('/'), nayin: ec.getDayNaYin() },
    { pillar: '时柱', ganZhi: ec.getTime(), tianGan: ec.getTimeGan(), diZhi: ec.getTimeZhi(), cangGan: ec.getTimeHideGan(), shiShen: ec.getTimeShiShenGan(), shiShenZhi: (ec.getTimeShiShenZhi() || []).join('/'), nayin: ec.getTimeNaYin() },
  ];
  const dayGan = ec.getDayGan();
  const dayWx = TG_WX[dayGan] || '';
  const biJie = pillars.filter(p => ['比肩', '劫财'].includes(p.shiShen)).length;
  const strengthLevel = biJie >= 2 ? '身强' : '身弱';
  const yongShen = strengthLevel === '身强' ? [WX_KE[dayWx], WX_SHENG[dayWx]].filter(Boolean) : [WX_SHENG[dayWx], dayWx];
  return {
    name: gender === 'male' ? '男方' : '女方',
    gender,
    dayGan,
    dayWx,
    dayZhi: pillars[2].diZhi,
    pillars,
    zodiac: lunar.getYearShengXiao(),
    nayin: ec.getDayNaYin(),
    yongShen: [...new Set(yongShen)],
    ziwei: buildZiweiChart(solar, gender),
    birthInfo: `${year}年${month}月${day}日 ${hour}:${String(minute).padStart(2, '0')}`,
  };
}

export default function HePan() {
  const { currentUser, addHistory } = useUser();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof analyzeHePan> | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const mine = (() => {
    if (!currentUser) return null;
    // 按档案记录的历法解析（档案暂不存闰月标记，农历按平月处理）
    const isLunarProfile = currentUser.birthCalendar === 'lunar';
    const lunar = isLunarProfile
      ? Lunar.fromYmdHms(currentUser.birthYear, currentUser.birthMonth, currentUser.birthDay, currentUser.birthHour, currentUser.birthMinute || 0, 0)
      : Solar.fromYmdHms(currentUser.birthYear, currentUser.birthMonth, currentUser.birthDay, currentUser.birthHour, currentUser.birthMinute || 0, 0).getLunar();
    const solarForZiwei = isLunarProfile
      ? lunar.getSolar()
      : Solar.fromYmdHms(currentUser.birthYear, currentUser.birthMonth, currentUser.birthDay, currentUser.birthHour, currentUser.birthMinute || 0, 0);
    const myGender = currentUser.gender === '男' ? 'male' : 'female';
    const ec = lunar.getEightChar();
    const pillars = [
      { pillar: '年柱', ganZhi: ec.getYear(), tianGan: ec.getYearGan(), diZhi: ec.getYearZhi(), cangGan: ec.getYearHideGan(), shiShen: ec.getYearShiShenGan(), shiShenZhi: (ec.getYearShiShenZhi() || []).join('/'), nayin: ec.getYearNaYin() },
      { pillar: '月柱', ganZhi: ec.getMonth(), tianGan: ec.getMonthGan(), diZhi: ec.getMonthZhi(), cangGan: ec.getMonthHideGan(), shiShen: ec.getMonthShiShenGan(), shiShenZhi: (ec.getMonthShiShenZhi() || []).join('/'), nayin: ec.getMonthNaYin() },
      { pillar: '日柱', ganZhi: ec.getDay(), tianGan: ec.getDayGan(), diZhi: ec.getDayZhi(), cangGan: ec.getDayHideGan(), shiShen: ec.getDayShiShenGan(), shiShenZhi: (ec.getDayShiShenZhi() || []).join('/'), nayin: ec.getDayNaYin() },
      { pillar: '时柱', ganZhi: ec.getTime(), tianGan: ec.getTimeGan(), diZhi: ec.getTimeZhi(), cangGan: ec.getTimeHideGan(), shiShen: ec.getTimeShiShenGan(), shiShenZhi: (ec.getTimeShiShenZhi() || []).join('/'), nayin: ec.getTimeNaYin() },
    ];
    const dayGan = ec.getDayGan();
    const dayWx = TG_WX[dayGan] || '';
    const biJie = pillars.filter(p => ['比肩', '劫财'].includes(p.shiShen)).length;
    const yongShen = biJie >= 2 ? [WX_KE[dayWx], WX_SHENG[dayWx]].filter(Boolean) : [WX_SHENG[dayWx], dayWx];
    return {
      name: currentUser.name,
      gender: myGender,
      dayGan,
      dayWx,
      dayZhi: pillars[2].diZhi,
      pillars,
      zodiac: lunar.getYearShengXiao(),
      nayin: ec.getDayNaYin(),
      yongShen: [...new Set(yongShen)],
      ziwei: buildZiweiChart(solarForZiwei, myGender),
      birthInfo: `${currentUser.birthYear}年${currentUser.birthMonth}月${currentUser.birthDay}日 ${currentUser.birthHour}:${String(currentUser.birthMinute || 0).padStart(2, '0')}${isLunarProfile ? '（农历）' : ''}`,
    };
  })();

  const handleCalc = async () => {
    if (!mine) {
      message.warning('请先在「个人档案」创建你的档案');
      return;
    }
    const values = form.getFieldsValue();
    const { year, month, day, hour, minute, gender, birthplace } = values;
    const calendar: 'solar' | 'lunar' = values.calendar === 'lunar' ? 'lunar' : 'solar';
    const isLeap = calendar === 'lunar' && values.isLeap === true;
    if (!year || !month || !day || hour === undefined) {
      message.warning('请填写完整的对方出生信息');
      return;
    }
    if (calendar === 'solar' ? !isValidSolarDate(year, month, day) : !isValidLunarDate(year, month, day, isLeap)) {
      message.warning(`对方${calendar === 'lunar' ? '农历' : '公历'}日期无效，请检查${calendar === 'lunar' && !isLeap ? '（如为闰月请勾选「闰月」）' : ''}`);
      return;
    }
    if (calendar === 'solar'
      ? isSolarFuture(year, month, day, hour || 0, minute || 0)
      : isLunarFuture(year, month, day, isLeap, hour || 0, minute || 0)) {
      message.warning('对方出生时间不能晚于当前时间');
      return;
    }

    // 真太阳时校正（对方若有出生地，则按当地经度 + 均时差校正；跨午夜时同步平移日期）
    // 均时差需要公历日期：农历输入先换算为对应公历日
    let calcHour = hour;
    let calcMinute = minute || 0;
    let tsDayOffset = 0;
    const partnerLng = (birthplace && birthplace.length >= 2)
      ? getCityLng(birthplace[0], birthplace[1], birthplace[2])
      : 120;
    if (partnerLng !== 120) {
      let eotDate: Date;
      if (calendar === 'lunar') {
        const s = Lunar.fromYmdHms(year, isLeap ? -month : month, day, 12, 0, 0).getSolar();
        eotDate = new Date(s.getYear(), s.getMonth() - 1, s.getDay());
      } else {
        eotDate = new Date(year, month - 1, day);
      }
      const trueSolar = getTrueSolarHour(hour, minute || 0, partnerLng, eotDate);
      calcHour = trueSolar.hour;
      calcMinute = trueSolar.minute;
      tsDayOffset = trueSolar.dayOffset || 0;
    }

    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 2500));
      const partner = buildPerson(year, month, day, calcHour, calcMinute || 0, gender || 'female', tsDayOffset, calendar, isLeap);
      // 真太阳时校正后的时间（覆盖 buildPerson 里的 raw 时间）
      const calLabel = calendar === 'lunar' ? `（农历${isLeap ? '闰' : ''}）` : '';
      if (partnerLng !== 120) {
        partner.birthInfo = `${year}年${month}月${day}日 ${hour}:${String(minute || 0).padStart(2, '0')}${calLabel}（原始）→ ${calcHour}:${String(calcMinute).padStart(2, '0')}（真太阳时${tsDayOffset !== 0 ? `，${tsDayOffset > 0 ? '次日' : '前一日'}` : ''}）`;
      } else {
        partner.birthInfo = `${year}年${month}月${day}日 ${hour}:${String(minute || 0).padStart(2, '0')}${calLabel}`;
      }
      // 把对方出生地/经度也写入（便于后续扩展）
      (partner as any).birthplaceArr = birthplace || [];
      (partner as any).longitude = partnerLng;
      const r = analyzeHePan({ mine, partner });
      setResult(r);
      // 保存合盘记录
      addHistory({
        userId: currentUser?.id || '',
        module: 'hepan',
        queryParams: { year, month, day, hour, minute, gender, birthplace, calendar, isLeap },
        resultSummary: `情侣合盘：${r.totalScore}分（${r.level}）`,
      });
    } catch (e: any) {
      message.error('合盘失败：' + (e.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '16px 0' }}>
      <DivinationOverlay show={loading} text="合盘推演 · 缘起三生" artSrc={hepanArt} />
      <Title level={3} style={{ textAlign: 'center', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontWeight: 600 }}>情侣合盘</Title>

      {/* 本人 */}
      <Card title="我方（自动带入档案）" size="small" style={{ marginBottom: 16 }}>
        {mine ? (
          <Space_Info name={mine.name} birth={''} dayWx={mine.dayWx} zodiac={mine.zodiac} nayin={mine.nayin} />
        ) : (
          <Alert message="尚未创建个人档案" description="请先到「个人档案」填写你的出生信息，再回来合盘。" type="warning" showIcon />
        )}
      </Card>

      {/* 对方 */}
      <Card title="对方（手动填写）" size="small" style={{ marginBottom: 16 }}>
        {result && (result.partnerDisplay) ? (
          <Space_Info
            name={result.partnerDisplay.name || '对方'}
            birth={result.partnerDisplay.birth}
            dayWx={result.partnerDisplay.dayWx}
            zodiac={result.partnerDisplay.zodiac}
            nayin={result.partnerDisplay.nayin}
          />
        ) : null}
        <Form form={form} layout="vertical" initialValues={{ gender: 'female', hour: 12, minute: 0, calendar: 'solar' }}>
          <Alert
            message="默认按公历（阳历）解析生日"
            description="请确认对方生日的历法：如是农历生日，请把下方「历法」切换为农历后再填写（闰月出生请勾选「闰月」），否则排盘会出错。"
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
          />
          <Row gutter={12}>
            <Col span={8}><Form.Item name="calendar" label="历法"><Radio.Group><Radio.Button value="solar">公历</Radio.Button><Radio.Button value="lunar">农历</Radio.Button></Radio.Group></Form.Item></Col>
            <Form.Item noStyle shouldUpdate={(prev, cur) => prev.calendar !== cur.calendar}>
              {({ getFieldValue }) => getFieldValue('calendar') === 'lunar' ? (
                <Col span={8}><Form.Item name="isLeap" valuePropName="checked" label=" "><Checkbox>闰月</Checkbox></Form.Item></Col>
              ) : null}
            </Form.Item>
            <Col span={8}><Form.Item name="year" label="年" rules={[{ required: true }]}><InputNumber min={1900} max={new Date().getFullYear()} placeholder="1998" style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="month" label="月" rules={[{ required: true }]}><InputNumber min={1} max={12} placeholder="6" style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="day" label="日" rules={[{ required: true }]}><InputNumber min={1} max={31} placeholder="15" style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="hour" label="时" rules={[{ required: true }]}><InputNumber min={0} max={23} placeholder="12" style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="minute" label="分"><InputNumber min={0} max={59} placeholder="0" style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="gender" label="性别"><Radio.Group><Radio.Button value="male">男</Radio.Button><Radio.Button value="female">女</Radio.Button></Radio.Group></Form.Item></Col>
          </Row>
          <Form.Item name="birthplace" label="出生地（可选，用于真太阳时校正）">
            <Cascader
              options={pcaCode}
              fieldNames={{ label: 'n', value: 'c', children: 'ch' }}
              placeholder="请选择省/市/区（不填则按北京东八区）"
              changeOnSelect
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Button type="primary" block size="large" onClick={handleCalc} loading={loading}>开始合盘</Button>
        </Form>
      </Card>

      {/* 结果 */}
      {result && (
        <div ref={resultRef}>
          <Card title="合盘结果" size="small">
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Progress type="circle" percent={result.totalScore} format={(p) => `${p}分`} strokeColor="var(--wx-metal)" />
            <Tag style={{ marginLeft: 12, fontSize: 14, padding: '4px 14px' }}>{result.level}</Tag>
          </div>
          <Paragraph style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-body)' }}>{result.summary}</Paragraph>
          {result.items.map((it, i) => (
            <div key={i} style={{
              marginBottom: 8, padding: '10px 12px', borderRadius: 10,
              background: i % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'rgba(201,169,110,0.05)',
              border: '1px solid var(--border-light)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>{it.title}</Text>
                <Text strong style={{ fontSize: 13, color: 'var(--wx-metal)' }}>{it.score} 分</Text>
              </div>
              <Text style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, display: 'block', marginTop: 4 }}>{it.desc}</Text>
            </div>
          ))}
          {/* 双向视角（对称合盘 v2：分数与输入顺序无关，视角文字分属两人） */}
          {result.perspectives && (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.15)' }}>
              <Text strong style={{ fontSize: 14, color: '#2563eb', display: 'block', marginBottom: 8 }}>🔀 双向视角（同一份缘分，两种感受）</Text>
              <div style={{ marginBottom: 8 }}>
                <Paragraph style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: 4, marginBottom: 0 }}>{result.perspectives.mine}</Paragraph>
              </div>
              <div>
                <Paragraph style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: 4, marginBottom: 0 }}>{result.perspectives.partner}</Paragraph>
              </div>
            </div>
          )}
          {/* 双方独立爱情建议 */}
          {result.loveAdvice && mine && (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: 'rgba(194,59,43,0.04)', border: '1px solid rgba(194,59,43,0.15)' }}>
              <Text strong style={{ fontSize: 14, color: 'var(--wx-fire)', display: 'block', marginBottom: 8 }}>💕 给你们的爱情建议（分别致双方）</Text>
              <div style={{ marginBottom: 8 }}>
                <Text strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>致「{mine.name}」（我）：</Text>
                <Paragraph style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: 4, marginBottom: 0 }}>{result.loveAdvice.mine}</Paragraph>
              </div>
              <div>
                <Text strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>致「{result.partnerDisplay?.name || '对方'}」：</Text>
                <Paragraph style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: 4, marginBottom: 0 }}>{result.loveAdvice.partner}</Paragraph>
              </div>
            </div>
          )}
          <Alert style={{ marginTop: 8 }} type="info" showIcon message="合盘结果仅供娱乐参考。真正的缘分，靠两个人共同经营。" />
          </Card>
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <ShareButton
              targetRef={resultRef}
              fileName="爻一爻-情侣合盘"
              buttonText="保存合盘图"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Space_Info({ name, birth, dayWx, zodiac, nayin }: { name: string; birth: string; dayWx: string; zodiac: string; nayin: string }) {
  return (
    <Space style={{ flexWrap: 'wrap' }}>
      <Text strong style={{ fontSize: 14 }}>{name}</Text>
      <Tag>{dayWx}命</Tag>
      <Tag>属{zodiac}</Tag>
      <Tag>{nayin}</Tag>
    </Space>
  );
}
