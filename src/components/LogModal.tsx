import { useEffect, useState } from 'react';
import { Modal, Button, List, Typography, Empty } from 'antd';
import { getLogs, clearLogs, type LogEntry } from '../utils/logger';

const { Text } = Typography;

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function copyToClipboard(text: string): boolean {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => { /* 降级在下方 try 已覆盖 */ });
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function serializeLogs(logs: LogEntry[]): string {
  return logs.map(l => {
    const head = `[${formatTime(l.ts)}]${l.module ? ` [${l.module}]` : ''} ${l.message}`;
    return l.stack ? `${head}\n${l.stack}` : head;
  }).join('\n\n');
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function LogModal({ open, onClose }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (open) setLogs(getLogs());
  }, [open]);

  const handleCopy = () => {
    copyToClipboard(serializeLogs(logs));
  };

  const handleClear = () => {
    Modal.confirm({
      title: '清空系统日志',
      content: '确定清空全部错误日志吗？此操作不可恢复。',
      okText: '清空',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => { clearLogs(); setLogs([]); },
    });
  };

  return (
    <Modal
      title={`系统日志（${logs.length} 条）`}
      open={open}
      onCancel={onClose}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button danger disabled={logs.length === 0} onClick={handleClear}>清空</Button>
          <div>
            <Button onClick={onClose} style={{ marginRight: 8 }}>关闭</Button>
            <Button type="primary" disabled={logs.length === 0} onClick={handleCopy}>复制全部</Button>
          </div>
        </div>
      }
      width={560}
    >
      {logs.length === 0 ? (
        <Empty description="暂无错误记录" style={{ padding: '32px 0' }} />
      ) : (
        <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
          <List
            size="small"
            dataSource={logs}
            renderItem={(l) => (
              <List.Item
                style={{ padding: '8px 0', alignItems: 'flex-start' }}
                onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}
              >
                <div style={{ width: '100%', minWidth: 0 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>{formatTime(l.ts)}</Text>
                  {l.module && <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>[{l.module}]</Text>}
                  <div style={{ fontSize: 13, wordBreak: 'break-all', color: 'var(--text-primary)' }}>{l.message}</div>
                  {expandedId === l.id && l.stack && (
                    <pre style={{ fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: '6px 0 0', color: 'var(--text-secondary)', background: 'var(--bg-warm)', padding: 8, borderRadius: 8 }}>{l.stack}</pre>
                  )}
                  {expandedId === l.id && l.url && !l.stack && (
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>{l.url}</Text>
                  )}
                </div>
              </List.Item>
            )}
          />
        </div>
      )}
    </Modal>
  );
}
