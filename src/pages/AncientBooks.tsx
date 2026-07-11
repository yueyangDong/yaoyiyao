import { useState, useMemo } from 'react';
import {
  Card, Typography, Space, Tag, Input, Row, Col,
  Tabs, Empty, Button, Divider, Breadcrumb,
} from 'antd';
import { SearchOutlined, BookOutlined } from '@ant-design/icons';
import { BookOpen, ArrowLeft, Search } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { ANCIENT_BOOKS, YIJING_VERNACULAR, searchAncientBooks, type AncientBook, type BookChapter } from '../data/ancientBooks';
import gua64 from '@freizl/yijing/zh-CN/64gua.json';

const { Title, Text, Paragraph } = Typography;

// 卦象符号映射
const GUA_SYMBOL_MAP: Record<string, string> = {
  '乾': '䷀', '坤': '䷁', '屯': '䷂', '蒙': '䷃', '需': '䷄', '讼': '䷅',
  '师': '䷆', '比': '䷇', '小畜': '䷈', '履': '䷉', '泰': '䷊', '否': '䷋',
  '同人': '䷌', '大有': '䷍', '谦': '䷎', '豫': '䷏', '随': '䷐', '蛊': '䷑',
  '临': '䷒', '观': '䷓', '噬嗑': '䷔', '贲': '䷕', '剥': '䷖', '复': '䷗',
  '无妄': '䷘', '大畜': '䷙', '颐': '䷚', '大过': '䷛', '坎': '䷜', '离': '䷝',
  '咸': '䷞', '恒': '䷟', '遁': '䷠', '大壮': '䷡', '晋': '䷢', '明夷': '䷣',
  '家人': '䷤', '睽': '䷥', '蹇': '䷦', '解': '䷧', '损': '䷨', '益': '䷩',
  '夬': '䷪', '姤': '䷫', '萃': '䷬', '升': '䷭', '困': '䷮', '井': '䷯',
  '革': '䷰', '鼎': '䷱', '震': '䷲', '艮': '䷳', '渐': '䷴', '归妹': '䷵',
  '丰': '䷶', '旅': '䷷', '巽': '䷸', '兑': '䷹', '涣': '䷺', '节': '䷻',
  '中孚': '䷼', '小过': '䷽', '既济': '䷾', '未济': '䷿',
};

