import { useState, useMemo } from 'react';
import {
  Card, Button, Typography, Space, Tag, Divider,
  Row, Col, Radio, message, Alert, Collapse, Select, Descriptions, Tooltip,
} from 'antd';
import { Sparkles, RefreshCw, HelpCircle } from 'lucide-react';
import { dayan, decodePan, threeNumberQiGua, manualQiGua } from 'iching-shifa';
import gua64 from '@freizl/yijing/zh-CN/64gua.json';
import { useUser } from '../context/UserContext';
import CollapsibleCard from '../components/CollapsibleCard';
import { guaShortToFull } from '../utils/liuyaoTexts';
import { buildAllLiuyaoReadings } from '../utils/liuyaoReading';
import type { Theme, ThemeReading } from '../utils/divinationCore';
import { THEME_WORD } from '../utils/divinationCore';
import ThemeReadingCard from '../components/ThemeReadingCard';
import { hexagramTexts } from '../data/hexagramFullTexts';
import { useDailyQuota } from '../hooks/useDailyQuota';

const { Title, Text, Paragraph } = Typography;

/**
 * 主题 → 取用速查。文案与 `utils/liuyaoReading.probesOf` 保持一致——
 * 这张表是给用户看的「为什么问这件事看这个爻」，判据本身在引擎里，不在这里。
 * ⚠️ 健康题的方向与其它题相反（官鬼旺＝病势盛），必须在这一层就讲清，
 * 否则用户看到「官鬼旺」会以为一律是好消息。
 */
const THEME_GUIDE = [
  { question: '事业 / 工作 / 升迁', liuqin: '官鬼 + 世应', reason: '官鬼代表职位、规则、上司；再看世应，定主动权在你还是在对方手里。' },
  { question: '爱情 / 婚姻', liuqin: '男看妻财，女看官鬼', reason: '六亲取用必须分性别：男以妻财为另一半，女以官鬼为另一半。未设置性别时两星各半合看。' },
  { question: '亲情 / 家人', liuqin: '父母 + 兄弟', reason: '父母主长辈与家宅根基，兄弟主手足平辈；两爻合看才是一家人。' },
  { question: '财运 / 收入', liuqin: '妻财', reason: '妻财主进项与实物：旺而受生是进得多，旺而被劫是赚得到存不住。' },
  { question: '健康 / 身体', liuqin: '官鬼（病）+ 子孙（药）', reason: '这一题方向相反：官鬼旺是病势盛（凶），子孙旺是药与恢复力（吉），两星反向计分。' },
  { question: '学业 / 考试', liuqin: '父母 + 官鬼', reason: '父母主文书学业，官鬼主名次功名；文书旺而名次动，才是真考得好。' },
];

// ========== 新手入门：三分钟看懂六爻 ==========
const LIUYAO_BEGINNER_GUIDE = [
  { term: '六爻是什么', plain: '把你心里问的事"摇"成一个六个爻组成的卦，再用卦里各爻的强弱、关系对照事情的发展。相当于给当下的处境拍一张快照。' },
  { term: '本卦（开始）', plain: '事情现在的样子——你起卦这一刻的状态。' },
  { term: '互卦（过程）', plain: '中间的发展过程——从现在走向结果路上会经历的事。' },
  { term: '变卦（结果）', plain: '事情最终会变成什么样——趋势的终点。' },
  { term: '动爻（○/×标记）', plain: '带○或×的爻是"动爻"，是全卦的开关：○（老阳）会由阳变阴，×（老阴）会由阴变阳。断卦主要就看动爻——它指明事情在哪一环起变化。' },
  { term: '世爻 / 应爻', plain: '世爻代表你自己，应爻代表对方或外部环境。应爻生世爻＝外界对你有利；应爻克世爻＝外部有阻力。' },
  { term: '六亲', plain: '每个爻按五行关系归成的"角色名"：父母＝文书/学业/长辈；兄弟＝朋友/平辈/竞争者；子孙＝晚辈/下属/解忧之神；妻财＝钱财（男命也代表另一半）；官鬼＝事业/压力（女命也代表另一半）。' },
  { term: '用神', plain: '你问什么事，就取对应的六亲当"主角"来分析——问财看妻财爻，问工作看官鬼爻，问考试看父母爻。用神旺、受生、持世，事情就顺。' },
  { term: '月建 / 旬空', plain: '月建是起卦当月的五行司令，决定各爻的旺衰（旺相休囚死）；旬空是暂时"落空"的状态——事情有名无实、还没落实，等出空的日期才见分晓。' },
];

