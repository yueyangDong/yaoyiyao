import { useState, useMemo } from 'react';
import {
  Card, Button, Typography, Space, Tag, Divider,
  Row, Col, Radio, message, Alert, Collapse, Select, Descriptions,
} from 'antd';
import { Sparkles, RefreshCw, HelpCircle } from 'lucide-react';
import { dayan, decodePan, threeNumberQiGua, manualQiGua } from 'iching-shifa';
import gua64 from '@freizl/yijing/zh-CN/64gua.json';
import { useUser } from '../context/UserContext';
import CollapsibleCard from '../components/CollapsibleCard';
import { generateLiuyaoPlainConclusion } from '../utils/plainConclusion';
import PlainConclusionCard from '../components/PlainConclusionCard';
import { renderWithTerms } from '../utils/renderWithTerms';
import { useDailyQuota } from '../hooks/useDailyQuota';

const { Title, Text, Paragraph } = Typography;

// 用神映射
const YONGSHEN_MAP: Record<string, string> = {
  '事业': '官鬼', '财运': '妻财', '感情(男)': '妻财',
  '感情(女)': '官鬼', '学业': '父母', '子女': '子孙',
  '父母': '父母', '合作': '兄弟', '疾病': '官鬼',
  '官司': '官鬼', '房子': '父母',
};

const YONGSHEN_GUIDE = [
  { question: '事业/工作/考试', liuqin: '官鬼', reason: '官鬼代表官方、上司、规则。问事业就看官鬼旺不旺。' },
  { question: '财运/生意', liuqin: '妻财', reason: '妻财代表钱财收入。财爻旺且受生则财运好。' },
  { question: '感情(女问男)/婚姻', liuqin: '官鬼', reason: '女命看官鬼(丈夫星)，旺相有气则感情顺利。' },
  { question: '感情(男问女)/婚姻', liuqin: '妻财', reason: '男命看妻财(妻子星)。' },
  { question: '学业/考试/父母', liuqin: '父母', reason: '父母爻代表文书、学历、长辈。' },
  { question: '子女/晚辈', liuqin: '子孙', reason: '子孙爻代表孩子、下属。子孙旺则晚辈有出息。' },
];

// 六亲状态白话
const LIUQIN_STATUS: Record<string, string> = {
  '用神受生': '好消息！用神被生助，事情有外力帮助，会越来越顺利。',
  '用神受克': '不太理想。用神被克制，有人或事在妨碍你关心的这件事。',
  '用神旬空': '用神逢空亡，事情目前"空"——还没落实、有名无实、或时候未到。',
  '用神入墓': '用神入墓库，事情"被关着"，暂时发挥不出来。待冲出墓库时才能见分晓。',
  '用神旺相': '用神得月建或日辰生扶，事情处于上升期，时机不错。',
  '用神休囚': '用神失月建之助，力量不足。不是最佳时机，先准备积蓄力量。',
  '世应': '世爻=你自己，应爻=对方/外部环境。应爻生世爻→外界对你有利。',
};

