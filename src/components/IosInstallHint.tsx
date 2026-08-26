import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'yyy_ios_hint_closed';

/** iOS Safari（未安装 PWA）检测：iPhone/iPad/iPod 且非 standalone 模式 */
function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/i.test(ua)
    && !(window as any).navigator.standalone
    && !window.matchMedia('(display-mode: standalone)').matches;
}

/** iOS「添加到主屏幕」引导提示条（PWA 不备案适配的关键入口） */
export default function IosInstallHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isIosSafari() && !sessionStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  const close = () => {
    setVisible(false);
    sessionStorage.setItem(STORAGE_KEY, '1');
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed', left: 16, right: 16, bottom: 16, zIndex: 999,
            background: 'rgba(10,10,15,0.92)',
            color: '#F5F0E6', borderRadius: 12,
            padding: '12px 14px', fontSize: 13, lineHeight: 1.6,
            boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
            fontFamily: 'var(--font-body)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              📱 <b>添加到主屏幕</b>：点底部「分享」按钮 →「添加到主屏幕」，即可全屏使用（无需安装 App）
            </span>
            <span
              onClick={close}
              style={{ cursor: 'pointer', marginLeft: 10, fontSize: 16, opacity: 0.7, flexShrink: 0 }}
              aria-label="关闭"
            >
              ✕
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
