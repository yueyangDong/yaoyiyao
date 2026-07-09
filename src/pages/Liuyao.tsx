import { useState, useMemo } from 'react';
import {
  Card, Button, Typography, Space, Tag, Divider,
  Row, Col, Radio, message, Alert, Collapse, Select, Descriptions,
} from 'antd';
import { Sparkles, RefreshCw, HelpCircle } from 'lucide-react';
import { dayan, decodePan, threeNumberQiGua, manualQiGua } from 'iching-shifa';
import gua64 from '@freizl/yijing/zh-CN/64gua.json';
import { useUser } from '../context/UserContext';

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

  const handleDayan = () => {
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

  const handleThreeNum = () => {
    if (!num1 || !num2 || !num3) {
      message.warning('请输入三个数字');
      return;
    }
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

  const handleManual = () => {
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
        style={{ marginBottom: 16, background: '#fff' }}
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
          <div style={{ maxHeight: 300, overflow: 'auto', background: 'rgba(0,0,0,0.02)', color: 'var(--text-body)', padding: 16, borderRadius: 8, fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap' }}>
            {dayanLog.join('\n')}
          </div>
        </Card>
      )}

      {/* 排盘结果 */}
      {pan && (
        <>
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
          <Card title="卦辞解读" style={{ marginBottom: 16, borderColor: 'var(--border-light)' }}>
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

          {/* 用神分析 */}
          <Card title="用神分析" style={{ marginBottom: 16, borderColor: 'var(--border-light)' }}>
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

          {/* 综合断语 */}
          {pan && yongShenType && yongShenAnalysis && (
            <Card title="综合断语" style={{ marginBottom: 16, borderColor: 'var(--border-light)' }}>
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
                以上分析基于卦象六亲生克关系，仅供娱乐参考。六爻占卜讲究"无事不占"，心中有事所想时起卦最准。
              </Paragraph>
            </Card>
          )}

          {/* 六爻详细列表 */}
          <Card title="六爻详细信息" size="small" style={{ marginBottom: 16, borderColor: 'var(--border-light)' }}>
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

          <div style={{ textAlign: 'center' }}>
            <Button onClick={resetAll} icon={<RefreshCw size={16} />} size="large">重新起卦</Button>
          </div>
        </>
      )}
    </div>
  );
}
