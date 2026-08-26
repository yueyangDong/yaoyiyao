import React from 'react';
import { Popover, Typography } from 'antd';
import type { TermEntry } from '../utils/termDictionary';

const { Text, Paragraph } = Typography;

interface Props {
  entry: TermEntry;
  children: React.ReactNode;
}

export default function TermPopover({ entry, children }: Props) {
  return (
    <Popover
      content={
        <div style={{ maxWidth: 260 }}>
          <Text strong style={{ fontSize: 14 }}>{entry.term}</Text>
          <Paragraph style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-body)' }}>
            {entry.explain}
          </Paragraph>
          {entry.analogy && (
            <Paragraph style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
              💡 {entry.analogy}
            </Paragraph>
          )}
        </div>
      }
      placement="top"
    >
      <span
        className="term-tag"
        style={{
          borderBottom: '1.5px dotted var(--module-gold)',
          cursor: 'help',
          color: 'inherit',
          padding: '0 1px',
        }}
      >
        {children}
      </span>
    </Popover>
  );
}
