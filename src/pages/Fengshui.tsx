import { useState, useMemo, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { useDailyQuota } from '../hooks/useDailyQuota';
import {
  Card, Select, Button, Typography, Space,
  Tag, Row, Col, Descriptions, InputNumber, Radio, Alert, Progress, Divider,
} from 'antd';
import { Compass, User, MapPin, Home, Lightbulb } from 'lucide-react';
import {
  HOUSE_DIRECTIONS, STAR_NAMES,
  calcFengshui, calcMingGua, Direction, FengshuiResult,
} from '../utils/fengshuiUtils';

const { Title, Text, Paragraph } = Typography;

const DIRECTIONS: Direction[] = ['北', '南', '东', '西', '东北', '西北', '东南', '西南'];

// 九星详细白话
const STAR_DETAIL: Record<string, { desc: string; suitable: string }> = {
  '生气': { desc: '第一吉星，五行属木。代表生机勃勃、财运旺盛、人丁兴旺。此方位能量最强，做什么都容易成功。', suitable: '最适合做大门、主卧室。孩子住此方位利学业和成长。' },
  '天医': { desc: '第二吉星，五行属土。代表健康、治愈、贵人。生病的人住此方位有利于康复，身体健康的住在此处不容易生病。', suitable: '最适合做卧室，尤其是长辈房。也可做厨房，让家人吃得健康。' },
  '延年': { desc: '第三吉星，五行属金。代表长寿、婚姻美满、人际关系和谐。此方位稳定持久的能量，很适合夫妻居住。', suitable: '最适合做主卧室（夫妻房）。也可做客厅，让家庭和睦、社交顺利。' },
  '伏位': { desc: '第四吉星，五行属木。代表平稳、安定、守成。没有大起大落，适合需要安静专注的场合。', suitable: '最适合做书房、禅修室。不适合做大门，因为能量太内敛了。' },
  '绝命': { desc: '第一凶星，五行属金。代表破败、疾病、意外伤害。这是八宅中最不吉利的方位，能量最为负面。', suitable: '只能做厕所、杂物间或储藏室。绝对不能做卧室或大门。' },
  '五鬼': { desc: '第二凶星，五行属火。代表口舌是非、火灾隐患、小偷盗贼。容易引起争议和麻烦。', suitable: '适合做厕所、储物间。如果做了卧室，住的人容易心烦气躁、多争吵。' },
  '六煞': { desc: '第三凶星，五行属水。代表桃花劫、人际纠纷、情绪低落。容易导致感情问题。', suitable: '适合做厕所、洗衣房。不适合未婚者住，易招烂桃花。' },
  '祸害': { desc: '第四凶星，五行属土。代表小人是非、慢性疾病、诸事不顺。虽然是最轻的凶星，但也不可小觑。', suitable: '适合做厕所、杂物间。不适合长期待的场所。' },
};

// 九星能量分（用于布局总评）
const STAR_SCORE: Record<string, number> = {
  '生气': 100, '延年': 92, '天医': 88, '伏位': 72,
  '祸害': 45, '六煞': 35, '五鬼': 25, '绝命': 15,
};

// 三大功能区逐项诊断话术
const DIAGNOSIS: Record<'大门' | '主卧' | '厨房', Record<string, string>> = {
  '大门': {
    '生气': '大门开在生气方，纳的是全屋最强旺气——财源、人丁、事业都从这道门进来，是最理想的开门方位，保持门口明亮整洁即可。',
    '天医': '大门开在天医方，纳健康与贵人之气，家人少病少灾，遇事常有人帮忙。',
    '延年': '大门开在延年方，纳和谐稳定之气，家庭和睦、姻缘顺遂，适合已婚家庭。',
    '伏位': '大门开在伏位方，气场平和守成，家运平顺但偏保守，适合求稳的家庭；想增旺可在门口养一盆圆叶绿植。',
    '绝命': '大门开在绝命方（第一凶位），纳衰败之气，最伤财运与健康，是最需要调整的一项。首选改开吉方之门；无法改门时：门内加长门帘缓冲、门口常年保持明亮（可常亮一盏小灯）、门垫下放置五帝钱，门外忌堆杂物垃圾。',
    '五鬼': '大门开在五鬼方，易招口舌是非、火盗虚惊。化解：门内加门帘、门口装长明灯，忌开门见灶、见镜子，玄关可放陶瓷摆件以土泄火。',
    '六煞': '大门开在六煞方，易招烂桃花与人缘纠纷。化解：门内放圆叶绿植稳住气场，忌开门见水、见花，玄关保持简洁。',
    '祸害': '大门开在祸害方，易犯小人、家运渐退。化解：门口常点灯增旺气，门垫下置五帝钱，大门油漆/门框有破损及时修补。',
  },
  '主卧': {
    '生气': '主卧在生气方，住者精力充沛、事业财运两旺，孩子住也利学业成长，是卧室的最佳选择。',
    '天医': '主卧在天医方，利睡眠与健康，长辈、病人住此康复快，是养身体的好房间。',
    '延年': '主卧在延年方，利夫妻感情和睦、白头偕老，是夫妻房首选；单身者住也利正缘。',
    '伏位': '主卧在伏位方，睡眠安稳、气场平和，适合喜静、压力大的人休养。',
    '绝命': '主卧在绝命方（第一凶位），住者易生病、破财、出意外，强烈建议换到吉方房间。实在无法换房：床头改朝吉方、床下放铜葫芦或天然葫芦化病气，房间用暖色调（米黄、浅棕）增阳，少用黑白冷色。',
    '五鬼': '主卧在五鬼方，住者心烦失眠、多争吵、易有火烛虚惊。化解：换房或床头朝吉方，房中少用红色，保持通风明亮，勿在房中堆放电器杂物。',
    '六煞': '主卧在六煞方，感情易生变、情绪低落失眠。化解：换房或床头朝吉方，房内放圆叶绿植，忌摆粉水晶、鲜花等招桃花之物。',
    '祸害': '主卧在祸害方，易有慢性病、小人纠缠。化解：床头朝吉方，房内保持整洁明亮，床头柜放天然葫芦化病气。',
  },
  '厨房': {
    '生气': '厨房在生气方，火旺生机，家人食禄丰足、精力旺盛，饭香人旺。',
    '天医': '厨房在天医方为最佳搭配——天医主健康，厨房管饮食，家人吃得营养、少生疾病。',
    '延年': '厨房在延年方，利家宅和睦、老人长寿，饭菜养人。',
    '伏位': '厨房在伏位方，平稳无咎，饮食安稳，注意保持洁净即可。',
    '绝命': '厨房在绝命方：传统有"以燥火压凶"之说，凶性可被压制一部分，但仍建议灶台/操作台尽量朝向吉方，厨房保持洁净通风，多用黄色、米色（土色）装饰稳气。',
    '五鬼': '厨房在五鬼方（五鬼属火），火上加火，最需注意用电用火安全，家人易口角。化解：灶台不正对厨房门，多用陶瓷、石器（土泄火气），灶台常备一壶水或蓝色装饰调候。',
    '六煞': '厨房在六煞方影响较小，注意水槽排水通畅、地面保持干燥即可。',
    '祸害': '厨房在祸害方，小病多从口入，注意饮食卫生与食材新鲜，灶台保持明亮、油污勤清理。',
  },
};

export default function Fengshui() {
  const { currentUser, addHistory } = useUser();
  const { tryConsume, quotaModal } = useDailyQuota('fengshui');
  const [sitting, setSitting] = useState<string | null>(null);
  const [door, setDoor] = useState<Direction | null>(null);
  const [bedroom, setBedroom] = useState<Direction | null>(null);
  const [kitchen, setKitchen] = useState<Direction | null>(null);
  const [result, setResult] = useState<FengshuiResult | null>(null);
  const [ownerYear, setOwnerYear] = useState<number | null>(null);
  const [ownerGender, setOwnerGender] = useState<'male' | 'female' | null>(null);

  useEffect(() => {
    if (currentUser && !ownerYear && !ownerGender) {
      setOwnerYear(currentUser.birthYear);
      setOwnerGender(currentUser.gender === '男' ? 'male' : 'female');
    }
  }, [currentUser]);

  const ownerMingGua = useMemo(() => {
    if (!ownerYear || !ownerGender) return null;
    return calcMingGua(ownerYear, ownerGender);
  }, [ownerYear, ownerGender]);

  const houseMatch = useMemo(() => {
    if (!result || !ownerMingGua) return null;
    const houseType = result.house.type;
    const personType = ownerMingGua.type;
    // 东四宅配东四命、西四宅配西四命
    const isMatch = (houseType === '东四宅') === (personType === '东四命');
    return {
      isMatch,
      houseType,
      personType,
      personGua: ownerMingGua.guaName,
      desc: isMatch
        ? `宅主为${ownerMingGua.type}（${ownerMingGua.guaName}命），住宅为${houseType}（${result.house.gua}宅），人宅相配！这是最理想的风水状态，住在此宅中家运兴旺，事业顺利。`
        : `⚠ 宅主为${ownerMingGua.type}（${ownerMingGua.guaName}命），但住宅为${houseType}（${result.house.gua}宅），人宅不匹配。虽然也可以通过调整内部布局来改善，但不如人宅相配来得理想。建议在选择住宅时优先考虑与命卦相配的宅型。`,
    };
  }, [result, ownerMingGua]);

  const handleCalc = async () => {
    if (!sitting || !door || !bedroom || !kitchen) return;
    if (!(await tryConsume())) return;
    const res = calcFengshui(sitting, door, bedroom, kitchen);
    setResult(res);
    addHistory({
      userId: currentUser?.id || '',
      module: 'fengshui',
      queryParams: { sitting, door, bedroom, kitchen },
      resultSummary: `风水相宅：坐${sitting}向${door}（${res?.house?.gua ?? ''}宅·${res?.house?.type ?? ''}）`,
    });
  };

  // 布局总评：大门纳气(35%) + 主卧养人(40%) + 厨房养命(25%)
  const layoutScore = useMemo(() => {
    if (!result || !door || !bedroom || !kitchen) return null;
    const doorStar = result.starMap[door];
    const bedStar = result.starMap[bedroom];
    const kitchenStar = result.starMap[kitchen];
    const total = Math.round(
      (STAR_SCORE[doorStar] ?? 50) * 0.35 +
      (STAR_SCORE[bedStar] ?? 50) * 0.40 +
      (STAR_SCORE[kitchenStar] ?? 50) * 0.25
    );
    const rating = total >= 85
      ? { label: '上吉', color: 'var(--wx-wood)', desc: '三大功能区基本都在吉位，家宅兴旺、住居顺遂，保持整洁明亮即可。' }
      : total >= 70
        ? { label: '吉利', color: 'var(--wx-wood)', desc: '整体布局较好，按下方建议微调个别房间即可。' }
        : total >= 55
          ? { label: '平顺', color: 'var(--wx-earth)', desc: '吉凶参半，重点调整位于凶方的卧室或大门。' }
          : total >= 40
            ? { label: '欠佳', color: 'var(--wx-fire)', desc: '多个功能区落在凶方，建议按下方化解法逐一调理。' }
            : { label: '需调理', color: 'var(--wx-fire)', desc: '布局与宅卦冲突较大，优先调整卧室与大门，或考虑换房/改门。' };
    return { total, doorStar, bedStar, kitchenStar, rating };
  }, [result, door, bedroom, kitchen]);

  const getStarStyle = (starName: string) => {
    const star = STAR_NAMES[starName];
    if (!star) return {};
    return star.ji === '吉'
      ? { background: 'var(--bg-card-solid)', color: 'var(--wx-wood)', borderColor: 'var(--border-light)' }
      : { background: 'rgba(194,59,43,0.03)', color: 'var(--wx-fire)', borderColor: 'rgba(194,59,43,0.08)' };
  };

  return (
    <div style={{ padding: '16px 0' }}>
      <Title level={3} style={{ textAlign: 'center', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontWeight: 600 }}>
        风水相宅
      </Title>

      {/* 新手教学：3步测出自家风水 */}
      <Card
        size="small"
        style={{ marginBottom: 16, background: 'rgba(107,154,122,0.04)', borderColor: 'rgba(107,154,122,0.15)' }}
        title={<span><Lightbulb size={16} style={{ marginRight: 6, verticalAlign: 'middle', color: 'var(--wx-wood)' }} />新手入门：3步测准自家风水（手机自带指南针即可）</span>}
      >
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={8}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flexShrink: 0, width: 24, height: 24, borderRadius: '50%', background: 'var(--wx-wood)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>1</div>
              <div>
                <Text strong>测房屋"坐向"</Text>
                <Paragraph style={{ fontSize: 12.5, color: 'var(--text-body)', marginTop: 4, marginBottom: 0 }}>
                  站在屋内大门处、<Text strong>面朝门外</Text>（就是人走出家门的方向），打开手机指南针：指针所指方向叫"<Text strong>向</Text>"，背后反方向叫"<Text strong>坐</Text>"。
                  <br />例：出门往南走 → <Text strong>坐北朝南</Text>（坎宅）。
                </Paragraph>
              </div>
            </div>
          </Col>
          <Col xs={24} sm={8}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flexShrink: 0, width: 24, height: 24, borderRadius: '50%', background: 'var(--wx-wood)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>2</div>
              <div>
                <Text strong>测房间方位</Text>
                <Paragraph style={{ fontSize: 12.5, color: 'var(--text-body)', marginTop: 4, marginBottom: 0 }}>
                  站在整套房子的<Text strong>中心点</Text>（约客厅中央），平举手机转一圈，分别看<Text strong>大门、主卧室、厨房</Text>落在哪个方位（东/南/西/北及四个角）。
                  <br />公寓楼以自家入户门为准。
                </Paragraph>
              </div>
            </div>
          </Col>
          <Col xs={24} sm={8}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flexShrink: 0, width: 24, height: 24, borderRadius: '50%', background: 'var(--wx-wood)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>3</div>
              <div>
                <Text strong>填宅主信息</Text>
                <Paragraph style={{ fontSize: 12.5, color: 'var(--text-body)', marginTop: 4, marginBottom: 0 }}>
                  填出生年份+性别，自动算出你的<Text strong>命卦</Text>（东四命/西四命）。宅型与命卦同类为"<Text strong>人宅相配</Text>"，住起来最顺。
                  <br />测量时远离钢筋墙、电器，多测几次取稳定值。
                </Paragraph>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 宅主信息 */}
      <Card
        title={<span><User size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />宅主信息（选填，用于人宅匹配）</span>}
        size="small"
        style={{ marginBottom: 16 }}
      >
        <Space wrap>
          <Text>出生年份：</Text>
          <InputNumber min={1940} max={2026} placeholder="1990" value={ownerYear} onChange={setOwnerYear} style={{ width: 100 }} />
          <Text>性别：</Text>
          <Radio.Group value={ownerGender} onChange={(e) => setOwnerGender(e.target.value)}>
            <Radio.Button value="male">男</Radio.Button>
            <Radio.Button value="female">女</Radio.Button>
          </Radio.Group>
          {ownerMingGua && (
            <Tag style={{
              background: ownerMingGua.type === '东四命' ? 'rgba(107,154,122,0.06)' : 'rgba(201,169,110,0.06)',
              color: ownerMingGua.type === '东四命' ? 'var(--wx-wood)' : 'var(--wx-earth)',
              border: 'none',
            }}>
              {ownerMingGua.type} · {ownerMingGua.guaName}命
            </Tag>
          )}
        </Space>
        <Paragraph style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
          东四命（坎离震巽）适合住东四宅，西四命（乾坤艮兑）适合住西四宅。
        </Paragraph>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text strong>住宅坐向：</Text>
            <Select
              placeholder="请选择住宅坐向"
              value={sitting}
              onChange={setSitting}
              style={{ width: '100%', maxWidth: 340, marginTop: 8 }}
              options={Object.keys(HOUSE_DIRECTIONS).map((k) => ({
                value: k, label: `${k}（${HOUSE_DIRECTIONS[k].gua}宅·${HOUSE_DIRECTIONS[k].type}）`,
              }))}
            />
          </div>
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={8}>
              <Text strong>大门方位：</Text>
              <Select placeholder="选择大门方位" value={door} onChange={setDoor}
                style={{ width: '100%', marginTop: 4 }}
                options={DIRECTIONS.map((d) => ({ value: d, label: `${d}方` }))} />
            </Col>
            <Col xs={24} sm={8}>
              <Text strong>主卧室方位：</Text>
              <Select placeholder="选择卧室方位" value={bedroom} onChange={setBedroom}
                style={{ width: '100%', marginTop: 4 }}
                options={DIRECTIONS.map((d) => ({ value: d, label: `${d}方` }))} />
            </Col>
            <Col xs={24} sm={8}>
              <Text strong>厨房方位：</Text>
              <Select placeholder="选择厨房方位" value={kitchen} onChange={setKitchen}
                style={{ width: '100%', marginTop: 4 }}
                options={DIRECTIONS.map((d) => ({ value: d, label: `${d}方` }))} />
            </Col>
          </Row>
          <Button type="primary" size="large" icon={<Compass size={16} />} onClick={handleCalc}
            disabled={!sitting || !door || !bedroom || !kitchen}>
            分析风水
          </Button>
        </Space>
      </Card>

      {result && (
        <>
          {/* 人宅匹配结果 */}
          {houseMatch && (
            <Alert
              message={houseMatch.isMatch ? '人宅相配 ✓' : '人宅不匹配 ⚠'}
              description={houseMatch.desc}
              type={houseMatch.isMatch ? 'success' : 'warning'}
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          {/* 风水总评分 */}
          {layoutScore && (
            <Card style={{ marginBottom: 16 }}>
              <Row align="middle" gutter={[16, 12]}>
                <Col xs={24} sm={9} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 40, fontWeight: 800, color: layoutScore.rating.color, fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>
                    {layoutScore.total}
                    <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-secondary)' }}> /100</span>
                  </div>
                  <Tag style={{ marginTop: 6, fontSize: 14, padding: '2px 14px', borderRadius: 12,
                    background: 'transparent', color: layoutScore.rating.color, borderColor: layoutScore.rating.color }}>
                    {layoutScore.rating.label}
                  </Tag>
                </Col>
                <Col xs={24} sm={15}>
                  <Paragraph style={{ marginBottom: 10, color: 'var(--text-body)' }}>{layoutScore.rating.desc}</Paragraph>
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                    评分依据：大门（纳气之口，权重35%）、主卧（停留最久，权重40%）、厨房（饮食养命，权重25%）各自落在吉位/凶位的九星能量。
                  </div>
                </Col>
              </Row>
            </Card>
          )}

          <Card title="宅卦信息" style={{ marginBottom: 16 }}>
            <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
              <Descriptions.Item label="住宅坐向">{result.house.name}</Descriptions.Item>
              <Descriptions.Item label="宅卦">
                <Tag style={{ background: 'rgba(155,155,155,0.06)', color: '#9B9B9B', border: 'none' }}>
                  {result.house.gua}宅
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="宅型">
                <Tag style={{
                  background: result.house.type === '东四宅' ? 'rgba(107,154,122,0.06)' : 'rgba(201,169,110,0.06)',
                  color: result.house.type === '东四宅' ? 'var(--wx-wood)' : 'var(--wx-earth)',
                  border: 'none',
                }}>
                  {result.house.type}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="分析"><Text>{result.analysis}</Text></Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="罗盘九宫吉凶图" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <svg viewBox="0 0 400 400" width="100%" style={{ maxWidth: 400 }}>
                {/* 罗盘背景 */}
                <circle cx={200} cy={200} r={192} fill="var(--bg-card-solid)" stroke="var(--border-light)" strokeWidth={2} />
                <circle cx={200} cy={200} r={148} fill="none" stroke="var(--border-light)" strokeWidth={1.5} />
                <circle cx={200} cy={200} r={82} fill="none" stroke="var(--border-light)" strokeWidth={1} />

                {/* 绘制8个方位扇区 */}
                {(() => {
                  const dirAngles: Record<string, number> = {
                    '南': -90, '西南': -45, '西': 0, '西北': 45,
                    '北': 90, '东北': 135, '东': 180, '东南': -135,
                  };
                  const degToRad = (d: number) => (d * Math.PI) / 180;
                  const cx = 200, cy = 200, outerR = 186, midR = 148, innerR = 82;

                  return DIRECTIONS.map((dir) => {
                    const centerDeg = dirAngles[dir];
                    const startDeg = centerDeg - 22.5;
                    const endDeg = centerDeg + 22.5;
                    const sr = degToRad(startDeg), er = degToRad(endDeg);
                    const midDeg = degToRad(centerDeg);

                    const x1o = cx + outerR * Math.cos(sr), y1o = cy + outerR * Math.sin(sr);
                    const x2o = cx + outerR * Math.cos(er), y2o = cy + outerR * Math.sin(er);
                    const x1i = cx + innerR * Math.cos(sr), y1i = cy + innerR * Math.sin(sr);
                    const x2i = cx + innerR * Math.cos(er), y2i = cy + innerR * Math.sin(er);

                    const starName = result.starMap[dir];
                    const star = STAR_NAMES[starName];
                    const style = getStarStyle(starName);
                    const isJi = star?.ji === '吉';

                    // 方位标签位置(外圈中间)
                    const labelR = (outerR + midR) / 2;
                    const labelX = cx + labelR * Math.cos(midDeg);
                    const labelY = cy + labelR * Math.sin(midDeg);

                    // 星名位置(内圈)
                    const starR = (midR + innerR) / 2;
                    const starX = cx + starR * Math.cos(midDeg);
                    const starY = cy + starR * Math.sin(midDeg);

                    // 标识坐向
                    const isSitting = sitting === dir;

                    return (
                      <g key={dir}>
                        {/* 扇区 */}
                        <path
                          d={`M${x1o},${y1o} L${x2o},${y2o} A${outerR},${outerR} 0 0,1 ${x2o},${y2o} L${x2o},${y2o}`}
                          fill="none" stroke="var(--border-light)" strokeWidth={0.5}
                        />
                        {/* 扇区背景 */}
                        <path
                          d={`M${x1o},${y1o} A${outerR},${outerR} 0 0,1 ${x2o},${y2o} L${x2i},${y2i} A${innerR},${innerR} 0 0,0 ${x1i},${y1i} Z`}
                          fill={isSitting ? 'rgba(0,0,0,0.06)' : isJi ? 'rgba(107,154,122,0.03)' : 'rgba(194,59,43,0.03)'}
                          stroke="var(--border-light)" strokeWidth={0.8}
                        />

                        {/* 方位名 */}
                        <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="central"
                          fontSize={14} fontWeight={700} fill="var(--text-primary)" fontFamily="var(--font-display)">
                          {dir}
                        </text>

                        {/* 星名 + 吉凶 */}
                        <text x={starX} y={starY - 8} textAnchor="middle" dominantBaseline="central"
                          fontSize={11} fontWeight={600} fill={style.color || 'var(--text-primary)'}>
                          {starName}
                        </text>
                        <text x={starX} y={starY + 10} textAnchor="middle" dominantBaseline="central"
                          fontSize={9} fill={isJi ? 'var(--wx-wood)' : 'var(--wx-fire)'}>
                          {star?.ji || '-'}
                        </text>

                        {/* 大门/主卧/厨房位置标记（门=蓝、卧=绿、厨=黄） */}
                        {[
                          door === dir ? { ch: '门', color: '#3d5a73' } : null,
                          bedroom === dir ? { ch: '卧', color: '#6b9a7a' } : null,
                          kitchen === dir ? { ch: '厨', color: '#c9a96e' } : null,
                        ].filter((m): m is { ch: string; color: string } => m !== null).map((m, k, arr) => {
                          const off = (k - (arr.length - 1) / 2) * 15;
                          const mr = degToRad(centerDeg + off);
                          const badgeR = 138;
                          const bx = cx + badgeR * Math.cos(mr);
                          const by = cy + badgeR * Math.sin(mr);
                          return (
                            <g key={m.ch}>
                              <circle cx={bx} cy={by} r={10} fill={m.color} stroke="var(--bg-card-solid)" strokeWidth={1.5} />
                              <text x={bx} y={by + 0.5} textAnchor="middle" dominantBaseline="central"
                                fontSize={9.5} fontWeight={700} fill="#fff">{m.ch}</text>
                            </g>
                          );
                        })}

                        {/* 坐向标记 */}
                        {isSitting && (
                          <circle cx={cx + (outerR + 10) * Math.cos(midDeg)} cy={cy + (outerR + 10) * Math.sin(midDeg)}
                            r={5} fill="var(--text-primary)" />
                        )}
                      </g>
                    );
                  });
                })()}

                {/* 中心 — 中宫 + 宅卦 */}
                <circle cx={200} cy={200} r={82} fill="rgba(0,0,0,0.02)" stroke="var(--border-light)" strokeWidth={1} />
                <text x={200} y={192} textAnchor="middle" fontSize={13} fontWeight={700}
                  fill="var(--text-primary)" fontFamily="var(--font-display)">中宫</text>
                <text x={200} y={210} textAnchor="middle" fontSize={12}
                  fill="var(--text-body)">{result.house.gua}宅</text>
                <text x={200} y={226} textAnchor="middle" fontSize={10}
                  fill="var(--text-secondary)">{result.house.type}</text>

                {/* 罗盘指针(指向坐方) */}
                {sitting && (() => {
                  const dirAngles: Record<string, number> = {
                    '南': -90, '西南': -45, '西': 0, '西北': 45,
                    '北': 90, '东北': 135, '东': 180, '东南': -135,
                  };
                  const angle = dirAngles[sitting] ?? 0;
                  const rad = (angle * Math.PI) / 180;
                  const needleLen = 70;
                  const nx = 200 + needleLen * Math.cos(rad);
                  const ny = 200 + needleLen * Math.sin(rad);
                  return (
                    <g>
                      <line x1={200} y1={200} x2={nx} y2={ny}
                        stroke="var(--wx-fire)" strokeWidth={2} strokeLinecap="round" />
                      <polygon
                        points={`${nx},${ny} ${200 + 10 * Math.cos(rad + 2.5)},${200 + 10 * Math.sin(rad + 2.5)} ${200 + 10 * Math.cos(rad - 2.5)},${200 + 10 * Math.sin(rad - 2.5)}`}
                        fill="var(--wx-fire)" />
                      <circle cx={200} cy={200} r={6} fill="var(--wx-fire)" opacity={0.5} />
                    </g>
                  );
                })()}

                {/* 十字线 */}
                <line x1={200} y1={18} x2={200} y2={382} stroke="var(--border-light)" strokeWidth={0.5} />
                <line x1={18} y1={200} x2={382} y2={200} stroke="var(--border-light)" strokeWidth={0.5} />
              </svg>
            </div>
            {/* 罗盘图例 */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', marginTop: 10, fontSize: 12.5, color: 'var(--text-secondary)' }}>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#3d5a73', marginRight: 4, verticalAlign: 'middle' }} />大门</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#6b9a7a', marginRight: 4, verticalAlign: 'middle' }} />主卧</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#c9a96e', marginRight: 4, verticalAlign: 'middle' }} />厨房</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: 'var(--text-primary)', marginRight: 4, verticalAlign: 'middle' }} />坐方</span>
            </div>
          </Card>

          {/* 三大功能区逐项诊断 */}
          {layoutScore && (
            <Card title={<span><Home size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />大门 · 主卧 · 厨房 逐项诊断与调整建议</span>} style={{ marginBottom: 16 }}>
              {([
                { key: '大门' as const, dir: door, star: layoutScore.doorStar, weight: '纳气之口，主全家财运与对外人缘' },
                { key: '主卧' as const, dir: bedroom, star: layoutScore.bedStar, weight: '停留时间最长，主健康、夫妻感情与精力' },
                { key: '厨房' as const, dir: kitchen, star: layoutScore.kitchenStar, weight: '饮食养命之所，主家人健康与食禄' },
              ]).map((item) => {
                const isJi = STAR_NAMES[item.star]?.ji === '吉';
                const score = STAR_SCORE[item.star] ?? 50;
                return (
                  <div key={item.key} style={{
                    marginBottom: 14, padding: '12px 14px', borderRadius: 8,
                    background: isJi ? 'rgba(107,154,122,0.04)' : 'rgba(194,59,43,0.04)',
                    border: `1px solid ${isJi ? 'rgba(107,154,122,0.15)' : 'rgba(194,59,43,0.12)'}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <Text strong style={{ fontSize: 15 }}>{item.key}</Text>
                        <Tag style={{ marginLeft: 8, background: 'transparent', border: 'none', color: 'var(--text-secondary)', padding: 0 }}>
                          {item.dir}方
                        </Tag>
                        <Tag color={isJi ? 'green' : 'red'} style={{ borderRadius: 10 }}>
                          {item.star}·{isJi ? '吉星' : '凶星'}
                        </Tag>
                      </div>
                      <Progress type="circle" size={48} percent={score}
                        strokeColor={isJi ? '#6b9a7a' : '#c23b2b'} trailColor="var(--border-light)" />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 6px' }}>{item.weight}</div>
                    <Paragraph style={{ fontSize: 13, marginBottom: 0, color: 'var(--text-body)' }}>
                      {DIAGNOSIS[item.key][item.star]}
                    </Paragraph>
                  </div>
                );
              })}
            </Card>
          )}

          {/* 凶位利用与化解 */}
          {result && (
            <Card title={<span><MapPin size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />剩余方位怎么用：凶位压制与吉位利用</span>} style={{ marginBottom: 16 }}>
              <Paragraph style={{ fontSize: 13, color: 'var(--text-body)' }}>
                <Text strong style={{ color: 'var(--wx-fire)' }}>凶位（绝命/五鬼/六煞/祸害）</Text>不要安排卧室、大门、沙发等长时间停留的地方，
                最适合做<Text strong>厕所、储藏室、衣柜、楼梯间</Text>——以"重物压凶、秽物制凶"，人不常待则凶气难发。
              </Paragraph>
              {DIRECTIONS.filter((d) => STAR_NAMES[result.starMap[d]]?.ji === '凶').map((d) => {
                const starName = result.starMap[d];
                const used = door === d ? '大门' : bedroom === d ? '主卧' : kitchen === d ? '厨房' : null;
                return (
                  <div key={d} style={{ fontSize: 13, padding: '6px 10px', marginBottom: 6, borderRadius: 6, background: 'rgba(194,59,43,0.03)' }}>
                    <Text strong>{d}方 · {starName}</Text>
                    {used
                      ? <Text style={{ color: 'var(--wx-fire)' }}>　⚠ 当前为{used}所在，请优先参考上方"逐项诊断"中的化解法调整</Text>
                      : <Text style={{ color: 'var(--text-secondary)' }}>　宜做厕所/储物/楼梯，人少停留即为化解</Text>}
                  </div>
                );
              })}
              <Divider style={{ margin: '10px 0' }} />
              <Paragraph style={{ fontSize: 13, color: 'var(--text-body)', marginBottom: 0 }}>
                <Text strong style={{ color: 'var(--wx-wood)' }}>吉位（生气/天医/延年/伏位）</Text>要留给人常用的地方：
                {DIRECTIONS.filter((d) => STAR_NAMES[result.starMap[d]]?.ji === '吉').map((d) => {
                  const starName = result.starMap[d];
                  const used = door === d ? '大门' : bedroom === d ? '主卧' : kitchen === d ? '厨房' : null;
                  return (
                    <Tag key={d} style={{ marginTop: 4, borderRadius: 10,
                      background: used ? 'rgba(107,154,122,0.12)' : 'rgba(107,154,122,0.05)',
                      color: 'var(--wx-wood)', border: 'none' }}>
                      {d}方·{starName}{used ? `（${used}✓）` : '（宜卧室/客厅/书房）'}
                    </Tag>
                  );
                })}
              </Paragraph>
            </Card>
          )}

          {/* 九星白话详解 */}
          <Card title="各方位九星详解（白话）" style={{ marginBottom: 16 }}>
            {DIRECTIONS.map((dir) => {
              const starName = result.starMap[dir];
              const detail = STAR_DETAIL[starName];
              if (!detail) return null;
              const hasDoor = door === dir;
              const hasBed = bedroom === dir;
              const hasKitchen = kitchen === dir;
              const isJi = STAR_NAMES[starName]?.ji === '吉';
              return (
                <div key={dir} style={{
                  marginBottom: 12, padding: '10px 14px', borderRadius: 8,
                  background: isJi ? 'var(--text-inverse)' : 'rgba(194,59,43,0.03)',
                  border: `1px solid ${isJi ? 'var(--border-light)' : 'rgba(194,59,43,0.08)'}`,
                }}>
                  <Text strong style={{ color: isJi ? 'var(--text-primary)' : 'var(--text-body)' }}>
                    {dir}方 — {starName}（{STAR_NAMES[starName]?.ji}）
                  </Text>
                  {hasDoor && <Tag style={{ marginLeft: 8, background: 'rgba(42,51,64,0.06)', color: 'var(--wx-water)', border: 'none' }}>大门在此</Tag>}
                  {hasBed && <Tag style={{ marginLeft: 4, background: 'rgba(107,154,122,0.06)', color: 'var(--wx-wood)', border: 'none' }}>卧室在此</Tag>}
                  {hasKitchen && <Tag style={{ marginLeft: 4, background: 'rgba(201,169,110,0.06)', color: 'var(--wx-earth)', border: 'none' }}>厨房在此</Tag>}
                  <Paragraph style={{ fontSize: 13, marginTop: 4, marginBottom: 2, color: 'var(--text-body)' }}>{detail.desc}</Paragraph>
                  <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>适合用途：{detail.suitable}</Text>
                </div>
              );
            })}
          </Card>
        </>
      )}
      {quotaModal}
    </div>
  );
}
