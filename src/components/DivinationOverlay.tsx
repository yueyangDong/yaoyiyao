import { motion, AnimatePresence } from 'framer-motion';
import { Typography } from 'antd';
import divinationArt from '../assets/divination-art.png';
const { Text } = Typography;

const BAGUA = ['☰', '☱', '☲', '☳', '☴', '☵', '☶', '☷'];
const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const ALL_GZ: string[] = [];
for (let i = 0; i < 60; i++) {
  ALL_GZ.push(GAN[i % 10] + ZHI[i % 12]);
}

// 取 5 个稳定的随机干支（组件挂载时固定，避免每次渲染跳动）
const pickGanZhi = (count: number): string[] => {
  const out: string[] = [];
  const pool = [...ALL_GZ];
  while (out.length < count && pool.length > 0) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
};

interface DivinationOverlayProps {
  show: boolean;
  text?: string;
  artSrc?: string;
}

export default function DivinationOverlay({ show, text = '推演中 · 天机渐显', artSrc }: DivinationOverlayProps) {
  const gz = pickGanZhi(5);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(10,10,15,0.85)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            userSelect: 'none',
          }}
        >
          {/* 八卦环 + 太极 */}
          <div style={{ position: 'relative', width: 220, height: 220 }}>
            {BAGUA.map((g, i) => (
              <motion.span
                key={g}
                animate={{ opacity: [0.35, 1, 0.35] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.25, ease: 'easeInOut' }}
                style={{
                  position: 'absolute', left: '50%', top: '50%',
                  transform: `translate(-50%,-50%) rotate(${i * 45}deg) translateY(-104px) rotate(${-i * 45}deg)`,
                  color: 'var(--wx-metal)', fontSize: 20,
                  fontFamily: 'var(--font-display)',
                  lineHeight: 1,
                }}
              >
                {g}
              </motion.span>
            ))}

            {/* 金环流光 */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute', inset: 8, borderRadius: '50%',
                border: '1px solid rgba(201,169,110,0.25)',
              }}
            >
              <span style={{
                position: 'absolute', top: -3, left: '50%', width: 6, height: 6,
                borderRadius: '50%', background: '#C9A96E',
                boxShadow: '0 0 12px 2px rgba(201,169,110,0.8)',
              }} />
            </motion.div>

            {/* 水墨图旋转（用户提供的加载动画素材，圆形展示） */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute', inset: 34, borderRadius: '50%',
                overflow: 'hidden',
                boxShadow: '0 0 22px rgba(245,240,230,0.18), inset 0 0 0 2px rgba(245,240,230,0.25)',
              }}
            >
              <img
                src={artSrc || divinationArt}
                alt=""
                draggable={false}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </motion.div>
          </div>

          {/* 干支流转 */}
          <div style={{
            marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(5, auto)',
            gap: 10, maxWidth: 320,
          }}>
            {gz.map((g, i) => (
              <motion.span
                key={g}
                animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.28, ease: 'easeInOut' }}
                style={{
                  padding: '5px 10px', borderRadius: 6,
                  background: 'rgba(201,169,110,0.08)',
                  border: '1px solid rgba(201,169,110,0.18)',
                  color: '#D9C08F', fontSize: 14,
                  fontFamily: 'var(--font-display)', letterSpacing: '0.06em',
                }}
              >
                {g}
              </motion.span>
            ))}
          </div>

          {/* 文案 */}
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ marginTop: 18 }}
          >
            <Text style={{
              color: '#C9A96E', fontSize: 17,
              fontFamily: 'var(--font-title)', fontWeight: 500,
              letterSpacing: '0.1em',
            }}>
              {text}
            </Text>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
