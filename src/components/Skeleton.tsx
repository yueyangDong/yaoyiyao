// 骨架屏组件
import { Card } from 'antd';

interface SkeletonProps {
  lines?: number;
  cardCount?: number;
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <Card style={{ marginBottom: 16, borderColor: 'var(--border-light)' }}>
      <div style={{ animation: 'shimmer 1.5s infinite' }}>
        <div style={{
          height: 20, width: '40%', background: 'var(--border-light)',
          borderRadius: 4, marginBottom: 12,
        }} />
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} style={{
            height: 14, background: i === lines - 1 ? 'var(--border-light)' : 'rgba(0,0,0,0.04)',
            borderRadius: 4, marginBottom: 8,
            width: i === lines - 1 ? '60%' : '100%',
          }} />
        ))}
      </div>
    </Card>
  );
}

export function PageSkeleton({ lines = 5, cardCount = 3 }: SkeletonProps) {
  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{
        height: 28, width: 120, margin: '0 auto 24px',
        background: 'var(--border-light)', borderRadius: 6,
        animation: 'shimmer 1.5s infinite',
      }} />
      {Array.from({ length: cardCount }, (_, i) => (
        <CardSkeleton key={i} lines={lines} />
      ))}
    </div>
  );
}

export default PageSkeleton;
