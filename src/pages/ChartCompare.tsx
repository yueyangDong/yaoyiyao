import { useState } from 'react';
import {
  Card, Form, InputNumber, Input, Button, Radio, Row, Col, Typography, Tag, Alert, Space, Cascader, Checkbox, Divider, Empty,
} from 'antd';
import { MiniNumber } from '../components/MiniNumber';
import { pcaCode } from 'cn-division';
import { type PersonForm, comparePersons, validatePersonForm } from '../utils/chartCompare';
import { birthdayBounds, clampBirthday } from '../utils/dateValidation';
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
  // 生日三道上限随「历法 / 年 / 月」实时变化，所以用 useWatch 取值，
  // 而不是在 InputNumber 上写死 max——写死必然出现「1998 年也选不了 12 月」这类过度收紧。
  const wYear = Form.useWatch('year', form);
  const wMonth = Form.useWatch('month', form);
  const wCalendar = Form.useWatch('calendar', form);
  const wIsLeap = Form.useWatch('isLeap', form);
  const bounds = birthdayBounds({ calendar: wCalendar, isLeap: wIsLeap, year: wYear, month: wMonth });

  /**
   * 变更时把超限的值**级联夹回**（改年份 → 重算月上限 → 再重算日上限）。
   * 判据在 dateValidation.clampBirthday，与排盘页共用同一份，不在这里另写。
   * ⚠️ setFieldsValue 不触发 onValuesChange（antd 约定），所以不会递归。
   */
  const commit = () => {
    const raw = form.getFieldsValue() as PersonForm;
    const fixed = clampBirthday(raw, {
      calendar: raw.calendar,
      isLeapOf: () => !!raw.isLeap,
    });
    if (fixed.year !== raw.year || fixed.month !== raw.month || fixed.day !== raw.day) {
      form.setFieldsValue(fixed as never);
      onValues(form.getFieldsValue() as PersonForm);
    } else {
      onValues(raw);
    }
  };

  return (
    <Card size="small" title={<Text strong style={{ color }}>{title}</Text>} style={{ marginBottom: 12 }}>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ calendar: 'solar', hour: 12, minute: 0, gender: 'male', ziShiSect: 2, ...initial }}
        onValuesChange={commit}
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
          {/*
            ⚠️ 这里只能用不带断点的 span，不能用 xs/sm。
            `span` 是**行宽的分数**（跟着容器走），`xs/sm` 是**视口断点**——两者在
            「容器宽度不随视口走」时会错配：对比页两张表单卡并排后卡内一行只有约 332～440px，
            卡内一行恒为约 332～440px（实测 1280 视口 334、390 视口 358、768 视口 440），
            而按 sm 值给的是 span-4 = 46px → 内层 input 22px、自带 padding 22px → **可视字宽 0**。
            纯分数就没有这个问题：无论容器多宽，年/月/日 恒为 1/3（→ input 71～89px）、
            时/分 恒为 1/2（→ 127～170px），自动落成「日期一行 / 时间一行」。
          */}
          <Col span={8}><Form.Item name="year" label="年" style={{ marginBottom: 10 }} rules={[{ required: true }]}>
            <MiniNumber min={1900} max={bounds.maxYear} placeholder="1998" /></Form.Item></Col>
          <Col span={8}><Form.Item name="month" label="月" style={{ marginBottom: 10 }} rules={[{ required: true }]}>
            <MiniNumber min={1} max={bounds.maxMonth} placeholder="6" /></Form.Item></Col>
          <Col span={8}><Form.Item name="day" label="日" style={{ marginBottom: 10 }} rules={[{ required: true }]}>
            <MiniNumber min={1} max={bounds.maxDay} placeholder="15" /></Form.Item></Col>
          <Col span={12}><Form.Item name="hour" label="时" style={{ marginBottom: 10 }} rules={[{ required: true }]}>
            <MiniNumber min={0} max={23} placeholder="12" /></Form.Item></Col>
          <Col span={12}><Form.Item name="minute" label="分" style={{ marginBottom: 10 }}>
            <MiniNumber min={0} max={59} placeholder="0" /></Form.Item></Col>
        </Row>
        <Text style={{ fontSize: 11.5, color: 'var(--text-secondary)', display: 'block', marginBottom: 10 }}>
          出生时间按 24 小时制填。23:00–23:59 出生者请注意下方流派档位。
        </Text>
        <Form.Item name="ziShiSect" label="晚子时流派（仅 23:00–23:59 出生相关）" style={{ marginBottom: 10 }}
          tooltip="23 点子时出生者：日柱算当天（默认）或算次日。八字与紫微两侧同取此档，避免同一张盘出现两套「日」。">
          <Radio.Group size="small"><Radio.Button value={2}>日柱算当天</Radio.Button><Radio.Button value={1}>日柱算次日</Radio.Button></Radio.Group>
        </Form.Item>
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
    pillars: chart.pillars, shenSha: chart.shenSha, yongShen: chart.yongShen,
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

      {/* ⚠️ 卡片断点用 lg 而不是 md：Layout 在视口 ≤768 时把内容容器收到 480px，
          而 md 断点在 768 就已生效——正好卡在「容器 480 + 两卡并排」的错配上，
          每张卡被压到约 220px（实测 768 视口下生日格 input 只剩 30px / 可视字宽 8px）。
          推到 lg（≥992，此时容器已是 800px）就不再有这个重叠窗口。 */}
      <Row gutter={12}>
        <Col xs={24} lg={12}><PersonFormBlock title="第一张盘" prefix="a" color="var(--wx-wood)" initial={{}} onValues={setFormA} /></Col>
        <Col xs={24} lg={12}><PersonFormBlock title="第二张盘" prefix="b" color="var(--wx-fire)" initial={{ gender: 'female' }} onValues={setFormB} /></Col>
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

          {/* 同上：结果两张卡也用 lg，避免 768px 视口下（容器 480）被压成 220px */}
          <Row gutter={12} style={{ marginBottom: 16 }}>
            <Col xs={24} lg={12}><ChartColumn chart={data.a} label="第一张盘" color="var(--wx-wood)" /></Col>
            <Col xs={24} lg={12}><ChartColumn chart={data.b} label="第二张盘" color="var(--wx-fire)" /></Col>
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
