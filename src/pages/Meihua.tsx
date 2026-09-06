import { useState, useEffect } from 'react';
import {
  Card, Button, InputNumber, Typography, Space, Divider,
  Tag, Row, Col, Radio, message, Descriptions, Alert,
} from 'antd';
import { ExperimentOutlined } from '@ant-design/icons';
import { Flower2 } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { calcMeiHua, calcMeiHuaFromDate, GUA_NAMES, GUA_SYMBOLS, GUA_WUXING, MeiHuaResult } from '../utils/meihuaUtils';
import { useDailyQuota } from '../hooks/useDailyQuota';

const { Title, Text, Paragraph } = Typography;

// 六十四卦意象（中性短语，适配本卦/互卦/变卦三种语境）
const GUA_IMAGERY: Record<string, string> = {
  '乾为天': '刚健进取，能量充沛，主动权在手',
  '坤为地': '柔顺承载，配合与包容比主导更有利',
  '水雷屯': '如春芽破土，起步维艰但生机已现',
  '山水蒙': '信息不足、方向未明，需要先学习和请教',
  '水天需': '需要耐心等待，条件正在成熟',
  '天水讼': '存在分歧争拗，硬碰硬不如各退一步',
  '地水师': '需要集结众人之力，纪律和名分是关键',
  '水地比': '亲近合作之象，选对伙伴事半功倍',
  '风天小畜': '小有积蓄，力量未足，宜小步积累',
  '天泽履': '如履虎尾，处境微妙，谨慎言行可保平安',
  '地天泰': '天地交泰，上下通畅，顺势有为',
  '天地否': '闭塞不通，宜守不宜进，静待转机',
  '天火同人': '志同道合者相聚，公开坦荡则吉',
  '火天大有': '丰盛富有，资源充足，宜谦以处之',
  '地山谦': '谦逊低调，反而能成事',
  '雷地豫': '顺时而动则安乐，但忌得意忘形',
  '泽雷随': '随顺时势，跟人跟势不跟面子',
  '山风蛊': '积弊显露，整治旧问题才能开新局',
  '地泽临': '阳气渐盛，机遇临近，宜主动把握',
  '风地观': '宜观察审视，看清再动',
  '火雷噬嗑': '有梗阻需要果断排除，咬碎障碍',
  '山火贲': '重修饰包装，形式虽美需防华而不实',
  '山地剥': '剥落消耗，根基受侵蚀，宜固守自保',
  '地雷复': '一阳来复，转机初现，宜顺势而为',
  '天雷无妄': '不妄为则吉，意外之事需坦然面对',
  '山天大畜': '大的积蓄，厚积薄发之象',
  '山雷颐': '颐养之道，管住嘴、稳住心、养实力',
  '泽风大过': '负担过重、压力失衡，需要卸力调整',
  '坎为水': '险陷重重，以诚信和定力突围',
  '离为火': '光明依附，找对依靠才能持续发光',
  '泽山咸': '相互感应，以诚动人，感情与合作易成',
  '雷风恒': '恒久稳定，守常持久比求变更重要',
  '天山遁': '退避保全，急流勇退不是认输',
  '雷天大壮': '声势正盛，切忌恃强冒进',
  '火地晋': '旭日东升，晋升发展之象',
  '地火明夷': '光明受伤，宜收敛锋芒、外晦内明',
  '风火家人': '内部和睦是根本，先齐家后成事',
  '火泽睽': '意见相左、貌合神离，求同存异为上',
  '水山蹇': '前有险阻，宜退不宜进，贵人相助可解',
  '雷水解': '困局消解，把握时机宜快不宜拖',
  '山泽损': '先损后益，眼前吃亏是为了长远',
  '风雷益': '增益相助，利有所往，宜大展拳脚',
  '泽天夬': '当断则断，果决清除隐患',
  '天风姤': '不期而遇，谨防一时冲动带来后患',
  '泽地萃': '聚集汇拢，聚众成事需防闲言',
  '地风升': '步步上升，积小成大',
  '泽水困': '身处困境，守志不移，少说多做',
  '水风井': '如井水养人，守好根本、修己安人',
  '泽火革': '变革在即，顺天应人则成',
  '火风鼎': '鼎新稳重，建立新秩序、新根基',
  '震为雷': '惊雷动荡，临危不乱者胜',
  '艮为山': '当止则止，静守比盲动更明智',
  '风山渐': '循序渐进，欲速则不达',
  '雷泽归妹': '名分未定、位置尴尬，急于求进易生波折',
  '雷火丰': '丰盛鼎盛，也须防盛极而衰',
  '火山旅': '行旅在外，谨慎谦柔则安',
  '巽为风': '如风渗透，柔缓推进反而深入',
  '兑为泽': '喜悦交流，和气生财，防口舌过度',
  '风水涣': '涣散之时，先聚拢人心再做事',
  '水泽节': '节制有度，过紧过松都不好',
  '风泽中孚': '诚信为本，心诚则灵',
  '雷山小过': '小有越过，宜小不宜大，宜下不宜上',
  '水火既济': '事已成局，守成防乱是关键',
  '火水未济': '差一步未成，行百里者半九十',
};

