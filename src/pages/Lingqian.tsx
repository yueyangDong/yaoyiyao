import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Card, Button, Typography, Space, Tag, message, Tabs,
  Row, Col, Divider, Input, Progress,
} from 'antd';
import {
  RedoOutlined, FireOutlined,
} from '@ant-design/icons';
import { ScrollText, Shuffle } from 'lucide-react';
import { guanyinLots } from '../data/guanyinLots';
import { guandiLots } from '../data/guandiLots';
import { ZHUGES_LOTS, getZhugeLotByStrokes } from '../data/zhugeshensuan';
import { useUser } from '../context/UserContext';
// @ts-ignore - canvas-confetti types not available
import confetti from 'canvas-confetti';

const { Title, Text, Paragraph } = Typography;

// 等级颜色 (使用设计系统)
const LEVEL_COLORS: Record<string, string> = {
  '上上': 'var(--wx-earth)', '上': 'var(--color-warn)', '中': 'var(--wx-wood)', '下': 'var(--wx-water)', '下下': 'var(--wx-metal)',
};

type DrawPhase = 'idle' | 'praying' | 'shaking' | 'confirming' | 'revealing' | 'done';

export default function Lingqian() {
  const { currentUser, addHistory } = useUser();
  const [lotType, setLotType] = useState<string>('guanyin');
  const [phase, setPhase] = useState<DrawPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [zhugeWords, setZhugeWords] = useState({ w1: '', w2: '', w3: '' });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentLots = lotType === 'guanyin' ? guanyinLots : lotType === 'guandi' ? guandiLots : ZHUGES_LOTS;

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const startDraw = useCallback(() => {
    if (lotType === 'zhuge') {
      if (!zhugeWords.w1 || !zhugeWords.w2 || !zhugeWords.w3) {
        message.warning('请输入三个汉字');
        return;
      }
      const r = getZhugeLotByStrokes(zhugeWords.w1, zhugeWords.w2, zhugeWords.w3);
      setResult(r.lot);
      setPhase('done');
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      addHistory({
        userId: currentUser?.id || '',
        module: 'lingqian',
        queryParams: { type: 'zhuge', words: zhugeWords },
        resultSummary: `诸葛神数第${r.lotIndex}签 ${r.lot.name} ${r.lot.level}`,
      });
      return;
    }

    setPhase('praying');
    setProgress(0);

    // 阶段1: 静心祈愿 2秒
    let p = 0;
    const prayInterval = setInterval(() => {
      p += 5;
      setProgress(p);
      if (p >= 25) {
        clearInterval(prayInterval);
        // 阶段2: 摇动签筒 3秒
        setPhase('shaking');
        const shakeInterval = setInterval(() => {
          p += 3.5;
          setProgress(p);
          if (p >= 60) {
            clearInterval(shakeInterval);
            // 阶段3: 圣杯确认 2秒
            setPhase('confirming');
            const confirmInterval = setInterval(() => {
              p += 5;
              setProgress(p);
              if (p >= 85) {
                clearInterval(confirmInterval);
                // 阶段4: 签文显现
                setPhase('revealing');
                const revealInterval = setInterval(() => {
                  p += 2;
                  setProgress(p);
                  if (p >= 100) {
                    clearInterval(revealInterval);
                    // 随机抽签
                    const idx = Math.floor(Math.random() * currentLots.length);
                    const lot = currentLots[idx];
                    setResult(lot);
                    setPhase('done');
                    // 放彩带
                    if (lot.level === '上上' || lot.level === '上') {
                      confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
                    } else {
                      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
                    }
                    addHistory({
                      userId: currentUser?.id || '',
                      module: 'lingqian',
                      queryParams: { type: lotType },
                      resultSummary: `${lotType === 'guanyin' ? '观音' : '关帝'}灵签第${(lot as any).id || (lot as any).index}签 ${lot.name} ${lot.level}`,
                    });
                  }
                }, 100);
              }
            }, 500);
          }
        }, 100);
      }
    }, 80);
  }, [lotType, zhugeWords, currentLots, currentUser?.id, addHistory]);

  const resetDraw = () => {
    setPhase('idle');
    setProgress(0);
    setResult(null);
    setZhugeWords({ w1: '', w2: '', w3: '' });
  };

  // 阶段渲染
  const phaseText: Record<DrawPhase, string> = {
    'idle': '诚心默念所问之事',
    'praying': '静心祈愿中...心境澄明，诚心祷告',
    'shaking': '摇动签筒中...签筒晃动，神签将至',
    'confirming': '掷筊确认中...圣杯落地，天意已显',
    'revealing': '签文显现中...灵签飞落，天命所归',
    'done': '',
  };

  const containerStyle: React.CSSProperties = {
    padding: '16px 0',
    minHeight: '80vh',
    background: 'var(--bg-warm)',
  };

  return (
    <div style={containerStyle}>
      <Title level={3} style={{
        textAlign: 'center',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        letterSpacing: 2,
        marginBottom: 8,
      }}>
        灵签抽签
      </Title>
      <Paragraph style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 16 }}>
        诚心默念所求之事，心诚则灵
      </Paragraph>

      {/* 签系选择 */}
      {phase === 'idle' && (
        <Card style={{
          maxWidth: 600, margin: '0 auto 16px',
          background: 'var(--bg-card-solid)',
          borderColor: 'var(--border-light)',
        }}>
          <Tabs
            activeKey={lotType}
            onChange={setLotType}
            centered
            items={[
              { key: 'guanyin', label: <span style={{ color: 'var(--text-primary)' }}>观音灵签</span>, children: null },
              { key: 'guandi', label: <span style={{ color: 'var(--text-primary)' }}>关帝灵签</span>, children: null },
              { key: 'zhuge', label: <span style={{ color: 'var(--text-primary)' }}>诸葛神数</span>, children: null },
            ]}
          />

          {lotType === 'zhuge' ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <Text style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: 12 }}>
                请输入三个汉字，根据笔画数推算签号
              </Text>
              <Space size="middle">
                <Input
                  maxLength={1}
                  value={zhugeWords.w1}
                  onChange={e => setZhugeWords(p => ({ ...p, w1: e.target.value }))}
                  style={{ width: 60, textAlign: 'center', fontSize: 24 }}
                />
                <Input
                  maxLength={1}
                  value={zhugeWords.w2}
                  onChange={e => setZhugeWords(p => ({ ...p, w2: e.target.value }))}
                  style={{ width: 60, textAlign: 'center', fontSize: 24 }}
                />
                <Input
                  maxLength={1}
                  value={zhugeWords.w3}
                  onChange={e => setZhugeWords(p => ({ ...p, w3: e.target.value }))}
                  style={{ width: 60, textAlign: 'center', fontSize: 24 }}
                />
              </Space>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <Text style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                心中默念你想问的事情（事业/感情/财运/健康...）
              </Text>
            </div>
          )}

          <div style={{ textAlign: 'center' }}>
            <Button
              type="primary"
              size="large"
              onClick={startDraw}
              icon={<ScrollText size={18} />}
              style={{
                height: 56, fontSize: 18, padding: '0 48px',
                background: 'var(--text-primary)',
                color: '#ffffff',
                border: 'none', borderRadius: 30,
              }}
            >
              开始抽签
            </Button>
          </div>
        </Card>
      )}

      {/* 抽签动画 */}
      {(phase !== 'idle' && phase !== 'done') && (
        <div style={{
          maxWidth: 500, margin: '0 auto', padding: '24px 0',
          textAlign: 'center',
        }}>
          {/* SVG签筒动画 */}
          <div style={{
            animation: phase === 'shaking' ? 'shake 0.12s infinite' : 'pulse 2s infinite',
            display: 'inline-block',
          }}>
            <svg viewBox="0 0 260 300" width="200" height="240">
              {/* 签筒 body */}
              <defs>
                <linearGradient id="tubeGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(0,0,0,0.04)" />
                  <stop offset="50%" stopColor="rgba(0,0,0,0.01)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0.06)" />
                </linearGradient>
              </defs>

              {/* 签筒底部圆角矩形 */}
              <rect x="85" y="70" width="90" height="160" rx="16"
                fill="url(#tubeGrad)" stroke="var(--border-light)" strokeWidth={1.5} />

              {/* 签筒顶部椭圆(开口) */}
              <ellipse cx="130" cy="70" rx="45" ry="10"
                fill="rgba(0,0,0,0.03)" stroke="var(--border-light)" strokeWidth={1} />

              {/* 签筒底部椭圆 */}
              <ellipse cx="130" cy="230" rx="45" ry="8"
                fill="none" stroke="var(--border-light)" strokeWidth={0.5} />

              {/* 签筒装饰环 */}
              <rect x="83" y="80" width="94" height={4} rx={2} fill="var(--border-light)" opacity={0.5} />
              <rect x="83" y="216" width="94" height={4} rx={2} fill="var(--border-light)" opacity={0.5} />

              {/* 签条 */}
              {[0, 1, 2, 3, 4].map((i) => {
                const stickX = 100 + i * 13;
                const visibleTop = 70 + (phase === 'revealing' ? 8 : 4);
                const flyOut = phase === 'revealing' && i === 2;
                return (
                  <g key={i} opacity={flyOut ? 0.3 : 1}>
                    {!flyOut && (
                      <>
                        {/* 签身 */}
                        <rect x={stickX} y={visibleTop} width={6} height={135}
                          fill="rgba(0,0,0,0.06)" rx={1} />
                        {/* 签头红色标记 */}
                        <rect x={stickX} y={visibleTop} width={6} height={12}
                          fill="var(--wx-fire)" rx={1} opacity={0.6} />
                      </>
                    )}
                    {/* 飞出的签 */}
                    {flyOut && (
                      <g style={{
                        animation: 'flyOut 1s ease-out forwards',
                        transformOrigin: 'center center',
                      }}>
                        <rect x={stickX - 2} y={visibleTop - 30} width={6} height={135}
                          fill="rgba(0,0,0,0.08)" rx={1} transform={`rotate(-15, ${stickX + 1}, ${visibleTop - 30 + 67})`} />
                        <rect x={stickX - 2} y={visibleTop - 30} width={6} height={12}
                          fill="var(--wx-fire)" rx={1} opacity={0.8} transform={`rotate(-15, ${stickX + 1}, ${visibleTop - 30 + 6})`} />
                        <text x={stickX + 1} y={visibleTop + 30} fontSize={8} fill="var(--text-primary)"
                          transform={`rotate(-15, ${stickX + 1}, ${visibleTop + 30})`} textAnchor="middle">签</text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* 圣杯(confirming阶段) */}
              {phase === 'confirming' && (
                <g style={{ animation: 'flip 0.8s infinite', transformOrigin: '130px 260px' }}>
                  {/* 左月牙 */}
                  <path d="M110,255 A18,18 0 0,1 110,285" fill="var(--wx-earth)" stroke="var(--border-input)" strokeWidth={1} opacity={0.9} />
                  {/* 右月牙 */}
                  <path d="M150,255 A18,18 0 0,0 150,285" fill="var(--wx-earth)" stroke="var(--border-input)" strokeWidth={1} opacity={0.9} />
                </g>
              )}
            </svg>
          </div>

          <Progress
            percent={progress}
            showInfo={false}
            strokeColor="var(--text-primary)"
            trailColor="var(--border-light)"
            style={{ marginBottom: 16 }}
          />

          <Text style={{ color: 'var(--text-body)', fontSize: 15, display: 'block' }}>
            {phaseText[phase]}
          </Text>
        </div>
      )}

      {/* 签文结果 */}
      {result && phase === 'done' && (
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <Card style={{
            marginBottom: 16,
            background: 'var(--bg-card-solid)',
            borderColor: 'var(--border-light)',
            boxShadow: 'var(--shadow-sm)',
          }}>
            {/* 签号 + 等级 */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{
                display: 'inline-block',
                background: 'rgba(0,0,0,0.02)',
                padding: '12px 32px',
                borderRadius: 12,
                marginBottom: 12,
              }}>
                <Text style={{ color: 'var(--text-body)', fontSize: 14 }}>
                  {lotType === 'guanyin' ? '观音灵签' : lotType === 'guandi' ? '关帝灵签' : '诸葛神数'}
                </Text>
              </div>
              <div>
                <Title level={1} style={{ color: LEVEL_COLORS[result.level], margin: '8px 0', fontSize: 48 }}>
                  第 {result.index} 签
                </Title>
                <Tag
                  color={LEVEL_COLORS[result.level]}
                  style={{ fontSize: 20, padding: '8px 28px', borderRadius: 20 }}
                >
                  {result.level}
                </Tag>
              </div>
              <Title level={3} style={{ color: 'var(--text-primary)', marginTop: 12 }}>
                {result.name}
              </Title>
              <Tag color="default" style={{ fontSize: 13 }}>{result.gongWei}</Tag>
            </div>

            <Divider style={{ borderColor: 'var(--border-light)' }} />

            {/* 签诗 */}
            <Card
              size="small"
              title={<><ScrollText size={16} style={{ marginRight: 4 }} />签诗</>}
              style={{
                marginBottom: 12,
                background: 'var(--bg-card-solid)',
                borderColor: 'var(--border-light)',
              }}
            >
              <Paragraph style={{
                fontSize: 16, lineHeight: 2.2, textAlign: 'center',
                fontFamily: '"KaiTi", "楷体", "STKaiti", serif',
                whiteSpace: 'pre-line',
                color: 'var(--text-body)',
              }}>
                {result.poem}
              </Paragraph>
            </Card>

            {/* 签语 + 解曰 */}
            <Card size="small" title="签文解读" style={{
              marginBottom: 12,
              background: 'var(--bg-card-solid)',
              borderColor: 'var(--border-light)',
            }}>
              <Paragraph style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-line', color: 'var(--text-body)' }}>
                {result.explanation}
              </Paragraph>
            </Card>

            <Card size="small" title="白话详解" style={{
              marginBottom: 12,
              background: 'var(--bg-card-solid)',
              borderColor: 'var(--border-light)',
            }}>
              <Paragraph style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-line', color: 'var(--text-body)' }}>
                {result.interpretation}
              </Paragraph>
            </Card>

            {/* 仙机指引 */}
            <Card size="small" title="仙机指引" style={{
              marginBottom: 12,
              background: 'var(--bg-card-solid)',
              borderColor: 'var(--border-light)',
            }}>
              <Row gutter={[8, 8]}>
                {Object.entries(result.guide).map(([key, val]) => (
                  <Col xs={12} sm={8} md={6} key={key}>
                    <Card size="small" styles={{ body: { padding: '8px', background: 'rgba(0,0,0,0.02)' } }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>{key}</Text>
                      <br />
                      <Text strong style={{ fontSize: 13, color: 'var(--text-body)' }}>{String(val)}</Text>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>

            {/* 分维度解读 */}
            {result.level && (
              <Card
                size="small"
                title={<span style={{ color: 'var(--text-primary)' }}>📋 分维度解读</span>}
                style={{
                  marginBottom: 12,
                  background: 'var(--bg-card-solid)',
                  borderColor: 'var(--border-light)',
                }}
              >
                <Row gutter={[8, 12]}>
                  {[
                    { label: '事业', icon: '💼' },
                    { label: '感情', icon: '💕' },
                    { label: '财运', icon: '💰' },
                    { label: '健康', icon: '💚' },
                  ].map(({ label, icon }) => {
                    const isGood = result.level === '上上' || result.level === '上';
                    const isBad = result.level === '下下' || result.level === '下';
                    const adviceMap: Record<string, string> = {
                      '事业': isGood ? '事业运旺，适合跳槽、创业、争取晋升。主动出击会有好结果。'
                        : isBad ? '事业上暂遇阻碍，不宜做重大决定。守住现有岗位，等待时机。'
                        : '事业运势平稳，按部就班即可，不宜冒进也不需担忧。',
                      '感情': isGood ? '桃花运好，单身者可大胆追求，有伴侣者感情升温。'
                        : isBad ? '感情上需多些耐心和理解，避免因小事争吵。单身者暂不适合表白。'
                        : '感情中规中矩，顺其自然就好，强扭的瓜不甜。',
                      '财运': isGood ? '财运不错，投资需审慎但可以适度尝试。有意外的进账机会。'
                        : isBad ? '财运走低，注意控制开支，避免高风险投资。守财为主。'
                        : '财运一般，维持现状即可。不贪心就不会有损失。',
                      '健康': isGood ? '身体状态良好，精神充沛。适合开始新的运动计划。'
                        : isBad ? '注意休息和调养，可能有小病痛。避免过度劳累。'
                        : '健康运平稳，保持良好作息即可，不必过度担心。',
                    };
                    return (
                      <Col xs={12} key={label}>
                        <Card size="small" styles={{ body: { padding: '10px 12px', background: 'rgba(0,0,0,0.02)' } }}>
                          <Text strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                            {icon} {label}
                          </Text>
                          <Paragraph style={{ fontSize: 12, color: 'var(--text-body)', marginTop: 4, marginBottom: 0, lineHeight: 1.7 }}>
                            {adviceMap[label]}
                          </Paragraph>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              </Card>
            )}

            {/* 凶签化解建议 */}
            {(result.level === '下' || result.level === '下下') && (
              <Card
                size="small"
                title={<span style={{ color: 'var(--wx-fire)' }}>🪷 化解建议</span>}
                style={{
                  marginBottom: 12,
                  background: 'rgba(199,91,91,0.03)',
                  borderColor: 'var(--border-light)',
                  borderLeft: '3px solid var(--wx-fire)',
                }}
              >
                <Paragraph style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.9 }}>
                  抽到凶签不必过度担心。灵签的本意是提醒，而非预言。凶签如良医——指出病灶是为了让你及时调整。建议：1. 近期少做重大决定，多观察多思考；2. 多行善事积累福报；3. 可以在心里默念"命由心造，福自我求"三遍；4. 过一段时间可以重新抽一次，心境变了签也会变。
                </Paragraph>
              </Card>
            )}

            {/* 典故 */}
            <Card
              size="small"
              title={<><FireOutlined /> 签文典故</>}
              style={{ background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-light)' }}
            >
              <Paragraph style={{ fontSize: 13, lineHeight: 1.8, fontStyle: 'italic', color: 'var(--text-body)' }}>
                {result.story}
              </Paragraph>
              {result.story && result.story.length < 100 && (
                <Paragraph style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
                  注：此签典故较短，建议结合签诗和解读综合理解。
                </Paragraph>
              )}
            </Card>
          </Card>

          {/* 操作按钮 */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Space>
              <Button
                size="large"
                icon={<RedoOutlined />}
                onClick={resetDraw}
                style={{
                  background: 'var(--text-primary)',
                  color: '#ffffff',
                  border: 'none',
                }}
              >
                重新抽签
              </Button>
              <Button
                size="large"
                icon={<Shuffle size={16} />}
                onClick={() => {
                  setPhase('idle');
                  setProgress(0);
                  setResult(null);
                }}
                style={{
                  background: 'var(--text-primary)',
                  color: '#ffffff',
                  border: 'none',
                }}
              >
                再抽一签
              </Button>
            </Space>
          </div>
        </div>
      )}

      {/* CSS 动画 */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          25% { transform: translateX(-8px) rotate(-3deg); }
          75% { transform: translateX(8px) rotate(3deg); }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 10px 40px rgba(0,0,0,0.08); }
          50% { box-shadow: 0 10px 60px rgba(0,0,0,0.12); }
        }
        @keyframes flyOut {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          60% { transform: translateY(-10px) rotate(-15deg); opacity: 0.8; }
          100% { transform: translateY(-40px) rotate(-25deg); opacity: 0; }
        }
        @keyframes flip {
          0%, 100% { transform: rotateY(0deg); }
          50% { transform: rotateY(180deg); }
        }
      `}</style>
    </div>
  );
}
