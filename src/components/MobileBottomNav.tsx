import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Binary, Star, Sparkles, Flower2, ScrollText, Sun,
} from 'lucide-react';

const TABS = [
  {
    key: 'home', label: '首页', path: '/',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  {
    key: 'mingli', label: '命理',
    subItems: [
      { key: 'bazi', label: '八字排盘', path: '/bazi', icon: <Binary size={16} /> },
      { key: 'ziwei', label: '紫微斗数', path: '/ziwei', icon: <Star size={16} /> },
      { key: 'nayin', label: '纳音查询', path: '/nayin', icon: <Sun size={16} /> },
    ],
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
  },
  {
    key: 'zhanbu', label: '占卜',
    subItems: [
      { key: 'daily', label: '每日一爻', path: '/daily', icon: <Sun size={16} /> },
      { key: 'liuyao', label: '六爻占卜', path: '/liuyao', icon: <Sparkles size={16} /> },
      { key: 'meihua', label: '梅花易数', path: '/meihua', icon: <Flower2 size={16} /> },
      { key: 'lingqian', label: '灵签抽签', path: '/lingqian', icon: <ScrollText size={16} /> },
    ],
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18V9h12v9a4 4 0 0 1-8 0Z"/></svg>,
  },
  {
    key: 'profile', label: '我的', path: '/profile',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  },
];

export default function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const handleTab = (tab: typeof TABS[number]) => {
    if (tab.subItems) {
      setMenuOpen(menuOpen === tab.key ? null : tab.key);
    } else if (tab.path) {
      setMenuOpen(null);
      navigate(tab.path);
    }
  };

  const isActive = (tab: typeof TABS[number]) => {
    if (tab.path === '/') return location.pathname === '/';
    if (tab.subItems) {
      return tab.subItems.some(s => location.pathname === s.path);
    }
    return location.pathname === tab.path;
  };

  return (
    <>
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 199,
            background: 'rgba(0,0,0,0.3)',
          }}
        />
      )}
      {menuOpen && TABS.find(t => t.key === menuOpen)?.subItems && (
        <div style={{
          position: 'fixed',
          bottom: 72 + 34,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)',
          maxWidth: 448,
          zIndex: 200,
          background: 'var(--bg-card-solid)',
          borderRadius: 16,
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-light)',
          padding: '8px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
        }}>
          {TABS.find(t => t.key === menuOpen)!.subItems!.map(item => (
            <button
              key={item.key}
              onClick={() => {
                navigate(item.path);
                setMenuOpen(null);
              }}
              style={{
                flex: '1 1 calc(50% - 4px)',
                minWidth: 120,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 14px',
                background: location.pathname === item.path ? 'var(--overlay-04)' : 'transparent',
                border: '1px solid var(--border-light)',
                borderRadius: 12,
                cursor: 'pointer',
                fontSize: 14,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
              }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}

      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 480,
        height: 56 + 34,
        paddingBottom: 34,
        background: 'rgba(247,245,240,0.95)',
        backdropFilter: 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
        borderTop: '1px solid var(--border-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 201,
        boxSizing: 'content-box',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTab(tab)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              minWidth: 44,
              minHeight: 44,
              padding: '4px 8px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: isActive(tab) ? 'var(--text-primary)' : 'var(--text-disabled)',
              transition: 'color 0.15s',
              fontSize: 10,
              fontFamily: 'var(--font-body)',
              fontWeight: isActive(tab) ? 500 : 400,
            }}
          >
            {tab.icon}
            <span style={{ lineHeight: 1 }}>{tab.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
