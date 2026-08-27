import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Space, Button } from 'antd';
import { motion } from 'framer-motion';
import { useUser } from '../context/UserContext';
import { Lunar } from 'lunar-typescript';
import {
  Binary, Star, Sparkles, Flower2, Waves, Compass,
  Moon, ScrollText, UserCircle, History, ArrowRight, BookOpen,
  Sun,
} from 'lucide-react';

const { Title, Text } = Typography;

const MODULES = [
  { key: 'daily', path: '/daily', title: '每日一爻', subtitle: '每天摇一卦，看看今日运势', color: 'var(--module-gold)', icon: <Sun size={22} strokeWidth={1.5} /> },
  { key: 'bazi', path: '/bazi', title: '八字排盘', subtitle: '八字排盘 — 看你天生的底牌', color: 'var(--module-green)', icon: <Binary size={22} strokeWidth={1.5} /> },
  { key: 'ziwei', path: '/ziwei', title: '紫微斗数', subtitle: '十二宫位，照见一生的格局', color: 'var(--module-blue)', icon: <Star size={22} strokeWidth={1.5} /> },
  { key: 'liuyao', path: '/liuyao', title: '六爻占卜', subtitle: '三枚铜钱，问个明白', color: 'var(--module-gold)', icon: <Sparkles size={22} strokeWidth={1.5} /> },
  { key: 'lingqian', path: '/lingqian', title: '灵签抽签', subtitle: '摇一支签，听听签文怎么说', color: 'var(--module-gray)', icon: <ScrollText size={22} strokeWidth={1.5} /> },
  { key: 'meihua', path: '/meihua', title: '梅花易数', subtitle: '观物起卦，处处皆可问', color: 'var(--module-red)', icon: <Flower2 size={22} strokeWidth={1.5} /> },
  { key: 'nayin', path: '/nayin', title: '纳音查询', subtitle: '六十甲子，听听你的五行纳音', color: 'var(--module-green)', icon: <Waves size={22} strokeWidth={1.5} /> },
  { key: 'fengshui', path: '/fengshui', title: '风水相宅', subtitle: '看看宅相，图个安居顺遂', color: 'var(--module-gold)', icon: <Compass size={22} strokeWidth={1.5} /> },
  { key: 'dream', path: '/dream', title: '周公解梦', subtitle: '梦里乾坤，醒来解一解', color: 'var(--module-blue)', icon: <Moon size={22} strokeWidth={1.5} /> },
  { key: 'ancient', path: '/ancient', title: '古籍经典', subtitle: '翻翻古籍，句句都是老理', color: 'var(--module-green)', icon: <BookOpen size={22} strokeWidth={1.5} /> },
  { key: 'profile', path: '/profile', title: '个人档案', subtitle: '存好生辰八字，走到哪算到哪', color: 'var(--module-gray)', icon: <UserCircle size={22} strokeWidth={1.5} /> },
];

function getTodayLunar(): string {
  try {
    const l = Lunar.fromDate(new Date());
    return `农历${l.getYearInChinese()}年 ${l.getMonthInChinese()}月 ${l.getDayInChinese()}日`;
  } catch {
    return '';
  }
}

