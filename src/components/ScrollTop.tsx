// 滚动到顶部按钮
import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { useNarrowViewport } from '../hooks/useNarrowViewport';

export default function ScrollTop() {
  const [visible, setVisible] = useState(false);
  const mobile = useNarrowViewport();

  useEffect(() => {
    const handler = () => setVisible(window.scrollY > window.innerHeight);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
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
