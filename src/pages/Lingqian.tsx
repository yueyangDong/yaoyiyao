import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Card, Button, Typography, Space, Tag, message, Tabs,
  Row, Col, Divider, Input, Progress,
} from 'antd';
import {
  ExperimentOutlined, FireOutlined, RedoOutlined, GiftOutlined, EditOutlined,
} from '@ant-design/icons';
import { GUANYIN_LOTS, LotEntry } from '../data/guanyinLots';
import { GUANDI_LOTS } from '../data/guandiLots';
import { ZHUGES_LOTS, getZhugeLotByStrokes } from '../data/zhugeshensuan';
import { useUser } from '../context/UserContext';
// @ts-ignore - canvas-confetti types not available
import confetti from 'canvas-confetti';

const { Title, Text, Paragraph } = Typography;

// 等级颜色
const LEVEL_COLORS: Record<string, string> = {
  '上上': '#e74c3c', '上': '#e67e22', '中': '#2ecc71', '下': '#3498db', '下下': '#9b59b6',
};
const LEVEL_EMOJI: Record<string, string> = {
  '上上': '🌟', '上': '✨', '中': '☯', '下': '🌙', '下下': '💫',
};

type DrawPhase = 'idle' | 'praying' | 'shaking' | 'confirming' | 'revealing' | 'done';