export default function AncientBooks() {
  const { addHistory, currentUser } = useUser();
  const [activeBook, setActiveBook] = useState<string>('yijing');
  const [selectedChapter, setSelectedChapter] = useState<BookChapter | null>(null);
  const [yijingSearch, setYijingSearch] = useState('');
  const [selectedGua, setSelectedGua] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');

  // 获取当前书籍
  const currentBook = useMemo(() => ANCIENT_BOOKS.find(b => b.id === activeBook), [activeBook]);

  // 易经64卦数据(从gua64.json读取)
  const guaList = useMemo(() => {
    return (gua64 as any[]).map((g: any) => ({
      name: g.name,
      symbol: GUA_SYMBOL_MAP[g.name] || g.symbol || '',
      guaCi: g.gua_ci || '',
      tuanCi: g.tuan_ci || '',
      daXiang: g.da_xiang || '',
      yaoCi: g.yao_ci || [],
      vernacular: YIJING_VERNACULAR[g.name] || '',
    }));
  }, []);

  // 搜索易经
  const filteredGuaList = useMemo(() => {
    if (!yijingSearch.trim()) return guaList;
    const kw = yijingSearch.toLowerCase();
    return guaList.filter((g: any) =>
      g.name.includes(kw) || g.guaCi.includes(kw) || g.vernacular.includes(kw),
    );
  }, [guaList, yijingSearch]);

  // 全局搜索
  const globalResults = useMemo(() => {
    if (!globalSearch.trim()) return [];
    return searchAncientBooks(globalSearch);
  }, [globalSearch]);

  const selectedGuaData = useMemo(() => {
    if (!selectedGua) return null;
    return guaList.find((g: any) => g.name === selectedGua);
  }, [selectedGua, guaList]);

  const handleBookChange = (bookId: string) => {
    setActiveBook(bookId);
    setSelectedChapter(null);
    setSelectedGua(null);
    setYijingSearch('');
  };

  const handleChapterClick = (ch: BookChapter) => {
    setSelectedChapter(ch);
    addHistory({
      userId: currentUser?.id || '',
      module: 'ancientbook',
      queryParams: { book: activeBook, chapter: ch.title },
      resultSummary: `古籍阅读：${currentBook?.title} · ${ch.title}`,
    });
  };

  const handleGuaClick = (name: string) => {
    setSelectedGua(name);
    addHistory({
      userId: currentUser?.id || '',
      module: 'ancientbook',
      queryParams: { book: 'yijing', gua: name },
      resultSummary: `古籍阅读：易经 · ${name}卦`,
    });
  };

  const handleBack = () => {
    setSelectedChapter(null);
    setSelectedGua(null);
  };

  const bookTabs = ANCIENT_BOOKS.map(b => ({
    key: b.id,
    label: <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <BookOpen size={14} /> {b.title}
    </span>,
  }));

  return (
    <div style={{ padding: '16px 0' }}>
      <Title level={3} style={{
        textAlign: 'center', fontFamily: 'var(--font-display)',
        color: 'var(--text-primary)', fontWeight: 600,
      }}>
        古籍经典
      </Title>

      {/* 全局搜索 */}
      <Card size="small" style={{ marginBottom: 16, borderColor: 'var(--border-light)' }}>
        <Input.Search
          placeholder="搜索古籍内容（如：上善若水、三人行、自强不息...）"
          value={globalSearch}
          onChange={e => setGlobalSearch(e.target.value)}
          onSearch={v => setGlobalSearch(v)}
          allowClear
          size="middle"
          prefix={<Search size={16} />}
        />
        {globalResults.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>搜索结果（{globalResults.length}条）：</Text>
            {globalResults.slice(0, 10).map((r, i) => (
              <Card
                key={i}
                size="small"
                hoverable
                style={{ marginTop: 8, borderColor: 'var(--border-light)' }}
                onClick={() => {
                  setActiveBook(r.book.id);
                  setSelectedChapter(r.chapter);
                  setGlobalSearch('');
                }}
              >
                <Space>
                  <Tag style={{ background: 'rgba(0,0,0,0.04)', border: 'none' }}>{r.book.title}</Tag>
                  <Text strong style={{ color: 'var(--text-primary)', fontSize: 13 }}>{r.chapter.title}</Text>
                </Space>
                <Paragraph ellipsis={{ rows: 2 }} style={{ fontSize: 12, color: 'var(--text-body)', marginTop: 4, marginBottom: 0 }}>
                  {r.section.original}
                </Paragraph>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* 书籍选择 */}
      <Tabs
        activeKey={activeBook}
        onChange={handleBookChange}
        items={bookTabs}
        centered
        style={{ marginBottom: 16 }}
      />

      {/* 书籍信息 */}
      {currentBook && !selectedChapter && !selectedGua && (
        <Card style={{ marginBottom: 16, borderColor: 'var(--border-light)' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space>
              <BookOpen size={24} />
              <div>
                <Title level={4} style={{ margin: 0, color: 'var(--text-primary)' }}>{currentBook.title}</Title>
                <Text style={{ color: 'var(--text-secondary)' }}>
                  {currentBook.author} · {currentBook.era}
                </Text>
              </div>
            </Space>
            <Paragraph style={{ color: 'var(--text-body)', marginTop: 8 }}>
              {currentBook.description}
            </Paragraph>
          </Space>
        </Card>
      )}

      {/* 返回按钮 */}
      {(selectedChapter || selectedGua) && (
        <Button
          type="text"
          icon={<ArrowLeft size={18} />}
          onClick={handleBack}
          style={{ marginBottom: 12, color: 'var(--text-secondary)' }}
        >
          返回目录
        </Button>
      )}

      {/* ─── 易经：64卦浏览 ─── */}
      {activeBook === 'yijing' && !selectedGua && (
        <>
          <Input.Search
            placeholder="搜索卦名、卦辞..."
            value={yijingSearch}
            onChange={e => setYijingSearch(e.target.value)}
            allowClear
            style={{ marginBottom: 16 }}
          />
          <Row gutter={[8, 8]}>
            {filteredGuaList.map((gua: any) => (
              <Col xs={8} sm={6} md={4} key={gua.name}>
                <Card
                  hoverable
                  size="small"
                  onClick={() => handleGuaClick(gua.name)}
                  style={{
                    textAlign: 'center',
                    borderColor: 'var(--border-light)',
                    cursor: 'pointer',
                  }}
                  styles={{ body: { padding: '10px 6px' } }}
                >
                  <Text style={{ fontSize: 24, display: 'block' }}>{gua.symbol}</Text>
                  <Text strong style={{ color: 'var(--text-primary)', fontSize: 14 }}>{gua.name}</Text>
                </Card>
              </Col>
            ))}
          </Row>
          {filteredGuaList.length === 0 && <Empty description="未找到匹配的卦" />}
        </>
      )}

      {/* ─── 道德经/论语：章节列表 ─── */}
      {activeBook !== 'yijing' && currentBook && !selectedChapter && (
        <div>
          {(currentBook.chapters || []).map((ch, i) => (
            <Card
              key={i}
              hoverable
              size="small"
              onClick={() => handleChapterClick(ch)}
              style={{ marginBottom: 8, borderColor: 'var(--border-light)', cursor: 'pointer' }}
            >
              <Space>
                <BookOutlined style={{ color: 'var(--text-secondary)' }} />
                <Text strong style={{ color: 'var(--text-primary)' }}>{ch.title}</Text>
              </Space>
              <Paragraph ellipsis={{ rows: 1 }} style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, marginBottom: 0 }}>
                {ch.sections[0]?.original?.slice(0, 60)}...
              </Paragraph>
            </Card>
          ))}
        </div>
      )}

      {/* ─── 章节详情：原文 + 白话 ─── */}
      {selectedChapter && (
        <div>
          <Title level={4} style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {selectedChapter.title}
          </Title>
          {selectedChapter.sections.map((sec, i) => (
            <Card
              key={i}
              style={{
                marginBottom: 16,
                borderColor: 'var(--border-light)',
                background: 'var(--bg-card-solid)',
              }}
            >
              {/* 原文 */}
              <div style={{
                padding: '14px 16px',
                background: 'rgba(0,0,0,0.02)',
                borderRadius: 8,
                marginBottom: 12,
                borderLeft: '3px solid var(--border-input)',
              }}>
                <Text style={{ fontSize: 11, color: 'var(--text-disabled)', display: 'block', marginBottom: 6 }}>
                  原文
                </Text>
                <Paragraph style={{
                  fontSize: 15,
                  lineHeight: 2.2,
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'var(--font-kai)',
                  marginBottom: 0,
                }}>
                  {sec.original}
                </Paragraph>
              </div>

              {/* 白话 */}
              <div style={{
                padding: '14px 16px',
                background: 'rgba(91,140,90,0.03)',
                borderRadius: 8,
                borderLeft: '3px solid var(--wx-wood)',
              }}>
                <Text style={{ fontSize: 11, color: 'var(--wx-wood)', display: 'block', marginBottom: 6 }}>
                  白话文解释
                </Text>
                <Paragraph style={{
                  fontSize: 14,
                  lineHeight: 1.9,
                  color: 'var(--text-body)',
                  whiteSpace: 'pre-wrap',
                  marginBottom: 0,
                }}>
                  {sec.vernacular}
                </Paragraph>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ─── 易经单卦详情：原文 + 白话 ─── */}
      {selectedGuaData && (
        <div>
          <Card style={{
            textAlign: 'center', marginBottom: 16,
            borderColor: 'var(--border-light)', background: 'var(--bg-card-solid)',
          }}>
            <Text style={{ fontSize: 64, display: 'block', lineHeight: 1.2 }}>
              {selectedGuaData.symbol}
            </Text>
            <Title level={2} style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', marginTop: 0 }}>
              {selectedGuaData.name}卦
            </Title>
          </Card>

          {/* 卦辞 */}
          {selectedGuaData.guaCi && (
            <Card
              title={<Text strong style={{ color: 'var(--text-primary)' }}>卦辞</Text>}
              size="small"
              style={{ marginBottom: 12, borderColor: 'var(--border-light)' }}
            >
              <Paragraph style={{
                fontSize: 15, lineHeight: 2, color: 'var(--text-primary)',
                fontFamily: 'var(--font-kai)',
                whiteSpace: 'pre-wrap', marginBottom: 4,
              }}>
                {selectedGuaData.guaCi}
              </Paragraph>
            </Card>
          )}

          {/* 彖辞 */}
          {selectedGuaData.tuanCi && (
            <Card
              title={<Text strong style={{ color: 'var(--text-primary)' }}>彖辞</Text>}
              size="small"
              style={{ marginBottom: 12, borderColor: 'var(--border-light)' }}
            >
              <Paragraph style={{
                fontSize: 14, lineHeight: 2, color: 'var(--text-body)',
                fontFamily: 'var(--font-kai)',
                whiteSpace: 'pre-wrap', marginBottom: 4,
              }}>
                {selectedGuaData.tuanCi}
              </Paragraph>
            </Card>
          )}

          {/* 大象 */}
          {selectedGuaData.daXiang && (
            <Card
              title={<Text strong style={{ color: 'var(--text-primary)' }}>大象</Text>}
              size="small"
              style={{ marginBottom: 12, borderColor: 'var(--border-light)' }}
            >
              <Paragraph style={{
                fontSize: 14, lineHeight: 2, color: 'var(--text-body)',
                fontFamily: 'var(--font-kai)',
                whiteSpace: 'pre-wrap', marginBottom: 4,
              }}>
                {selectedGuaData.daXiang}
              </Paragraph>
            </Card>
          )}

          {/* 爻辞 */}
          {selectedGuaData.yaoCi && selectedGuaData.yaoCi.length > 0 && (
            <Card
              title={<Text strong style={{ color: 'var(--text-primary)' }}>六爻爻辞</Text>}
              size="small"
              style={{ marginBottom: 12, borderColor: 'var(--border-light)' }}
            >
              {selectedGuaData.yaoCi.map((yc: string, i: number) => (
                <Paragraph key={i} style={{
                  fontSize: 13, lineHeight: 2, color: 'var(--text-body)',
                  fontFamily: 'var(--font-kai)',
                  whiteSpace: 'pre-wrap', marginBottom: 6,
                }}>
                  {yc}
                </Paragraph>
              ))}
            </Card>
          )}

          {/* 白话解释 */}
          {selectedGuaData.vernacular && (
            <Card
              style={{
                marginBottom: 16, borderColor: 'var(--border-light)',
                borderLeft: '3px solid var(--wx-wood)',
                background: 'rgba(91,140,90,0.03)',
              }}
            >
              <Text style={{ fontSize: 12, color: 'var(--wx-wood)', display: 'block', marginBottom: 8 }}>
                白话文解释
              </Text>
              <Paragraph style={{
                fontSize: 15, lineHeight: 1.9, color: 'var(--text-body)',
                whiteSpace: 'pre-wrap', marginBottom: 0,
              }}>
                {selectedGuaData.vernacular}
              </Paragraph>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
