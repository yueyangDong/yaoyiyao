import { useState, useMemo } from 'react';
import {
  Card, Button, Typography, Space, Tag, Divider,
  Row, Col, Radio, message, Alert, Select, Descriptions, Tooltip,
} from 'antd';
import { Sparkles, RefreshCw, HelpCircle, Compass, Clock } from 'lucide-react';
import { useUser } from '../context/UserContext';
import CollapsibleCard from '../components/CollapsibleCard';
import ThemeReadingCard from '../components/ThemeReadingCard';
import { useDailyQuota } from '../hooks/useDailyQuota';
import type { Theme } from '../utils/divinationCore';
import { buildKe, buildRandomKe, DI_ZHI_ORDER, JIANG_PLAIN, LIU_QIN_PLAIN, type KeResult } from '../utils/daliurenCore';
import { buildAllDaliurenReadings, buildDaliurenActions, buildDaliurenTiming, positionHints } from '../utils/daliurenReading';

const { Title, Text, Paragraph } = Typography;

/** 三分钟看懂大六壬：只解释「这张盘在说什么」，不讲流派 */
const BEGINNER_GUIDE = [
  { term: '大六壬是什么', plain: '三式（太乙、奇门、六壬）里专管「人事」的一门：把你提问的这一刻，换算成一张十二宫的盘，再用四课三传推这件事的来龙去脉。它比六爻重，好处是能看出「过程分几步、卡在哪一步」。' },
  { term: '月将加时', plain: '月将是太阳这个月所在的位置（按中气换），占时是你提问的时辰。把月将放到占时那一格上，其余十一格顺排，就得到「天盘」。天盘是「气」，地盘是「位」——同一件事，气落在哪个位置，决定了它在哪一环发力。' },
  { term: '四课', plain: '四课是「事从哪里起」：第一课看你自己（日干），第三课看事情或对方（日支），第二、四课是各自延伸出来的一层。上下相克叫「克」，克在哪里，事情就从哪里起波澜。' },
  { term: '三传', plain: '三传是事情的三步：初传＝起因/当下，中传＝过程，末传＝结果。三传就是这条事的「剧情线」，比吉凶结论更值得看。' },
  { term: '课体', plain: '课体是这张盘的「类型名」：元首（顺理成章）、重审（由内而起）、涉害（几条路都带伤）、昴星（悬着没抓手）、伏吟（原地打转）、返吟（翻来覆去）。它定的是事情的走法，不是好坏。' },
  { term: '十二天将', plain: '贵人、螣蛇、朱雀、六合、勾陈、青龙、天空、白虎、太常、玄武、太阴、天后。它们给事情加「气质」：贵人主有人帮、白虎主硬碰硬、玄武主有没说清的部分。天将只修饰，不定吉凶。' },
  { term: '类神', plain: '你问什么，就要在盘上找对应的那一类：问钱看妻财、问工作看官鬼、问文书看父母、问病看官鬼（但方向相反，旺是病重）。类神落在初传还是末传，决定这件事是「眼前」还是「以后」。' },
  { term: '应期', plain: '「什么时候」不能凭感觉，要看用神落在哪个地支：落在子就在子月／子日。落空亡的，要等这个支值月值日（填实）或对冲的那个支来冲（冲实）；临驿马的按「日」算、事情快；三传合成局的，按那一季算。它给的是窗口和节奏，不是某一天。' },
  { term: '所以呢', plain: '盘看懂了要能落到「明天做什么」。最后一层把「驿马主快」「贵人临亥」翻成三件事：找哪一类人、往哪个方向使劲、用什么方式推。它只定方向、不替你拍板——医生、合同、账目仍按现实里的规矩来。' },
];

