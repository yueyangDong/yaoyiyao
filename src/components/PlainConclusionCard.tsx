import React from 'react';

interface Props {
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  tone?: 'default' | 'good' | 'warn';
}

const TONE_STYLE: Record<string, React.CSSProperties> = {
  default: { background: 'linear-gradient(135deg, #FFF9EC 0%, #F7F0DC 100%)', borderColor: 'var(--module-gold)' },
  good: { background: 'linear-gradient(135deg, #F0FAF3 0%, #E3F1E8 100%)', borderColor: '#52A56B' },
  warn: { background: 'linear-gradient(135deg, #FDF0EC 0%, #F9E3DA 100%)', borderColor: '#C96A4B' },
};

export default function PlainConclusionCard({ title = '一句话结论', icon, children, tone = 'default' }: Props) {
  const style = TONE_STYLE[tone];
  return (
    <div
      className="plain-conclusion-card"
      style={{
        ...style,
        border: `1px solid ${style.borderColor}`,
        borderRadius: 16,
        padding: '16px 18px',
        marginBottom: 16,
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
      </div>
      <div style={{ fontSize: 15, lineHeight: 1.9, color: 'var(--text-body)' }}>{children}</div>
    </div>
  );
}
