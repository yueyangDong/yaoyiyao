import { useState, useMemo } from 'react';
import {
  Card, Input, Typography, Row, Col, Tag, Button,
  Modal, Space, Empty, Divider, AutoComplete,
} from 'antd';
import {
  SearchOutlined, BulbOutlined, TagsOutlined, FireOutlined, HistoryOutlined,
} from '@ant-design/icons';
import {
  Moon, Search as SearchIcon,
  PawPrint, User, Leaf, Package, Zap,
  Home, Cloud, Ghost, Building, Dices,
} from 'lucide-react';
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

// Category -> lucide-react icon mapping (replaces emoji)
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  '动物': <PawPrint size={28} />,
  '人物': <User size={28} />,
  '植物': <Leaf size={28} />,
  '物品': <Package size={28} />,
  '活动': <Zap size={28} />,
  '生活': <Home size={28} />,
  '自然': <Cloud size={28} />,
  '鬼神': <Ghost size={28} />,
  '建筑': <Building size={28} />,
};

// Smaller icons for inline use (modal title, etc.)
const CATEGORY_ICONS_SMALL: Record<string, React.ReactNode> = {
  '动物': <PawPrint size={20} />,
  '人物': <User size={20} />,
  '植物': <Leaf size={20} />,
  '物品': <Package size={20} />,
  '活动': <Zap size={20} />,
  '生活': <Home size={20} />,
  '自然': <Cloud size={20} />,
  '鬼神': <Ghost size={20} />,
  '建筑': <Building size={20} />,
};

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
        results.push({ value: keyword, label: `${keyword} - ${entry.title}` });
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
      {/* Title — clean text, no emoji, display font */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <Moon size={28} style={{ color: 'var(--text-primary)', marginRight: 8, verticalAlign: 'middle' }} />
        <Title level={3} style={{
          display: 'inline',
          fontFamily: 'var(--font-display)',
          color: 'var(--text-primary)',
          fontWeight: 600,
        }}>
          周公解梦
        </Title>
      </div>

      {/* 搜索框 */}
      <Card style={{
        marginBottom: 16,
        borderColor: 'var(--border-light)',
      }}>
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
            enterButton={<><SearchIcon size={16} /> 解梦</>}
            onSearch={handleSearch}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </AutoComplete>
        <Text style={{ display: 'block', marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
          支持拼音首字母搜索（如"she"→"蛇"），输入关键词或点击热门梦境直接查看。
        </Text>

        {/* 搜索历史 */}
        {history.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 12, marginRight: 8, color: 'var(--text-secondary)' }}>
              <HistoryOutlined /> 最近搜索：
            </Text>
            {history.slice(0, 5).map((h) => (
              <Tag
                key={h}
                style={{
                  cursor: 'pointer',
                  marginBottom: 4,
                  background: 'rgba(0,0,0,0.04)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-light)',
                }}
                onClick={() => handleSearch(h)}
              >
                {h}
              </Tag>
            ))}
          </div>
        )}
      </Card>

      {/* 分类九宫格 */}
      <Card
        title={<Space><TagsOutlined /> 分类浏览</Space>}
        style={{ marginBottom: 16, borderColor: 'var(--border-light)' }}
      >
        <Row gutter={[12, 12]}>
          {Object.entries(DREAM_CATEGORIES).map(([key, cat]) => (
            <Col xs={8} sm={8} md={8} lg={8} xl={8} key={key}>
              <Card
                hoverable
                size="small"
                style={{
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: selectedCategory === key ? 'rgba(0,0,0,0.02)' : '#fff',
                  borderColor: selectedCategory === key ? 'var(--text-primary)' : 'var(--border-light)',
                }}
                onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                  {CATEGORY_ICONS[key]}
                </div>
                <Text strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>{cat.name}</Text>
                <br />
                <Text style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{cat.desc}</Text>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 分类列表（选中分类后显示） */}
      {selectedCategory && (
        <Card
          title={<Space>{CATEGORY_ICONS_SMALL[selectedCategory]} <span>{DREAM_CATEGORIES[selectedCategory]?.name}</span></Space>}
          extra={<Button size="small" onClick={() => setSelectedCategory(null)}>关闭</Button>}
          style={{ marginBottom: 16, borderColor: 'var(--border-light)' }}
        >
          <Row gutter={[6, 6]}>
            {filteredByCategory.map((entry) => (
              <Col xs={12} sm={8} md={6} key={entry.keyword}>
                <Tag
                  style={{
                    cursor: 'pointer',
                    padding: '4px 10px',
                    fontSize: 13,
                    marginBottom: 4,
                    width: '100%',
                    textAlign: 'center',
                    background: 'rgba(74,91,107,0.08)',
                    color: 'var(--wx-water)',
                    border: '1px solid rgba(74,91,107,0.12)',
                  }}
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
      <Card
        title={<Space><FireOutlined /> 热门梦境</Space>}
        style={{ marginBottom: 16, borderColor: 'var(--border-light)' }}
      >
        <Space wrap size={[8, 8]}>
          {HOT_KEYWORDS.map((kw) => (
            <Tag
              key={kw}
              style={{
                cursor: 'pointer',
                padding: '6px 14px',
                fontSize: 14,
                background: 'rgba(212,148,58,0.08)',
                color: 'var(--color-warn)',
                border: '1px solid rgba(212,148,58,0.12)',
              }}
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
          icon={<Dices size={20} />}
          onClick={handleRandom}
          style={{ height: 48, fontSize: 16, padding: '0 36px' }}
        >
          随机解梦
        </Button>
      </div>

      {/* 详情弹窗 */}
      <Modal
        title={selectedDream ? (
          <Space>
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              {CATEGORY_ICONS_SMALL[selectedDream.category]}
            </span>
            <Text strong style={{ fontSize: 18, color: 'var(--text-primary)' }}>{selectedDream.title}</Text>
            <Tag style={{
              background: 'rgba(155,155,155,0.08)',
              color: 'var(--wx-metal)',
              border: '1px solid rgba(155,155,155,0.12)',
            }}>
              {DREAM_CATEGORIES[selectedDream.category]?.name}
            </Tag>
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
              background: 'rgba(0,0,0,0.02)',
              padding: 16,
              borderRadius: 8,
              color: 'var(--text-body)',
            }}>
              {selectedDream.content}
            </div>

            <div style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>相关标签：</Text>
              <Space wrap size={[4, 4]} style={{ marginLeft: 8 }}>
                {selectedDream.tags.map((tag) => (
                  <Tag
                    key={tag}
                    style={{
                      fontSize: 11,
                      cursor: 'pointer',
                      background: 'rgba(0,0,0,0.04)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-light)',
                    }}
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
                <Divider style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-light)' }}>相关梦境推荐</Divider>
                <Row gutter={[6, 6]}>
                  {relatedDreams.map((d) => (
                    <Col key={d.keyword}>
                      <Tag
                        style={{
                          cursor: 'pointer',
                          background: 'rgba(74,91,107,0.08)',
                          color: 'var(--wx-water)',
                          border: '1px solid rgba(74,91,107,0.12)',
                        }}
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
