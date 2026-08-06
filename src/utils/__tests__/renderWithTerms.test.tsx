import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { renderWithTerms } from '../renderWithTerms';

describe('renderWithTerms', () => {
  it('wraps known terms and keeps plain text', () => {
    const { container } = render(<div>{renderWithTerms('你的日主偏强，用神为火。')}</div>);
    expect(container.querySelectorAll('.term-tag').length).toBeGreaterThanOrEqual(2);
    expect(container.textContent).toContain('你的');
    expect(container.textContent).toContain('偏强');
  });

  it('returns plain text when no terms matched', () => {
    const { container } = render(<div>{renderWithTerms('今天天气不错')}</div>);
    expect(container.querySelectorAll('.term-tag').length).toBe(0);
    expect(container.textContent).toBe('今天天气不错');
  });

  it('handles empty string', () => {
    const { container } = render(<div>{renderWithTerms('')}</div>);
    expect(container.textContent).toBe('');
  });
});
