import React from 'react';
import { Card, Tag, Typography, Segmented, Collapse } from 'antd';
import { THEMES, JUDGE_RULE, THEME_WORD, verdictTone, verdictIcon, bandOf } from '../utils/divinationCore';
import type { Theme, ThemeReading } from '../utils/divinationCore';

const { Text, Paragraph } = Typography;

interface Props {
  readings: ThemeReading[];
  theme: Theme;
  onChange: (t: Theme) => void;
  /** 板块标识，用于取对应的判读口径声明 */
  board: 'liuyao' | 'meihua' | 'lot';
  title?: string;
}

const TONE_VAR: Record<'good' | 'neutral' | 'bad', string> = {
  good: 'var(--wx-wood)',
  neutral: 'var(--wx-earth)',
  bad: 'var(--wx-fire)',
};

const TONE_BG: Record<'good' | 'neutral' | 'bad', string> = {
  good: 'rgba(58,122,82,0.06)',
  neutral: 'rgba(201,169,110,0.08)',
  bad: 'rgba(194,59,43,0.05)',
};

/**
 * 三板块共用的「分主题解读」卡片。
 *
 * ⚠️ 为什么做成一个组件：吉凶话术一旦分散到三个页面，就一定会出现
 * 「A 页说大吉、B 页说凶」的口径漂移。页面只负责把盘面交给引擎、
 * 把结果交给这里渲染，措辞与档位都从 `divinationCore` 取。
 */
export default function ThemeReadingCard({ readings, theme, onChange, board, title }: Props) {
  const active = readings.find((r) => r.theme === theme) || readings[0];
  if (!active) return null;
  const tone = verdictTone(active.verdict);
  const accent = TONE_VAR[tone];

  return (
    <Card
      title={
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
          {title || '分主题解读'}
        </span>
      }
      style={{ marginBottom: 16, borderColor: 'var(--border-light)' }}
    >
      <Segmented
        block
        value={theme}
        onChange={(v) => onChange(v as Theme)}
        options={THEMES.map((t) => ({ label: t, value: t }))}
        style={{ marginBottom: 12 }}
      />

      <div
        style={{
          padding: '12px 14px',
          borderRadius: 12,
          background: TONE_BG[tone],
          border: `1px solid ${accent}`,
          borderLeft: `3px solid ${accent}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text strong style={{ fontSize: 15, color: accent }}>
            {verdictIcon(active.verdict)} {active.verdict}
          </Text>
          <Tag style={{ fontSize: 11, margin: 0 }}>{THEME_WORD[active.theme]}</Tag>
          <Text style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            {active.subject}
          </Text>
        </div>
        <Paragraph style={{ fontSize: 14, lineHeight: 1.9, color: 'var(--text-body)', margin: '8px 0 0' }}>
          {active.summary}
        </Paragraph>
      </div>

      <div style={{ marginTop: 12 }}>
        <Text strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>
          判读依据（按权重排序）
        </Text>
        <div style={{ marginTop: 6 }}>
          {active.evidence.map((e, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
                padding: '5px 0',
                borderBottom: '1px dashed var(--border-light)',
              }}
            >
              <Tag
                style={{
                  fontSize: 11,
                  margin: 0,
                  flexShrink: 0,
                  minWidth: 78,
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                  background: 'rgba(0,0,0,0.02)',
                }}
              >
                {e.label}
              </Tag>
              <Text style={{ fontSize: 12.5, lineHeight: 1.75, color: 'var(--text-body)', flex: 1 }}>
                {e.detail}
              </Text>
              {e.weight !== 0 && (
                <Text
                  style={{
                    fontSize: 11,
                    flexShrink: 0,
                    color: e.weight > 0 ? 'var(--wx-wood)' : 'var(--wx-fire)',
                  }}
                >
                  {e.weight > 0 ? '+' : ''}{Math.round(e.weight * 10) / 10}
                </Text>
              )}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          padding: '10px 12px',
          borderRadius: 10,
          background: 'rgba(0,0,0,0.025)',
        }}
      >
        <Text strong style={{ fontSize: 12.5, color: 'var(--text-primary)' }}>怎么用这个结论</Text>
        <Paragraph style={{ fontSize: 12.5, lineHeight: 1.8, color: 'var(--text-body)', margin: '4px 0 0' }}>
          {active.advice}
        </Paragraph>
        {active.note && (
          <Paragraph style={{ fontSize: 11.5, lineHeight: 1.7, color: 'var(--text-secondary)', margin: '6px 0 0' }}>
            注：{active.note}
          </Paragraph>
        )}
      </div>

      <Collapse
        ghost
        style={{ marginTop: 8 }}
        items={[
          {
            key: 'rule',
            label: <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>这一板块凭什么这么判（判读口径）</Text>,
            children: (
              <Paragraph style={{ fontSize: 12, lineHeight: 1.8, color: 'var(--text-secondary)', margin: 0 }}>
                {JUDGE_RULE[board]}
                <br />
                档位刻度：{bandOf('大吉').min} 分以上为「大吉」，依次为「吉 / 平 / 小凶」，{bandOf('凶').min} 分以下为「凶」。三个板块共用同一把尺子，所以同一件事在不同板块得到的方向应当一致；若不一致，看「判读依据」里权重最大那条即可知道分歧出在哪。
              </Paragraph>
            ),
          },
        ]}
      />
    </Card>
  );
}
