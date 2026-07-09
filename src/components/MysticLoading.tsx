import { motion } from 'framer-motion';
import { Typography } from 'antd';

const { Text } = Typography;

const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const ALL_GZ: string[] = [];
for (let i = 0; i < 60; i++) {
  ALL_GZ.push(GAN[i % 10] + ZHI[i % 12]);
}

interface MysticLoadingProps {
  text?: string;
  done?: boolean;
}

export default function MysticLoading({ text = '推演中...', done = false }: MysticLoadingProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '60px 20px', minHeight: 200,
    }}>
      {!done ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          style={{
            width: 64, height: 64, borderRadius: '50%',
            border: '2px solid transparent',
            borderTopColor: '#1A1A1A',
            borderRightColor: 'rgba(0,0,0,0.15)',
            borderBottomColor: 'rgba(0,0,0,0.06)',
            marginBottom: 24,
          }}
        />
      ) : (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          style={{
            width: 64, height: 64, borderRadius: '50%',
            background: '#1A1A1A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 28, marginBottom: 24,
          }}
        >
          ✓
        </motion.div>
      )}

      <motion.div
        animate={{ opacity: done ? 1 : [0.4, 1, 0.4] }}
        transition={{ duration: 1.5, repeat: done ? 0 : Infinity, ease: 'easeInOut' }}
      >
        <Text style={{
          color: done ? '#5B8C5A' : 'var(--text-secondary)',
          fontSize: 16,
          fontFamily: 'var(--font-title)',
          fontWeight: 500,
          letterSpacing: '0.04em',
        }}>
          {done ? '排盘完成' : text}
        </Text>
      </motion.div>

      {!done && (
        <motion.div
          style={{
            marginTop: 16,
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px 12px', maxWidth: 280,
          }}
        >
          {[0, 1, 2, 3].map((col) => (
            <motion.div
              key={col}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: col * 0.1, ease: 'easeInOut' }}
              style={{
                padding: '4px 8px',
                background: 'rgba(0,0,0,0.03)',
                border: '1px solid rgba(0,0,0,0.06)',
                borderRadius: 6,
                textAlign: 'center',
                color: 'var(--text-secondary)',
                fontSize: 12,
                fontFamily: 'var(--font-display)',
              }}
            >
              {ALL_GZ[(col * 15 + Math.floor(Date.now() / 100) % 15)]}
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
