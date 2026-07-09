import { useState } from 'react';
import {
  Card, Input, Button, Typography, Tag, Table, Space,
  InputNumber, Divider, message,
} from 'antd';
import { useUser } from '../context/UserContext';
import { Waves, Search } from 'lucide-react';
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

  const wuxingClassMap: Record<string, string> = {
    '金': 'tag-metal',
    '木': 'tag-wood',
    '水': 'tag-water',
    '火': 'tag-fire',
    '土': 'tag-earth',
  };

  const columns = [
    { title: '干支', dataIndex: 'ganzhi', key: 'ganzhi', width: 80,
      render: (v: string) => <Text strong style={{ color: 'var(--text-primary)' }}>{v}</Text> },
    { title: '纳音', dataIndex: 'nayin', key: 'nayin', width: 100,
      render: (v: string) => <Tag>{v}</Tag> },
    { title: '五行', dataIndex: 'wuxing', key: 'wuxing', width: 60,
      render: (v: string) => <Tag className={wuxingClassMap[v] || ''}>{v}</Tag> },
    { title: '解读', dataIndex: 'desc', key: 'desc', ellipsis: true,
      render: (v: string) => <span style={{ color: 'var(--text-body)' }}>{v}</span> },
  ];

  return (
    <div style={{ padding: '16px 0' }}>
      <Title level={3} style={{ textAlign: 'center', color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: 4 }}>
        <Waves size={28} strokeWidth={1.5} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        纳音查询
      </Title>

      <Card className="glass-card" title="干支查询" style={{ marginBottom: 16 }}>
        <Space>
          <Input
            placeholder='输入干支，如"甲子"'
            value={ganzhiInput}
            onChange={(e) => setGanzhiInput(e.target.value)}
            style={{ width: 200 }}
            onPressEnter={handleGanzhiSearch}
          />
          <Button type="primary" icon={<Search size={16} />} onClick={handleGanzhiSearch}>
            查询纳音
          </Button>
        </Space>
      </Card>

      <Card className="glass-card" title="年份查询" style={{ marginBottom: 16 }}>
        <Space>
          <InputNumber
            min={1900}
            max={2100}
            placeholder="1990"
            value={yearInput}
            onChange={(v) => setYearInput(v || null)}
            style={{ width: 120 }}
          />
          <Button type="primary" icon={<Search size={16} />} onClick={handleYearSearch}>
            查询年份纳音
          </Button>
        </Space>
        <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
          输入公历年份，查询该年对应的年柱干支及其纳音
        </Text>
      </Card>

      {result && (
        <Card className="glass-card" style={{ marginBottom: 16 }}>
          <Title level={4} style={{ color: 'var(--text-primary)' }}>
            {result.type === 'ganzhi' ? `干支「${result.data.ganzhi}」` : `${yearInput}年（${result.data.ganzhi}年）`}
          </Title>
          <Space size="large" style={{ marginBottom: 12 }}>
            <Text strong style={{ fontSize: 20, color: 'var(--text-primary)' }}>{result.data.nayin}</Text>
            <Tag className={wuxingClassMap[result.data.wuxing] || ''}>
              五行属{result.data.wuxing}
            </Tag>
          </Space>
          <Divider />
          <Text style={{ color: 'var(--text-body)' }}>{result.data.desc}</Text>
        </Card>
      )}

      <Card className="glass-card" title="六十甲子纳音全表">
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