const THEME_GUIDE = [
  { q: '事业 / 工作 / 升迁', look: '官鬼 + 父母', why: '官鬼是职位与上司，父母是文书与平台；官鬼现而受生，位置才动得起来。' },
  { q: '爱情 / 婚姻', look: '男看妻财，女看官鬼', why: '未设性别时两星合看，取盘中现而有力者为主——不默认男命。' },
  { q: '亲情 / 家人', look: '父母 + 兄弟', why: '父母主长辈与家宅，兄弟主手足平辈。' },
  { q: '财运 / 收入', look: '妻财 + 子孙', why: '妻财是钱本身，子孙是钱的来源（生财之神）。' },
  { q: '健康 / 身体', look: '官鬼（病）+ 子孙（药）', why: '这一题方向相反：官鬼旺是病势盛（凶），子孙旺是恢复力（吉）。' },
  { q: '学业 / 考试', look: '父母 + 官鬼', why: '父母主文书学历，官鬼主名次；文书旺而名次动，才是真考得好。' },
];

const RELATION_COLOR: Record<string, string> = {
  下贼上: 'var(--wx-fire)',
  上克下: 'var(--wx-earth)',
  无克: 'var(--text-disabled)',
};

/** 行动层四类的颜色：找人/方向是「往哪使劲」，方式/避坑是「怎么使劲、别往哪撞」 */
const ACTION_COLOR: Record<string, string> = {
  找人: 'gold',
  方向: 'blue',
  方式: 'cyan',
  避坑: 'orange',
};

