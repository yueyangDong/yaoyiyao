// 滚动到顶部按钮
import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

const isMobile = () => window.innerWidth <= 768;

export default function ScrollTop() {
  const [visible, setVisible] = useState(false);
  const [mobile, setMobile] = useState(isMobile());

  useEffect(() => {
    const handler = () => setVisible(window.scrollY > window.innerHeight);
    const resize = () => setMobile(isMobile());
    window.addEventListener('scroll', handler, { passive: true });
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('scroll', handler);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      aria-label="回到顶部"
      style={{
        position: 'fixed',
        bottom: mobile ? 100 : 32,
        right: mobile ? 12 : 24,
        zIndex: 900,
        width: mobile ? 48 : 40,
        height: mobile ? 48 : 40,
        borderRadius: '50%',
        border: '1px solid var(--border-light)',
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(10px)',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: 'var(--shadow-sm)',
        animation: 'fadeIn 0.2s var(--ease-out) forwards',
      }}
    >
      <ArrowUp size={mobile ? 22 : 18} strokeWidth={1.5} color="var(--text-secondary)" />
    </button>
  );
}
