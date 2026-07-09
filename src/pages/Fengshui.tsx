import { useState, useMemo, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import {
  Card, Select, Button, Typography, Space, Divider,
  Tag, Row, Col, Descriptions, Tooltip, InputNumber, Radio, Alert,
} from 'antd';
import { HomeOutlined, UserOutlined } from '@ant-design/icons';
import {
  HOUSE_DIRECTIONS, STAR_NAMES, GONGE_POSITIONS,
  calcFengshui, Direction, FengshuiResult,
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

// 计算东四命/西四命
function calcMingGua(year: number, gender: 'male' | 'female'): { guaNum: number; guaName: string; type: string } {
  // 简化：用年份后两位之和
  const yearStr = String(year);
  let sum = 0;
  for (const ch of yearStr) sum += parseInt(ch);
  // 计算命卦：男命 (100 - 年份和) % 9，女命 (年份和 - 4) % 9
  let guaNum: number;
  if (gender === 'male') {
    guaNum = (100 - sum) % 9;
    if (guaNum === 0) guaNum = 9;
  } else {
    guaNum = (sum - 4) % 9;
    if (guaNum === 0) guaNum = 9;
    if (guaNum < 0) guaNum += 9;
  }

  const guaNames: Record<number, string> = { 1: '坎', 2: '坤', 3: '震', 4: '巽', 5: '坤', 6: '乾', 7: '兑', 8: '艮', 9: '离' };
  const eastTypes = [1, 3, 4, 9];
  const guaName = guaNames[guaNum] || '未知';
  const type = eastTypes.includes(guaNum) ? '东四命' : '西四命';

  return { guaNum, guaName, type };
}

export default function Fengshui() {
  const { currentUser, addHistory } = useUser();
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
    const isMatch = houseType === personType;
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

  const handleCalc = () => {
    if (!sitting || !door || !bedroom || !kitchen) return;
    const res = calcFengshui(sitting, door, bedroom, kitchen);
    setResult(res);
    addHistory({
      userId: currentUser?.id || '',
      module: 'fengshui',
      queryParams: { sitting, door, bedroom, kitchen },
      resultSummary: `风水相宅：坐${sitting}向${door}（${res?.house?.gua ?? ''}宅·${res?.house?.type ?? ''}）`,
    });
  };

  const getStarStyle = (starName: string) => {
    const star = STAR_NAMES[starName];
    if (!star) return {};
    return star.ji === '吉'
      ? { background: '#f6ffed', color: '#52c41a', borderColor: '#b7eb8f' }
      : { background: '#fff2f0', color: '#ff4d4f', borderColor: '#ffa39e' };
  };

  return (
    <div style={{ padding: '16px 0' }}>
      <Title level={3} style={{ textAlign: 'center', color: '#8b4513' }}>风水相宅</Title>

      {/* 宅主信息 */}
      <Card title={<><UserOutlined /> 宅主信息（选填，用于人宅匹配）</>} size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Text>出生年份：</Text>
          <InputNumber min={1940} max={2010} placeholder="1990" value={ownerYear} onChange={setOwnerYear} style={{ width: 100 }} />
          <Text>性别：</Text>
          <Radio.Group value={ownerGender} onChange={(e) => setOwnerGender(e.target.value)}>
            <Radio.Button value="male">男</Radio.Button>
            <Radio.Button value="female">女</Radio.Button>
          </Radio.Group>
          {ownerMingGua && (
            <Tag color={ownerMingGua.type === '东四命' ? 'blue' : 'orange'}>
              {ownerMingGua.type} · {ownerMingGua.guaName}命
            </Tag>
          )}
        </Space>
        <Paragraph style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
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
          <Button type="primary" size="large" icon={<HomeOutlined />} onClick={handleCalc}
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

          <Card title="宅卦信息" style={{ marginBottom: 16 }}>
            <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
              <Descriptions.Item label="住宅坐向">{result.house.name}</Descriptions.Item>
              <Descriptions.Item label="宅卦"><Tag color="purple">{result.house.gua}宅</Tag></Descriptions.Item>
              <Descriptions.Item label="宅型">
                <Tag color={result.house.type === '东四宅' ? 'blue' : 'orange'}>{result.house.type}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="分析"><Text>{result.analysis}</Text></Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="九宫方位吉凶图" style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, maxWidth: 360, margin: '0 auto' }}>
              {GONGE_POSITIONS.map((pos) => {
                if (pos.direction === '中') {
                  return (
                    <div key="center" style={{ padding: 12, textAlign: 'center', background: '#f0f0f0', borderRadius: 4, minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Text type="secondary">中宫</Text>
                    </div>
                  );
                }
                const starName = result.starMap[pos.direction];
                const star = STAR_NAMES[starName];
                const style = getStarStyle(starName);
                return (
                  <Tooltip key={pos.direction} title={STAR_DETAIL[starName]?.desc || ''}>
                    <div style={{ padding: 8, textAlign: 'center', borderRadius: 4, minHeight: 85, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: `2px solid ${style.borderColor || '#d9d9d9'}`, background: style.background || '#fff', cursor: 'pointer' }}>
                      <Text strong style={{ fontSize: 12, color: style.color }}>{pos.label}</Text>
                      <Text style={{ fontSize: 12, color: style.color }}>{starName}</Text>
                      <Tag color={star?.ji === '吉' ? 'success' : 'error'} style={{ fontSize: 10, marginTop: 2 }}>{star?.ji || '-'}</Tag>
                    </div>
                  </Tooltip>
                );
              })}
            </div>
          </Card>

          {/* 九星白话详解 */}
          <Card title="各方位九星详解（白话）" style={{ marginBottom: 16 }}>
            {DIRECTIONS.map((dir) => {
              const starName = result.starMap[dir];
              const detail = STAR_DETAIL[starName];
              if (!detail) return null;
              const hasDoor = door === dir;
              const hasBed = bedroom === dir;
              const hasKitchen = kitchen === dir;
              return (
                <div key={dir} style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 6, background: STAR_NAMES[starName]?.ji === '吉' ? '#f6ffed' : '#fff2f0' }}>
                  <Text strong>{dir}方 — {starName}（{STAR_NAMES[starName]?.ji}）</Text>
                  {hasDoor && <Tag color="blue" style={{ marginLeft: 8 }}>大门在此</Tag>}
                  {hasBed && <Tag color="green" style={{ marginLeft: 4 }}>卧室在此</Tag>}
                  {hasKitchen && <Tag color="orange" style={{ marginLeft: 4 }}>厨房在此</Tag>}
                  <Paragraph style={{ fontSize: 13, marginTop: 4, marginBottom: 2 }}>{detail.desc}</Paragraph>
                  <Text style={{ fontSize: 12, color: '#1890ff' }}>适合用途：{detail.suitable}</Text>
                </div>
              );
            })}
          </Card>
        </>
      )}
    </div>
  );
}