// 六亲白话（Tooltip 用）
const LIUQIN_PLAIN: Record<string, string> = {
  '父母': '文书、学历、合同、长辈、房子',
  '兄弟': '朋友、平辈、竞争者、开支',
  '子孙': '晚辈、下属、解忧之神、医药',
  '妻财': '钱财、财物（男命代表另一半）',
  '官鬼': '事业、职位、压力（女命代表另一半）',
};

// 六兽白话（Tooltip 用，与用神分析里的描述同一口径）
const LIUSHOU_PLAIN: Record<string, string> = {
  '青龙': '主喜庆、贵人',
  '朱雀': '主口舌、文书、沟通',
  '勾陈': '主田土、迟滞、牵连',
  '腾蛇': '主虚惊、怪异、反复',
  '白虎': '主凶伤、权威、疾病',
  '玄武': '主暗昧、隐私、盗失',
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
  const [theme, setTheme] = useState<Theme>('事业');
  const [dayanLog, setDayanLog] = useState<string[]>([]);

  // 六个主题一次算满：切主题不重算盘面，也不会出现「切了主题结论没变」的套话
  const readings: ThemeReading[] = useMemo(
    () => (pan ? buildAllLiuyaoReadings(pan, currentUser?.gender) : []),
    [pan, currentUser?.gender],
  );

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

  // 匹配64卦原文：库返回的卦名是简称（「离」），gua64 的 name 也是简称，
  // 但页面其它地方用的是全名（「离为火」），这里统一折成简称再查，避免静默查不到。
  const gua64Text = useMemo(() => {
    if (!pan) return null;
    const raw: string = pan.benGua.guaName || '';
    const short = raw.includes('为') ? raw[0] : raw.length > 2 ? raw.slice(2) : raw;
    return gua64.find((g: any) => g.name === raw || g.name === short) || null;
  }, [pan]);

  // 当前主题对应的「卦象情境」文案（64卦 × 主题，取自 hexagramFullTexts）
  const scenarioText = useMemo(() => {
    if (!pan) return null;
    const full = guaShortToFull(pan.benGua.guaName || '');
    const data = hexagramTexts.find((h) => h.name === full);
    if (!data) return null;
    const key = theme === '爱情' ? '感情' : theme;
    const scenario = (data.scenarios as unknown as Record<string, string>)[key];
    return {
      name: data.name,
      summary: data.summary,
      scenario: scenario || '',
      masterRead: data.masterRead,
      advice: data.advice,
    };
  }, [pan, theme]);

  // 世应生克关系自动分析（白话：世=你，应=对方/环境）
  const shiYingAnalysis = useMemo(() => {
    if (!pan) return null;
    const shi = pan.benGua.yaoList.find((y: any) => y.shiYing === '世');
    const ying = pan.benGua.yaoList.find((y: any) => y.shiYing === '应');
    if (!shi || !ying) return null;
    try {
      // ⚠️ 五行一律取爻自带的 wuXing，不要从纳甲末字反推——
      // 反推等于在页面里又养了一份「地支→五行」映射，和引擎那份迟早不一致。
      const shiWx = shi.wuXing;
      const yingWx = ying.wuXing;
      const WX_SHENG: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
      const WX_KE: Record<string, string> = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' };
      let rel: string; let plain: string;
      if (WX_SHENG[yingWx] === shiWx) {
        rel = `应爻（${yingWx}）生世爻（${shiWx}）`;
        plain = '对方/外部环境在滋养你——你问的这件事，外界对你有善意，多借力、多合作，别单打独斗。';
      } else if (WX_SHENG[shiWx] === yingWx) {
        rel = `世爻（${shiWx}）生应爻（${yingWx}）`;
        plain = '你在对外付出——事情的成败取决于你的投入度和坚持，主动权在你，但要防过度消耗。';
      } else if (WX_KE[shiWx] === yingWx) {
        rel = `世爻（${shiWx}）克应爻（${yingWx}）`;
        plain = '你克制对方/环境——主动权握在你手里，事情能按你的意图推进，注意方式温和些，赢了事别输了关系。';
      } else if (WX_KE[yingWx] === shiWx) {
        rel = `应爻（${yingWx}）克世爻（${shiWx}）`;
        plain = '环境压制你——外部条件暂时不利，硬顶不如智取：要么换路径，要么等时机（应爻受冲受克的日期）。';
      } else {
        rel = `世应同为${shiWx}（比和）`;
        plain = '你与对方/环境同频——不冲不克，按部就班推进即可，属于平顺的格局。';
      }
      return {
        rel,
        plain,
        detail: `世爻在第${shi.position}爻（${shi.naJia}，${shiWx}，${shi.liuQin}）；应爻在第${ying.position}爻（${ying.naJia}，${yingWx}，${ying.liuQin}）。`,
      };
    } catch {
      return null;
    }
  }, [pan]);

  const resetAll = () => {
    setPan(null);
    setDayanLog([]);
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

      {/* 新手入门 */}
      <CollapsibleCard title="三分钟看懂六爻（新手必读）" summary="本卦/互卦/变卦/动爻/世应/六亲/用神，一屏说清" accordionGroup="liuyao-guide">
        <Card size="small" style={{ border: 'none', boxShadow: 'none', background: 'transparent', margin: 0, padding: 0 }}>
          <Row gutter={[8, 8]}>
            {LIUYAO_BEGINNER_GUIDE.map((item, i) => (
              <Col xs={24} sm={12} key={i}>
                <div style={{ padding: '8px 10px', borderRadius: 8, background: i % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'rgba(201,169,110,0.05)' }}>
                  <Text strong style={{ fontSize: 13, color: 'var(--text-primary)', display: 'block', marginBottom: 2 }}>「{item.term}」</Text>
                  <Text style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, display: 'block' }}>{item.plain}</Text>
                </div>
              </Col>
            ))}
          </Row>
          <Alert
            style={{ marginTop: 8 }}
            type="success"
            showIcon
            message="一分钟上手：心里默念你要问的事 → 起卦 → 在「问什么看什么」里选你的主题（事业/爱情/亲情/财运/健康/学业）→ 先看结论，再往下看判读依据。"
          />
        </Card>
      </CollapsibleCard>

      {/* 取用速查 */}
      <Card
        title={<><HelpCircle size={16} /> 问什么，看哪一爻（取用速查）</>}
        size="small"
        style={{ marginBottom: 16, borderColor: 'var(--border-light)' }}
      >
        <Row gutter={[8, 8]}>
          {THEME_GUIDE.map((item, i) => (
            <Col xs={24} sm={12} key={i}>
              <Paragraph style={{ fontSize: 13, marginBottom: 4 }}>
                <Text strong style={{ color: 'var(--text-primary)' }}>{item.question} → {item.liuqin}</Text>
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
          {/* 分主题解读：先给结论（按主题选），依据在下；卦辞/卦象只描述情境 */}
          <ThemeReadingCard
            readings={readings}
            theme={theme}
            onChange={setTheme}
            board="liuyao"
            title="问什么看什么：分主题解读"
          />

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
              <Descriptions.Item label="月建">{pan.monthJian?.slice(-1)}</Descriptions.Item>
              <Descriptions.Item label="日空">{pan.dayKong}</Descriptions.Item>
              <Descriptions.Item label="节气">{pan.solarTerm}</Descriptions.Item>
            </Descriptions>

            {/* 世应生克白话分析 */}
            {shiYingAnalysis && (
              <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.25)' }}>
                <Text strong style={{ fontSize: 13, color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>
                  ⚖️ 世应关系（你 vs 对方/环境）
                </Text>
                <Text strong style={{ fontSize: 13, color: 'var(--wx-earth)', display: 'block' }}>{shiYingAnalysis.rel}</Text>
                <Text style={{ fontSize: 12, color: 'var(--text-body)', lineHeight: 1.7, display: 'block', marginTop: 2 }}>{shiYingAnalysis.plain}</Text>
                <Text style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginTop: 4 }}>{shiYingAnalysis.detail}</Text>
              </div>
            )}
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
                label: '第三层：这几个词是什么意思',
                children: (
                  <>
                    <Paragraph style={{ fontSize: 12.5, lineHeight: 1.9, color: 'var(--text-body)' }}>
                      这里只解释术语，不下吉凶——<Text strong>吉凶一律以「分主题解读」为准</Text>。
                      同一状态在不同主题下结论可能相反（例如「用神旺」问事业是好事，问健康里若是官鬼则为病势盛）。
                    </Paragraph>
                    <Row gutter={[8, 8]}>
                      {[
                        { k: '旺 / 相 / 休 / 囚 / 死', v: '用神相对月令的五个档位：当令为旺、受月令生为相、去生月令为休、去克月令为囚、被月令克为死。' },
                        { k: '旬空', v: '用神落在当日「空亡」的两个地支上。不是没有，是暂时不落实——要等填实或冲空。' },
                        { k: '入墓', v: '用神的地支正好是它五行的墓库（木未、火戌、金丑、水辰、土四季）。有力但被关着。' },
                        { k: '回头生 / 回头克', v: '动爻变出的那一爻，反过来生它或克它。这是「越变越好」与「越折腾越伤」的分水岭。' },
                        { k: '进神 / 退神', v: '动爻与变爻同五行，地支顺进为进神（涨势），逆退为退神（降档）。' },
                        { k: '持世 / 临应', v: '用神落在世爻＝主动权在你；落在应爻＝关键在对方或外部环境。' },
                      ].map((item) => (
                        <Col xs={24} sm={12} key={item.k}>
                          <Card size="small" style={{ borderColor: 'var(--border-light)' }}>
                            <Text strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>{item.k}：</Text>
                            <Text style={{ fontSize: 12, color: 'var(--text-body)' }}>{item.v}</Text>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </>
                ),
              },
            ]} />
          </Card>

          {/* 卦象情境：只描述处境，不作吉凶定论 */}
          <Card
            title={<span style={{ color: 'var(--wx-earth)', fontWeight: 600 }}>🖼 卦象情境 · 「{scenarioText?.name || guaShortToFull(pan.benGua.guaName)}」问{THEME_WORD[theme]}</span>}
            style={{ marginBottom: 16, borderColor: 'var(--border-light)', borderLeft: '3px solid var(--wx-earth)' }}
          >
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 10 }}
              message="这一层只讲「你处在什么局面里、该怎么应对」，不单独定吉凶。吉凶以上面的「分主题解读」为准——卦辞说吉、而用神空破的盘，是要往下打折看的。"
            />
            {scenarioText ? (
              <>
                <Paragraph style={{ fontSize: 14, lineHeight: 2, color: 'var(--text-body)' }}>
                  <Text strong style={{ color: 'var(--text-primary)' }}>处境：</Text>{scenarioText.summary}
                </Paragraph>
                <Paragraph style={{ fontSize: 14, lineHeight: 2, color: 'var(--text-body)' }}>
                  <Text strong style={{ color: 'var(--text-primary)' }}>问{THEME_WORD[theme]}：</Text>
                  {scenarioText.scenario || '这一卦没有该主题的专门描述，请对照上面的「处境」自行体会。'}
                </Paragraph>
                <Paragraph style={{ fontSize: 13.5, lineHeight: 1.9, color: 'var(--text-body)', fontStyle: 'italic' }}>
                  {scenarioText.masterRead}
                </Paragraph>
                <Paragraph style={{ fontSize: 13, lineHeight: 1.9, color: 'var(--text-secondary)' }}>
                  {scenarioText.advice}
                </Paragraph>
              </>
            ) : (
              <Paragraph style={{ fontSize: 14, color: 'var(--text-body)' }}>
                本卦暂无情境文案，请以卦辞原文与分主题解读为准。
              </Paragraph>
            )}
          </Card>
            </CollapsibleCard>

          {/* 六爻详细列表 */}
          <CollapsibleCard title="六爻详细信息" summary="每爻纳甲、六亲、世应详解（鼠标悬停看白话）" accordionGroup="liuyao-analysis">
          <Card style={{ border: 'none', boxShadow: 'none', background: 'transparent', margin: 0, padding: 0 }}>
            {[...pan.benGua.yaoList].reverse().map((y: any, i: number) => {
              const movingChange = y.isMoving && pan.zhiGua?.yaoList
                ? (() => {
                  const zhiYao = pan.zhiGua.yaoList.find((z: any) => z.position === y.position);
                  const from = y.yaoValue === 9 ? '老阳○' : y.yaoValue === 6 ? '老阴×' : '';
                  const to = zhiYao ? ((zhiYao.yaoValue === 7 || zhiYao.yaoValue === 9) ? '阳' : '阴') : '';
                  return from ? `${from} 变${to}` : '';
                })()
                : '';
              return (
                <div key={i} style={{ padding: '6px 8px', marginBottom: 4, background: y.isMoving ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.02)', borderRadius: 4 }}>
                  <Space wrap size={4}>
                    <Text strong style={{ color: 'var(--text-primary)' }}>第{y.position}爻</Text>
                    <Tooltip title="这一爻配的干支（纳甲）——用来定它的五行和六亲"><Tag>{y.naJia}</Tag></Tooltip>
                    <Tooltip title="该爻的五行属性——重点看它与月建、动爻的生克关系"><Tag>{y.wuXing}</Tag></Tooltip>
                    <Tooltip title={LIUQIN_PLAIN[y.liuQin] || '六亲：爻与卦宫的五行关系名'}><Tag>{y.liuQin}</Tag></Tooltip>
                    {y.liuShou && <Tooltip title={LIUSHOU_PLAIN[y.liuShou] || '六兽'}><Tag>{y.liuShou}</Tag></Tooltip>}
                    {y.shiYing === '世' && <Tooltip title="世爻＝你自己"><Tag color="gold">世</Tag></Tooltip>}
                    {y.shiYing === '应' && <Tooltip title="应爻＝对方或外部环境"><Tag color="blue">应</Tag></Tooltip>}
                    {y.isMoving && (
                      <Tooltip title="动爻是断卦的重点：老阳○会变阴、老阴×会变阳——事情在这一环起变化">
                        <Tag color="red">{movingChange || '动爻'}</Tag>
                      </Tooltip>
                    )}
                    <Text style={{ color: 'var(--text-secondary)', fontSize: 11 }}>星宿：{y.xingXiu} 纳音：{y.naYin}</Text>
                  </Space>
                  {y.isMoving && movingChange && (
                    <Text style={{ fontSize: 11, color: 'var(--wx-fire)', display: 'block', marginTop: 2, paddingLeft: 4 }}>
                      ↑ 动爻所在：事情变化的关键节点，断卦优先看这一爻对应的爻辞
                    </Text>
                  )}
                </div>
              );
            })}
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
