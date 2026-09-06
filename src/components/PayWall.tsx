import React, { useCallback, useEffect, useState } from 'react';
import { Button, Input, message } from 'antd';
import { LockOutlined, GiftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  PRODUCT_INFO,
  fetchEntitlements,
  hasEntitlement,
  redeemCode,
  type Entitlement,
  type ProductCode,
} from '../lib/payment';

interface PayWallProps {
  /** 产品类型 */
  product: ProductCode;
  /** 权益绑定的命盘指纹（report 类必填，day_pass 传 ''） */
  targetKey?: string;
  /** 被锁定的内容（未解锁时以模糊预览展示） */
  children: React.ReactNode;
  /** 卖点列表，默认取产品描述 */
  benefits?: string[];
  /** 模糊预览可见高度（px），默认 120 */
  previewHeight?: number;
}

/**
 * 通用付费墙：有权益 → 直接渲染内容；无权益 → 模糊预览 + 兑换码解锁卡片。
 * 权益判定只读服务端 entitlements，兑换成功后在组件内刷新并解锁。
 */
export default function PayWall({
  product,
  targetKey = '',
  children,
  benefits,
  previewHeight = 120,
}: PayWallProps) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const info = PRODUCT_INFO[product];

  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setEntitlements([]);
      setLoaded(true);
      return;
    }
    const list = await fetchEntitlements(user.id);
    setEntitlements(list);
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    if (!authLoading) refresh();
  }, [authLoading, refresh]);

  const unlocked = hasEntitlement(entitlements, product, targetKey);

  const handleRedeem = async () => {
    if (!code.trim()) {
      message.warning('请输入兑换码');
      return;
    }
    setRedeeming(true);
    try {
      const result = await redeemCode(code, targetKey);
      if (result.ok) {
        message.success(result.message);
        setCode('');
        await refresh();
      } else {
        message.error(result.message);
      }
    } finally {
      setRedeeming(false);
    }
  };

  // 已解锁：直接展示内容
  if (unlocked) return <>{children}</>;

  // 加载中：不占位闪烁，静默等待（页面其余内容照常）
  if (!loaded || authLoading) return null;

  const bulletList = benefits || [info.desc];

  return (
    <div style={{ position: 'relative', marginBottom: 16 }}>
      {/* 模糊预览：真实渲染内容但不可读不可点，给用户"内容确实存在"的确信感 */}
      <div
        aria-hidden
        style={{
          maxHeight: previewHeight,
          overflow: 'hidden',
          filter: 'blur(6px)',
          pointerEvents: 'none',
          userSelect: 'none',
          opacity: 0.55,
        }}
      >
        {children}
      </div>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: previewHeight,
          background: 'linear-gradient(180deg, rgba(255,251,240,0) 0%, var(--bg-page, #FBF7EC) 95%)',
          pointerEvents: 'none',
        }}
      />

      {/* 解锁卡片 */}
      <div
        style={{
          position: 'relative',
          marginTop: -24,
          background: 'linear-gradient(135deg, #FFF9EC 0%, #F7F0DC 100%)',
          border: '1px solid var(--module-gold)',
          borderRadius: 16,
          padding: '20px 18px',
          textAlign: 'center',
          boxShadow: '0 4px 16px rgba(120, 90, 20, 0.10)',
        }}
      >
        <div style={{ fontSize: 22, marginBottom: 6 }}>
          <LockOutlined style={{ color: 'var(--module-gold)' }} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-title)' }}>
          {info.name}
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#B8860B', margin: '6px 0 10px' }}>
          ¥{info.price}
          <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 6 }}>
            兑换码解锁 · 永久有效
          </span>
        </div>
        <div style={{ textAlign: 'left', maxWidth: 420, margin: '0 auto 14px' }}>
          {bulletList.map((b, i) => (
            <div key={i} style={{ fontSize: 13, lineHeight: 1.9, color: 'var(--text-body)' }}>
              <GiftOutlined style={{ color: 'var(--module-gold)', marginRight: 6 }} />
              {b}
            </div>
          ))}
        </div>

        {!supabase ? (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            当前为本地模式，付费内容需配置云同步后解锁
          </div>
        ) : !user ? (
          <>
            <Button type="primary" onClick={() => navigate('/auth')} style={{ borderRadius: 8 }}>
              登录后解锁
            </Button>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
              兑换码将绑定到你的账号，换设备不丢失
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, maxWidth: 420, margin: '0 auto' }}>
              <Input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="输入兑换码 XXXX-XXXX-XXXX"
                maxLength={14}
                onPressEnter={handleRedeem}
                style={{ borderRadius: 8, textAlign: 'center', letterSpacing: 1 }}
              />
              <Button
                type="primary"
                loading={redeeming}
                onClick={handleRedeem}
                style={{ borderRadius: 8, flexShrink: 0 }}
              >
                立即解锁
              </Button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
              还没有兑换码？请联系客服或在售卖点购买
            </div>
          </>
        )}
      </div>
    </div>
  );
}
