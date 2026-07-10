// Toast 通知系统
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let toastId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const toast = useCallback((type: ToastType, message: string) => {
    const id = ++toastId;
    setToasts(prev => {
      const next = [...prev, { id, type, message }];
      return next.length > 2 ? next.slice(-2) : next;
    });

    const timer = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      timers.current.delete(id);
    }, 3000);
    timers.current.set(id, timer);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) { clearTimeout(timer); timers.current.delete(id); }
  }, []);

  const borderColors: Record<ToastType, string> = {
    success: 'var(--wx-wood)',
    error: 'var(--wx-fire)',
    info: 'var(--wx-water)',
  };

  const bgColors: Record<ToastType, string> = {
    success: 'rgba(91,140,90,0.06)',
    error: 'rgba(199,91,91,0.06)',
    info: 'rgba(74,91,107,0.06)',
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{
        position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8,
        pointerEvents: 'none',
      }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            style={{
              pointerEvents: 'auto',
              cursor: 'pointer',
              minWidth: 280, maxWidth: 420,
              padding: '14px 20px',
              background: 'var(--bg-card-solid)',
              borderRadius: 14,
              borderLeft: `4px solid ${borderColors[t.type]}`,
              boxShadow: 'var(--shadow-md)',
              fontSize: 14,
              color: 'var(--text-body)',
              fontWeight: 500,
              animation: 'toastSlideIn 0.3s var(--ease-out) forwards',
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
