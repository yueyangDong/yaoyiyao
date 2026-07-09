import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Typography, List, Tag, Button, Space, Popconfirm, Empty, Select } from 'antd';
import {
  CalendarOutlined, StarOutlined, FireOutlined, ThunderboltOutlined,
  ExperimentOutlined, HomeOutlined, SmileOutlined, CloudOutlined,
  DeleteOutlined, ArrowLeftOutlined,
} from '@ant-design/icons';
import { useUser } from '../context/UserContext';

const { Title, Text } = Typography;

const MODULE_INFO: Record<string, { title: string; icon: React.ReactNode; color: string }> = {
  bazi: { title: '八字排盘', icon: <CalendarOutlined />, color: '#e74c3c' },
  ziwei: { title: '紫微斗数', icon: <StarOutlined />, color: '#9b59b6' },
  nayin: { title: '纳音查询', icon: <FireOutlined />, color: '#e67e22' },
  liuyao: { title: '六爻大衍', icon: <ThunderboltOutlined />, color: '#2ecc71' },
  meihua: { title: '梅花易数', icon: <ExperimentOutlined />, color: '#3498db' },
  fengshui: { title: '风水相宅', icon: <HomeOutlined />, color: '#1abc9c' },
  mianxiang: { title: '看面相', icon: <SmileOutlined />, color: '#f39c12' },
  dream: { title: '周公解梦', icon: <CloudOutlined />, color: '#9c27b0' },
  lingqian: { title: '灵签抽签', icon: <CloudOutlined />, color: '#c9a96e' },
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
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>返回首页</Button>
        <Title level={3} style={{ margin: 0, color: '#8b4513' }}>📋 查询历史</Title>
      </Space>

      <Card>
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
          <Empty description={history.length === 0 ? '暂无查询记录，快去试试各模块吧！' : '该模块暂无记录'} />
        ) : (
          <List
            dataSource={filtered}
            renderItem={(item) => {
              const info = MODULE_INFO[item.module] || { title: item.module, icon: null, color: '#999' };
              return (
                <List.Item
                  actions={[
                    <Button
                      key="recheck"
                      type="link"
                      onClick={() => navigate(`/${item.module}`)}
                    >
                      重新查询
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Tag color={info.color} style={{ fontSize: 16, padding: '4px 8px' }}>
                        {info.icon}
                      </Tag>
                    }
                    title={
                      <Space>
                        <Text strong>{info.title}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {formatDateTime(item.timestamp)}
                        </Text>
                      </Space>
                    }
                    description={item.resultSummary || '无摘要'}
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
