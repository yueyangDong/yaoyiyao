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
            <Paragraph style={{ fontSize: 14, color: 'var(--text-body)' }}>
              这件事从「{result.benGuaName}」的状态开始，
              中间经历「{result.huGuaName}」的变化过程，
              最终走向「{result.bianGuaName}」的结果。
              {result.benGuaName === result.bianGuaName
                ? '本卦和变卦相同，说明事情的整体性质不会发生根本改变，但过程中的细节需要注意。'
                : '本卦和变卦不同，说明这件事会有一个明显的转变，你需要关注变卦所代表的趋势来调整你的策略。'}
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
