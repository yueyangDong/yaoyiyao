import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Typography, Space, Tag, Button, Alert } from 'antd';
import { UserAddOutlined, HistoryOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useUser } from '../context/UserContext';
import { Lunar } from 'lunar-typescript';

const { Title, Text, Paragraph } = Typography;

const MODULES = [
  {
    key: 'bazi', path: '/bazi', title: '八字排盘', icon: '🔮',
    slogan: '解读你的天赋密码',
    desc: '输入出生年月日时，排出四柱八字命盘。看五行旺衰、十神关系、大运流年走势，了解一生运势蓝图。',
    color: '#e74c3c',
  },
  {
    key: 'ziwei', path: '/ziwei', title: '紫微斗数', icon: '⭐',
    slogan: '十二宫星曜揭示人生轨迹',
    desc: '基于精准出生时间，排出紫微斗数命盘。看十四主星落十二宫、四化飞星吉凶，洞悉人生各领域机遇。',
    color: '#9b59b6',
  },
  {
    key: 'liuyao', path: '/liuyao', title: '六爻占卜', icon: '⚡',
    slogan: '一事一问 · 铜钱问卦',
    desc: '默念你的问题，模拟六次铜钱抛掷。看本卦变卦、六亲六兽、64卦白话解读，给你明确指引。',
    color: '#2ecc71',
  },
  {
    key: 'meihua', path: '/meihua', title: '梅花易数', icon: '🌸',
    slogan: '三个数字 · 万物可占',
    desc: '输入任意三个数字，即时演算上卦、下卦、动爻。体用生克分析，告诉你当下处境的吉凶。',
    color: '#3498db',
  },
  {
    key: 'lingqian', path: '/lingqian', title: '灵签抽签', icon: '🏮',
    slogan: '庙宇求签 · 观音灵签',
    desc: '诚心默念所求之事，经历签筒摇晃、筊杯圣杯仪式，获得100签中的一支，古风签诗+白话解签。',
    color: '#c9a96e',
  },
  {
    key: 'nayin', path: '/nayin', title: '纳音查询', icon: '🌊',
    slogan: '干支纳音 · 五行探秘',
    desc: '输入任意干支组合，立即查询其纳音五行。了解六十甲子纳音体系，每个干支对应的五行属性和人生预示。',
    color: '#e67e22',
  },
  {
    key: 'fengshui', path: '/fengshui', title: '风水相宅', icon: '🏠',
    slogan: '八宅吉凶 · 人宅匹配',
    desc: '选择住宅坐向和方位，配合宅主出生年份，用八宅派规则判断各方位吉凶和适宜用途。',
    color: '#1abc9c',
  },
  {
    key: 'mianxiang', path: '/mianxiang', title: '看面相', icon: '😊',
    slogan: '面部特征 · 性格解读',
    desc: '通过问卷选择面部特征，圆脸/方脸/眼型/鼻型等，结合传统面相学十二宫，解读性格和运势倾向。',
    color: '#f39c12',
  },
  {
    key: 'dream', path: '/dream', title: '周公解梦', icon: '🌙',
    slogan: '千年解梦智慧',
    desc: '输入你梦到的关键词，如蛇、水、飞、掉牙...9大分类500+梦境解读，告诉你梦境的传统文化含义。',
    color: '#9c27b0',
  },
  {
    key: 'profile', path: '/profile', title: '个人档案', icon: '🪪',
    slogan: '一次填写 · 全模块通用',
    desc: '创建个人档案后，八字、紫微、六爻等所有模块自动读取你的出生信息，无需每次都重复填写。',
    color: '#607d8b',
  },
];

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

// 获取今日农历
function getTodayLunar(): string {
  try {
    const now = new Date();
    const solar = (window as any)._lunar_solar || null;
    const l = Lunar.fromDate(now);
    return `农历${l.getYearInChinese()}年 ${l.getMonthInChinese()}月 ${l.getDayInChinese()}日`;
  } catch {
    return '';
  }
}

