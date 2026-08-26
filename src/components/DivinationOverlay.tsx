import { motion, AnimatePresence } from 'framer-motion';
import { Typography } from 'antd';

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
}

/** 阴阳双鲤（水墨风：黑鲤鱼 + 白鲤鱼首尾相衔，圆头大眼长须、分叉尾鳍、背鳍，动态旋转） */
function YinYangFish({ size = 150 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size}>
      {/* 浅色底圆（保证黑鱼在深色遮罩上可见） */}
      <circle cx="100" cy="100" r="99" fill="#F0ECE2" opacity="0.12" />
      {/* 外环描边 */}
      <circle cx="100" cy="100" r="98" fill="none" stroke="#F5F0E6" strokeWidth="1.5" opacity="0.55" />

      {/* === 白鲤鱼（阳·右半，头在上，尾在中心上方） === */}
      <path
        d="M100,2 A98,98 0 0,1 100,198 A49,49 0 0,1 100,100 A49,49 0 0,0 100,2 Z"
        fill="#F5F0E6"
        stroke="rgba(26,26,31,0.28)"
        strokeWidth="1.5"
      />
      {/* 白鱼头（顶部圆润吻部） */}
      <ellipse cx="100" cy="11" rx="13" ry="9" fill="#F5F0E6" />
      {/* 白鱼眼（大黑眼） */}
      <circle cx="108" cy="17" r="5" fill="#1A1A1F" />
      <circle cx="110" cy="15" r="1.6" fill="#F5F0E6" />
      {/* 白鱼须（两根长须向上） */}
      <path d="M93,7 Q83,-6 76,-13" stroke="#F5F0E6" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M107,7 Q117,-6 124,-13" stroke="#F5F0E6" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* 白鱼背鳍（右侧外缘） */}
      <path d="M150,66 C164,52 168,38 162,28 C168,44 164,58 152,70 Z" fill="#F5F0E6" stroke="rgba(26,26,31,0.35)" strokeWidth="1" />
      {/* 白鱼胸鳍（右下） */}
      <path d="M118,132 C130,141 138,139 141,130 C133,137 125,135 118,132 Z" fill="#F5F0E6" stroke="rgba(26,26,31,0.3)" strokeWidth="0.8" />
      {/* 白鱼尾鳍（中心上方，深墨分叉大尾） */}
      <path d="M100,56 C92,50 84,40 82,30 C92,40 98,44 100,46 C102,44 108,40 118,30 C116,40 108,50 100,56 Z" fill="#1A1A1F" opacity="0.92" />

      {/* === 黑鲤鱼（阴·左半，头在下，尾在中心下方） === */}
      <path
        d="M100,2 A98,98 0 0,0 100,198 A49,49 0 0,0 100,100 A49,49 0 0,1 100,2 Z"
        fill="#1A1A1F"
        stroke="rgba(245,240,230,0.22)"
        strokeWidth="1.5"
      />
      {/* 黑鱼头（底部圆润吻部） */}
      <ellipse cx="100" cy="189" rx="13" ry="9" fill="#1A1A1F" />
      {/* 黑鱼眼（大白眼） */}
      <circle cx="92" cy="183" r="5" fill="#F5F0E6" />
      <circle cx="90" cy="185" r="1.6" fill="#1A1A1F" />
      {/* 黑鱼须（两根长须向下） */}
      <path d="M93,193 Q83,206 76,213" stroke="#1A1A1F" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M107,193 Q117,206 124,213" stroke="#1A1A1F" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* 黑鱼背鳍（左侧外缘） */}
      <path d="M50,134 C36,148 32,162 38,172 C32,156 36,142 48,130 Z" fill="#1A1A1F" stroke="rgba(245,240,230,0.3)" strokeWidth="1" />
      {/* 黑鱼胸鳍（左下） */}
      <path d="M82,68 C70,59 62,61 59,70 C67,63 75,65 82,68 Z" fill="#1A1A1F" stroke="rgba(245,240,230,0.25)" strokeWidth="0.8" />
      {/* 黑鱼尾鳍（中心下方，浅墨分叉大尾） */}
      <path d="M100,144 C92,150 84,160 82,170 C92,160 98,156 100,154 C102,156 108,160 118,170 C116,160 108,150 100,144 Z" fill="#F5F0E6" opacity="0.92" />
    </svg>
  );
}

export default function DivinationOverlay({ show, text = '推演中 · 天机渐显' }: DivinationOverlayProps) {
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

            {/* 太极旋转 */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute', inset: 40,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <YinYangFish size={140} />
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
