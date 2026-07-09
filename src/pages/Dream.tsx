import { useState, useMemo } from 'react';
import {
  Card, Input, Typography, Row, Col, Tag, Button,
  Modal, Space, Empty, Divider, AutoComplete,
} from 'antd';
import {
  SearchOutlined, BulbOutlined, TagsOutlined, FireOutlined, HistoryOutlined,
} from '@ant-design/icons';
import { ALL_DREAMS, DREAM_CATEGORIES, PINYIN_MAP, DreamEntry } from '../data/dreamData';
import { useUser } from '../context/UserContext';

const { Title, Text, Paragraph } = Typography;

const HOT_KEYWORDS = ['蛇', '水', '掉牙', '飞', '考试', '死人', '鱼', '火', '钱', '鬼', '婴儿', '结婚'];

// localStorage key for search history
const HISTORY_KEY = 'dream_search_history';

function getSearchHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch { return []; }
}

function setSearchHistory(keywords: string[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(keywords.slice(0, 10)));
}

export default function Dream() {
  const { currentUser, addHistory } = useUser();
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDream, setSelectedDream] = useState<DreamEntry | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [history, setHistory] = useState<string[]>(getSearchHistory);

  // 搜索建议 (autocomplete)
  const searchOptions = useMemo(() => {
    if (!searchText.trim()) return [];
    const txt = searchText.toLowerCase().trim();
    const results: { value: string; label: string }[] = [];

    for (const entry of ALL_DREAMS) {
      const keyword = entry.keyword;
      const matchKey = keyword.toLowerCase().includes(txt);
      const matchTag = entry.tags.some((t) => t.toLowerCase().includes(txt));
      const matchCategory = entry.category.includes(txt);

      // 拼音匹配
      let matchPinyin = false;
      const chars = keyword.split('');
      if (chars.length > 0) {
        const py = PINYIN_MAP[chars[0]];
        if (py && py.startsWith(txt)) matchPinyin = true;
      }

      if (matchKey || matchTag || matchCategory || matchPinyin) {
        results.push({ value: keyword, label: `${DREAM_CATEGORIES[entry.category]?.emoji || ''} ${keyword} - ${entry.title}` });
        if (results.length >= 10) break;
      }
    }
    return results;
  }, [searchText]);

  const handleSearch = (value: string) => {
    if (!value.trim()) return;
    const txt = value.trim();
    // 更新搜索历史
    const newHistory = [txt, ...history.filter((h) => h !== txt)].slice(0, 10);
    setHistory(newHistory);
    setSearchHistory(newHistory);

    // 查找匹配
    const entry = ALL_DREAMS.find(
      (d) => d.keyword === txt || d.keyword.includes(txt) || d.tags.includes(txt),
    );
    if (entry) {
      setSelectedDream(entry);
      setModalOpen(true);
      addHistory({
        userId: currentUser?.id || '',
        module: 'dream',
        queryParams: { keyword: txt },
        resultSummary: `周公解梦：${entry.keyword}`,
      });
    } else {
      const fuzzy = ALL_DREAMS.find(
        (d) => d.keyword.includes(txt) || d.tags.some((t) => t.includes(txt)),
      );
      if (fuzzy) {
        setSelectedDream(fuzzy);
        setModalOpen(true);
        addHistory({
          userId: currentUser?.id || '',
          module: 'dream',
          queryParams: { keyword: txt },
          resultSummary: `周公解梦：${fuzzy.keyword}`,
        });
      }
    }
    setSearchText('');
  };

  const filteredByCategory = useMemo(() => {
    return selectedCategory
      ? ALL_DREAMS.filter((d) => d.category === selectedCategory)
      : [];
  }, [selectedCategory]);

  const handleRandom = () => {
    const idx = Math.floor(Math.random() * ALL_DREAMS.length);
    setSelectedDream(ALL_DREAMS[idx]);
    setModalOpen(true);
  };

  const handleOpenDream = (entry: DreamEntry) => {
    setSelectedDream(entry);
    setModalOpen(true);
    // 也加入历史
    const newHistory = [entry.keyword, ...history.filter((h) => h !== entry.keyword)].slice(0, 10);
    setHistory(newHistory);
    setSearchHistory(newHistory);
  };

  const relatedDreams = useMemo(() => {
    if (!selectedDream) return [];
    return ALL_DREAMS
      .filter((d) => d.keyword !== selectedDream.keyword && (
        d.category === selectedDream.category
        || d.tags.some((t) => selectedDream.tags.includes(t))
      ))
      .slice(0, 5);
  }, [selectedDream]);

  return (
    <div style={{ padding: '16px 0' }}>
      <Title level={3} style={{ textAlign: 'center', color: '#8b4513' }}>周公解梦</Title>

      {/* 搜索框 */}
      <Card style={{ marginBottom: 16 }}>
        <AutoComplete
          options={searchOptions}
          value={searchText}
          onChange={(v) => setSearchText(v)}
          onSelect={(v) => handleSearch(v)}
          style={{ width: '100%' }}
        >
          <Input.Search
            size="large"
            placeholder="输入梦到的关键词，如蛇、水、飞..."
            enterButton={<><SearchOutlined /> 解梦</>}
            onSearch={handleSearch}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </AutoComplete>
        <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
          支持拼音首字母搜索（如"she"→"蛇"），输入关键词或点击热门梦境直接查看。
        </Text>

        {/* 搜索历史 */}
        {history.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <Text type="secondary" style={{ fontSize: 12, marginRight: 8 }}>
              <HistoryOutlined /> 最近搜索：
            </Text>
            {history.slice(0, 5).map((h) => (
              <Tag
                key={h}
                style={{ cursor: 'pointer', marginBottom: 4 }}
                onClick={() => handleSearch(h)}
              >
                {h}
              </Tag>
            ))}
          </div>
        )}
      </Card>

      {/* 分类九宫格 */}
      <Card title={<><TagsOutlined /> 分类浏览</>} style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          {Object.entries(DREAM_CATEGORIES).map(([key, cat]) => (
            <Col xs={8} sm={8} md={8} lg={8} xl={8} key={key}>
              <Card
                hoverable
                size="small"
                style={{
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: selectedCategory === key ? '#e6f7ff' : '#fff',
                  borderColor: selectedCategory === key ? '#1890ff' : '#d9d9d9',
                }}
                onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
              >
                <div style={{ fontSize: 28 }}>{cat.emoji}</div>
                <Text strong style={{ fontSize: 13 }}>{cat.name}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 11 }}>{cat.desc}</Text>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 分类列表（选中分类后显示） */}
      {selectedCategory && (
        <Card
          title={`${DREAM_CATEGORIES[selectedCategory]?.emoji} ${DREAM_CATEGORIES[selectedCategory]?.name}`}
          extra={<Button size="small" onClick={() => setSelectedCategory(null)}>关闭</Button>}
          style={{ marginBottom: 16 }}
        >
          <Row gutter={[6, 6]}>
            {filteredByCategory.map((entry) => (
              <Col xs={12} sm={8} md={6} key={entry.keyword}>
                <Tag
                  style={{ cursor: 'pointer', padding: '4px 10px', fontSize: 13, marginBottom: 4, width: '100%', textAlign: 'center' }}
                  color="blue"
                  onClick={() => handleOpenDream(entry)}
                >
                  {entry.title}
                </Tag>
              </Col>
            ))}
            {filteredByCategory.length === 0 && <Empty description="该分类暂无数据" />}
          </Row>
        </Card>
      )}

      {/* 热门梦境标签云 */}
      <Card title={<><FireOutlined /> 热门梦境</>} style={{ marginBottom: 16 }}>
        <Space wrap size={[8, 8]}>
          {HOT_KEYWORDS.map((kw) => (
            <Tag
              key={kw}
              color="volcano"
              style={{ cursor: 'pointer', padding: '6px 14px', fontSize: 14 }}
              onClick={() => {
                const entry = ALL_DREAMS.find((d) => d.keyword === kw || d.tags.includes(kw));
                if (entry) handleOpenDream(entry);
              }}
            >
              {kw}
            </Tag>
          ))}
        </Space>
      </Card>

      {/* 随机解梦按钮 */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <Button
          size="large"
          icon={<BulbOutlined />}
          onClick={handleRandom}
          style={{ height: 48, fontSize: 16, padding: '0 36px' }}
        >
          🎲 随机解梦
        </Button>
      </div>

      {/* 详情弹窗 */}
      <Modal
        title={selectedDream ? (
          <Space>
            <Text style={{ fontSize: 20 }}>{DREAM_CATEGORIES[selectedDream.category]?.emoji}</Text>
            <Text strong style={{ fontSize: 18 }}>{selectedDream.title}</Text>
            <Tag color="purple">{DREAM_CATEGORIES[selectedDream.category]?.name}</Tag>
          </Space>
        ) : '解梦详情'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={<Button onClick={() => setModalOpen(false)}>关闭</Button>}
        width={640}
        styles={{ body: { maxHeight: '60vh', overflow: 'auto' } }}
      >
        {selectedDream && (
          <>
            <div style={{
              whiteSpace: 'pre-wrap',
              fontSize: 14,
              lineHeight: 1.8,
              marginBottom: 16,
              background: '#fdf8f0',
              padding: 16,
              borderRadius: 8,
            }}>
              {selectedDream.content}
            </div>

            <div style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>相关标签：</Text>
              <Space wrap size={[4, 4]} style={{ marginLeft: 8 }}>
                {selectedDream.tags.map((tag) => (
                  <Tag key={tag} style={{ fontSize: 11 }}
                    onClick={() => {
                      const entry = ALL_DREAMS.find((d) => d.tags.includes(tag) && d.keyword !== selectedDream.keyword);
                      if (entry) setSelectedDream(entry);
                    }}
                  >
                    {tag}
                  </Tag>
                ))}
              </Space>
            </div>

            {/* 相关梦境推荐 */}
            {relatedDreams.length > 0 && (
              <>
                <Divider>相关梦境推荐</Divider>
                <Row gutter={[6, 6]}>
                  {relatedDreams.map((d) => (
                    <Col key={d.keyword}>
                      <Tag
                        style={{ cursor: 'pointer' }}
                        color="blue"
                        onClick={() => setSelectedDream(d)}
                      >
                        {d.title}
                      </Tag>
                    </Col>
                  ))}
                </Row>
              </>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
