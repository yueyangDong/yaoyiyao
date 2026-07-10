import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Typography, Space, Button } from 'antd';
import { motion } from 'framer-motion';
import { useUser } from '../context/UserContext';
import { Lunar } from 'lunar-typescript';
import {
  Binary, Star, Sparkles, Flower2, Waves, Compass,
  Moon, ScrollText, UserCircle, History, ArrowRight, BookOpen,
  Sun,
} from 'lucide-react';

const { Title, Text, Paragraph } = Typography;

const MODULES = [
  {
    key: 'daily', path: '/daily', title: '每日一爻',
    slogan: '黄历 · 天气 · 每日一签',
    desc: '今日运气怎么样？黄历宜忌、天气出行、每日灵签、幸运指南。',
    color: '#C4A45A',
    icon: <Sun size={28} strokeWidth={1.5} />,
  },
  {
    key: 'bazi', path: '/bazi', title: '八字排盘',
    slogan: '解读你的天赋密码',
    desc: '排出四柱八字，看五行旺衰、十神关系、大运流年走势。',
    color: '#5B8C5A',
    icon: <Binary size={28} strokeWidth={1.5} />,
  },
  {
    key: 'ziwei', path: '/ziwei', title: '紫微斗数',
    slogan: '十二宫星曜揭示人生',
    desc: '排出紫微命盘，看十四主星落宫、四化飞星吉凶。',
    color: '#4A5B6B',
    icon: <Star size={28} strokeWidth={1.5} />,
  },
  {
    key: 'liuyao', path: '/liuyao', title: '六爻占卜',
    slogan: '一事一问 · 铜钱问卦',
    desc: '默念问题，模拟铜钱抛掷，看本卦变卦白话解读。',
    color: '#C4A45A',
    icon: <Sparkles size={28} strokeWidth={1.5} />,
  },
  {
    key: 'lingqian', path: '/lingqian', title: '灵签抽签',
    slogan: '庙宇求签 · 观音灵签',
    desc: '诚心默念，经历签筒摇晃仪式，古风签诗解签。',
    color: '#9B9B9B',
    icon: <ScrollText size={28} strokeWidth={1.5} />,
  },
  {
    key: 'meihua', path: '/meihua', title: '梅花易数',
    slogan: '三个数字 · 万物可占',
    desc: '输入三个数字即时演算，体用生克分析吉凶。',
    color: '#C75B5B',
    icon: <Flower2 size={28} strokeWidth={1.5} />,
  },
  {
    key: 'nayin', path: '/nayin', title: '纳音查询',
    slogan: '干支纳音 · 五行探秘',
    desc: '查询六十甲子纳音体系，干支对应的五行属性。',
    color: '#5B8C5A',
    icon: <Waves size={28} strokeWidth={1.5} />,
  },
  {
    key: 'fengshui', path: '/fengshui', title: '风水相宅',
    slogan: '八宅吉凶 · 人宅匹配',
    desc: '选择住宅坐向，用八宅派规则判断方位吉凶。',
    color: '#C4A45A',
    icon: <Compass size={28} strokeWidth={1.5} />,
  },
  {
    key: 'dream', path: '/dream', title: '周公解梦',
    slogan: '千年解梦智慧',
    desc: '输入梦到关键词，9大分类500+梦境传统文化解读。',
    color: '#4A5B6B',
    icon: <Moon size={28} strokeWidth={1.5} />,
  },
  {
    key: 'ancient', path: '/ancient', title: '古籍经典',
    slogan: '易经 · 道德经 · 论语',
    desc: '浏览中华古籍经典，原文对照白话文解释，轻松读懂先贤智慧。',
    color: '#5B8C5A',
    icon: <BookOpen size={28} strokeWidth={1.5} />,
  },
  {
    key: 'profile', path: '/profile', title: '个人档案',
    slogan: '一次填写 · 全模块通用',
    desc: '创建档案后各模块自动读取出生信息，无需重复填写。',
    color: '#9B9B9B',
    icon: <UserCircle size={28} strokeWidth={1.5} />,
  },
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
  const { users, history, currentUser } = useUser();
  const [lunarDate, setLunarDate] = useState('');

  useEffect(() => {
    setLunarDate(getTodayLunar());
  }, []);

  const lastQueryMap: Record<string, string> = {};
  for (const h of history) {
    if (!lastQueryMap[h.module]) {
      lastQueryMap[h.module] = h.timestamp;
    }
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

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-warm)',
      padding: '64px 20px 48px',
      position: 'relative',
    }}>
      {/* 微纹理背景 */}
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
          fontSize: 'var(--text-3xl)',
          color: 'var(--text-primary)',
          letterSpacing: '0.06em',
          marginBottom: 6,
        }}>
          爻 一 爻
        </Title>
        <Text style={{
          color: 'var(--text-secondary)',
          fontSize: 'var(--text-sm)',
          letterSpacing: '0.04em',
        }}>
          探天机 · 不迷信
        </Text>
        {lunarDate && (
          <div style={{ marginTop: 8 }}>
            <Text style={{
              color: 'var(--text-disabled)',
              fontSize: 'var(--text-xs)',
            }}>
              {lunarDate}
            </Text>
          </div>
        )}
      </motion.div>

      {/* 用户引导横幅 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{ maxWidth: 800, margin: '0 auto 24px', position: 'relative' }}
      >
        {users.length === 0 ? (
          <Card
            hoverable
            onClick={() => navigate('/profile')}
            style={{
              borderRadius: 16,
              border: '1px solid var(--border-light)',
              background: 'linear-gradient(135deg, rgba(74,91,107,0.04) 0%, rgba(255,255,255,0.9) 100%)',
            }}
            styles={{ body: { padding: '16px 20px' } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Space>
                <span style={{ fontSize: 24 }}>👤</span>
                <div>
                  <Text strong style={{ color: 'var(--text-primary)', fontSize: 14 }}>
                    你还没创建个人档案
                  </Text>
                  <br />
                  <Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                    填写出生信息后，所有模块自动带入数据
                  </Text>
                </div>
              </Space>
              <Button type="primary" size="small">
                立即创建 <ArrowRight size={14} />
              </Button>
            </div>
          </Card>
        ) : currentUser ? (
          <Card
            hoverable
            onClick={() => navigate('/profile')}
            style={{
              borderRadius: 16,
              border: '1px solid var(--border-light)',
              background: 'linear-gradient(135deg, rgba(91,140,90,0.04) 0%, rgba(255,255,255,0.9) 100%)',
            }}
            styles={{ body: { padding: '14px 20px' } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                    {currentUser.gender} · 公历{currentUser.birthYear}-{String(currentUser.birthMonth).padStart(2,'0')}-{String(currentUser.birthDay).padStart(2,'0')}
                  </Text>
                </div>
              </Space>
              <Space>
                <Button type="text" size="small" style={{ color: 'var(--text-secondary)' }}>
                  编辑档案 <ArrowRight size={14} />
                </Button>
              </Space>
            </div>
          </Card>
        ) : null}
      </motion.div>

      {/* 快捷入口 */}
      <div style={{
        textAlign: 'right', maxWidth: 800, margin: '0 auto 24px',
        position: 'relative',
      }}>
        <Button
          type="text"
          icon={<History size={16} strokeWidth={1.5} />}
          onClick={() => navigate('/history')}
          style={{ color: 'var(--text-secondary)', fontWeight: 400 }}
        >
          查询历史
        </Button>
      </div>

      {/* 功能卡片网格 */}
      <Row gutter={[16, 16]} justify="center" style={{ maxWidth: 800, margin: '0 auto', position: 'relative' }}>
        {MODULES.map((mod, i) => (
          <Col xs={24} sm={12} md={8} key={mod.path}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                delay: 0.04 * i,
                duration: 0.25,
                ease: [0.4, 0, 0.2, 1],
              }}
            >
              <Card
                hoverable
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
                }}
                styles={{ body: { padding: '20px' } }}
              >
                {/* 图标 + 标题同行 */}
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  marginBottom: 10,
                }}>
                  <span style={{ color: mod.color, flexShrink: 0, marginRight: 10 }}>
                    {mod.icon}
                  </span>
                  <div>
                    <Text strong style={{
                      fontSize: 'var(--text-lg)',
                      fontFamily: 'var(--font-title)',
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                    }}>
                      {mod.title}
                    </Text>
                    <br />
                    <Text style={{
                      fontSize: 'var(--text-sm)',
                      color: mod.color,
                      letterSpacing: '0.02em',
                    }}>
                      {mod.slogan}
                    </Text>
                  </div>
                </div>

                {/* 描述 */}
                <Paragraph style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.7,
                  marginBottom: 16,
                  paddingLeft: 38,
                }}>
                  {mod.desc}
                </Paragraph>

                {/* 底部：箭头 */}
                <div style={{
                  position: 'absolute',
                  bottom: 16,
                  right: 16,
                  color: 'var(--text-disabled)',
                  transition: 'transform 0.25s var(--ease-out)',
                }} className="card-arrow">
                  <ArrowRight size={16} strokeWidth={1.5} />
                </div>

                {/* 上次查询 */}
                {lastQueryMap[mod.key] && (
                  <div style={{ position: 'absolute', bottom: 14, left: 58 }}>
                    <Text style={{
                      fontSize: 11,
                      color: 'var(--text-disabled)',
                    }}>
                      上次：{formatTimeAgo(lastQueryMap[mod.key])}
                    </Text>
                  </div>
                )}
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>

      {/* 自定义箭头hover效果 */}
      <style>{`
        .glass-card:hover .card-arrow {
          transform: translateX(4px);
          color: var(--text-primary);
        }
      `}</style>

      {/* 底部 */}
      <div style={{
        textAlign: 'center',
        marginTop: 48,
        color: 'var(--text-disabled)',
        fontSize: 'var(--text-xs)',
        position: 'relative',
      }}>
        仅供娱乐 · 不具科学依据
      </div>
    </div>
  );
}
