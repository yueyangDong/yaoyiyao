import { useMemo } from 'react';
import { Card, Typography, Space, Tag, Empty } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import { Binary, Star } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';

const { Text, Title } = Typography;

const WUXING_LABELS: Record<string, string> = { '木': '木', '火': '火', '土': '土', '金': '金', '水': '水' };

export default function ModuleCompare() {
  const { history, currentUser } = useUser();
  const navigate = useNavigate();

  const { baziSummary, ziweiSummary, hasBoth } = useMemo(() => {
    const bazi = history.find(h => h.module === 'bazi' && h.userId === currentUser?.id);
    const ziwei = history.find(h => h.module === 'ziwei' && h.userId === currentUser?.id);
    return {
      baziSummary: bazi?.resultSummary || null,
      ziweiSummary: ziwei?.resultSummary || null,
      hasBoth: !!(bazi && ziwei),
    };
  }, [history, currentUser]);

  if (!currentUser) return null;
  if (!hasBoth) {
    return (
      <Card size="small" style={{
        borderRadius: 16,
        border: '1px solid var(--border-light)',
        background: 'linear-gradient(135deg, rgba(74,91,107,0.03) 0%, rgba(255,255,255,0.8) 100%)',
      }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text strong style={{ fontSize: 14 }}>八字 · 紫微 交叉验证</Text>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="分别使用八字排盘和紫微斗数后，可在此对比两种体系的分析结果"
            imageStyle={{ height: 40 }}
          />
        </Space>
      </Card>
    );
  }

  return (
    <Card size="small" style={{
      borderRadius: 16,
      border: '1px solid var(--border-light)',
      background: 'linear-gradient(135deg, rgba(91,140,90,0.04) 0%, rgba(74,91,107,0.04) 100%)',
    }}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong style={{ fontSize: 14 }}>八字 · 紫微 交叉验证</Text>
          <Tag color="green">已有两份分析</Tag>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'start' }}>
          {/* 八字 */}
          <Card size="small" hoverable onClick={() => navigate('/bazi')} style={{
            borderColor: 'rgba(91,140,90,0.2)',
            background: 'rgba(91,140,90,0.04)',
            borderRadius: 12,
          }}>
            <Space>
              <Binary size={16} style={{ color: 'var(--wx-wood)' }} />
              <Text strong style={{ fontSize: 13 }}>八字排盘</Text>
            </Space>
            <Text style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginTop: 4 }}>
              {baziSummary}
            </Text>
          </Card>

          {/* 连接 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', paddingTop: 16 }}>
            <ArrowRightOutlined style={{ color: 'var(--text-disabled)', fontSize: 20 }} />
          </div>

          {/* 紫微 */}
          <Card size="small" hoverable onClick={() => navigate('/ziwei')} style={{
            borderColor: 'rgba(74,91,107,0.2)',
            background: 'rgba(74,91,107,0.04)',
            borderRadius: 12,
          }}>
            <Space>
              <Star size={16} style={{ color: 'var(--wx-water)' }} />
              <Text strong style={{ fontSize: 13 }}>紫微斗数</Text>
            </Space>
            <Text style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginTop: 4 }}>
              {ziweiSummary}
            </Text>
          </Card>
        </div>

        <Text style={{ fontSize: 11, color: 'var(--text-disabled)', textAlign: 'center' }}>
          八字看五行旺衰 · 紫微看星曜落宫 · 两套体系互为补充
        </Text>
      </Space>
    </Card>
  );
}
