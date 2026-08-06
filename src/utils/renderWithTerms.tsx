import React from 'react';
import { findTermsInText } from './termDictionary';
import TermPopover from '../components/TermPopover';

/**
 * 将文本中的命理术语替换为带「人话解释」气泡的高亮标签。
 * 匹配逻辑：按术语长度降序（长词优先），命中处跳过避免重复匹配。
 */
export function renderWithTerms(text: string): React.ReactNode {
  if (!text) return text;
  const matches = findTermsInText(text);
  if (matches.length === 0) return text;

  // 收集命中位置（长词优先已由 findTermsInText 保证顺序）
  const ranges: Array<{ start: number; end: number; entry: (typeof matches)[number] }> = [];
  let cursor = 0;
  const sorted = [...matches].sort((a, b) => b.term.length - a.term.length);
  for (const entry of sorted) {
    let idx = text.indexOf(entry.term, cursor);
    while (idx !== -1) {
      // 跳过与已收录区间重叠的位置
      const overlapped = ranges.some(r => idx < r.end && idx + entry.term.length > r.start);
      if (!overlapped) {
        ranges.push({ start: idx, end: idx + entry.term.length, entry });
        break;
      }
      idx = text.indexOf(entry.term, idx + 1);
    }
  }
  ranges.sort((a, b) => a.start - b.start);

  const nodes: React.ReactNode[] = [];
  let pos = 0;
  ranges.forEach((r, i) => {
    if (r.start > pos) nodes.push(text.slice(pos, r.start));
    nodes.push(
      <TermPopover key={i} entry={r.entry}>
        {text.slice(r.start, r.end)}
      </TermPopover>
    );
    pos = r.end;
  });
  if (pos < text.length) nodes.push(text.slice(pos));
  return nodes;
}