// 六爻SVG卦象组件
function HexagramSVG({ yaoList, size = 180 }: { yaoList: any[]; size?: number }) {
  const w = size, h = size * 0.9;
  const lineW = size * 0.65, lineH = 7, cornerR = 3;
  const gap = (h - 16) / 6, startY = 8;
  const cx = w / 2;
  const lines = [...yaoList].reverse(); // top(6th) → bottom(1st)

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ maxWidth: w }}>
      {lines.map((yao: any, i: number) => {
        const y = startY + i * gap;
        const isYang = yao.yaoValue === 7 || yao.yaoValue === 9;
        const isMoving = yao.isMoving;
        const baseColor = isMoving ? 'var(--text-primary)' : 'var(--text-disabled)';

        return (
          <g key={i}>
            {/* 世应标记 */}
            <text x={cx - lineW / 2 - 10} y={y + 5} textAnchor="end" fontSize={10}
              fill={yao.shiYing === '世' ? 'var(--wx-wood)' : 'var(--wx-water)'} fontWeight={600}>
              {yao.shiYing === '世' ? '世' : yao.shiYing === '应' ? '应' : ''}
            </text>

            {isYang ? (
              <rect x={cx - lineW / 2} y={y - lineH / 2} width={lineW} height={lineH}
                rx={cornerR} fill={baseColor} opacity={isMoving ? 1 : 0.45} />
            ) : (
              <>
                <rect x={cx - lineW / 2} y={y - lineH / 2} width={lineW * 0.42}
                  height={lineH} rx={cornerR} fill={baseColor} opacity={isMoving ? 1 : 0.45} />
                <rect x={cx + lineW / 2 - lineW * 0.42} y={y - lineH / 2}
                  width={lineW * 0.42} height={lineH} rx={cornerR} fill={baseColor} opacity={isMoving ? 1 : 0.45} />
              </>
            )}

            {/* 动爻标记 */}
            {isMoving && (
              <g>
                <circle cx={cx + lineW / 2 + 16} cy={y} r={9} fill="none"
                  stroke="var(--wx-fire)" strokeWidth={1.5} opacity={0.8}>
                  <animate attributeName="r" values="9;12;9" dur="1.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.5s" repeatCount="indefinite" />
                </circle>
                <text x={cx + lineW / 2 + 16} y={y + 4} textAnchor="middle" fontSize={13}
                  fill="var(--wx-fire)" fontWeight="bold">
                  {isYang ? '○' : '×'}
                </text>
              </g>
            )}

            {/* 爻位号 */}
            <text x={cx - lineW / 2 - 24} y={y + 5} textAnchor="end" fontSize={9}
              fill="var(--text-disabled)">{yao.position}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Liuyao() {
  const { currentUser, addHistory } = useUser();
  const { tryConsume, quotaModal } = useDailyQuota('liuyao');
  const [mode, setMode] = useState<'dayan' | 'threeNum' | 'manual'>('dayan');
  const [pan, setPan] = useState<any>(null);
  const [yongShenType, setYongShenType] = useState<string | null>(null);
  const [yongShenAnalysis, setYongShenAnalysis] = useState<string>('');
  const [dayanLog, setDayanLog] = useState<string[]>([]);

  // 手动数字
  const [num1, setNum1] = useState<number | undefined>(undefined);
  const [num2, setNum2] = useState<number | undefined>(undefined);
  const [num3, setNum3] = useState<number | undefined>(undefined);
  const [manualYaoValues, setManualYaoValues] = useState<number[]>([7, 7, 7, 7, 7, 7]);

  const now = new Date();

  const handleDayan = async () => {
    if (!(await tryConsume())) return;
    try {
      const log: string[] = [];
      log.push('=== 大衍筮法 (iching-shifa) ===');
      log.push('调用 dayan() 自动完成四营三变，生成六爻...');

      const yaoString = dayan();
      log.push(`生成的爻值序列：${yaoString}`);

      const result = decodePan(yaoString, {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
        hour: now.getHours(),
      });

      log.push(`本卦：${result.benGua.guaName}`);
      log.push(`变卦：${result.zhiGua?.guaName || '无'}`);
      log.push(`互卦：${result.huGua?.guaName || '无'}`);
      log.push(`动爻数：${result.dongYaoCount}`);

      setDayanLog(log);
      setPan(result);
      setYongShenAnalysis('');
      message.success('起卦完成');
      addHistory({
        userId: currentUser?.id || '',
        module: 'liuyao',
        queryParams: { mode: 'dayan' },
        resultSummary: `六爻大衍：${result.benGua.guaName}→${result.zhiGua?.guaName || '无变卦'}`,
      });
    } catch (e: any) {
      console.error('大衍筮法错误：', e);
      message.error('起卦失败：' + (e.message || '未知错误'));
    }
  };

  const handleThreeNum = async () => {
    if (!num1 || !num2 || !num3) {
      message.warning('请输入三个数字');
      return;
    }
    if (!(await tryConsume())) return;
    try {
      const yaoString = threeNumberQiGua(num1, num2, num3);
      const result = decodePan(yaoString, {
        year: now.getFullYear(), month: now.getMonth() + 1,
        day: now.getDate(), hour: now.getHours(),
      });
      setPan(result);
      setYongShenAnalysis('');
      message.success('数字起卦完成');
      addHistory({
        userId: currentUser?.id || '',
        module: 'liuyao',
        queryParams: { mode: 'threeNum', num1, num2, num3 },
        resultSummary: `六爻三数：${result.benGua.guaName}→${result.zhiGua?.guaName || '无变卦'}`,
      });
    } catch (e: any) {
      console.error('三数起卦错误：', e);
      message.error('起卦失败：' + (e.message || '未知错误'));
    }
  };

  const handleManual = async () => {
    if (!(await tryConsume())) return;
    try {
      const yaoString = manualQiGua(manualYaoValues.join(''));
      const result = decodePan(yaoString, {
        year: now.getFullYear(), month: now.getMonth() + 1,
        day: now.getDate(), hour: now.getHours(),
      });
      setPan(result);
      setYongShenAnalysis('');
      message.success('手动起卦完成');
      addHistory({
        userId: currentUser?.id || '',
        module: 'liuyao',
        queryParams: { mode: 'manual', yaoValues: manualYaoValues },
        resultSummary: `六爻手动：${result.benGua.guaName}→${result.zhiGua?.guaName || '无变卦'}`,
      });
    } catch (e: any) {
      console.error('手动起卦错误：', e);
      message.error('起卦失败：' + (e.message || '未知错误'));
    }
  };

  const handleYongShenSelect = (type: string) => {
    setYongShenType(type);
    if (!pan) return;

    const targetLiuQin = YONGSHEN_MAP[type];
    if (!targetLiuQin) { setYongShenAnalysis('请选择问事类型'); return; }

    const yongYao = pan.benGua.yaoList.find((y: any) => y.liuQin === targetLiuQin);

    if (!yongYao) {
      setYongShenAnalysis(`用神「${targetLiuQin}」在本卦中没有出现（伏藏于飞神之下）。\n\n建议：1. 查看本卦的伏神列表（如有），看用神是否飞伏在某一爻。2. 伏藏代表事情目前"藏而不露"，还需等待时机。3. 到大运流年冲动伏神之时，事情才会显现。`);
      return;
    }

    const parts: string[] = [];

    // 基本定位
    parts.push(`[用神定位] 问「${type}」看「${targetLiuQin}」，位于第${yongYao.position}爻（${yongYao.naJia}），五行属${yongYao.wuXing}。`);

    // 动爻判断
    if (yongYao.isMoving) {
      parts.push(`[动爻] 此爻为动爻！表示你所问的事情正在变化之中，不会维持现状，很快会有进展或转折。`);
    } else {
      parts.push(`[静爻] 此爻为静爻，所问之事短期内不会有大的变化，维持现有状态。`);
    }

    // 世应判断
    if (yongYao.shiYing === '世') {
      parts.push(`[持世] 用神持世大吉！这件事的主动权在你手里，你说了算。尤其是自己创业、主动追求的事情会很有利。`);
    } else if (yongYao.shiYing === '应') {
      parts.push(`[临应] 用神临应，事情的关键在于对方/外部环境。你需要多关注外部因素，主动权不完全在你手中。`);
    }

    // 旬空判断
    if (pan.dayKong) {
      const yaoZhi = yongYao.naJia?.slice(-2).charAt(1) || yongYao.naJia?.slice(-1) || '';
      if (pan.dayKong.includes(yaoZhi)) {
        parts.push(`[旬空] 用神所在的「${yaoZhi}」为旬空之支，事情目前"空"——有名无实、尚未落实。需要等待出空之时（填实或冲空）才会显现实质。`);
      }
    }

    // 旺衰判断
    if (pan.monthJian) {
      const monthZhi = pan.monthJian;
      const wx = yongYao.wuXing;
      parts.push(`[月建] 当前月建为「${monthZhi}」，用神五行属「${wx}」。月建对用神的影响需要结合具体生克关系来定——月建生用神则旺，克用神则衰。`);
    }

    // 六兽信息
    if (yongYao.liuShou) {
      const liuShouInfo: Record<string, string> = {
        '青龙': '青龙主喜、主贵，用神临青龙，事情有喜庆之象。',
        '朱雀': '朱雀主口舌文书，用神临朱雀，事情涉及沟通、文书、法律。',
        '勾陈': '勾陈主田土、迟滞，事情进展可能较慢，涉及不动产。',
        '腾蛇': '腾蛇主虚惊、怪异，事情可能有虚虚实实，不太明朗。',
        '白虎': '白虎主凶伤、权威，事情涉及权力斗争或医疗健康。',
        '玄武': '玄武主暗昧、盗贼，事情有暗箱操作或隐私方面需要注意。',
      };
      if (liuShouInfo[yongYao.liuShou]) {
        parts.push(`[六兽] ${liuShouInfo[yongYao.liuShou]}`);
      }
    }

    setYongShenAnalysis(parts.join('\n\n'));
  };

  // 匹配64卦白话解释
  const gua64Text = useMemo(() => {
    if (!pan) return null;
    const name = pan.benGua.guaName;
    // gua64中查找
    const found = gua64.find((g: any) => g.name === name || g.symbol?.includes(name?.[0]));
    return found;
  }, [pan]);

  const resetAll = () => {
    setPan(null);
    setDayanLog([]);
    setYongShenAnalysis('');
    setYongShenType(null);
  };

  return (
    <div style={{ padding: '16px 0' }}>
      <Title level={3} style={{ textAlign: 'center', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontWeight: 600 }}>
        六爻大衍
      </Title>

      <Alert
        message="使用 iching-shifa 进行排盘，自动完成装卦（六亲、六兽、世应、纳甲）。"
        type="info"
        showIcon
        style={{ marginBottom: 16, background: 'var(--bg-card-solid)' }}
      />

      {/* 用神选择 */}
      <Card
        title={<><HelpCircle size={16} /> 用神选择指南</>}
        size="small"
        style={{ marginBottom: 16, borderColor: 'var(--border-light)' }}
      >
        <Row gutter={[8, 8]}>
          {YONGSHEN_GUIDE.map((item, i) => (
            <Col xs={24} sm={12} key={i}>
              <Paragraph style={{ fontSize: 13, marginBottom: 4 }}>
                <Text strong style={{ color: 'var(--text-primary)' }}>{item.question} 「{item.liuqin}」</Text>
                <br /><Text style={{ color: 'var(--text-secondary)' }}>{item.reason}</Text>
              </Paragraph>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 起卦方式 */}
      <Card style={{ marginBottom: 16, borderColor: 'var(--border-light)' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong style={{ color: 'var(--text-primary)' }}>起卦方式：</Text>
            <Radio.Group value={mode} onChange={(e) => { setMode(e.target.value); resetAll(); }} style={{ marginLeft: 12 }}>
              <Radio.Button value="dayan">大衍筮法</Radio.Button>
              <Radio.Button value="threeNum">三数起卦</Radio.Button>
              <Radio.Button value="manual">手动指定六爻</Radio.Button>
            </Radio.Group>
          </div>

          <Divider />

          {mode === 'dayan' && (
            <div style={{ textAlign: 'center' }}>
              <Button type="primary" size="large" icon={<Sparkles size={16} />} onClick={handleDayan}>
                大衍筮法起卦
              </Button>
              <Text style={{ color: 'var(--text-secondary)', display: 'block', marginTop: 8 }}>
                自动模拟五十根蓍草"四营三变"，生成六爻。心里默念你要问的事。
              </Text>
            </div>
          )}

          {mode === 'threeNum' && (
            <div style={{ textAlign: 'center' }}>
              <Space>
                <input type="number" min={1} placeholder="上卦数" value={num1 ?? ''} onChange={(e) => { const v = e.target.value; setNum1(v === '' ? undefined : Number(v)); }}
                  style={{ width: 80, padding: '4px 8px', border: '1px solid var(--border-input)', borderRadius: 'var(--radius-input)' }} />
                <input type="number" min={1} placeholder="下卦数" value={num2 ?? ''} onChange={(e) => { const v = e.target.value; setNum2(v === '' ? undefined : Number(v)); }}
                  style={{ width: 80, padding: '4px 8px', border: '1px solid var(--border-input)', borderRadius: 'var(--radius-input)' }} />
                <input type="number" min={1} placeholder="动爻数" value={num3 ?? ''} onChange={(e) => { const v = e.target.value; setNum3(v === '' ? undefined : Number(v)); }}
                  style={{ width: 80, padding: '4px 8px', border: '1px solid var(--border-input)', borderRadius: 'var(--radius-input)' }} />
              </Space>
              <div style={{ marginTop: 12 }}>
                <Button type="primary" onClick={handleThreeNum}>三数起卦</Button>
              </div>
            </div>
          )}

          {mode === 'manual' && (
            <div style={{ textAlign: 'center' }}>
              <Space wrap>
                {manualYaoValues.map((v, i) => (
                  <Space key={i} direction="vertical" size={0}>
                    <Text style={{ fontSize: 11, color: 'var(--text-secondary)' }}>第{i + 1}爻</Text>
                    <Select value={v} onChange={(val) => { const arr = [...manualYaoValues]; arr[i] = val; setManualYaoValues(arr); }}
                      style={{ width: 90 }} options={[
                        { value: 6, label: '6 老阴×' }, { value: 7, label: '7 少阳' },
                        { value: 8, label: '8 少阴' }, { value: 9, label: '9 老阳○' },
                      ]} />
                  </Space>
                ))}
              </Space>
              <div style={{ marginTop: 12 }}>
                <Button type="primary" onClick={handleManual}>手动排卦</Button>
              </div>
            </div>
          )}
        </Space>
      </Card>

      {/* 大衍过程日志 */}
      {dayanLog.length > 0 && (
        <Card title="大衍筮法推演日志" style={{ marginBottom: 16, borderColor: 'var(--border-light)' }}>
          <div style={{ maxHeight: 300, overflow: 'auto', background: 'rgba(0,0,0,0.02)', color: 'var(--text-body)', padding: 16, borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 13, whiteSpace: 'pre-wrap' }}>
            {dayanLog.join('\n')}
          </div>
        </Card>
      )}

      {/* 排盘结果 */}
      {pan && (
        <>
          {/* 白话断卦 */}
          {pan && (() => {
            const con = generateLiuyaoPlainConclusion(
              pan.benGua.guaName,
              pan.dongYaoCount,
              !!pan.zhiGua && pan.zhiGua.guaName !== pan.benGua.guaName,
            );
            const tone = con.verdict === '宜守' ? 'default' : con.verdict === '有变' ? 'warn' : 'good';
            return (
              <PlainConclusionCard
                icon={con.verdict === '宜守' ? '🧘' : con.verdict === '有变' ? '🌊' : '🔥'}
                title={`白话断卦 · ${con.verdict}`}
                tone={tone}
              >
                {renderWithTerms(con.text)}
              </PlainConclusionCard>
            );
          })()}

          {/* 卦象总览 */}
          <Card title="卦象排盘" style={{ marginBottom: 16, borderColor: 'var(--border-light)' }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Card size="small" title="本卦 · 开始" style={{ textAlign: 'center', borderColor: 'var(--border-light)' }}>
                  <Title level={4} style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', marginBottom: 4 }}>{pan.benGua.guaName}</Title>
                  <HexagramSVG yaoList={pan.benGua.yaoList} size={180} />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card size="small" title="互卦 · 过程" style={{ textAlign: 'center', borderColor: 'var(--border-light)' }}>
                  <Title level={5} style={{ color: 'var(--text-primary)' }}>{pan.huGua?.guaName || '—'}</Title>
                  {pan.huGua?.yaoList && <HexagramSVG yaoList={pan.huGua.yaoList} size={160} />}
                  <Text style={{ color: 'var(--text-secondary)' }}>中间发展过程</Text>
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card size="small" title="变卦 · 结果" style={{ textAlign: 'center', borderColor: 'var(--border-light)' }}>
                  <Title level={5} style={{ color: 'var(--text-primary)', marginBottom: 4 }}>{pan.zhiGua?.guaName || '—'}</Title>
                  {pan.zhiGua?.yaoList && <HexagramSVG yaoList={pan.zhiGua.yaoList} size={180} />}
                  <Text style={{ color: 'var(--text-secondary)' }}>动爻：{pan.dongYaoCount}个</Text>
                </Card>
              </Col>
            </Row>

            {/* 卦时间信息 */}
            <Descriptions column={{ xs: 1, sm: 3 }} size="small" style={{ marginTop: 12 }}>
              <Descriptions.Item label="干支年">{pan.ganZhiYear.gz}</Descriptions.Item>
              <Descriptions.Item label="干支月">{pan.ganZhiMonth.gz}</Descriptions.Item>
              <Descriptions.Item label="干支日">{pan.ganZhiDay.gz}</Descriptions.Item>
              <Descriptions.Item label="月建">{pan.monthJian}</Descriptions.Item>
              <Descriptions.Item label="日空">{pan.dayKong}</Descriptions.Item>
              <Descriptions.Item label="节气">{pan.solarTerm}</Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 三层说明：古文原文 + 直译 + 白话 */}
          <CollapsibleCard title="卦辞解读" summary="古文原文、直译、白话三层解读" accordionGroup="liuyao-analysis">
          <Card style={{ border: 'none', boxShadow: 'none', background: 'transparent', margin: 0, padding: 0 }}>
            <Collapse defaultActiveKey={['plain']} items={[
              {
                key: 'original',
                label: '第一层：古文原文',
                children: (
                  <>
                    {gua64Text ? (
                      <>
                        <Paragraph><Text strong style={{ color: 'var(--text-primary)' }}>卦辞：</Text>{gua64Text.gua_ci}</Paragraph>
                        {gua64Text.tuan_ci && <Paragraph><Text strong style={{ color: 'var(--text-primary)' }}>彖辞：</Text>{gua64Text.tuan_ci}</Paragraph>}
                        {gua64Text.da_xiang && <Paragraph><Text strong style={{ color: 'var(--text-primary)' }}>大象：</Text>{gua64Text.da_xiang}</Paragraph>}
                        <Divider>爻辞</Divider>
                        {gua64Text.yao_ci?.map((yc: string, i: number) => {
                          const isMoving = pan.benGua.yaoList[i]?.isMoving;
                          return (
                            <Paragraph key={i}>
                              <Text strong={isMoving} style={{ color: isMoving ? '#1A1A1A' : undefined }}>
                                {yc}
                              </Text>
                              {isMoving && <Tag style={{ marginLeft: 8 }}>动爻</Tag>}
                            </Paragraph>
                          );
                        })}
                      </>
                    ) : (
                      <>
                        <Paragraph><Text strong style={{ color: 'var(--text-primary)' }}>卦辞：</Text>{pan.benGua.guaCi}</Paragraph>
                        {pan.benGua.yaoList.map((y: any, i: number) => (
                          <Paragraph key={i}>
                            <Text strong={y.isMoving} style={{ color: y.isMoving ? '#1A1A1A' : undefined }}>
                              第{y.position}爻{y.isMoving ? '（动）' : ''}：{y.naJia} {y.wuXing} {y.liuQin} {y.liuShou} {y.shiYing}
                            </Text>
                          </Paragraph>
                        ))}
                      </>
                    )}
                  </>
                ),
              },
              {
                key: 'plain',
                label: '第二层：白话解读',
                children: (
                  <div style={{ padding: 8, borderRadius: 8, background: 'rgba(0,0,0,0.02)' }}>
                    <Paragraph style={{ fontSize: 14, color: 'var(--text-body)' }}>
                      <Text strong style={{ color: 'var(--text-primary)' }}>iching-shifa 自动断语：</Text>
                      {pan.explanation || '暂无自动断语'}
                    </Paragraph>
                    {pan.dongYaoCount > 0 ? (
                      <Paragraph style={{ fontSize: 14, color: 'var(--text-body)' }}>
                        此卦有{pan.dongYaoCount}个动爻。动爻代表事情正在变化的关键节点，需重点关注变爻对应的爻辞。
                        {pan.dongYaoCount === 1 && '单爻动以本卦变爻爻辞为主。'}
                        {pan.dongYaoCount === 2 && '两爻动以本卦二变爻之上爻为主。'}
                        {pan.dongYaoCount >= 3 && '三爻及以上变动较大，以变卦卦辞为主。'}
                      </Paragraph>
                    ) : (
                      <Paragraph style={{ fontSize: 14, color: 'var(--text-body)' }}>此卦无动爻，以本卦卦辞为主。事情维持现状，短期不会有大的变化。</Paragraph>
                    )}
                  </div>
                ),
              },
              {
                key: 'liuqin_status',
                label: '第三层：六亲生克分析',
                children: (
                  <Row gutter={[8, 8]}>
                    {Object.entries(LIUQIN_STATUS).map(([key, val]) => (
                      <Col xs={24} sm={12} key={key}>
                        <Card size="small" style={{ borderColor: 'var(--border-light)' }}>
                          <Text strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>{key}：</Text>
                          <Text style={{ fontSize: 12, color: 'var(--text-body)' }}>{val}</Text>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                ),
              },
            ]} />
          </Card>

          {/* 大师口吻解读 */}
          <Card
            title={<span style={{ color: 'var(--wx-earth)', fontWeight: 600 }}>🔮 命理大师解读</span>}
            style={{ marginBottom: 16, borderColor: 'var(--border-light)', borderLeft: '3px solid var(--wx-earth)' }}
          >
            <Paragraph style={{ fontSize: 15, lineHeight: 2, color: 'var(--text-body)', fontStyle: 'italic' }}>
              {(() => {
                const guaName = pan.benGua.guaName;
                const dongCount = pan.dongYaoCount;
                const zhiName = pan.zhiGua?.guaName;

                // 大师解读：150-300字
                const readings: Record<string, string> = {
                  '乾为天': '你现在处在人生的高光时刻，像一条飞龙在天。但乾卦告诉你，越是在高处越要谦逊。你的能力足够，但不要急着证明自己。这个阶段，稳比快更重要。记住：亢龙有悔不是一句警告，而是老朋友的一句提醒。',
                  '坤为地': '你现在的状态就像大地——承载万物却不争功。坤卦告诉你，成功的秘诀是跟随对的引领，而不是自己冲锋。这段时间做配角比做主角更安全。厚德载物，你的耐心会换来最好的结果。',
                  '水雷屯': '万物初生的艰难，你正在经历。就像种子破土前的黑暗，所有的挣扎都是必须的。屯卦不是告诉你放弃，而是告诉你：创业初期本该如此。别一个人扛，去找能帮你的人。',
                  '山水蒙': '你正处在"蒙昧"之中，不是智力不够，而是信息不足。蒙卦提醒你，问对人比闷头想更有效。像孩童一样大胆提问，不丢人。启发就在下一次对话里。',
                  '水天需': '你现在就像在沙漠里等雨——急不得。需卦告诉你，事情正在来的路上，但不是现在。这个阶段主动出击反而容易碰壁，不如把准备工作做足。好事多磨不是空话。',
                  '天水讼': '争讼之象，你在跟什么较劲？讼卦告诉你，赢了道理可能输了人情。有智慧的人懂得"中途撤诉"，不是认输，而是算清了账——不值得。',
                  '地水师': '你现在就像一个将军，心里要打这一仗。师卦提醒你，出师必须有名，而且要找对人。单打独斗赢不了，团队才是胜负手。纪律比勇猛更重要。',
                  '水地比': '比卦是亲近之象。你现在需要一个靠得住的人——可能是合作伙伴，可能是伴侣。比卦告诉你，选对人比做对事更重要。找到一个"自己人"，事情就成了一半。',
                  '风天小畜': '小畜是小积累的意思。你现在可能有点焦虑，觉得进步太慢。但这卦告诉你，小步快跑比一次冲刺更能到达终点。积蓄的力量虽然看不见，但它一直在增长。',
                  '天泽履': '履卦说的是"踩在老虎尾巴上"——你现在的处境有点微妙，跟在厉害的人后面或强势的环境中。履卦提醒你，言行举止要谨慎。老虎不咬人，但你也别去摸它鼻子。',
                  '地天泰': '小往大来，你正在上升通道里。泰卦是天地相交——上面愿意听，下面敢于说，事情自然顺。你现在要做的不是庆祝，而是把这段顺利用来铺路：趁关系好沟通的时候，把难谈的事谈掉；趁手气顺的时候，把难布的局布好。顺境不常有，别浪费在享受上。',
                  '天地否': '否卦和泰卦正好相反——上下不通，你说话没人听，做事没人应。这种时候最忌讳用力过猛：越想证明自己，越容易碰壁。否卦的智慧是"收敛"：把力气省下来，把嘴闭上，把手头能掌控的小事做好。否极泰来是规律，但"泰来"之前，你得先熬过"否"。',
                  '天火同人': '这卦说"同人于野"——在开阔处与人结盟。你现在需要的是队友，不是下属，也不是观众。同人卦提醒你两件事：一是找价值观相同的人，只有利益相同的走不远；二是结盟要摆在明面上，私下的小圈子反而坏事。打开自己，坦荡一点，贵人就在同路人里。',
                  '火天大有': '火在天上，普照万物——你手里的资源、人脉、时机都处于充盈状态。大有卦最难的不是"有"，而是"有之后怎么办"。它的提醒是：富有而谦逊，才是真富有。这个阶段最该做的是分享和布局，把资源变成更长远的根基，而不是忙着向世界证明你拥有。',
                  '地山谦': '山藏在地底下——有真本事但不露。谦卦是六十四卦里唯一六爻皆吉的卦，它告诉你：你现在的低调不是吃亏，是在攒人品、攒机会。该你做的事踏踏实实做，不该你邀的功一分不邀。放心，山不会永远埋在地下，时候到了自然有人看见。',
                  '雷地豫': '豫是安乐，也是预备。雷出地奋，事情让你心情振奋——这没问题，但豫卦真正想说的是：兴奋的时候最容易忘乎所以。你可以在战略上乐观，战术上必须留后手。另外，这卦也提醒你别只自己高兴，带着身边人一起高兴，路才走得长。',
                  '泽雷随': '随卦讲的是"跟"的智慧。现在不是你领头的时候，跟着对的人、对的趋势走，反而省力。但随卦有一条底线：随，不是随便。跟谁、随什么，选之前睁大眼睛；选定之后，就别三心二意。最怕的是一边跟随一边不服，内耗全在自己身上。',
                  '山风蛊': '蛊是器皿里生了虫——事情放太久，出问题了。这卦不是坏消息，它是提醒你：该收拾了。旧账、旧模式、旧关系里积压的毛病，拖一天就多烂一分。蛊卦的勇气在于"治蛊"：别怕揭开盖子，烂掉的部分清掉，剩下的还能用，而且会更好用。',
                  '地泽临': '临是居高临下，也是机会临近。阳气正在往上走，属于你的窗口期来了。临卦的提醒是"至于八月有凶"——好时机有保质期。所以别犹豫、别观望，趁现在把该定的定下来。你面对的事情比你想象的更有把握，拿出点气势来。',
                  '风地观': '观卦是让你看的，不是让你动的。现在做任何大动作都为时过早——你对局势的了解还不够。观有两层：观人，也观己。看别人怎么做，看趋势往哪走；也回头看自己，哪些判断是出于情绪。看清楚了再出手，一击即中比频频出手强得多。',
                  '火雷噬嗑': '嘴里有东西，咬碎了才能咽下去——你和目标之间卡着一个具体的障碍。噬嗑卦告诉你：这个障碍绕不过去，必须正面解决。好在你有解决它的能力，需要的只是决心。别拖，拖久了障碍会长大。咬碎它，后面就是坦途。',
                  '山火贲': '贲是装饰。这卦问你一个问题：你现在忙着修饰的，是事情本身，还是事情的样子？包装不是坏事，第一印象也确实重要，但贲卦的提醒是"白贲无咎"——最高级的修饰是素净。把内核做扎实，外在的点缀恰到好处就好，别让形式大过内容。',
                  '山地剥': '五阴剥一阳，你手头的东西正在流失——可能是资源、可能是人心、可能是耐心。剥卦不让你反抗，因为趋势挡不住；它让你"顺而止之"：停止追加投入，守住还没流失的核心部分。叶子落光了，根还在。等到一阳来复，你还有东山再起的本钱。',
                  '地雷复': '复是回来。阳气从最底下重新生发——你走丢的东西正在回来的路上：状态、机会，或者某个人。复卦说"七日来复"，转机有它自己的节奏，急不得。你现在唯一要做的是：别再折腾，好好休养，把"回来"的通道留出来。门开着，春天自己会进来。',
                  '天雷无妄': '无妄卦讲"不妄为"，也讲"无妄之灾"。第一，你没把握的事现在别碰，凭运气做事必有后患；第二，如果真遇到莫名其妙的麻烦，记住那不是你的错，别因此乱了阵脚。行得正，就不怕雷打。这卦说到底就四个字：别动歪念。',
                  '山天大畜': '大畜是大的蓄积。你现在像一座蓄水的水库——容量在涨，但还没到开闸的时候。这卦建议你继续"蓄"：蓄本事、蓄人脉、蓄粮草。它同时也说"利涉大川"——蓄够了，是可以干大事的。关键在判断水位：没蓄够别泄，蓄够了别捂。',
                  '山雷颐': '颐是养。这卦首先管的是嘴：病从口入，祸从口出，最近说话饮食都要留神。往深一层，颐卦问的是"你靠什么养活自己"——是凭真本事，还是靠看别人脸色？自食其力者吉。把心思花在养实力上，少花在羡慕别人上。',
                  '泽风大过': '栋梁弯了——你扛的东西超过了你的负荷。大过卦不批评你，它知道你是能扛事的人才会扛过头。但它提醒你：再不卸力，折的就是你自己。两条路：要么把担子分出去，要么承认自己暂时扛不了。这不丢人，大梁断了才真的误事。',
                  '坎为水': '坎是险，而且是一险接一险。你可能正处在"怎么又出事"的阶段。坎卦的智慧是"有孚维心"——外在的水再深，心里的定盘星不能丢。水往下流，遇到坎就填满它再继续。你也一样：不跟困境硬碰，一步一步填过去，险滩后面就是平流。',
                  '离为火': '离是火，也是依附。火必须附在柴上才能烧——你现在的光芒，很大程度上依赖某个平台、某个人或某种关系。这没什么不好意思的，但离卦提醒你两件事：一是认清自己依附的是什么，别错把平台当本事；二是持续发光的前提，是持续给自己添柴。',
                  '泽山咸': '咸就是"感"，无心之感——最自然的相互吸引。这卦对感情和合作都是好兆头：不用刻意，真诚就够了。咸卦的爻位从脚趾一路感应到脸颊，提醒你感情要一步一步来，别跳过过程。让一切自然发生，你唯一要做的，是真心实意地回应。',
                  '雷风恒': '恒卦讲长久。雷与风，一动一顺，相互配合才能长久。你问的事如果是感情或合作，这卦说：能成，但"恒"不是一成不变的死守，而是动态的磨合——像雷和风一样，各自保持活力，又始终呼应。如果是做事：选定方向，别轻易换赛道，时间是你的朋友。',
                  '天山遁': '遁是退。阴在长，阳在退——局势对你不利，而且不利还会扩大。遁卦不是让你认输，是让你体面地撤：趁现在还能全身而退，赶紧收拾好东西离开烂局。退得早是智慧，退得晚是狼狈。记住，遁的目的是保存实力，不是再也不回来。',
                  '雷天大壮': '大壮是阳气壮盛——你现在底气足、势头猛，这当然是好事。但大壮卦最有名的警告是"羝羊触藩"：公羊仗着力气大去撞篱笆，结果角被卡住。力气大的时候最容易办蠢事。这卦就一句话：能用脑子解决的事，别用蛮力。',
                  '火地晋': '晋是晋升，太阳从地平线上升起。你正在被看见——能力、成绩，上面都看在眼里。晋卦告诉你：接下来会有提拔或更进一步的机会，大方接住，不必假客气。同时记住晋卦的另一面：升得快的时候，姿态要放得更低，这能帮你挡住大多数嫉妒。',
                  '地火明夷': '明夷，光明入地——你的才华暂时没处发挥，甚至环境对你有敌意。这卦教你"外晦内明"：外面装糊涂，心里亮堂堂。不是让你同流合污，是让你别在黑暗里点灯——灯越亮，风越大。把光芒收一收，护住心里的火种，等天亮。',
                  '风火家人': '家人卦讲"内"。你外面的问题，根子可能在内部——家里、团队里、核心圈子里。先把内部理顺：谁负责什么说清楚，规矩立在前头，感情放在规矩里而不是规矩外。内部一和，外面的事会顺得让你意外。另外，家人卦也提醒：别把最差的脾气留给最亲的人。',
                  '火泽睽': '睽是乖离——两个人、两股力量，方向不同。你可能正在经历"说不通"的憋屈：明明都为了这件事好，就是拧着来。睽卦的智慧是"异中求同"：别指望对方变成你，先承认差异，再找那个微小的共同点。大事化小，小事也能成大事——前提是别硬掰。',
                  '水山蹇': '蹇是跛脚走路——前有险水，后有高山，进退两难。蹇卦给的路线是"利西南不利东北"：换个方向走，别死磕眼前这条道。还有更重要的一句："利见大人"——这关你自己过不去，去找那个比你高的人帮你。开口求助不丢人，困在原地才耽误事。',
                  '雷水解': '解是松绑。雷雨作，百果草木都裂开壳——困扰你很久的那个结，要开了。解卦的提醒就一个字：快。解冻的窗口不会一直开着，该复位的复位，该原谅的原谅，该了结的了结。别翻旧账，解卦讲的是"赦过宥罪"——往前看，别回头。',
                  '山泽损': '损卦先说吃亏。你现在可能要主动放弃点什么——钱、面子、一个执念。听起来亏，但损卦的真意是"损下益上"：减损多余的欲望，反而增益了根本。舍得舍得，这卦就是教你"舍"的那一半。算大账的人不吃亏，算小账的人占不到便宜。',
                  '风雷益': '益卦和损卦是一对——风雷相助，其势益增。现在是"加"的时候：加码投入、加深关系、加速推进。益卦说"利涉大川"，平时不敢干的大事，现在可以干。它还提醒你一层：增益别人的同时，自己也在增益——这个阶段利他就是利己，别小气。',
                  '泽天夬': '夬是决断。五个阳爻逼着一个阴爻——形势很清楚，就差你拍板。夬卦告诉你：拖延已经没有意义，该清除的障碍、该结束的关系、该做的决定，了结掉。但夬卦也提醒方式：别在盛怒之下动手，公开、正当、留有余地地处置。快刀斩乱麻，但刀要稳。',
                  '天风姤': '姤是不期而遇。一个阴爻遇上五个阳爻——意外的缘分、意外的机会，或者意外的麻烦，正在靠近。姤卦的提醒是：初遇时感觉越好，越要慢一点。来得太容易的东西，去得也容易。不是让你拒绝相遇，是让你别在第一时间就交出全部。',
                  '泽地萃': '萃是聚集。人往你这儿聚，资源也往你这儿聚——这是成事的好局。但萃卦提醒：人多嘴杂，聚得快散得也快。你需要一根"主心骨"把大家拢住：一个共同的目标，或者一个让人信服的规矩。另外，聚众之时，防一句闲话、一个小人。',
                  '地风升': '升卦是往上走，像树从地里长出来。它最鼓舞人心的地方在于：升不靠跳，靠长。你现在每一步微小的进展都算数，都在把你往上抬。升卦说"南征吉"——朝着有光的方向走，别回头。想见贵人就去见，想提的要求就提，这个节骨眼上，主动有好运。',
                  '泽水困': '困卦是泽里没水——你觉得资源枯竭、处处受限，说什么没人信。困卦最狠的一句是"有言不信"：困境中解释是没用的，没人听。所以它让你"困而不失其所"：守住心志，少说多做。困是检验成色的炉子——能在困中不乱方寸的人，出来之后必成气候。',
                  '水风井': '井卦讲"养"。井水的价值在于：不动的时候自清，有人来打水就供养。你现在是那口井——别急着四处奔波找机会，先把自身修炼好，机会会来找你。井卦还提醒"井渫不食"：井淘干净了却没人来喝，是遗憾——所以要让对的人知道你这口井。',
                  '泽火革': '革是变革。泽中有火，水火相息——旧的东西到了非变不可的时候。革卦讲时机："巳日乃孚"——等条件成熟了再动手，变革才能服众。你如果想变，先问自己三个问题：该不该变？到没到变的时候？支持你的人够不够？三个都是"是"，就放手去革，别留恋。',
                  '火风鼎': '鼎是国之重器，三足而立——稳，且新。革故之后是鼎新：你正在（或应该）建立自己的新秩序、新位置。鼎卦提醒你"正位凝命"：位置要摆得正，根基要扎得稳。三足缺一足就翻——找到支撑你的那几个支点，把它们一一夯实。',
                  '震为雷': '震是惊雷，突发的震动让你心头一紧。震卦最妙的是"笑言哑哑"：修炼到家的人，雷声再大也谈笑自若——不是不害怕，是怕过之后手不抖。这卦告诉你：震动不是来毁你的，是来给你醒神的。经此一震，你会比从前更稳。',
                  '艮为山': '艮是止。两座山并立，一动不动。你现在心里再急，这卦也告诉你：停下来。不是不让你干，是时机不到——"时止则止，时行则行"，现在恰好是"止"的时候。停止焦虑、停止刷消息、停止没意义的动作。静下来，答案自己会浮上来。',
                  '风山渐': '渐是循序渐进。鸿雁南飞，一站一站地停，从不直飞。你问的事能成，但快不了——它的成长曲线是台阶式的，每一级都要踩实。渐卦尤其忌"抢跑"：感情别急着确定关系，事业别急着扩张规模。慢一点，反而最先到。',
                  '雷泽归妹': '归妹是少女出嫁——急了点，位置也尴尬了点。这卦照出的是"名不正言不顺"的处境：你可能在一段关系或一个位置里，付出不少却没个说法。归妹卦不劝你忍，也不劝你闹，它让你想清楚：你要的到底是什么？想清楚之前，别急着加码。',
                  '雷火丰': '丰是丰盛到顶点——雷电交加，声势浩大，如日中天。但丰卦骨子里是清醒的："日中则昃"，太阳到头顶就开始西斜。它提醒你两件事：一是抓紧这段鼎盛期把事办成，别浪费；二是心里给"衰退"留个位置，盛时不挥霍，衰时不慌张。',
                  '火山旅': '旅是在路上。你现在是"客"——新环境、新关系，或者人生地不熟的状态。旅卦的处世秘诀是"柔"：姿态放低，嘴甜一点，别得罪地头蛇。旅途中别置办重资产，别做长远承诺，把这段经历当成看风景。心安之处即是家，但那是下一程的事。',
                  '巽为风': '巽是风，无孔不入但从不硬撞。你现在需要的不是强攻，是渗透：一件事反复做，一个理念反复讲，一个人慢慢处。巽卦的力量在"持续"——风看不见，但日子久了能改变地形。别急着想立竿见影，你坚持的方向是对的。',
                  '兑为泽': '兑是喜悦，两泽相连，互相滋润。你现在人缘不错，沟通顺畅，适合谈事、聚会、把关系往前推一步。兑卦唯一的提醒是：喜悦要有节制——话别说满，笑别过度，应酬里守住自己的正事。让人舒服是你的本事，别让它变成消耗。',
                  '风水涣': '涣是涣散——人心散了，或者计划散了。涣卦的对策很有意思："涣奔其机"——涣散的时候，先奔回那个最稳固的支点。聚拢核心的人和事，边缘的随它去。涣中也有机会：旧的格局散了，正是你重新洗牌的时候。',
                  '水泽节': '节是节制。泽上有水，得有个堤坝，不然就漫了。这卦问你：最近是不是在什么事上失了分寸？花钱、说话、用力、用情——过了那个度，好事也变坏事。节卦也提醒另一端：苦节不可贞，把自己勒得太紧也长久不了。八分满，刚刚好。',
                  '风泽中孚': '中孚是内心的诚信。卦象中间空虚、上下敦实——虚心才能容物。这卦对你最大的提示是：真诚是接下来唯一的通行证。别耍小聪明，别玩话术，你面对的人（或事）吃软不吃硬。心里怎么想，嘴上就怎么说——孚能感天动地。',
                  '雷山小过': '小过是"稍微过一点"——雷在山上响，声势过了它的体量。这卦给你的行为指南很具体：宜小不宜大，宜下不宜上。小事可以着手，大事先放放；姿态可以低一点，目标别定太高。就像飞鸟掠过，留个声音就好，别恋战。小过不是错，把握住"过"的分寸就是智慧。',
                  '水火既济': '既济是"已经成了"。六爻全部得位，水火各安其处——你手里这件事，局面是好的。但既济卦最警醒的是它的转折：初吉终乱。成了之后最容易松懈，一松懈就乱。这卦让你庆功之前先做一件事：把可能出问题的环节过一遍。守成，比创业更难。',
                  '火水未济': '未济是"还差一步"。六十四卦用它收尾，大有深意：事情没有真正完结的时候。你现在可能觉得"怎么还没成"——别灰心，未济不是失败，是"将成未成"。小狐狸过河，快到岸了尾巴还没干，这时候松劲就前功尽弃。最后这一口气，屏住。',
                };

                if (readings[guaName]) {
                  let text = readings[guaName];

                  // 变卦联动
                  if (zhiName && zhiName !== guaName) {
                    text += `\n\n本卦「${guaName}」变为「${zhiName}」，这是一个重要的转折信号。事情不会停留在现在的状态，变化已经在酝酿。`;
                    if (dongCount === 1) text += '单爻独动，变化指向明确——看变出的那一爻就是天机所在。';
                    else if (dongCount === 2) text += '两个动爻说明有两股力量在推动变化，需要在上爻和下爻之间权衡。';
                    else text += '动爻较多，变化是根本性的，不要试图维持现状，顺势而变才是明智。';
                  }

                  return text;
                }

                // 通用解读
                let text = `你起得「${guaName}」这一卦。`;
                if (dongCount > 0) {
                  text += `卦中有${dongCount}个动爻，说明你所问的事情正在变化之中，不会维持原样。`;
                  if (zhiName) text += `从「${guaName}」变出「${zhiName}」，如同一条河流改变了方向——你现在的每个选择都很重要，因为它们会影响最终的走向。`;
                } else {
                  text += '此卦安静不动，说明事情的性质和走向已经确定。现在不是做重大改变的时候，维持现状、守住本心就是最好的策略。';
                }
                text += '\n\n给你的建议：不要只看眼前的得失。卦象是一面镜子，照见的是更长远的东西。信卦不如信自己，但卦象的提醒值得一听。';

                return text;
              })()}
            </Paragraph>
          </Card>
            </CollapsibleCard>

          {/* 用神分析 */}
          <CollapsibleCard title="用神分析" summary={yongShenType ? `用神：${yongShenType}分析` : '选择问事类型进行用神分析'} accordionGroup="liuyao-analysis">
          <Card style={{ border: 'none', boxShadow: 'none', background: 'transparent', margin: 0, padding: 0 }}>
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={8}>
                <Card size="small" title="选择问事类型" style={{ borderColor: 'var(--border-light)' }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {Object.entries(YONGSHEN_MAP).map(([k, v]) => (
                      <Button
                        key={k}
                        type={yongShenType === k ? 'primary' : 'default'}
                        block
                        size="small"
                        onClick={() => handleYongShenSelect(k)}
                      >
                        {k} {v}
                      </Button>
                    ))}
                  </Space>
                </Card>
              </Col>
              <Col xs={24} sm={16}>
                {yongShenAnalysis ? (
                  <div style={{ padding: 12, background: 'rgba(0,0,0,0.02)', borderRadius: 8 }}>
                    {yongShenAnalysis.split('\n\n').map((p, i) => (
                      <Paragraph key={i} style={{ fontSize: 14, marginBottom: 6, color: 'var(--text-body)' }}>{p}</Paragraph>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: 16, textAlign: 'center' }}>
                    <Text style={{ color: 'var(--text-secondary)' }}>点击左侧按钮选择你想问的事情，系统会自动为你分析用神的吉凶状态</Text>
                  </div>
                )}
                {pan && yongShenType && (
                  <div style={{ marginTop: 12 }}>
                    <Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                      参考资料：本卦「{pan.benGua.guaName}」{pan.dongYaoCount > 0 ? `有${pan.dongYaoCount}个动爻` : '无动爻'}
                      | 月建「{pan.monthJian}」| 日空「{pan.dayKong}」
                    </Text>
                  </div>
                )}
              </Col>
            </Row>
          </Card>
            </CollapsibleCard>

          {/* 综合断语 */}
          {pan && yongShenType && yongShenAnalysis && (
            <CollapsibleCard title="综合断语" summary="基于卦象与用神的综合解读" accordionGroup="liuyao-analysis">
            <Card style={{ border: 'none', boxShadow: 'none', background: 'transparent', margin: 0, padding: 0 }}>
              <Paragraph style={{ fontSize: 14, color: 'var(--text-body)' }}>
                {(() => {
                  const targetLiuQin = YONGSHEN_MAP[yongShenType];
                  const yongYao = pan.benGua.yaoList.find((y: any) => y.liuQin === targetLiuQin);
                  if (!yongYao) return '用神伏藏，事情还需等待合适的时机。建议先做好准备工作，等时机成熟再行动。';

                  let summary = '';
                  const isGood = yongYao.shiYing === '世' || !yongYao.isMoving;

                  if (yongYao.shiYing === '世') {
                    summary += `综合来看，问「${yongShenType}」之事，用神「${targetLiuQin}」持世，主动权在你手中。`;
                  } else if (yongYao.shiYing === '应') {
                    summary += `综合来看，问「${yongShenType}」之事，关键在对方或外部环境。`;
                  } else {
                    summary += `综合来看，问「${yongShenType}」之事，用神「${targetLiuQin}」落第${yongYao.position}爻。`;
                  }

                  if (yongYao.isMoving) {
                    summary += '用神为动爻，事情正在变化之中，不会维持现状。';
                    if (yongYao.shiYing === '世') summary += '变化对你有利，主动推动即可见成效。';
                    else summary += '注意变化的方向，顺势而为。';
                  } else {
                    summary += '用神为静爻，短期内事情变化不大，保持现状或做好长期准备。';
                  }

                  if (pan.dayKong) {
                    const yaoZhi = yongYao.naJia?.slice(-2).charAt(1) || yongYao.naJia?.slice(-1) || '';
                    if (pan.dayKong.includes(yaoZhi)) {
                      summary += '但用神逢旬空，目前事情还未真正落实，需要等待"出空"的时间点。';
                    }
                  }

                  if (pan.dongYaoCount >= 3) {
                    summary += '由于动爻较多（>=3），事情发展会比较曲折，最终结果以变卦为准。';
                  }

                  if (pan.dongYaoCount === 0) {
                    summary += '此卦无动爻，事情的性质和走向基本确定，按现在的情况推进即可。';
                  }

                  return summary;
                })()}
              </Paragraph>
              <Paragraph style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                以上分析基于卦象六亲生克关系，仅供娱乐参考。六爻讲究"无事不占"，心中有事时起卦，卦象往往更有针对性。
              </Paragraph>
            </Card>
            </CollapsibleCard>
          )}

          {/* 六爻详细列表 */}
          <CollapsibleCard title="六爻详细信息" summary="每爻纳甲、六亲、世应详解" accordionGroup="liuyao-analysis">
          <Card style={{ border: 'none', boxShadow: 'none', background: 'transparent', margin: 0, padding: 0 }}>
            {[...pan.benGua.yaoList].reverse().map((y: any, i: number) => (
              <div key={i} style={{ padding: '6px 8px', marginBottom: 4, background: y.isMoving ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.02)', borderRadius: 4 }}>
                <Space wrap size={4}>
                  <Text strong style={{ color: 'var(--text-primary)' }}>第{y.position}爻</Text>
                  <Tag>{y.naJia}</Tag>
                  <Tag>{y.wuXing}</Tag>
                  <Tag>{y.liuQin}</Tag>
                  <Tag>{y.liuShou}</Tag>
                  <Tag>{y.shiYing === '世' ? '世' : '应'}</Tag>
                  {y.isMoving && <Tag>动爻</Tag>}
                  <Text style={{ color: 'var(--text-secondary)', fontSize: 11 }}>星宿：{y.xingXiu} 纳音：{y.naYin}</Text>
                </Space>
              </div>
            ))}
          </Card>
            </CollapsibleCard>

          <div style={{ textAlign: 'center' }}>
            <Button onClick={resetAll} icon={<RefreshCw size={16} />} size="large">重新起卦</Button>
          </div>
        </>
      )}
      {quotaModal}
    </div>
  );
}
