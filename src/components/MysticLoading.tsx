import { motion } from 'framer-motion';
import { Typography } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

const { Text } = Typography;

// 六十甲子
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
      {/* 金色旋转光环 */}
      {!done ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          style={{
            width: 80, height: 80, borderRadius: '50%',
            border: '3px solid transparent',
            borderTopColor: '#c9a96e',
            borderRightColor: '#f0d68a',
            borderBottomColor: '#8b6914',
            marginBottom: 24,
          }}
        />
      ) : (
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg, #2ecc71, #27ae60)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36, marginBottom: 24,
        }}>
          ✅
        </div>
      )}

      {/* 提示文字 */}
      <motion.div
        animate={{ opacity: done ? 1 : [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: done ? 0 : Infinity, ease: 'easeInOut' }}
      >
        <Text style={{
          color: done ? '#2ecc71' : '#c9a96e',
          fontSize: 18,
          fontFamily: 'var(--font-title)',
          letterSpacing: 4,
        }}>
          {done ? '排盘完成' : text}
        </Text>
      </motion.div>

      {/* 六十甲子快速轮播 */}
      {!done && (
        <motion.div
          style={{
            marginTop: 16,
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px 16px', maxWidth: 300,
          }}
        >
          {[0, 1, 2, 3].map((col) => (
            <motion.div
              key={col}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: col * 0.1, ease: 'easeInOut' }}
              style={{
                padding: '4px 8px',
                background: 'rgba(201,169,110,0.1)',
                border: '1px solid rgba(201,169,110,0.2)',
                borderRadius: 4,
                textAlign: 'center',
                color: '#c9a96e',
                fontSize: 13,
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