// 三卦串联解读（本卦→互卦→变卦像讲故事）
function getThreeGuaStory(benName: string, huName: string, bianName: string, dongYao: number): string {
  const ben = GUA_IMAGERY[benName] || `呈现出「${benName}」的状态，需要结合卦象细细体会`;
  const hu = GUA_IMAGERY[huName] || `会遇到「${huName}」所示的波折和转折，需要灵活应对`;
  const bian = GUA_IMAGERY[bianName] || `走向「${bianName}」所示的趋势`;

  let story = '';
  story += `这件事的开端（${benName}）：${ben}。` + '\n\n';
  story += `发展的过程（${huName}）：${hu}。` + '\n\n';
  story += `最终的走向（${bianName}）：${bian}。`;

  if (dongYao <= 3) {
    story += '\n\n动爻位置偏低，变化出现在事情的前期——开局的局面很快会改变，不必太纠结于当下的状态。';
  } else {
    story += '\n\n动爻位置偏高，变化出现在事情的中后期——前期可以按部就班推进，但到了关键时刻要果断调整。';
  }

  if (benName === bianName) {
    story += '\n\n本卦与变卦相同，说明这件事的性质不会发生根本改变。看似走了很远，其实一直围绕着核心问题在转——把根本问题解决了，结果自然就好。';
  }

  return story;
}

// 体用关系 → 颜色（吉绿/凶红/中性蓝）
const RELATION_COLORS: Record<string, string> = {
  '体用比和': 'var(--wx-wood)',
  '用生体': 'var(--wx-wood)',
  '体克用': 'var(--wx-water)',
  '体生用': 'var(--color-warn)',
  '用克体': 'var(--wx-fire)',
};

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
  const { tryConsume, quotaModal } = useDailyQuota('meihua');
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

  const handleCalc = async () => {
    if (mode !== 'date' && (!num1 || !num2 || !num3)) { message.warning('请输入三个数字'); return; }
    if (!(await tryConsume())) return;
    try {
      let res: MeiHuaResult;
      if (mode === 'date') {
        res = calcMeiHuaFromDate();
      } else {
        res = calcMeiHua(num1!, num2!, num3!);
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
                    <Text strong style={{ fontSize: 18, color: RELATION_COLORS[result.relation] || 'var(--text-primary)' }}>
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

            {/* 变卦参断：定结局吉凶 */}
            <Divider style={{ margin: '12px 0' }} />
            <Row gutter={[16, 8]} align="middle">
              <Col xs={24} md={10}>
                <Text style={{ color: 'var(--text-secondary)' }}>
                  变卦参断（结局）：变出之卦五行属「{result.bianYongWuxing}」，对体卦为
                </Text>
                <Text strong style={{ marginLeft: 6, fontSize: 16, color: result.bianRelation.includes('吉') || result.bianRelation === '体用比和' || result.bianRelation === '用生体' ? 'var(--wx-wood)' : result.bianRelation === '用克体' ? 'var(--wx-fire)' : 'var(--text-primary)' }}>
                  {result.bianRelation}
                </Text>
              </Col>
              <Col xs={24} md={14}>
                <Text style={{ fontSize: 13, color: 'var(--text-body)' }}>
                  本卦体用看当下格局，变卦参断定最终结局。{result.bianJudgement}
                </Text>
              </Col>
            </Row>
          </Card>
        </>
      )}
      {quotaModal}
    </div>
  );
}