export default function Home() {
  const navigate = useNavigate();
  const { currentUser, users, history } = useUser();
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

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a12 0%, #1a0a1a 25%, #0d1220 50%, #0a0f18 75%, #080a12 100%)',
      padding: '32px 16px 48px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* 星空背景粒子 (CSS) */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: 'radial-gradient(ellipse at 20% 50%, rgba(201,169,110,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(100,100,200,0.05) 0%, transparent 50%)',
        pointerEvents: 'none',
      }} />

      {/* 太极图 */}
      <div style={{
        textAlign: 'center', marginTop: 16, marginBottom: 16,
        position: 'relative', zIndex: 1,
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          style={{
            width: 100, height: 100, margin: '0 auto',
            borderRadius: '50%',
            background: 'conic-gradient(from 0deg, #1a1a2e 0deg 180deg, #e0d5c0 180deg 360deg)',
            position: 'relative',
          }}
        >
          <div style={{
            position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)',
            width: 16, height: 16, borderRadius: '50%', background: '#e0d5c0',
          }} />
          <div style={{
            position: 'absolute', bottom: '15%', left: '50%', transform: 'translateX(-50%)',
            width: 16, height: 16, borderRadius: '50%', background: '#1a1a2e',
          }} />
        </motion.div>
      </div>

      {/* 标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        style={{ textAlign: 'center', marginBottom: 8, position: 'relative', zIndex: 1 }}
      >
        <Title level={1} style={{ color: '#c9a96e', letterSpacing: 10, marginBottom: 4, fontSize: '2.5rem' }}>
          ☯ 玄学命理馆
        </Title>
        <Text style={{ color: '#8b7355', fontSize: 15 }}>
          一窥命运玄机 · 品悟传统文化
        </Text>
        {lunarDate && (
          <div style={{ marginTop: 6 }}>
            <Text style={{ color: '#6b5540', fontSize: 13 }}>📅 {lunarDate}</Text>
          </div>
        )}
      </motion.div>

      {/* 全局免责 */}
      <div style={{ textAlign: 'center', marginBottom: 16, position: 'relative', zIndex: 1 }}>
        <Text style={{ color: '#555', fontSize: 11 }}>
          ⚠ 本应用仅供娱乐，不构成任何决策依据，不具科学依据
        </Text>
      </div>

      {/* 无用户引导 */}
      {users.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Alert
            message="👋 欢迎！请先创建你的个人档案"
            description="创建档案后，各模块将自动读取你的出生信息，无需重复填写。"
            type="info"
            showIcon
            style={{
              marginBottom: 24, borderRadius: 8, maxWidth: 600, margin: '0 auto 24px',
              background: 'rgba(30,30,60,0.8)', borderColor: '#3d3d6b',
            }}
            action={
              <Button type="primary" icon={<UserAddOutlined />} onClick={() => {
                const btn = document.querySelector('[title="添加/切换用户"]') as HTMLElement;
                btn?.click();
              }}>
                创建档案
              </Button>
            }
          />
        </motion.div>
      )}

      {/* 快捷入口 */}
      <div style={{ textAlign: 'right', marginBottom: 12, maxWidth: 1200, margin: '0 auto 12px', position: 'relative', zIndex: 1 }}>
        <Button type="link" icon={<HistoryOutlined />} onClick={() => navigate('/history')}
          style={{ color: '#c9a96e' }}>
          查询历史
        </Button>
      </div>

      {/* 菜单卡片 */}
      <Row gutter={[16, 16]} justify="center" style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {MODULES.map((mod, i) => (
          <Col xs={24} sm={12} md={8} lg={6} key={mod.path}>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i, duration: 0.5 }}
              whileHover={{ y: -8, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Card
                hoverable
                onClick={() => navigate(mod.path)}
                className="mystic-card"
                style={{
                  textAlign: 'center',
                  height: '100%',
                  minHeight: 220,
                  borderTop: `3px solid ${mod.color}`,
                  background: 'rgba(15,15,26,0.85)',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                styles={{ body: { padding: '20px 14px' } }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.boxShadow = `0 8px 40px ${mod.color}33`;
                  el.style.borderColor = mod.color;
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.boxShadow = '';
                  el.style.borderColor = 'rgba(201,169,110,0.15)';
                }}
              >
                {/* Icon emoji */}
                <motion.div
                  whileHover={{ scale: 1.2, rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 0.3 }}
                  style={{ fontSize: 40, marginBottom: 10 }}
                >
                  {mod.icon}
                </motion.div>

                {/* 标题 */}
                <Title level={4} style={{ marginBottom: 4, color: '#e0d5c0', fontSize: 17, fontFamily: 'var(--font-title)' }}>
                  {mod.title}
                </Title>

                {/* Slogan */}
                <Text strong style={{ color: mod.color, fontSize: 13, display: 'block', marginBottom: 6 }}>
                  {mod.slogan}
                </Text>

                {/* 功能描述 */}
                <Paragraph style={{
                  color: '#8b7355', fontSize: 11, lineHeight: 1.6,
                  marginBottom: 10, minHeight: 48,
                }}>
                  {mod.desc}
                </Paragraph>

                {/* 开始按钮 */}
                <div style={{
                  padding: '4px 16px',
                  background: `rgba(${parseInt(mod.color.slice(1,3),16)},${parseInt(mod.color.slice(3,5),16)},${parseInt(mod.color.slice(5,7),16)},0.1)`,
                  borderRadius: 20,
                  color: mod.color,
                  fontSize: 12,
                  fontWeight: 'bold',
                  display: 'inline-block',
                }}>
                  开始{mod.title.replace('抽签', '求签')} →
                </div>

                {/* 上次查询时间 */}
                {lastQueryMap[mod.key] && (
                  <div style={{ marginTop: 8 }}>
                    <Tag style={{ fontSize: 10, background: 'rgba(201,169,110,0.1)', color: '#c9a96e', border: 'none' }}>
                      上次：{formatTimeAgo(lastQueryMap[mod.key])}
                    </Tag>
                  </div>
                )}
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>

    </div>
  );
}
