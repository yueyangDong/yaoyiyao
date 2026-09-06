import React, { useCallback, useEffect, useState } from 'react';
import { Card, Input, Button, Tag, Empty, message } from 'antd';
import { GiftOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { PRODUCT_INFO, fetchEntitlements, redeemCode, FREE_MODE, type Entitlement } from '../lib/payment';

/** 「我的权益」卡片：展示已解锁权益 + 通用兑换码入口（挂在个人档案页） */
export default function EntitlementCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState<Entitlement[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setList([]);
      setLoaded(true);
      return;
    }
    setList(await fetchEntitlements(user.id));
    setLoaded(true);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleRedeem = async () => {
    if (!code.trim()) {
      message.warning('请输入兑换码');
      return;
    }
    setRedeeming(true);
    try {
      // 通用入口：报告类权益请在对应页面兑换（需绑定命盘）；
      // 这里主要服务 day_pass（target 由服务端写死为当天）
      const result = await redeemCode(code, '');
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

  if (FREE_MODE) {
    return (
      <Card
        className="glass-card"
        size="small"
        style={{ marginBottom: 24, textAlign: 'center' }}
        title={
          <span>
            <GiftOutlined style={{ color: 'var(--module-gold)', marginRight: 6 }} />
            我的权益
          </span>
        }
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0 6px' }}>
          🎉 全站功能限时免费开放中
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.9 }}>
          八字详批、紫微深度解读、情侣合盘报告，以及六爻、梅花、灵签、解梦、风水等全部功能，现在均可免费无限次使用，无需兑换码。
        </div>
      </Card>
    );
  }

  if (!supabase) return null;

  const now = Date.now();
  const active = list.filter(e => !e.expires_at || new Date(e.expires_at).getTime() > now);

  return (
    <Card
      className="glass-card"
      size="small"
      style={{ marginBottom: 24 }}
      title={
        <span>
          <GiftOutlined style={{ color: 'var(--module-gold)', marginRight: 6 }} />
          我的权益
        </span>
      }
    >
      {!user ? (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
            登录后可查看已解锁的权益，并使用兑换码
          </div>
          <Button type="primary" size="small" onClick={() => navigate('/auth')} style={{ borderRadius: 8 }}>
            去登录
          </Button>
        </div>
      ) : (
        <>
          {loaded && active.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={<span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>暂无已解锁权益</span>}
            />
          ) : (
            active.map(e => {
              const info = PRODUCT_INFO[e.product_code];
              const isDayPass = e.product_code === 'day_pass';
              return (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                    <CheckCircleOutlined style={{ color: '#6B9A7A', marginRight: 6 }} />
                    {info?.name || e.product_code}
                  </span>
                  <Tag style={{ marginRight: 0, fontSize: 12 }}>
                    {isDayPass && e.expires_at ? (
                      <>
                        <ClockCircleOutlined /> 当日 {new Date(e.expires_at).getHours() === 0 ? '24:00' : ''} 到期
                      </>
                    ) : '永久有效'}
                  </Tag>
                </div>
              );
            })
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="兑换码 XXXX-XXXX-XXXX"
              maxLength={14}
              size="small"
              onPressEnter={handleRedeem}
              style={{ borderRadius: 8, textAlign: 'center', letterSpacing: 1 }}
            />
            <Button type="primary" size="small" loading={redeeming} onClick={handleRedeem} style={{ borderRadius: 8, flexShrink: 0 }}>
              兑换
            </Button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
            报告类兑换码（八字/紫微/合盘）请在对应页面输入，以绑定当前命盘
          </div>
        </>
      )}
    </Card>
  );
}
