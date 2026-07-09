import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Typography, List, Tag, Button, Space, Popconfirm, Empty, Select } from 'antd';
import { DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import {
  Binary, Star, Sparkles, Flower2, Compass, Moon,
  ScrollText, Waves, History as HistoryIcon,
} from 'lucide-react';
import { useUser } from '../context/UserContext';

const { Title, Text } = Typography;

const MODULE_INFO: Record<string, { title: string; icon: React.ReactNode; color: string }> = {
  bazi: { title: '八字排盘', icon: <Binary size={16} strokeWidth={1.5} />, color: '#5B8C5A' },
  ziwei: { title: '紫微斗数', icon: <Star size={16} strokeWidth={1.5} />, color: '#4A5B6B' },
  nayin: { title: '纳音查询', icon: <Waves size={16} strokeWidth={1.5} />, color: '#5B8C5A' },
  liuyao: { title: '六爻占卜', icon: <Sparkles size={16} strokeWidth={1.5} />, color: '#C4A45A' },
  meihua: { title: '梅花易数', icon: <Flower2 size={16} strokeWidth={1.5} />, color: '#C75B5B' },
  fengshui: { title: '风水相宅', icon: <Compass size={16} strokeWidth={1.5} />, color: '#C4A45A' },
  dream: { title: '周公解梦', icon: <Moon size={16} strokeWidth={1.5} />, color: '#4A5B6B' },
  lingqian: { title: '灵签抽签', icon: <ScrollText size={16} strokeWidth={1.5} />, color: '#9B9B9B' },
};

function formatDateTime(isoStr: string): string {
  const d = new Date(isoStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function History() {
  const navigate = useNavigate();
  const { history, clearHistory } = useUser();
  const [filterModule, setFilterModule] = useState<string | undefined>(undefined);

  const filtered = filterModule
    ? history.filter(h => h.module === filterModule)
    : history;

  return (
    <div style={{ padding: '16px 0' }}>
      <Space style={{ marginBottom: 20 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>返回</Button>
        <Title level={3} style={{
          margin: 0, fontSize: 'var(--text-2xl)', fontFamily: 'var(--font-title)',
          fontWeight: 500, color: 'var(--text-primary)',
        }}>
          查询历史
        </Title>
      </Space>

      <Card className="glass-card" styles={{ body: { padding: '20px' } }}>
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            allowClear
            placeholder="按模块筛选"
            value={filterModule}
            onChange={(v) => setFilterModule(v)}
            style={{ width: 200 }}
            options={Object.entries(MODULE_INFO).map(([key, info]) => ({
              value: key,
              label: <Space>{info.icon} {info.title}</Space>,
            }))}
          />
          {history.length > 0 && (
            <Popconfirm
              title={filterModule ? `清空「${MODULE_INFO[filterModule]?.title || filterModule}」的全部记录？` : '清空全部历史记录？'}
              onConfirm={() => clearHistory(filterModule)}
              okText="确定"
              cancelText="取消"
            >
              <Button danger icon={<DeleteOutlined />}>
                {filterModule ? '清空该模块' : '清空全部'}
              </Button>
            </Popconfirm>
          )}
        </Space>

        {filtered.length === 0 ? (
          <Empty description={history.length === 0 ? '暂无查询记录' : '该模块暂无记录'} />
        ) : (
          <List
            dataSource={filtered}
            renderItem={(item) => {
              const info = MODULE_INFO[item.module] || { title: item.module, icon: null, color: '#999' };
              return (
                <List.Item
                  actions={[
                    <Button key="recheck" type="link" onClick={() => navigate(`/${item.module}`)}>
                      重新查询
                    </Button>,
                  ]}
                  style={{ padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}
                >
                  <List.Item.Meta
                    avatar={
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 36, height: 36, borderRadius: 10,
                        background: `${info.color}14`, color: info.color,
                      }}>
                        {info.icon}
                      </span>
                    }
                    title={
                      <Space>
                        <Text strong style={{ fontSize: 'var(--text-base)' }}>{info.title}</Text>
                        <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>
                          {formatDateTime(item.timestamp)}
                        </Text>
                      </Space>
                    }
                    description={
                      <Text style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                        {item.resultSummary || '无摘要'}
                      </Text>
                    }
                  />
                </List.Item>
              );
            }}
          />
        )}
      </Card>
    </div>
  );
}
