import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleCardProps {
  title: string;
  icon?: React.ReactNode;
  summary?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  /** 手风琴分组名，同组同时只展开一个 */
  accordionGroup?: string;
  onToggle?: (open: boolean) => void;
  className?: string;
  style?: React.CSSProperties;
}

const openStates = new Map<string, (() => void)[]>();

export default function CollapsibleCard({
  title, icon, summary, children, defaultOpen = false,
  accordionGroup, onToggle, className, style,
}: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    onToggle?.(false);
  }, [onToggle]);

  useEffect(() => {
    if (!accordionGroup) return;
    if (!openStates.has(accordionGroup)) {
      openStates.set(accordionGroup, []);
    }
    openStates.get(accordionGroup)!.push(close);
    return () => {
      const list = openStates.get(accordionGroup);
      if (list) {
        const idx = list.indexOf(close);
        if (idx >= 0) list.splice(idx, 1);
      }
    };
  }, [accordionGroup, close]);

  const toggle = () => {
    const next = !open;
    if (next && accordionGroup) {
      openStates.get(accordionGroup)?.forEach(fn => {
        if (fn !== close) fn();
      });
    }
    setOpen(next);
    onToggle?.(next);
    if (next && cardRef.current) {
      setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 260);
    }
  };

  return (
    <div
      ref={cardRef}
      className={`collapsible-card ${className || ''}`}
      style={{
        background: 'var(--bg-card-solid)',
        borderRadius: 'var(--radius-card, 16px)',
        border: '1px solid var(--border-light, rgba(0,0,0,0.06))',
        marginBottom: 8,
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        onClick={toggle}
        className="collapsible-card-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          cursor: 'pointer',
          minHeight: 44,
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          transition: 'background 0.15s',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {icon && (
              <span style={{
                flexShrink: 0, width: 20, height: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {icon}
              </span>
            )}
            <span style={{
              fontSize: 15,
              fontWeight: 500,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-title)',
            }}>
              {title}
            </span>
          </div>
          {!open && summary && (
            <p style={{
              margin: '4px 0 0 0',
              fontSize: 13,
              color: 'var(--text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              paddingLeft: icon ? 28 : 0,
            }}>
              {summary}
            </p>
          )}
        </div>
        <ChevronDown
          size={18}
          strokeWidth={1.5}
          style={{
            flexShrink: 0,
            color: 'var(--text-disabled)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.25s ease',
          }}
        />
      </div>

      <div
        ref={contentRef}
        style={{
          maxHeight: open ? (contentRef.current?.scrollHeight || 2000) + 'px' : '0px',
          opacity: open ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease',
        }}
      >
        <div style={{ padding: '0 16px 16px 16px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
