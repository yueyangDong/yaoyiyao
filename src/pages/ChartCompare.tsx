import { useState } from 'react';
import {
  Card, Form, InputNumber, Input, Button, Radio, Row, Col, Typography, Tag, Alert, Space, Cascader, Checkbox, Divider, Empty,
} from 'antd';
import { pcaCode } from 'cn-division';
import { type PersonForm, comparePersons, validatePersonForm } from '../utils/chartCompare';
import { SHENSHA_SIMILARITY_BANDS } from '../utils/shenShaSimilarity';
import { calcShenShaPower, type ShaPowerItem } from '../utils/shenShaPower';
import type { PersonChart } from '../utils/personChart';

const { Title, Text, Paragraph } = Typography;

/** 单人输入表单（A/B 各一个实例，字段名带前缀避免 Form 冲突） */
function PersonFormBlock({
  title, prefix, color, initial, onValues,
}: {
  title: string; prefix: string; color: string; initial: Partial<PersonForm>; onValues: (v: PersonForm) => void;
}) {
  const [form] = Form.useForm();
  return (
    <Card size="small" title={<Text strong style={{ color }}>{title}</Text>} style={{ marginBottom: 12 }}>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ calendar: 'solar', hour: 12, minute: 0, gender: 'male', ...initial }}
        onValuesChange={() => onValues(form.getFieldsValue() as PersonForm)}
      >
        <Row gutter={[10, 0]}>
          <Col span={12}><Form.Item name="calendar" label="历法" style={{ marginBottom: 10 }}>
            <Radio.Group size="small"><Radio.Button value="solar">公历</Radio.Button><Radio.Button value="lunar">农历</Radio.Button></Radio.Group>
          </Form.Item></Col>
          <Col span={12}><Form.Item name="gender" label="性别" style={{ marginBottom: 10 }}>
            <Radio.Group size="small"><Radio.Button value="male">男</Radio.Button><Radio.Button value="female">女</Radio.Button></Radio.Group>
          </Form.Item></Col>
          <Form.Item noStyle shouldUpdate={(p, c) => p.calendar !== c.calendar}>
            {({ getFieldValue }) => getFieldValue('calendar') === 'lunar' ? (
              <Col span={12}><Form.Item name="isLeap" valuePropName="checked" label=" " style={{ marginBottom: 10 }}><Checkbox>闰月</Checkbox></Form.Item></Col>
            ) : null}
          </Form.Item>
          <Col span={8}><Form.Item name="year" label="年" style={{ marginBottom: 10 }} rules={[{ required: true }]}>
            <InputNumber min={1900} max={new Date().getFullYear()} placeholder="1998" style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={4}><Form.Item name="month" label="月" style={{ marginBottom: 10 }} rules={[{ required: true }]}>
            <InputNumber min={1} max={12} placeholder="6" style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={4}><Form.Item name="day" label="日" style={{ marginBottom: 10 }} rules={[{ required: true }]}>
            <InputNumber min={1} max={31} placeholder="15" style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={4}><Form.Item name="hour" label="时" style={{ marginBottom: 10 }} rules={[{ required: true }]}>
            <InputNumber min={0} max={23} placeholder="12" style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={4}><Form.Item name="minute" label="分" style={{ marginBottom: 10 }}>
            <InputNumber min={0} max={59} placeholder="0" style={{ width: '100%' }} /></Form.Item></Col>
        </Row>
        <Form.Item name="name" label="称呼（可选）" style={{ marginBottom: 10 }}>
          <Input placeholder={`如：${prefix === 'a' ? '我 / 朋友' : '对方'}`} maxLength={12} />
        </Form.Item>
        <Form.Item name="birthplace" label="出生地（可选，用于真太阳时校正）" style={{ marginBottom: 0 }}>
          <Cascader options={pcaCode} fieldNames={{ label: 'n', value: 'c', children: 'ch' }}
            placeholder="省/市/区（不填则按东八区 120°E）" changeOnSelect style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Card>
  );
}

