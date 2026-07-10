import { useState, useEffect } from 'react';
import {
  Card, Button, InputNumber, Typography, Space, Divider,
  Tag, Row, Col, Radio, message, Descriptions, Alert,
} from 'antd';
import { ExperimentOutlined } from '@ant-design/icons';
import { Flower2 } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { calcMeiHua, calcMeiHuaFromDate, GUA_NAMES, GUA_SYMBOLS, GUA_WUXING, MeiHuaResult } from '../utils/meihuaUtils';

const { Title, Text, Paragraph } = Typography;

// 三卦串联解读（本卦→互卦→变卦像讲故事）
function getThreeGuaStory(benName: string, huName: string, bianName: string, dongYao: number): string {
  const stories: Record<string, string> = {
    '乾为天': '事情以一种强势、主动的姿态开始，你有着充足的行动力。',
    '坤为地': '事情从接纳、顺从开始，外部环境是主导力量。',
    '水雷屯': '开始阶段充满艰难，像春天种子破土，需要耐心。',
    '山水蒙': '开始时信息不明朗，像雾里看花，需要先搞清楚状况。',
    '水天需': '开始阶段处于等待状态，事情尚在酝酿中。',
    '天水讼': '一开始就存在分歧或争议，需要妥善沟通。',
    '地水师': '开始就意识到需要团队或外援，一个人搞不定。',
    '水地比': '开始阶段有利好的人际关系或合作机会。',
    '风天小畜': '开始阶段是小步积累，进展缓慢但持续。',
    '天泽履': '开始阶段需要谨慎行事，环境中存在风险因素。',
    '地天泰': '开始阶段顺风顺水，天地交泰大吉大利。',
    '天地否': '开始阶段闭塞不通，需要先打破隔阂。',
    '天火同人': '开始阶段需要找到志同道合的人。',
    '火天大有': '开始阶段资源充足，大有可为。',
    '地山谦': '开始阶段需要保持谦虚低调的态度。',
    '雷地豫': '开始阶段心情愉悦，但要防止乐极生悲。',
    '泽雷随': '开始阶段需要顺应时势，不宜逆行。',
    '山风蛊': '开始阶段发现积弊，需要拨乱反正。',
    '地泽临': '开始阶段机遇来临，要把握时机。',
    '风地观': '开始阶段宜多观察，少行动。',
    '火雷噬嗑': '开始阶段有阻碍需要咬碎，需要决断力。',
    '山火贲': '开始阶段注重外表包装，内在尚需充实。',
    '山地剥': '开始阶段有人事变动或消耗，宜守不宜攻。',
    '地雷复': '开始阶段是复兴之始，阳气回暖。',
    '天雷无妄': '开始阶段纯任天然，不妄为反而是最好的作为。',
    '山天大畜': '开始阶段是大积累的前奏，准备越多越好。',
    '山雷颐': '开始阶段需要养精蓄锐，管好自己的事。',
    '泽风大过': '开始阶段存在过度或失衡，调平衡是关键。',
    '坎为水': '开始阶段如同涉水过河，需要谨慎和毅力。',
    '离为火': '开始阶段明亮清晰，但要注意依附对的人。',
  };

  let story = '';
  story += '这件事开始的时候，' + (stories[benName] || `呈现出「${benName}」的状态，需要根据卦象判断方向。`) + '\n\n';
  story += '过程中，' + (stories[huName] || `会遇到「${huName}」所示的波折和转折，需要灵活应对。`) + '\n\n';
  story += '最终的结果偏向' + (stories[bianName] || `「${bianName}」所示的趋势。`);

  if (dongYao <= 3) {
    story += '变化出现在前期，开局的局面很快会改变，不用太纠结于当下的状态。';
  } else {
    story += '变化出现在中后期，前期可以按部就班，但到了关键时刻要果断调整。';
  }

  if (benName === bianName) {
    story += '\n\n本卦与变卦相同，说明这件事的性质不会发生根本改变。看似走了很远，其实一直围绕着核心问题在转——把根本问题解决了，结果自然就好。';
  }

  return story;
}