export default function Lingqian() {
  const { currentUser, addHistory } = useUser();
  const [lotType, setLotType] = useState<string>('guanyin');
  const [phase, setPhase] = useState<DrawPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<LotEntry | null>(null);
  const [zhugeWords, setZhugeWords] = useState({ w1: '', w2: '', w3: '' });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shakeRef = useRef<HTMLDivElement | null>(null);

  const currentLots = lotType === 'guanyin' ? GUANYIN_LOTS : lotType === 'guandi' ? GUANDI_LOTS : ZHUGES_LOTS;

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
                      resultSummary: `${lotType === 'guanyin' ? '观音' : '关帝'}灵签第${lot.index}签 ${lot.name} ${lot.level}`,
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
    background: 'linear-gradient(135deg, #0a0a0f 0%, #1a0a00 30%, #0d0d1a 60%, #0a0a0f 100%)',
  };

  return (
    <div style={containerStyle}>
      <Title level={3} style={{ textAlign: 'center', color: '#c9a96e', letterSpacing: 6, marginBottom: 8 }}>
        🏮 灵签抽签
      </Title>
      <Paragraph style={{ textAlign: 'center', color: '#8b7355', marginBottom: 16 }}>
        诚心默念所求之事，心诚则灵
      </Paragraph>

      {/* 签系选择 */}
      {phase === 'idle' && (
        <Card style={{
          maxWidth: 600, margin: '0 auto 16px',
          background: 'rgba(20,15,10,0.85)', borderColor: '#3d2b1a',
          backdropFilter: 'blur(20px)',
        }}>
          <Tabs
            activeKey={lotType}
            onChange={setLotType}
            centered
            items={[
              { key: 'guanyin', label: <span style={{ color: '#c9a96e' }}>🔮 观音灵签</span>, children: null },
              { key: 'guandi', label: <span style={{ color: '#c9a96e' }}>⚔️ 关帝灵签</span>, children: null },
              { key: 'zhuge', label: <span style={{ color: '#c9a96e' }}>🪶 诸葛神数</span>, children: null },
            ]}
          />

          {lotType === 'zhuge' ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <Text style={{ color: '#8b7355', display: 'block', marginBottom: 12 }}>
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
              <Text style={{ color: '#8b7355', display: 'block', marginBottom: 8 }}>
                心中默念你想问的事情（事业/感情/财运/健康...）
              </Text>
            </div>
          )}

          <div style={{ textAlign: 'center' }}>
            <Button
              type="primary"
              size="large"
              onClick={startDraw}
              icon={<GiftOutlined />}
              style={{
                height: 56, fontSize: 18, padding: '0 48px',
                background: 'linear-gradient(135deg, #c9a96e, #8b6914)',
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
          maxWidth: 500, margin: '0 auto', padding: 40,
          textAlign: 'center',
        }}>
          {/* 签筒动画区 */}
          <div
            ref={shakeRef}
            style={{
              width: 120, height: 200, margin: '0 auto 30px',
              background: 'linear-gradient(180deg, #8b4513, #5c2d0a)',
              borderRadius: '15px 15px 40px 40px',
              border: '3px solid #c9a96e',
              position: 'relative',
              boxShadow: '0 10px 40px rgba(201,169,110,0.3)',
              animation: phase === 'shaking' ? 'shake 0.15s infinite' : 'pulse 2s infinite',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div style={{
              width: 40, height: 100,
              background: 'linear-gradient(180deg, #f5deb3, #d2b48c)',
              borderRadius: 4,
              border: '2px solid #8b4513',
              position: 'absolute',
              top: phase === 'revealing' ? -30 : 20,
              transition: 'top 0.8s ease-out',
              opacity: phase === 'revealing' ? 0.4 : 1,
            }}>
              <Text style={{ fontSize: 20, display: 'block', textAlign: 'center', lineHeight: '100px' }}>签</Text>
            </div>
          </div>

          <Progress
            percent={progress}
            showInfo={false}
            strokeColor={{ '0%': '#c9a96e', '100%': '#8b6914' }}
            trailColor="rgba(201,169,110,0.15)"
            style={{ marginBottom: 20 }}
          />

          <Text style={{ color: '#c9a96e', fontSize: 16, display: 'block' }}>
            {phaseText[phase]}
          </Text>

          {/* 圣杯动画 */}
          {phase === 'confirming' && (
            <div style={{ fontSize: 40, marginTop: 16, animation: 'flip 1s infinite' }}>
              🥢🥢
            </div>
          )}
        </div>
      )}

      {/* 签文结果 */}
      {result && phase === 'done' && (
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <Card style={{
            marginBottom: 16,
            background: 'linear-gradient(135deg, rgba(253,248,240,0.95), rgba(245,235,210,0.95))',
            borderColor: '#c9a96e',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            {/* 签号 + 等级 */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #1a1a2e, #2d1f0a)',
                padding: '12px 32px',
                borderRadius: 12,
                marginBottom: 12,
              }}>
                <Text style={{ color: '#c9a96e', fontSize: 14 }}>
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
                  {LEVEL_EMOJI[result.level]} {result.level}
                </Tag>
              </div>
              <Title level={3} style={{ color: '#5c2d0a', marginTop: 12 }}>
                {result.name}
              </Title>
              <Tag color="purple" style={{ fontSize: 13 }}>{result.gongWei}</Tag>
            </div>

            <Divider style={{ borderColor: '#c9a96e' }} />

            {/* 签诗 */}
            <Card
              size="small"
              title={<><EditOutlined /> 签诗</>}
              style={{
                marginBottom: 12,
                background: 'rgba(255,248,240,0.9)',
                borderColor: '#d4a574',
              }}
            >
              <Paragraph style={{
                fontSize: 16, lineHeight: 2.2, textAlign: 'center',
                fontFamily: '"KaiTi", "楷体", "STKaiti", serif',
                whiteSpace: 'pre-line',
                color: '#3d1f00',
              }}>
                {result.poem}
              </Paragraph>
            </Card>

            {/* 签语 + 解曰 */}
            <Card size="small" title="📜 签文解读" style={{ marginBottom: 12 }}>
              <Paragraph style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                {result.explanation}
              </Paragraph>
            </Card>

            <Card size="small" title="📖 白话详解" style={{ marginBottom: 12 }}>
              <Paragraph style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                {result.interpretation}
              </Paragraph>
            </Card>

            {/* 仙机指引 */}
            <Card size="small" title="🏷 仙机指引" style={{ marginBottom: 12 }}>
              <Row gutter={[8, 8]}>
                {Object.entries(result.guide).map(([key, val]) => (
                  <Col xs={12} sm={8} md={6} key={key}>
                    <Card size="small" styles={{ body: { padding: '8px' } }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>{key}</Text>
                      <br />
                      <Text strong style={{ fontSize: 13 }}>{val}</Text>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>

            {/* 典故 */}
            <Card
              size="small"
              title={<><FireOutlined /> 签文典故</>}
              style={{ background: 'rgba(253,245,230,0.9)' }}
            >
              <Paragraph style={{ fontSize: 13, lineHeight: 1.8, fontStyle: 'italic' }}>
                {result.story}
              </Paragraph>
            </Card>
          </Card>

          {/* 操作按钮 */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Space>
              <Button
                size="large"
                icon={<RedoOutlined />}
                onClick={resetDraw}
                style={{ background: '#2d1f0a', color: '#c9a96e', borderColor: '#5c3d1a' }}
              >
                重新抽签
              </Button>
              <Button
                size="large"
                icon={<ExperimentOutlined />}
                onClick={() => {
                  setPhase('idle');
                  setProgress(0);
                  setResult(null);
                }}
                style={{ background: '#2d1f0a', color: '#c9a96e', borderColor: '#5c3d1a' }}
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
          0%, 100% { box-shadow: 0 10px 40px rgba(201,169,110,0.3); }
          50% { box-shadow: 0 10px 60px rgba(201,169,110,0.6); }
        }
        @keyframes flip {
          0%, 100% { transform: rotateY(0deg); }
          50% { transform: rotateY(180deg); }
        }
      `}</style>
    </div>
  );
}
