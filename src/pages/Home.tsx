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
  { key: 'daily', path: '/daily', title: '每日一爻', color: 'var(--module-gold)', icon: <Sun size={22} strokeWidth={1.5} /> },
  { key: 'bazi', path: '/bazi', title: '八字排盘', color: 'var(--module-green)', icon: <Binary size={22} strokeWidth={1.5} /> },
  { key: 'ziwei', path: '/ziwei', title: '紫微斗数', color: 'var(--module-blue)', icon: <Star size={22} strokeWidth={1.5} /> },
  { key: 'liuyao', path: '/liuyao', title: '六爻占卜', color: 'var(--module-gold)', icon: <Sparkles size={22} strokeWidth={1.5} /> },
  { key: 'lingqian', path: '/lingqian', title: '灵签抽签', color: 'var(--module-gray)', icon: <ScrollText size={22} strokeWidth={1.5} /> },
  { key: 'meihua', path: '/meihua', title: '梅花易数', color: 'var(--module-red)', icon: <Flower2 size={22} strokeWidth={1.5} /> },
  { key: 'nayin', path: '/nayin', title: '纳音查询', color: 'var(--module-green)', icon: <Waves size={22} strokeWidth={1.5} /> },
  { key: 'fengshui', path: '/fengshui', title: '风水相宅', color: 'var(--module-gold)', icon: <Compass size={22} strokeWidth={1.5} /> },
  { key: 'dream', path: '/dream', title: '周公解梦', color: 'var(--module-blue)', icon: <Moon size={22} strokeWidth={1.5} /> },
  { key: 'ancient', path: '/ancient', title: '古籍经典', color: 'var(--module-green)', icon: <BookOpen size={22} strokeWidth={1.5} /> },
  { key: 'profile', path: '/profile', title: '个人档案', color: 'var(--module-gray)', icon: <UserCircle size={22} strokeWidth={1.5} /> },
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
              background: 'linear-gradient(135deg, rgba(91,140,90,0.05) 0%, rgba(255,255,255,0.9) 100%)',
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
              background: 'linear-gradient(135deg, rgba(74,91,107,0.04) 0%, rgba(255,255,255,0.9) 100%)',
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
                  <Text strong style={{
                    fontSize: 15,
                    fontFamily: 'var(--font-title)',
                    color: 'var(--text-primary)',
                  }}>
                    {mod.title}
                  </Text>
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
                    <Text style={{ fontSize: 'var(--text-sm)', color: mod.color, letterSpacing: '0.02em' }}>
                      {MODULES.find(m => m.key === mod.key)?.title}
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