// 详细体用生克白话
const TIYONG_DETAIL: Record<string, { title: string; desc: string; advice: string }> = {
  '体用比和': {
    title: '体用比和 —— 大吉',
    desc: '体卦和用卦五行相同，就像两个好朋友志同道合。外部环境和你自身状态是一致的，做什么都顺风顺水。事情会按照你期望的方向发展，不需要太费力就能有好的结果。',
    advice: '建议：趁势而上，现在正是好时机，不要犹豫。',
  },
  '用生体': {
    title: '用生体 —— 大吉',
    desc: '用卦的五行生体卦，意味着外部环境在主动帮助你。就好像有贵人在背后推你一把，事情会比你预想的还要顺利。你在意的事情，外部条件都在给你助力。',
    advice: '建议：大胆去做，现在是"天时地利人和"的阶段，成功的概率很高。',
  },
  '体生用': {
    title: '体生用 —— 小吉',
    desc: '体卦生用卦，你在为外部环境付出。事情能成，但需要你主动投入精力、时间或资源。就像种庄稼——你付出了耕耘和汗水，秋后才能收获。着急不来。',
    advice: '建议：事情能成，但需要耐心，一步一步来。过程中可能会有消耗感，但结果是好的。',
  },
  '体克用': {
    title: '体克用 —— 小吉',
    desc: '体卦克用卦，你能掌控外部环境。但就像用拳头砸墙，你虽然能赢但要费些力气。需要你主动出击、积极争取，事情才能往好的方向发展。',
    advice: '建议：你有主动权，但不要过于强势。注意方式方法，硬来可能会导致不必要的冲突。',
  },
  '用克体': {
    title: '用克体 —— 凶',
    desc: '用卦克体卦，外部环境在压制你。就像逆水行舟，做什么都不太顺畅。可能会遇到阻力、反对意见或者意想不到的困难。这不代表完全没有希望，但需要你格外谨慎。',
    advice: '建议：目前不宜大动干戈，先观察局势，等待时机。可以做一些小调整，但大的决策最好暂缓。',
  },
};