export default function Home() {
  const navigate = useNavigate();
  const { history, currentUser } = useUser();
  const [lunarDate, setLunarDate] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    setLunarDate(getTodayLunar());
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const lastQueryMap: Record<string, string> = {};
  for (const h of history) {
    if (!lastQueryMap[h.module]) lastQueryMap[h.module] = h.timestamp;
  }

  function formatTimeAgo(isoStr: string): string {
    const diff = Date.now() - new Date(isoStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return minutes <= 1 ? '刚刚' : `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}天前`;
    return `${Math.floor(days / 30)}个月前`;
  }

  const recentModules = [...new Set(history.map(h => h.module))]
    .slice(0, 3)
    .map(key => MODULES.find(m => m.key === key))
    .filter(Boolean);

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: 'var(--bg-warm)',
    padding: isMobile ? '32px 16px 120px' : '64px 20px 48px',
    position: 'relative',
    maxWidth: isMobile ? 480 : 800,
    margin: '0 auto',
  };

  return (
    <div style={containerStyle}>
      {/* 背景纹理 */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.025, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle at 25% 60%, #000 0.5px, transparent 0.5px), radial-gradient(circle at 75% 30%, #000 0.5px, transparent 0.5px)',
        backgroundSize: '80px 80px, 60px 60px',
      }} />

      {/* 标题区 */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        style={{ textAlign: 'center', marginBottom: 8, position: 'relative' }}
      >
        <Title level={1} style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: isMobile ? 32 : 'var(--text-3xl)',
          color: 'var(--text-primary)',
          letterSpacing: '0.06em',
          marginBottom: 6,
        }}>
          爻 一 爻
        </Title>
        <Text style={{
          color: 'var(--text-secondary)',
          fontSize: 13,
          letterSpacing: '0.04em',
        }}>
          探天机 · 不迷信
        </Text>
        {lunarDate && (
          <div style={{ marginTop: 8 }}>
            <Text style={{
              color: 'var(--text-disabled)',
              fontSize: 12,
              whiteSpace: 'nowrap',
            }}>
              {lunarDate}
            </Text>
          </div>
        )}
      </motion.div>

      {/* 首页公告：清醒提示 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        style={{
          marginBottom: 16, padding: '14px 16px', borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(201,169,110,0.07) 0%, rgba(255,255,255,0.92) 100%)',
          border: '1px solid rgba(201,169,110,0.28)',
          position: 'relative',
        }}
      >
        <Text strong style={{ color: 'var(--wx-metal)', fontSize: 13, letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>
          📜 命运这场开卷考，答案仅供参考
        </Text>
        <Text style={{ fontSize: 12, color: 'var(--text-body)', lineHeight: 1.8, display: 'block' }}>
          嘿，我知道点开爻一爻的你，可能正面临某个十字路口，有点迷茫，有点孤独，甚至有点想抓住一根稻草。
          先抱抱你。我们想做的，从来不是定义你的人生剧本，而是当你觉得看不清前路时，给你递一面镜子，让你看到自己心里本来就有的光。
          但请务必收下这份「清醒提示」：这里的星盘、塔罗、卦象，本质是古老的数据模型与概率游戏。所有内容仅供娱乐与自我探索，不构成任何人生决策的依据。
          你的工作、学业、感情，最终的选择权和责任，永远在你手里。别把算法当命运，别把预测当判决。你的人生，你说了算。
          如果此刻你真的非常艰难，请记得关闭爻一爻，给现实中的朋友打个电话，或者寻求专业的心理支持。我们在这里陪你，但现实中的拥抱更暖。
        </Text>
      </motion.div>

      {/* 用户横幅 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{ marginBottom: 24, position: 'relative' }}
      >
        {currentUser ? (
          <div
            onClick={() => navigate('/profile')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px',
              background: 'linear-gradient(135deg, rgba(107,154,122,0.05) 0%, rgba(255,255,255,0.9) 100%)',
              border: '1px solid var(--border-light)',
              borderRadius: 16,
              cursor: 'pointer',
            }}
          >
            <Space>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, borderRadius: '50%', background: '#1A1A1A',
                color: '#fff', fontWeight: 600, fontSize: 14,
              }}>
                {currentUser.name.charAt(0)}
              </span>
              <div>
                <Text strong style={{ color: 'var(--text-primary)', fontSize: 14 }}>
                  {currentUser.name}
                </Text>
                <Text style={{ color: 'var(--text-secondary)', fontSize: 12, marginLeft: 8 }}>
                  {currentUser.gender} · {currentUser.birthYear}
                </Text>
              </div>
            </Space>
            <ArrowRight size={14} color="var(--text-disabled)" />
          </div>
        ) : (
          <div
            onClick={() => navigate('/profile')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px',
              background: 'linear-gradient(135deg, rgba(42,51,64,0.04) 0%, rgba(255,255,255,0.9) 100%)',
              border: '1px solid var(--border-light)',
              borderRadius: 16,
              cursor: 'pointer',
            }}
          >
            <Space>
              <span style={{ fontSize: 24 }}>👤</span>
              <div>
                <Text strong style={{ color: 'var(--text-primary)', fontSize: 14 }}>创建个人档案</Text>
                <br />
                <Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>填写后全模块自动带入</Text>
              </div>
            </Space>
            <Button type="primary" size="small">创建 <ArrowRight size={14} /></Button>
          </div>
        )}
      </motion.div>

      {/* 最近使用 */}
      {recentModules.length > 0 && (
        <div style={{ marginBottom: 16, position: 'relative' }}>
          <Text style={{ fontSize: 12, color: 'var(--text-disabled)', marginBottom: 8, display: 'block' }}>最近使用</Text>
          <Space wrap>
            {recentModules.map(mod => (
              <Button
                key={mod!.key}
                size="small"
                onClick={() => navigate(mod!.path)}
                style={{
                  borderRadius: 8,
                  border: '1px solid var(--border-medium)',
                  color: mod!.color,
                  fontSize: 13,
                }}
              >
                {mod!.icon}
                <span style={{ marginLeft: 6 }}>{mod!.title}</span>
              </Button>
            ))}
          </Space>
        </div>
      )}

      {/* 查询历史链接 */}
      <div style={{ textAlign: 'right', marginBottom: 16, position: 'relative' }}>
        <Button
          type="text"
          icon={<History size={16} strokeWidth={1.5} />}
          onClick={() => navigate('/history')}
          style={{ color: 'var(--text-secondary)' }}
        >
          查询历史
        </Button>
      </div>

      {/* 功能卡片 - 手机端单列，桌面端三列 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
        gap: 8,
        position: 'relative',
      }}>
        {MODULES.map((mod, i) => (
          <motion.div
            key={mod.path}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.04 * i, duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            {isMobile ? (
              <div
                className="home-module-card"
                onClick={() => navigate(mod.path)}
              >
                <Space size={12}>
                  <span style={{ color: mod.color, display: 'flex' }}>{mod.icon}</span>
                  <div>
                    <Text strong style={{
                      fontSize: 15,
                      fontFamily: 'var(--font-title)',
                      color: 'var(--text-primary)',
                    }}>
                      {mod.title}
                    </Text>
                    <br />
                    <Text style={{
                      fontSize: 11,
                      color: 'var(--text-secondary)',
                      display: 'block',
                      lineHeight: 1.4,
                      whiteSpace: 'nowrap',
                    }}>
                      {mod.subtitle}
                    </Text>
                  </div>
                </Space>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {lastQueryMap[mod.key] && (
                    <Text style={{ fontSize: 11, color: 'var(--text-disabled)' }}>
                      {formatTimeAgo(lastQueryMap[mod.key])}
                    </Text>
                  )}
                  <ArrowRight size={16} strokeWidth={1.5} color="var(--text-disabled)" />
                </div>
              </div>
            ) : (
              <div
                onClick={() => navigate(mod.path)}
                className="glass-card"
                style={{
                  cursor: 'pointer',
                  height: '100%',
                  minHeight: 170,
                  borderRadius: 16,
                  border: '1px solid rgba(0,0,0,0.06)',
                  position: 'relative',
                  overflow: 'hidden',
                  padding: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 10 }}>
                  <span style={{ color: mod.color, flexShrink: 0, marginRight: 10 }}>
                    {mod.icon}
                  </span>
                  <div>
                    <Text strong style={{ fontSize: 'var(--text-lg)', fontFamily: 'var(--font-title)', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {mod.title}
                    </Text>
                    <br />
                    <Text style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', letterSpacing: '0.02em' }}>
                      {mod.subtitle}
                    </Text>
                  </div>
                </div>
                {lastQueryMap[mod.key] && (
                  <div style={{ position: 'absolute', bottom: 14, left: 58 }}>
                    <Text style={{ fontSize: 11, color: 'var(--text-disabled)' }}>
                      上次：{formatTimeAgo(lastQueryMap[mod.key])}
                    </Text>
                  </div>
                )}
                <div style={{ position: 'absolute', bottom: 16, right: 16, color: 'var(--text-disabled)' }} className="card-arrow">
                  <ArrowRight size={16} strokeWidth={1.5} />
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* 底部文字 */}
      <div style={{
        textAlign: 'center', marginTop: 32,
        color: 'var(--text-disabled)', fontSize: 12,
        position: 'relative',
      }}>
        仅供娱乐 · 不具科学依据
      </div>
    </div>
  );
}