export default function Daliuren() {
  const { currentUser, addHistory } = useUser();
  const { tryConsume, quotaModal } = useDailyQuota('daliuren');
  const [mode, setMode] = useState<'time' | 'manual' | 'random'>('time');
  const [ke, setKe] = useState<KeResult | null>(null);
  const [hourZhi, setHourZhi] = useState<string>('子');
  const [theme, setTheme] = useState<Theme>('事业');

  const readings = useMemo(
    () => (ke ? buildAllDaliurenReadings(ke, currentUser?.gender) : []),
    [ke, currentUser?.gender],
  );
  const hints = useMemo(() => (ke ? positionHints(ke) : []), [ke]);
  // 应期随主题变（锚点是该类神的落点），所以要传 theme；性别决定爱情题锚在妻财还是官鬼
  const timing = useMemo(
    () => (ke ? buildDaliurenTiming(ke, theme, currentUser?.gender) : null),
    [ke, theme, currentUser?.gender],
  );
  // 行动层同理：「该找谁」在不同主题下是不同的人（勾陈＝经办／老病历／牵旧关系的人）
  const actions = useMemo(
    () => (ke ? buildDaliurenActions(ke, theme, currentUser?.gender) : []),
    [ke, theme, currentUser?.gender],
  );

  const runKe = async (next: KeResult) => {
    if (!(await tryConsume())) return;
    setKe(next);
    message.success('起课完成');
    addHistory({
      userId: currentUser?.id || '',
      module: 'daliuren',
      queryParams: { mode: next.mode, dayGz: next.dateInfo.dayGz, hourZhi: next.dateInfo.hourZhi },
      resultSummary: `大六壬：${next.keTi.name}，三传${next.sanChuan.map((s) => s.zhi).join('→')}`,
    });
  };

  const handleTime = () => runKe(buildKe(new Date(), { mode: 'time' }));
  const handleManual = () => runKe(buildKe(new Date(), { hourZhi, mode: 'manual' }));
  const handleRandom = () => runKe(buildRandomKe(new Date()));

  const reset = () => setKe(null);

  return (
    <div style={{ padding: '16px 0' }}>
      <Title level={3} style={{ textAlign: 'center', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontWeight: 600 }}>
        大六壬
      </Title>
      <Text style={{ display: 'block', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12, marginBottom: 12 }}>
        人事之王 · 看事情的来龙去脉，而不只给一个吉凶
      </Text>

      <Alert
        message="起课不靠随机数：月将按中气定、天盘按「月将加时」排、三传按九宗门取——盘面是算出来的，只有「随机起课」这一种玩法的将时是抽的。"
        type="info"
        showIcon
        style={{ marginBottom: 16, background: 'var(--bg-card-solid)' }}
      />

      <CollapsibleCard
        title="三分钟看懂大六壬（新手必读）"
        summary="月将加时 / 四课 / 三传 / 课体 / 天将 / 类神，一屏说清"
        accordionGroup="daliuren-guide"
      >
        <Card size="small" style={{ border: 'none', boxShadow: 'none', background: 'transparent', margin: 0, padding: 0 }}>
          <Row gutter={[8, 8]}>
            {BEGINNER_GUIDE.map((item, i) => (
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
            message="一分钟上手：心里默念要问的事 → 起课 → 在「问什么看什么」里选主题 → 先看结论，再看三传（起因→过程→结果），最后看判读依据。"
          />
        </Card>
      </CollapsibleCard>

      <Card
        title={<><HelpCircle size={16} /> 问什么，看哪一类神（取用速查）</>}
        size="small"
        style={{ marginBottom: 16, borderColor: 'var(--border-light)' }}
      >
        <Row gutter={[8, 8]}>
          {THEME_GUIDE.map((item, i) => (
            <Col xs={24} sm={12} key={i}>
              <Paragraph style={{ fontSize: 13, marginBottom: 4 }}>
                <Text strong style={{ color: 'var(--text-primary)' }}>{item.q} → {item.look}</Text>
                <br />
                <Text style={{ color: 'var(--text-secondary)' }}>{item.why}</Text>
              </Paragraph>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 起课 */}
      <Card style={{ marginBottom: 16, borderColor: 'var(--border-light)' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong style={{ color: 'var(--text-primary)' }}>起课方式：</Text>
            <Radio.Group
              value={mode}
              onChange={(e) => { setMode(e.target.value); reset(); }}
              style={{ marginLeft: 12 }}
            >
              <Radio.Button value="time">正时起课</Radio.Button>
              <Radio.Button value="manual">活时起课</Radio.Button>
              <Radio.Button value="random">随机起课</Radio.Button>
            </Radio.Group>
          </div>

          <Divider style={{ margin: '8px 0' }} />

          {mode === 'time' && (
            <div style={{ textAlign: 'center' }}>
              <Button type="primary" size="large" icon={<Clock size={16} />} onClick={handleTime}>
                以此刻起课
              </Button>
              <Text style={{ color: 'var(--text-secondary)', display: 'block', marginTop: 8 }}>
                用当下的年月日时定月将与占时——传统最正规的起法。心里默念你要问的事。
              </Text>
            </div>
          )}

          {mode === 'manual' && (
            <div style={{ textAlign: 'center' }}>
              <Space>
                <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>占时</Text>
                <Select
                  value={hourZhi}
                  onChange={setHourZhi}
                  style={{ width: 110 }}
                  options={DI_ZHI_ORDER.map((z) => ({ value: z, label: `${z}时` }))}
                />
              </Space>
              <div style={{ marginTop: 12 }}>
                <Button type="primary" onClick={handleManual}>以此时起课</Button>
              </div>
              <Text style={{ color: 'var(--text-secondary)', display: 'block', marginTop: 8 }}>
                活时课：时辰另取（如「忽然心动的那一刻」），月将仍按今天的节气定。
              </Text>
            </div>
          )}

          {mode === 'random' && (
            <div style={{ textAlign: 'center' }}>
              <Button type="primary" size="large" icon={<Compass size={16} />} onClick={handleRandom}>
                随机起课
              </Button>
              <Text style={{ color: 'var(--text-secondary)', display: 'block', marginTop: 8 }}>
                将、时都随机抽——适合「心里没底、想换个角度看看」的时候。同一件事别反复抽，抽到第三次就不是问了。
              </Text>
            </div>
          )}
        </Space>
      </Card>

      {ke && (
        <>
          {/* 课盘总览 */}
          <Card title="课盘总览" style={{ marginBottom: 16, borderColor: 'var(--border-light)' }}>
            <Descriptions column={{ xs: 1, sm: 3 }} size="small">
              <Descriptions.Item label="日干支"><Text strong>{ke.dateInfo.dayGz}</Text></Descriptions.Item>
              <Descriptions.Item label="时干支">{ke.dateInfo.hourGz}</Descriptions.Item>
              <Descriptions.Item label="月将">
                {ke.dateInfo.jiangName}（{ke.dateInfo.jiangZhi}）· {ke.dateInfo.zhongQi}后
              </Descriptions.Item>
              <Descriptions.Item label="昼夜">{ke.dateInfo.dayNight}占</Descriptions.Item>
              <Descriptions.Item label="贵人">
                {ke.tianDiPan.guiRenZhi} 临 {ke.tianDiPan.guiRenOnDi}（{ke.tianDiPan.forward ? '顺布' : '逆布'}）
              </Descriptions.Item>
              <Descriptions.Item label="课体"><Tag color="gold">{ke.keTi.name}</Tag></Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 10, background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.25)' }}>
              <Text style={{ fontSize: 12.5, lineHeight: 1.8, color: 'var(--text-body)' }}>{ke.keTi.note}</Text>
            </div>
          </Card>

          {/* 分主题解读 */}
          <ThemeReadingCard
            readings={readings}
            theme={theme}
            onChange={setTheme}
            board="daliuren"
            title="问什么看什么：分主题解读"
          />

          {/* 应期：只回答「什么时候」，不动吉凶。锚点＝类神落点（与判读同一套取用） */}
          {timing && (
            <Card
              title={<><Clock size={16} /> 应期 · 大概什么时候见分晓</>}
              style={{ marginBottom: 16, borderColor: 'var(--border-light)' }}
            >
              <Space size={6} wrap style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 13, color: 'var(--text-secondary)' }}>节奏</Text>
                <Tag color={timing.speed.level === '快' ? 'green' : timing.speed.level === '慢' ? 'orange' : 'default'}>
                  {timing.speed.level}
                </Tag>
                <Text style={{ fontSize: 12, color: 'var(--text-body)' }}>{timing.speed.why}</Text>
              </Space>

              <Text style={{ display: 'block', fontSize: 13, lineHeight: 1.85, color: 'var(--text-body)', marginBottom: 10 }}>
                {timing.summary}
              </Text>

              {/* 主窗口＝类神/发用之支，用一张卡单独承重；参考窗口压成两行，层级一眼可分 */}
              {(() => {
                const mainW = timing.windows.find((w) => w.role === '主');
                const refs = timing.windows.filter((w) => w.role === '参考');
                if (!mainW) return null;
                return (
                  <>
                    <div style={{
                      border: '1px solid rgba(201,169,110,0.45)', borderRadius: 10, padding: '10px 12px',
                      background: 'rgba(201,169,110,0.07)',
                    }}>
                      <Space size={8} wrap>
                        <Tag style={{ fontSize: 11, border: 'none', background: 'rgba(201,169,110,0.22)', color: '#a8832f' }}>
                          主
                        </Tag>
                        <Text style={{ fontSize: 24, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', lineHeight: 1.1 }}>
                          {mainW.zhi}
                        </Text>
                        <Text style={{ fontSize: 12.5, color: 'var(--text-body)' }}>{mainW.when}</Text>
                      </Space>
                      <Text style={{ display: 'block', marginTop: 2, fontSize: 12, color: 'var(--text-body)' }}>
                        {mainW.dayHint}
                      </Text>
                      <Text style={{ display: 'block', marginTop: 2, fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        {mainW.basis}
                      </Text>
                    </div>

                    {refs.map((w) => (
                      <div key={w.zhi} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginTop: 8 }}>
                        <Tag style={{ fontSize: 10.5, border: 'none', background: 'rgba(0,0,0,0.05)', color: 'var(--text-secondary)', marginTop: 1 }}>
                          参考
                        </Tag>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ fontSize: 12.5, color: 'var(--text-body)' }}>
                            {w.when}
                          </Text>
                          <Text style={{ display: 'block', fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                            {w.dayHint}；{w.basis}
                          </Text>
                        </div>
                      </div>
                    ))}
                  </>
                );
              })()}

              <Divider style={{ margin: '10px 0' }} />

              <Text strong style={{ display: 'block', fontSize: 12.5, marginBottom: 4, color: 'var(--text-primary)' }}>
                这一盘按什么推出来的
              </Text>
              <Space direction="vertical" size={2} style={{ width: '100%' }}>
                {timing.rules.map((r, i) => (
                  <Text key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.75 }}>{r}</Text>
                ))}
              </Space>

              <Alert style={{ marginTop: 10 }} type="info" showIcon message={timing.note} />
            </Card>
          )}

          {/* 行动层：只把上面的结论翻成「找谁、往哪走、怎么推」，不重新判吉凶 */}
          {actions.length > 0 && (
            <Card
              title={<><Compass size={16} /> 所以呢 · 该找谁、往哪走</>}
              style={{ marginBottom: 16, borderColor: 'var(--border-light)' }}
            >
              <Text style={{ display: 'block', fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 10 }}>
                这一层不重新判吉凶，只把上面的结论翻成能做的事：找哪一类人、往哪个方向使劲、用什么方式推、哪里别撞。
                每条都附了盘面依据——觉得不对，就按依据自己改。
              </Text>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {actions.map((a, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', gap: 8, alignItems: 'flex-start',
                      padding: '9px 10px', borderRadius: 10,
                      border: '1px solid var(--border-light)',
                      background: 'rgba(0,0,0,0.015)',
                    }}
                  >
                    <Tag color={ACTION_COLOR[a.kind]} style={{ fontSize: 11, margin: '1px 0 0', flex: '0 0 auto' }}>
                      {a.kind}
                    </Tag>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ display: 'block', fontSize: 13, lineHeight: 1.8, color: 'var(--text-body)' }}>
                        {a.action}
                      </Text>
                      <Text style={{ display: 'block', marginTop: 2, fontSize: 11.5, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                        {a.basis}
                      </Text>
                    </div>
                  </div>
                ))}
              </Space>
              <Alert
                style={{ marginTop: 10 }}
                type="warning"
                showIcon
                message="它给的是「往哪儿使劲」，不是「保证成」。医疗、法律、财务上的决定仍按现实规矩来——该看的医生要看，该签的合同要读，该算的账要算。"
              />
            </Card>
          )}

          {/* 四课 */}
          <Card title="四课 · 事从哪里起" style={{ marginBottom: 16, borderColor: 'var(--border-light)' }}>
            <Row gutter={[8, 8]}>
              {ke.siKe.map((k) => (
                <Col xs={12} sm={6} key={k.index}>
                  <div style={{
                    border: '1px solid var(--border-light)', borderRadius: 10, padding: '10px 8px',
                    textAlign: 'center', background: k.index === 1 || k.index === 3 ? 'rgba(0,0,0,0.02)' : 'transparent',
                  }}>
                    <Text style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block' }}>{k.name}</Text>
                    <Text style={{ fontSize: 20, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', display: 'block', lineHeight: 1.4 }}>
                      {k.upper}
                    </Text>
                    <Text style={{ fontSize: 11, color: 'var(--text-disabled)', display: 'block' }}>上神</Text>
                    <div style={{ height: 1, background: 'var(--border-light)', margin: '6px 0' }} />
                    <Text style={{ fontSize: 16, fontFamily: 'var(--font-display)', color: 'var(--text-body)', display: 'block' }}>
                      {k.lowerLabel}
                    </Text>
                    <Text style={{ fontSize: 11, color: RELATION_COLOR[k.relation], display: 'block', marginTop: 4 }}>
                      {k.relation === '无克' ? '上下无克' : k.relation}
                    </Text>
                  </div>
                </Col>
              ))}
            </Row>
            <Text style={{ display: 'block', marginTop: 10, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              一、三课是主干：第一课看你自己（日干那一头），第三课看事情或对方（日支）；
              二、四课是各自延伸的一层。哪一课「下贼上」或「上克下」，事情就从那里起波澜。
            </Text>
          </Card>

          {/* 三传 */}
          <Card title="三传 · 事情的起因、过程、结果" style={{ marginBottom: 16, borderColor: 'var(--border-light)' }}>
            <Row gutter={[8, 8]}>
              {ke.sanChuan.map((s, i) => (
                <Col xs={24} sm={8} key={s.stage}>
                  <div style={{
                    border: '1px solid var(--border-light)', borderRadius: 10, padding: 10,
                    borderLeft: `3px solid ${i === 0 ? 'var(--wx-wood)' : i === 1 ? 'var(--wx-earth)' : 'var(--wx-metal)'}`,
                    background: 'rgba(0,0,0,0.015)',
                  }}>
                    <Space size={4} wrap>
                      <Text strong style={{ fontSize: 12, color: 'var(--text-primary)' }}>{s.stage}</Text>
                      <Text style={{ fontSize: 20, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>{s.zhi}</Text>
                      <Tag style={{ fontSize: 11 }}>{s.dunGan}</Tag>
                      <Tooltip title={LIU_QIN_PLAIN[s.liuQin] || ''}>
                        <Tag style={{ fontSize: 11 }}>{s.liuQin}</Tag>
                      </Tooltip>
                      <Tooltip title={JIANG_PLAIN[s.tianJiang] || ''}>
                        <Tag color="gold" style={{ fontSize: 11 }}>{s.tianJiang}</Tag>
                      </Tooltip>
                      {s.kong && <Tag color="red" style={{ fontSize: 11 }}>空</Tag>}
                      {s.yiMa && <Tag color="blue" style={{ fontSize: 11 }}>马</Tag>}
                    </Space>
                    <Text style={{ display: 'block', marginTop: 4, fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                      {s.stage === '初传' ? '起因 / 当下这一刻' : s.stage === '中传' ? '过程 / 中间的变化' : '结果 / 事情收到哪'}
                    </Text>
                  </div>
                </Col>
              ))}
            </Row>
            <Text style={{ display: 'block', marginTop: 10, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              三传的顺序就是事情的先后：初传是开手，中传是转折，末传是落点。
              「空」是暂时不落实（等到填实才算数），「马」主快、主动、主远。
            </Text>
          </Card>

          {/* 天地盘十二宫 */}
          <Card title="天地盘 · 十二宫" style={{ marginBottom: 16, borderColor: 'var(--border-light)' }}>
            <Row gutter={[6, 6]}>
              {ke.tianDiPan.positions.map((p) => (
                <Col xs={6} sm={4} key={p.di}>
                  <div style={{
                    textAlign: 'center', borderRadius: 8, padding: '8px 2px',
                    border: `1px solid ${p.isGuiRen ? 'rgba(201,169,110,0.55)' : 'var(--border-light)'}`,
                    background: p.isGuiRen ? 'rgba(201,169,110,0.10)' : p.isHour ? 'rgba(0,0,0,0.03)' : 'transparent',
                  }}>
                    <Text style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'block' }}>{p.jiang}</Text>
                    <Text style={{ fontSize: 16, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', display: 'block', lineHeight: 1.5 }}>
                      {p.tian}
                    </Text>
                    <div style={{ height: 1, background: 'var(--border-light)', margin: '2px 6px' }} />
                    <Text style={{ fontSize: 13, fontFamily: 'var(--font-display)', color: 'var(--text-body)', display: 'block' }}>
                      {p.di}
                    </Text>
                    {p.isHour && <Text style={{ fontSize: 10, color: 'var(--text-disabled)' }}>占时</Text>}
                  </div>
                </Col>
              ))}
            </Row>
            <Text style={{ display: 'block', marginTop: 10, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              每格上为天盘（气）、中为天将、下为地盘（位）。月将落在地盘「占时」那一格上，其余顺排——
              所以看到天盘，就知道「这个月的气」此刻压在哪个位置上。
            </Text>
          </Card>

          {/* 重点提示 */}
          <Card title="这张盘上的几个看点" style={{ marginBottom: 16, borderColor: 'var(--border-light)' }}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              {hints.map((h, i) => (
                <Text key={i} style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.8 }}>
                  · {h}
                </Text>
              ))}
            </Space>
          </Card>

          <div style={{ textAlign: 'center' }}>
            <Button onClick={reset} icon={<RefreshCw size={16} />} size="large">重新起课</Button>
          </div>
        </>
      )}

      {!ke && (
        <div style={{ textAlign: 'center', color: 'var(--text-disabled)', fontSize: 12, marginTop: 8 }}>
          <Sparkles size={14} style={{ marginRight: 4 }} />
          大六壬讲「一事一课」：起课之后先把问题在心里说清楚，再看盘。
        </div>
      )}

      {quotaModal}
    </div>
  );
}
