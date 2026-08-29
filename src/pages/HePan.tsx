import { useState } from 'react';
import {
  Card, Form, InputNumber, Button, Radio, Row, Col, Typography, Tag, Progress, Alert, message, Space,
} from 'antd';
import { Lunar, Solar } from 'lunar-typescript';
import { useUser } from '../context/UserContext';
import DivinationOverlay from '../components/DivinationOverlay';
import hepanArt from '../assets/hepan-art.png';
import { analyzeHePan } from '../utils/hepan';
import { isValidSolarDate, isSolarFuture } from '../utils/dateValidation';

const { Title, Text, Paragraph } = Typography;

const TG_WX: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};
const WX_SHENG: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
const WX_KE: Record<string, string> = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' };

/** 从四柱生成合盘输入（对方） */
function buildPerson(year: number, month: number, day: number, hour: number, minute: number, gender: string) {
  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();
  const pillars = [
    { pillar: '年柱', ganZhi: ec.getYear(), tianGan: ec.getYearGan(), diZhi: ec.getYearZhi(), cangGan: ec.getYearHideGan(), shiShen: ec.getYearShiShenGan(), shiShenZhi: (ec.getYearShiShenZhi() || []).join('/'), nayin: ec.getYearNaYin() },
    { pillar: '月柱', ganZhi: ec.getMonth(), tianGan: ec.getMonthGan(), diZhi: ec.getMonthZhi(), cangGan: ec.getMonthHideGan(), shiShen: ec.getMonthShiShenGan(), shiShenZhi: (ec.getMonthShiShenZhi() || []).join('/'), nayin: ec.getMonthNaYin() },
    { pillar: '日柱', ganZhi: ec.getDay(), tianGan: ec.getDayGan(), diZhi: ec.getDayZhi(), cangGan: ec.getDayHideGan(), shiShen: ec.getDayShiShenGan(), shiShenZhi: (ec.getDayShiShenZhi() || []).join('/'), nayin: ec.getDayNaYin() },
    { pillar: '时柱', ganZhi: ec.getTime(), tianGan: ec.getTimeGan(), diZhi: ec.getTimeZhi(), cangGan: ec.getTimeHideGan(), shiShen: ec.getTimeShiShenGan(), shiShenZhi: (ec.getTimeShiShenZhi() || []).join('/'), nayin: ec.getTimeNaYin() },
  ];
  const dayWx = TG_WX[ec.getDayGan()] || '';
  const biJie = pillars.filter(p => ['比肩', '劫财'].includes(p.shiShen)).length;
  const strengthLevel = biJie >= 2 ? '身强' : '身弱';
  const yongShen = strengthLevel === '身强' ? [WX_KE[dayWx], WX_SHENG[dayWx]].filter(Boolean) : [WX_SHENG[dayWx], dayWx];
  return {
    pillars,
    dayWx,
    zodiac: lunar.getYearShengXiao(),
    nayin: ec.getDayNaYin(),
    yongShen: [...new Set(yongShen)],
    birthInfo: `${year}年${month}月${day}日 ${hour}:${String(minute).padStart(2, '0')}`,
  };
}

export default function HePan() {
  const { currentUser } = useUser();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof analyzeHePan> | null>(null);

  const mine = (() => {
    if (!currentUser) return null;
    const solar = Solar.fromYmdHms(currentUser.birthYear, currentUser.birthMonth, currentUser.birthDay, currentUser.birthHour, currentUser.birthMinute || 0, 0);
    const lunar = solar.getLunar();
    const ec = lunar.getEightChar();
    const pillars = [
      { pillar: '年柱', ganZhi: ec.getYear(), tianGan: ec.getYearGan(), diZhi: ec.getYearZhi(), cangGan: ec.getYearHideGan(), shiShen: ec.getYearShiShenGan(), shiShenZhi: (ec.getYearShiShenZhi() || []).join('/'), nayin: ec.getYearNaYin() },
      { pillar: '月柱', ganZhi: ec.getMonth(), tianGan: ec.getMonthGan(), diZhi: ec.getMonthZhi(), cangGan: ec.getMonthHideGan(), shiShen: ec.getMonthShiShenGan(), shiShenZhi: (ec.getMonthShiShenZhi() || []).join('/'), nayin: ec.getMonthNaYin() },
      { pillar: '日柱', ganZhi: ec.getDay(), tianGan: ec.getDayGan(), diZhi: ec.getDayZhi(), cangGan: ec.getDayHideGan(), shiShen: ec.getDayShiShenGan(), shiShenZhi: (ec.getDayShiShenZhi() || []).join('/'), nayin: ec.getDayNaYin() },
      { pillar: '时柱', ganZhi: ec.getTime(), tianGan: ec.getTimeGan(), diZhi: ec.getTimeZhi(), cangGan: ec.getTimeHideGan(), shiShen: ec.getTimeShiShenGan(), shiShenZhi: (ec.getTimeShiShenZhi() || []).join('/'), nayin: ec.getTimeNaYin() },
    ];
    const dayWx = TG_WX[ec.getDayGan()] || '';
    const biJie = pillars.filter(p => ['比肩', '劫财'].includes(p.shiShen)).length;
    const yongShen = biJie >= 2 ? [WX_KE[dayWx], WX_SHENG[dayWx]].filter(Boolean) : [WX_SHENG[dayWx], dayWx];
    return {
      pillars,
      dayWx,
      zodiac: lunar.getYearShengXiao(),
      nayin: ec.getDayNaYin(),
      yongShen: [...new Set(yongShen)],
      name: currentUser.name,
    };
  })();

  const handleCalc = async () => {
    if (!mine) {
      message.warning('请先在「个人档案」创建你的档案');
      return;
    }
    const values = form.getFieldsValue();
    const { year, month, day, hour, minute, gender } = values;
    if (!year || !month || !day || hour === undefined) {
      message.warning('请填写完整的对方出生信息');
      return;
    }
    if (!isValidSolarDate(year, month, day)) {
      message.warning('对方日期无效，请检查');
      return;
    }
    if (isSolarFuture(year, month, day, hour || 0, minute || 0)) {
      message.warning('对方出生时间不能晚于当前时间');
      return;
    }

    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 2500));
      const partner = buildPerson(year, month, day, hour, minute || 0, gender || 'female');
      const r = analyzeHePan({ mine, partner });
      setResult(r);
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
        <Form form={form} layout="vertical" initialValues={{ gender: 'female', hour: 12, minute: 0 }}>
          <Row gutter={12}>
            <Col span={8}><Form.Item name="year" label="年" rules={[{ required: true }]}><InputNumber min={1900} max={new Date().getFullYear()} placeholder="1998" style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="month" label="月" rules={[{ required: true }]}><InputNumber min={1} max={12} placeholder="6" style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="day" label="日" rules={[{ required: true }]}><InputNumber min={1} max={31} placeholder="15" style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="hour" label="时" rules={[{ required: true }]}><InputNumber min={0} max={23} placeholder="12" style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="minute" label="分"><InputNumber min={0} max={59} placeholder="0" style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="gender" label="性别"><Radio.Group><Radio.Button value="male">男</Radio.Button><Radio.Button value="female">女</Radio.Button></Radio.Group></Form.Item></Col>
          </Row>
          <Button type="primary" block size="large" onClick={handleCalc} loading={loading}>开始合盘</Button>
        </Form>
      </Card>

      {/* 结果 */}
      {result && (
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
          <Alert style={{ marginTop: 8 }} type="info" showIcon message="合盘结果仅供娱乐参考。真正的缘分，靠两个人共同经营。" />
        </Card>
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
