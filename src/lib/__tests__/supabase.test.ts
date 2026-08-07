import { describe, it, expect, vi } from 'vitest';

describe('supabase 降级', () => {
  it('构建环境缺 .env 时 supabase 为 null（应用以本地模式运行，不抛错白屏）', async () => {
    // 模拟缺 env 构建场景（等价 git worktree 无 .env 文件）
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    try {
      const { supabase } = await import('../supabase');
      expect(supabase).toBeNull();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
