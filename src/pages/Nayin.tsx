import { useState } from 'react';
import {
  Card, Input, Button, Typography, Tag, Table, Space,
  InputNumber, Divider, message,
} from 'antd';
import { useUser } from '../context/UserContext';
import { SearchOutlined } from '@ant-design/icons';
import { NAYIN_MAP, NAYIN_LIST, getNayin, getYearNayin } from '../utils/nayinTexts';

const { Title, Text } = Typography;

export default function Nayin() {
  const { currentUser, addHistory } = useUser();
  const [ganzhiInput, setGanzhiInput] = useState('');
  const [yearInput, setYearInput] = useState<number | null>(null);
  const [result, setResult] = useState<any>(null);
  const [searchText, setSearchText] = useState('');

  const handleGanzhiSearch = () => {
    if (!ganzhiInput.trim()) {
      message.warning('请输入干支');
      return;
    }
    const entry = getNayin(ganzhiInput.trim());
    if (entry) {
      setResult({ type: 'ganzhi', data: entry });
      addHistory({
        userId: currentUser?.id || '',
        module: 'nayin',
        queryParams: { ganzhi: ganzhiInput },
        resultSummary: `纳音查询：${entry.ganzhi} → ${entry.nayin}（${entry.wuxing}）`,
      });
    } else {
      message.warning('未找到该干支的纳音信息，请输入如"甲子"格式');
    }
  };

  const handleYearSearch = () => {
    if (!yearInput) {
      message.warning('请输入年份');
      return;
    }
    const entry = getYearNayin(yearInput);
    if (entry) {
      setResult({ type: 'year', data: entry });
      addHistory({
        userId: currentUser?.id || '',
        module: 'nayin',
        queryParams: { year: yearInput },
        resultSummary: `纳音查询：${yearInput}年 → ${entry.ganzhi} ${entry.nayin}`,
      });
    } else {
      message.warning('请检查输入');
    }
  };

  const filteredList = NAYIN_LIST.filter(
    (item) =>
      item.ganzhi.includes(searchText) ||
      item.nayin.includes(searchText) ||
      item.wuxing.includes(searchText)
  );

  const columns = [
    { title: '干支', dataIndex: 'ganzhi', key: 'ganzhi', width: 80,
      render: (v: string) => <Text strong>{v}</Text> },
    { title: '纳音', dataIndex: 'nayin', key: 'nayin', width: 100,
      render: (v: string) => <Tag color="gold">{v}</Tag> },
    { title: '五行', dataIndex: 'wuxing', key: 'wuxing', width: 60,
      render: (v: string) => {
        const colors: Record<string, string> = { '金': 'gold', '木': 'green', '水': 'blue', '火': 'red', '土': 'orange' };
        return <Tag color={colors[v] || 'default'}>{v}</Tag>;
      } },
    { title: '解读', dataIndex: 'desc', key: 'desc', ellipsis: true },
  ];

  return (
    <div style={{ padding: '16px 0' }}>
      <Title level={3} style={{ textAlign: 'center', color: '#c9a96e', fontFamily: 'var(--font-title)', letterSpacing: 4 }}>🌊 纳音查询</Title>

      <Card title="干支查询" style={{ marginBottom: 16 }}>
        <Space>
          <Input
            placeholder='输入干支，如"甲子"'
            value={ganzhiInput}
            onChange={(e) => setGanzhiInput(e.target.value)}
            style={{ width: 200 }}
            onPressEnter={handleGanzhiSearch}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleGanzhiSearch}>
            查询纳音
          </Button>
        </Space>
      </Card>

      <Card title="年份查询" style={{ marginBottom: 16 }}>
        <Space>
          <InputNumber
            min={1900}
            max={2100}
            placeholder="1990"
            value={yearInput}
            onChange={(v) => setYearInput(v || null)}
            style={{ width: 120 }}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleYearSearch}>
            查询年份纳音
          </Button>
        </Space>
        <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
          输入公历年份，查询该年对应的年柱干支及其纳音
        </Text>
      </Card>

      {result && (
        <Card className="mystic-card" style={{ marginBottom: 16 }}>
          <Title level={4} style={{ color: '#c9a96e' }}>
            {result.type === 'ganzhi' ? `干支「${result.data.ganzhi}」` : `${yearInput}年（${result.data.ganzhi}年）`}
          </Title>
          <Space size="large" style={{ marginBottom: 12 }}>
            <Text strong style={{ fontSize: 20, color: '#f0d68a' }}>{result.data.nayin}</Text>
            <Tag color={({ '金': 'gold', '木': 'green', '水': 'blue', '火': 'red', '土': 'orange' } as any)[result.data.wuxing]}>
              五行属{result.data.wuxing}
            </Tag>
          </Space>
          <Divider />
          <Text>{result.data.desc}</Text>
        </Card>
      )}

      <Card title="六十甲子纳音全表">
        <Input.Search
          placeholder="搜索干支、纳音或五行..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ marginBottom: 16, maxWidth: 400 }}
          allowClear
        />
        <Table
          dataSource={filteredList}
          columns={columns}
          rowKey="ganzhi"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          size="small"
          scroll={{ x: 500 }}
        />
      </Card>
    </div>
  );
}
