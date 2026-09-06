import React, { useCallback, useState } from 'react';
import { Modal, Input, Button, message } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { consumeDailyQuota, redeemCode, PRODUCT_INFO } from '../lib/payment';

/**
 * 每日免费次数限制 hook（按次功能通用）
 *
 * 用法：
 *   const { tryConsume, quotaModal } = useDailyQuota('liuyao');
 *   // 起卦按钮：if (!(await tryConsume())) return;
 *   // JSX 末尾渲染 {quotaModal}
 *
 * 规则：每模块每日免费 freeLimit 次；持有当日 day_pass 的用户服务端自动放行。
 * 登录用户走服务端计数（防刷），未登录走 localStorage（可绕过，MVP 接受）。
 */
export function useDailyQuota(module: string, freeLimit = 1) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const tryConsume = useCallback(async (): Promise<boolean> => {
    const allowed = await consumeDailyQuota(user?.id ?? null, module, freeLimit);
    if (!allowed) setOpen(true);
    return allowed;
  }, [user, module, freeLimit]);

  const handleRedeem = async () => {
    if (!code.trim()) {
      message.warning('请输入兑换码');
      return;
    }
    setRedeeming(true);
    try {
      const result = await redeemCode(code, '');
      if (result.ok) {
        message.success(result.message);
        setCode('');
        setOpen(false);
      } else {
        message.error(result.message);
      }
    } finally {
      setRedeeming(false);
    }
  };

  const quotaModal = (
    <Modal
      open={open}
      onCancel={() => setOpen(false)}
      footer={null}
      centered
      width={380}
    >
      <div style={{ textAlign: 'center', padding: '8px 4px' }}>
        <ClockCircleOutlined style={{ fontSize: 28, color: 'var(--module-gold)' }} />
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginTop: 8 }}>
          今日免费次数已用完
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.9, margin: '8px 0 16px' }}>
          每个功能每天免费 {freeLimit} 次，明天 0 点重置。
          <br />
          或兑换「{PRODUCT_INFO.day_pass.name}」¥{PRODUCT_INFO.day_pass.price}，今日全部按次功能不限次。
        </div>
        {!supabase || !user ? (
          <Button type="primary" block onClick={() => { setOpen(false); navigate('/auth'); }} style={{ borderRadius: 8 }}>
            登录后使用兑换码
          </Button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <Input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="兑换码 XXXX-XXXX-XXXX"
              maxLength={14}
              onPressEnter={handleRedeem}
              style={{ borderRadius: 8, textAlign: 'center', letterSpacing: 1 }}
            />
            <Button type="primary" loading={redeeming} onClick={handleRedeem} style={{ borderRadius: 8, flexShrink: 0 }}>
              兑换
            </Button>
          </div>
        )}
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 10 }}>
          内容仅供娱乐参考 · 传统文化研究工具
        </div>
      </div>
    </Modal>
  );

  return { tryConsume, quotaModal };
}