/** 神煞力量条：条长 = power，颜色按档位 */
function ShaRow({ item }: { item: ShaPowerItem }) {
  const color = item.level === '强' ? '#d46b08' : item.level === '中' ? 'var(--wx-metal)' : '#bfbfbf';
  const why = [
    item.factors.changSheng ? `得地${item.factors.changSheng}` : '',
    item.factors.relationType ? `被${item.factors.relationType}` : '',
    item.factors.kong < 1 ? '落空亡' : '',
  ].filter(Boolean).join('·');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
      <Text style={{ fontSize: 12, width: 76, flexShrink: 0 }}>{item.name}</Text>
      <div style={{ flex: 1, height: 6, background: 'rgba(0,0,0,0.05)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${Math.round(item.power * 100)}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <Text style={{ fontSize: 11, color: 'var(--text-secondary)', width: 92, flexShrink: 0, textAlign: 'right' }}>
        {item.power.toFixed(2)} {item.level}{why ? ` · ${why}` : ''}
      </Text>
    </div>
  );
}

function ChartColumn({ chart, label, color }: { chart: PersonChart; label: string; color: string }) {
  const powers = calcShenShaPower({
    pillars: chart.pillars, shenSha: chart.shenSha, strengthLevel: chart.strengthLevel, yongShen: chart.yongShen,
  }).sort((a, b) => b.power - a.power);
  return (
    <Card size="small" title={<Text strong style={{ color }}>{label}｜{chart.name}</Text>} style={{ height: '100%' }}>
      <div style={{ marginBottom: 8 }}>
        {chart.pillars.map((p) => (
          <div key={p.pillar} style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
            <Text style={{ fontSize: 12, color: 'var(--text-secondary)', width: 32 }}>{p.pillar[0]}</Text>
            <Text strong style={{ fontSize: 15, letterSpacing: 1 }}>{p.ganZhi}</Text>
            <Text style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{p.nayin}{p.unknown ? '（时辰推定）' : ''}</Text>
          </div>
        ))}
      </div>
      <Space size={4} wrap style={{ marginBottom: 8 }}>
        <Tag>{chart.dayGan}{chart.dayWx}日主</Tag>
        <Tag>{chart.strengthLevel}</Tag>
        <Tag>用神{chart.yongShen.join('、') || '—'}</Tag>
        <Tag>{chart.zodiac}</Tag>
      </Space>
      <Divider style={{ margin: '8px 0' }} />
      <Text style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
        神煞发力排行（前 8 / 共 {powers.length} 处）
      </Text>
      {powers.length === 0
        ? <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>四柱中未见常见神煞——平凡也是一种配置。</Text>
        : powers.slice(0, 8).map((it) => <ShaRow key={`${it.name}|${it.pillar}`} item={it} />)}
    </Card>
  );
}

export default function ChartCompare() {
  const [formA, setFormA] = useState<PersonForm | null>(null);
  const [formB, setFormB] = useState<PersonForm | null>(null);
  const [data, setData] = useState<{ a: PersonChart; b: PersonChart } | null>(null);
  const [error, setError] = useState('');
  const [cmp, setCmp] = useState<ReturnType<typeof comparePersons>['similarity'] | null>(null);

  const handleCompare = () => {
    setError('');
    for (const [f, who] of [[formA, '第一张盘'], [formB, '第二张盘']] as const) {
      if (!f) { setError(`请先填写${who}的出生信息`); return; }
      const msg = validatePersonForm(f);
      if (msg) { setError(`${who}：${msg}`); return; }
    }
    try {
      const r = comparePersons(formA!, formB!);
      setData({ a: r.a, b: r.b });
      setCmp(r.similarity);
    } catch (e: any) {
      setData(null);
      setCmp(null);
      setError(e?.message || '排盘失败（请检查日期与该年是否存在闰月）');
    }
  };

  const levelText = cmp?.level === '高'
    ? '高度共振：两人的关键星高度重叠，容易"对上频道"，但也要留意同时踩坑、缺少互补。'
    : cmp?.level === '中'
      ? '明显共振：有共同的发力点，默契有底子，但也各有对方的"盲区"。'
      : '共振偏低：两人的触发点大多不同，感同身受要靠主动去学，不能指望天生。';

  return (
    <div>
      <Title level={3} style={{ textAlign: 'center', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontWeight: 600 }}>
        命盘对比
      </Title>
      <Paragraph style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-body)', marginBottom: 16 }}>
        不限关系——朋友、合伙人、亲子都可以看。核心是「神煞共振」：把每颗神煞的<b>实际发力强弱</b>算进相似度，
        而不是简单数"两人都出现了几颗同名神煞"。
      </Paragraph>

      <Row gutter={12}>
        <Col xs={24} md={12}><PersonFormBlock title="第一张盘" prefix="a" color="var(--wx-wood)" initial={{}} onValues={setFormA} /></Col>
        <Col xs={24} md={12}><PersonFormBlock title="第二张盘" prefix="b" color="var(--wx-fire)" initial={{ gender: 'female' }} onValues={setFormB} /></Col>
      </Row>

      <Button type="primary" block size="large" onClick={handleCompare} style={{ marginBottom: 16 }}>开始对比</Button>
      {error && <Alert type="warning" showIcon message={error} style={{ marginBottom: 16 }} />}

      {!data && <Empty description="填好两组出生信息后点「开始对比」" style={{ marginTop: 24 }} />}

      {data && cmp && (
        <>
          <Card size="small" style={{ marginBottom: 16, textAlign: 'center', background: 'rgba(201,169,110,0.05)' }}>
            <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>神煞共振指数</Text>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 10, margin: '4px 0' }}>
              <Text strong style={{ fontSize: 30, lineHeight: 1.1 }}>{cmp.score.toFixed(3)}</Text>
              <Tag style={{ fontSize: 14, padding: '2px 12px' }}>共振{cmp.level}</Tag>
            </div>
            <Paragraph style={{ fontSize: 13, color: 'var(--text-body)', marginBottom: 6 }}>{levelText}</Paragraph>
            <Text style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
              阈值：高 ≥ {SHENSHA_SIMILARITY_BANDS.high}、中 ≥ {SHENSHA_SIMILARITY_BANDS.medium}
              （由真实命盘分布的分位数标定，不是拍的）；共同神煞 {cmp.sharedCount} 颗
            </Text>
          </Card>

          <Row gutter={12} style={{ marginBottom: 16 }}>
            <Col xs={24} md={12}><ChartColumn chart={data.a} label="第一张盘" color="var(--wx-wood)" /></Col>
            <Col xs={24} md={12}><ChartColumn chart={data.b} label="第二张盘" color="var(--wx-fire)" /></Col>
          </Row>

          <Card size="small" title="共振明细" style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 12.5, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              共同发力点（按贡献降序，括号内为双方的较弱力量）
            </Text>
            {cmp.shared.length === 0
              ? <Text style={{ fontSize: 12 }}>两张盘没有共同的神煞——触发点完全不重叠。</Text>
              : (
                <Space size={4} wrap style={{ marginBottom: 12 }}>
                  {cmp.shared.slice(0, 12).map((s) => (
                    <Tag key={s.name} style={{ fontSize: 12 }}>{s.name}（{s.weight.toFixed(2)}）</Tag>
                  ))}
                  {cmp.shared.length > 12 && <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>等 {cmp.shared.length} 颗</Text>}
                </Space>
              )}
            <Divider style={{ margin: '10px 0' }} />
            <Row gutter={12}>
              <Col xs={24} sm={12}>
                <Text style={{ fontSize: 12.5, color: 'var(--wx-wood)', display: 'block', marginBottom: 4 }}>
                  只有第一张盘有
                </Text>
                {cmp.onlyA.length === 0 ? <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>无</Text>
                  : <Space size={4} wrap>{cmp.onlyA.slice(0, 10).map((n) => <Tag key={n} style={{ fontSize: 12 }}>{n}</Tag>)}
                    {cmp.onlyA.length > 10 && <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>等 {cmp.onlyA.length} 颗</Text>}</Space>}
              </Col>
              <Col xs={24} sm={12}>
                <Text style={{ fontSize: 12.5, color: 'var(--wx-fire)', display: 'block', marginBottom: 4 }}>
                  只有第二张盘有
                </Text>
                {cmp.onlyB.length === 0 ? <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>无</Text>
                  : <Space size={4} wrap>{cmp.onlyB.slice(0, 10).map((n) => <Tag key={n} style={{ fontSize: 12 }}>{n}</Tag>)}
                    {cmp.onlyB.length > 10 && <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>等 {cmp.onlyB.length} 颗</Text>}</Space>}
              </Col>
            </Row>
          </Card>

          <Alert type="info" showIcon message="对比结果仅供娱乐参考。共振高低不代表关系好坏，而是「起点默契度」——剩下的靠经营。" />
        </>
      )}
    </div>
  );
}