export default function Meihua() {
  const { currentUser, addHistory } = useUser();
  const [mode, setMode] = useState<'date' | 'manual'>('date');
  const [num1, setNum1] = useState<number | null>(null);
  const [num2, setNum2] = useState<number | null>(null);
  const [num3, setNum3] = useState<number | null>(null);
  const [result, setResult] = useState<MeiHuaResult | null>(null);

  useEffect(() => {
    if (currentUser && num1 === null && num2 === null && num3 === null) {
      setNum1(currentUser.birthYear);
      setNum2(currentUser.birthMonth);
      setNum3(currentUser.birthDay);
    }
  }, [currentUser]);

  const handleCalc = () => {
    try {
      let res: MeiHuaResult;
      if (mode === 'date') {
        res = calcMeiHuaFromDate();
      } else {
        if (!num1 || !num2 || !num3) { message.warning('请输入三个数字'); return; }
        res = calcMeiHua(num1, num2, num3);
      }
      setResult(res);
      message.success('起卦完成');
      addHistory({
        userId: currentUser?.id || '',
        module: 'meihua',
        queryParams: { mode, num1, num2, num3 },
        resultSummary: `梅花易数：${res.benGuaName}${res.benGuaSymbol} → ${res.bianGuaName}${res.bianGuaSymbol}（${res.relation}）`,
      });
    } catch { message.error('计算出错，请检查输入'); }
  };

  const getWxColor = (wx: string) => {
    const colors: Record<string, string> = {
      '金': 'var(--wx-metal)',
      '木': 'var(--wx-wood)',
      '水': 'var(--wx-water)',
      '火': 'var(--wx-fire)',
      '土': 'var(--wx-earth)',
    };
    return colors[wx] || 'var(--text-secondary)';
  };

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <Title
          level={3}
          style={{
            textAlign: 'center',
            fontFamily: 'var(--font-display)',
            color: 'var(--text-primary)',
            fontWeight: 600,
            fontSize: 'var(--text-2xl)',
            margin: 0,
          }}
        >
          <Flower2 size={24} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          梅花易数
        </Title>
      </div>

      <Card style={{ marginBottom: 16, borderColor: 'var(--border-light)' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong style={{ color: 'var(--text-primary)' }}>起卦方式：</Text>
            <Radio.Group value={mode} onChange={(e) => { setMode(e.target.value); setResult(null); }} style={{ marginLeft: 12 }}>
              <Radio.Button value="date">当前时间起卦</Radio.Button>
              <Radio.Button value="manual">手动输入数字</Radio.Button>
            </Radio.Group>
          </div>
          {mode === 'manual' && (
            <Row gutter={8} align="middle">
              <Col><InputNumber min={1} placeholder="上卦数" value={num1} onChange={setNum1} style={{ width: 100 }} /></Col>
              <Col><InputNumber min={1} placeholder="下卦数" value={num2} onChange={setNum2} style={{ width: 100 }} /></Col>
              <Col><InputNumber min={1} placeholder="动爻数" value={num3} onChange={setNum3} style={{ width: 100 }} /></Col>
              <Col><Text style={{ color: 'var(--text-secondary)' }}>输入3个数（如日期、门牌号、随意数字）</Text></Col>
            </Row>
          )}
          <Button type="primary" size="large" icon={<ExperimentOutlined />} onClick={handleCalc}>
            {mode === 'date' ? '时间起卦' : '数字起卦'}
          </Button>
        </Space>
      </Card>

      {result && (
        <>
          {/* 三卦：开始-过程-结果 */}
          <Card
            title={<span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>本卦 → 互卦 → 变卦（事情发展的三个阶段）</span>}
            style={{ marginBottom: 16, borderColor: 'var(--border-light)' }}
          >
            <Alert
              message="本卦代表事情的开始/现状，互卦代表中间发展过程，变卦代表最终结果/变化趋势。三卦串联起来就是事情从开始到结束的完整故事。"
              type="info" showIcon style={{ marginBottom: 16 }}
            />
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Card size="small" title={<span style={{ color: 'var(--text-primary)' }}>本卦 · 开始</span>} className="mystic-card" style={{ textAlign: 'center', borderColor: 'var(--border-light)' }}>
                  <div style={{ fontSize: 48 }}>{result.benGuaSymbol}</div>
                  <Title level={5} style={{ color: 'var(--text-primary)' }}>{result.benGuaName}</Title>
                  <Text style={{ color: 'var(--text-secondary)' }}>代表：你当前的状况、事情的开端</Text>
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card size="small" title={<span style={{ color: 'var(--text-primary)' }}>互卦 · 过程</span>} style={{ textAlign: 'center', borderColor: 'var(--border-light)' }}>
                  <div style={{ fontSize: 48 }}>{result.huGuaSymbol}</div>
                  <Title level={5} style={{ color: 'var(--text-primary)' }}>{result.huGuaName}</Title>
                  <Text style={{ color: 'var(--text-secondary)' }}>代表：事情发展的中间阶段</Text>
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card size="small" title={<span style={{ color: 'var(--text-primary)' }}>变卦 · 结果</span>} style={{ textAlign: 'center', borderColor: 'var(--border-light)' }}>
                  <div style={{ fontSize: 48 }}>{result.bianGuaSymbol}</div>
                  <Title level={5} style={{ color: 'var(--text-primary)' }}>{result.bianGuaName}</Title>
                  <Text style={{ color: 'var(--text-secondary)' }}>代表：事情的最终走向（动爻：第{result.dongYao}爻）</Text>
                </Card>
              </Col>
            </Row>

            <Divider>三卦串联解读</Divider>
            <Paragraph style={{ fontSize: 14, color: 'var(--text-body)', whiteSpace: 'pre-line', lineHeight: 2 }}>
              {getThreeGuaStory(result.benGuaName, result.huGuaName, result.bianGuaName, result.dongYao)}
            </Paragraph>
          </Card>

          {/* 体用分析 */}
          <Card
            title={<span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>体用生克分析</span>}
            style={{ marginBottom: 16, borderColor: 'var(--border-light)' }}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} md={10}>
                <Descriptions column={1} bordered size="small">
                  <Descriptions.Item label="体卦（你自己）">
                    <Tag color={getWxColor(result.tiWuxing)} style={{ fontSize: 14 }}>
                      {GUA_SYMBOLS[result.tiGua]} {GUA_NAMES[result.tiGua]}（{result.tiWuxing}）
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="用卦（外部环境）">
                    <Tag color={getWxColor(result.yongWuxing)} style={{ fontSize: 14 }}>
                      {GUA_SYMBOLS[result.yongGua]} {GUA_NAMES[result.yongGua]}（{result.yongWuxing}）
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="体用关系">
                    <Text strong style={{ fontSize: 18, color: result.relation.includes('吉') ? 'var(--wx-wood)' : 'var(--wx-fire)' }}>
                      {result.relation}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="五行生克">
                    <Text style={{ color: 'var(--text-body)' }}>
                      体({result.tiWuxing}) {' '}
                      {result.relation.includes('体生') ? '→生→' : result.relation.includes('用生') ? '←生←' : result.relation.includes('体克') ? '→克→' : result.relation.includes('用克') ? '←克←' : '⇄比和⇄'}
                      {' '} 用({result.yongWuxing})
                    </Text>
                  </Descriptions.Item>
                </Descriptions>
              </Col>
              <Col xs={24} md={14}>
                {TIYONG_DETAIL[result.relation] ? (
                  <div style={{ padding: 12, borderRadius: 8 }}>
                    <Title level={5} style={{ color: 'var(--text-primary)' }}>{TIYONG_DETAIL[result.relation].title}</Title>
                    <Paragraph style={{ fontSize: 14, color: 'var(--text-body)' }}>{TIYONG_DETAIL[result.relation].desc}</Paragraph>
                    <Paragraph style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {TIYONG_DETAIL[result.relation].advice}
                    </Paragraph>
                  </div>
                ) : (
                  <Paragraph style={{ color: 'var(--text-body)' }}>{result.judgement}</Paragraph>
                )}
              </Col>
            </Row>
          </Card>
        </>
      )}
    </div>
  );
}
