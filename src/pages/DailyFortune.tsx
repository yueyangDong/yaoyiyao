// 每日一爻：黄历 + 天气 + 每日签 + 幸运指南 + 出行提示
import { useState, useEffect, useCallback } from 'react';
import {
  Card, Typography, Space, Tag, Row, Col, Button, Spin, message,
} from 'antd';
import { MapPin, Sun, Wind, Sunrise, Sunset, RefreshCw } from 'lucide-react';
import { Lunar } from 'lunar-typescript';
import { motion } from 'framer-motion';
import { getWeather, getWeatherIcon, getWeatherDesc, getUserPosition, type WeatherData, type GeoPosition } from '../utils/weatherApi';
import {
  getLuckyGuide, getDailyLotIndex, getTravelAdvice, type LuckyGuide, type TravelAdvice,
} from '../utils/dailyFortuneUtils';
import { guanyinLots } from '../data/guanyinLots';
import { useToast } from '../components/Toast';

const { Title, Text, Paragraph } = Typography;

const LEVEL_COLORS: Record<string, string> = {
  '上上': 'var(--wx-earth)', '上': 'var(--color-warn)', '中': 'var(--wx-wood)', '下': 'var(--wx-water)', '下下': 'var(--wx-metal)',
};

function getWeekday(): string {
  return ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][new Date().getDay()];
}

const SHICHEN_NAMES: Record<string, string> = {
  '子': '子时 23-01', '丑': '丑时 01-03', '寅': '寅时 03-05', '卯': '卯时 05-07',
  '辰': '辰时 07-09', '巳': '巳时 09-11', '午': '午时 11-13', '未': '未时 13-15',
  '申': '申时 15-17', '酉': '酉时 17-19', '戌': '戌时 19-21', '亥': '亥时 21-23',
};

export default function DailyFortune() {
  const { toast } = useToast();
  const [lunar] = useState(() => Lunar.fromDate(new Date()));
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [city, setCity] = useState('北京');
  const [luckyGuide] = useState<LuckyGuide>(() => getLuckyGuide());
  const [dailyLot, setDailyLot] = useState<any>(null);
  const [travelAdvice, setTravelAdvice] = useState<TravelAdvice | null>(null);

  // 加载天气
  const loadWeather = useCallback(async (lat: number, lng: number, cityName?: string) => {
    setWeatherLoading(true);
    try {
      const data = await getWeather(lat, lng);
      setWeather(data);
      if (cityName) setCity(cityName);
    } catch (e) {
      toast('info', '天气数据获取失败，使用默认信息');
    } finally {
      setWeatherLoading(false);
    }
  }, [toast]);

  // 初始：默认北京
  useEffect(() => {
    // 每日签
    const lotIdx = getDailyLotIndex();
    const lot = guanyinLots.find(l => l.id === lotIdx) || guanyinLots[0];
    setDailyLot(lot);

    // 天气：默认北京
    loadWeather(39.9, 116.4, '北京');
  }, [loadWeather]);

  // 出行建议
  useEffect(() => {
    if (weather) {
      setTravelAdvice(getTravelAdvice(weather.weatherCode, lunar));
    }
  }, [weather, lunar]);

  const handleGetLocation = async () => {
    try {
      message.loading({ content: '获取位置中...', key: 'geo' });
      const pos = await getUserPosition();
      message.success({ content: `已定位到 ${pos.city || '当前位置'}`, key: 'geo' });
      await loadWeather(pos.lat, pos.lng, pos.city);
    } catch (e: any) {
      message.error({ content: e.message === 'Geolocation not supported'
        ? '浏览器不支持定位'
        : '定位失败，请检查浏览器位置权限', key: 'geo' });
    }
  };

  const formatTime = (isoStr: string) => {
    if (!isoStr) return '--';
    const t = new Date(isoStr);
    return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div style={{ padding: '16px 0', minHeight: '100vh' }}>
      {/* 标题 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Title level={3} style={{
          textAlign: 'center', fontFamily: 'var(--font-display)',
          color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4,
        }}>
          每日一爻
        </Title>
        <Text style={{
          display: 'block', textAlign: 'center', color: 'var(--text-secondary)',
          fontSize: 13, marginBottom: 4,
        }}>
          农历{lunar.getYearInChinese()}年 {lunar.getMonthInChinese()}月 {lunar.getDayInChinese()}日 · {getWeekday()}
        </Text>
        <Text style={{
          display: 'block', textAlign: 'center', color: 'var(--text-secondary)',
          fontSize: 12, marginBottom: 16,
        }}>
          公历{new Date().getFullYear()}年{new Date().getMonth() + 1}月{new Date().getDate()}日 · 干支{lunar.getDayInGanZhi()}日 · {lunar.getDayNaYin()}
        </Text>
      </motion.div>

      {/* 天气卡片 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card style={{
          marginBottom: 16, borderColor: 'var(--border-light)',
          overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Space size="middle">
              <div style={{ fontSize: 48, lineHeight: 1 }}>
                {weather ? getWeatherIcon(weather.weatherCode) : '☀️'}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Text strong style={{ fontSize: 32, color: 'var(--text-primary)' }}>
                    {weatherLoading ? <Spin size="small" /> : weather ? `${weather.temp}°C` : '--°C'}
                  </Text>
                  {weather && (
                    <Text style={{ color: 'var(--text-secondary)', fontSize: 16 }}>
                      {getWeatherDesc(weather.weatherCode)}
                    </Text>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                  {weather && (
                    <>
                      <Space size={4}>
                        <Sunrise size={14} strokeWidth={1.5} color="var(--text-disabled)" />
                        <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>日出 {formatTime(weather.sunrise)}</Text>
                      </Space>
                      <Space size={4}>
                        <Sunset size={14} strokeWidth={1.5} color="var(--text-disabled)" />
                        <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>日落 {formatTime(weather.sunset)}</Text>
                      </Space>
                      {weather.windSpeed > 0 && (
                        <Space size={4}>
                          <Wind size={14} strokeWidth={1.5} color="var(--text-disabled)" />
                          <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>风力 {weather.windSpeed}km/h</Text>
                        </Space>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Space>
            <Button
              type="text"
              icon={<MapPin size={16} strokeWidth={1.5} />}
              onClick={handleGetLocation}
              style={{ color: 'var(--text-secondary)', fontSize: 13, flexShrink: 0 }}
              loading={weatherLoading}
            >
              {city}
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* 宜忌卡片 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={12}>
            <Card
              size="small"
              title={<span style={{ color: 'var(--wx-wood)', fontSize: 15 }}>宜</span>}
              style={{
                borderColor: 'var(--border-light)',
                borderTop: '3px solid var(--wx-wood)',
                minHeight: 140,
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {lunar.getDayYi().slice(0, 10).map((item: string) => (
                  <Tag key={item} style={{
                    background: 'rgba(91,140,90,0.06)',
                    color: 'var(--wx-wood)', border: 'none', fontSize: 13,
                  }}>{item}</Tag>
                ))}
                {lunar.getDayYi().length === 0 && (
                  <Text style={{ color: 'var(--text-disabled)' }}>诸事不宜</Text>
                )}
              </div>
            </Card>
          </Col>
          <Col xs={12}>
            <Card
              size="small"
              title={<span style={{ color: 'var(--wx-fire)', fontSize: 15 }}>忌</span>}
              style={{
                borderColor: 'var(--border-light)',
                borderTop: '3px solid var(--wx-fire)',
                minHeight: 140,
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {lunar.getDayJi().slice(0, 10).map((item: string) => (
                  <Tag key={item} style={{
                    background: 'rgba(199,91,91,0.06)',
                    color: 'var(--wx-fire)', border: 'none', fontSize: 13,
                  }}>{item}</Tag>
                ))}
                {lunar.getDayJi().length === 0 && (
                  <Text style={{ color: 'var(--text-disabled)' }}>百无禁忌</Text>
                )}
              </div>
            </Card>
          </Col>
        </Row>
      </motion.div>

      {/* 吉神凶煞 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card size="small" style={{ marginBottom: 16, borderColor: 'var(--border-light)' }}>
          <Row gutter={8}>
            <Col xs={12}>
              <Text style={{ fontSize: 12, color: 'var(--text-disabled)' }}>吉神：</Text>
              {luckyGuide.jiShen.length > 0
                ? luckyGuide.jiShen.slice(0, 5).map(s => (
                  <Tag key={s} style={{ marginRight: 4, fontSize: 11, background: 'rgba(91,140,90,0.06)', color: 'var(--wx-wood)', border: 'none' }}>{s}</Tag>
                ))
                : <Text style={{ fontSize: 12, color: 'var(--text-disabled)' }}>—</Text>
              }
            </Col>
            <Col xs={12}>
              <Text style={{ fontSize: 12, color: 'var(--text-disabled)' }}>凶煞：</Text>
              {luckyGuide.xiongSha.length > 0
                ? luckyGuide.xiongSha.slice(0, 5).map(s => (
                  <Tag key={s} style={{ fontSize: 11, background: 'rgba(199,91,91,0.06)', color: 'var(--wx-fire)', border: 'none' }}>{s}</Tag>
                ))
                : <Text style={{ fontSize: 12, color: 'var(--text-disabled)' }}>—</Text>
              }
              {lunar.getDayChong() && (
                <Tag style={{ fontSize: 11, background: 'rgba(0,0,0,0.04)', border: 'none' }}>
                  冲{lunar.getDayChong()}
                </Tag>
              )}
            </Col>
          </Row>
        </Card>
      </motion.div>

      {/* 每日一签 */}
      {dailyLot && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card
            style={{
              marginBottom: 16, borderColor: 'var(--border-light)',
              background: 'linear-gradient(135deg, rgba(196,164,90,0.06) 0%, rgba(255,255,255,0.95) 50%, rgba(196,164,90,0.06) 100%)',
            }}
          >
            {/* 签头 */}
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 14, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                🏮 今日一签 · 观音灵签
              </Text>
              <div style={{ marginBottom: 8 }}>
                <Text style={{
                  fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)',
                  color: LEVEL_COLORS[dailyLot.level] || 'var(--text-primary)',
                }}>
                  第 {dailyLot.id} 签
                </Text>
                <span style={{
                  marginLeft: 12, fontSize: 18, padding: '4px 18px', borderRadius: 14,
                  background: 'rgba(196,164,90,0.12)',
                  color: 'var(--wx-earth)',
                  fontWeight: 700, fontFamily: 'var(--font-display)',
                }}>
                  {dailyLot.level}
                </span>
              </div>
              <Title level={5} style={{ color: 'var(--text-primary)', marginTop: 4, marginBottom: 0, fontWeight: 600 }}>
                {dailyLot.name}
              </Title>
              <Text style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginTop: 2 }}>
                {dailyLot.gongwei}
              </Text>
            </div>

            {/* 签诗 - 完整 */}
            <div style={{
              padding: '14px 16px', background: 'rgba(0,0,0,0.02)',
              borderRadius: 10, marginBottom: 12,
            }}>
              <Text style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                📜 签诗
              </Text>
              <Paragraph style={{
                fontSize: 15, lineHeight: 2.4, textAlign: 'center',
                fontFamily: 'var(--font-kai)',
                whiteSpace: 'pre-line', color: 'var(--text-primary)',
                marginBottom: 0,
              }}>
                {dailyLot.poem}
              </Paragraph>
            </div>

            {/* 签语 */}
            <div style={{
              padding: '12px 16px', background: 'rgba(196,164,90,0.06)',
              borderRadius: 10, marginBottom: 12,
              borderLeft: '3px solid var(--wx-earth)',
            }}>
              <Text style={{ fontSize: 11, color: 'var(--wx-earth)', display: 'block', marginBottom: 4, fontWeight: 500 }}>
                🔮 签文解读
              </Text>
              <Paragraph style={{
                fontSize: 14, lineHeight: 1.9, color: 'var(--text-body)',
                whiteSpace: 'pre-line', marginBottom: 0,
              }}>
                {dailyLot.qianyu}
              </Paragraph>
            </div>

            {/* 白话详解 */}
            <div style={{
              padding: '12px 16px', background: 'rgba(91,140,90,0.04)',
              borderRadius: 10, marginBottom: 12,
              borderLeft: '3px solid var(--wx-wood)',
            }}>
              <Text style={{ fontSize: 11, color: 'var(--wx-wood)', display: 'block', marginBottom: 4, fontWeight: 500 }}>
                📖 白话详解
              </Text>
              <Paragraph style={{
                fontSize: 14, lineHeight: 1.9, color: 'var(--text-body)',
                whiteSpace: 'pre-line', marginBottom: 0,
              }}>
                {dailyLot.jieyue}
              </Paragraph>
            </div>

            {/* 仙机指引 */}
            <div style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, fontWeight: 500 }}>
                🧭 仙机指引
              </Text>
              <Row gutter={[6, 6]}>
                {Object.entries(dailyLot.xianji).map(([key, val]: [string, any]) => (
                  <Col xs={12} sm={6} key={key}>
                    <Card size="small" styles={{
                      body: { padding: '8px 10px', background: 'rgba(0,0,0,0.02)', borderRadius: 8 },
                    }}>
                      <Text style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{key}</Text>
                      <br />
                      <Text strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>{val}</Text>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>

            {/* 分维度 */}
            <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
              {[
                { label: '💼 事业', text: dailyLot.level === '上上' || dailyLot.level === '上' ? '事业运旺，可大胆推进。' : dailyLot.level === '下下' || dailyLot.level === '下' ? '暂不宜做重大决策，先守住现有。' : '事业平稳，按部就班即可。' },
                { label: '💕 感情', text: dailyLot.level === '上上' || dailyLot.level === '上' ? '桃花运好，良缘可期。' : dailyLot.level === '下下' || dailyLot.level === '下' ? '感情需要多一些耐心和理解。' : '感情中规中矩，顺其自然。' },
                { label: '💰 财运', text: dailyLot.level === '上上' || dailyLot.level === '上' ? '财运不错，可适度投资。' : dailyLot.level === '下下' || dailyLot.level === '下' ? '控制开支，避免高风险操作。' : '财运一般，维持现状即可。' },
                { label: '💚 健康', text: dailyLot.level === '上上' || dailyLot.level === '上' ? '精力充沛，适合开始新计划。' : dailyLot.level === '下下' || dailyLot.level === '下' ? '注意休息，避免过度劳累。' : '健康平稳，保持良好作息。' },
              ].map(({ label, text }) => (
                <Col xs={12} sm={6} key={label}>
                  <Text style={{ fontSize: 12, color: 'var(--text-body)' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{label}：</strong>{text}
                  </Text>
                </Col>
              ))}
            </Row>

            {/* 典故 */}
            {dailyLot.diangu && dailyLot.diangu.length > 10 && (
              <div style={{
                padding: '12px 16px', background: 'rgba(0,0,0,0.02)',
                borderRadius: 10,
              }}>
                <Text style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, fontWeight: 500 }}>
                  📚 签文典故
                </Text>
                <Paragraph style={{
                  fontSize: 13, lineHeight: 1.9, fontStyle: 'italic',
                  color: 'var(--text-body)', marginBottom: 0,
                }}>
                  {dailyLot.diangu}
                </Paragraph>
              </div>
            )}
          </Card>
        </motion.div>
      )}

      {/* 幸运指南 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card
          title={<span style={{ color: 'var(--text-primary)' }}>✨ 今日幸运指南</span>}
          size="small"
          style={{ marginBottom: 16, borderColor: 'var(--border-light)' }}
        >
          <Row gutter={[12, 12]}>
            <Col xs={12} sm={8}>
              <Card size="small" styles={{ body: { padding: '10px 14px', background: 'rgba(0,0,0,0.02)' } }}>
                <Text style={{ fontSize: 11, color: 'var(--text-disabled)' }}>幸运色</Text>
                <br />
                <Text strong style={{ color: 'var(--text-primary)', fontSize: 14 }}>
                  {luckyGuide.luckyColors.join(' / ')}
                </Text>
              </Card>
            </Col>
            <Col xs={12} sm={8}>
              <Card size="small" styles={{ body: { padding: '10px 14px', background: 'rgba(0,0,0,0.02)' } }}>
                <Text style={{ fontSize: 11, color: 'var(--text-disabled)' }}>幸运数</Text>
                <br />
                <Text strong style={{ color: 'var(--text-primary)', fontSize: 14 }}>
                  {luckyGuide.luckyNumbers.join(', ')}
                </Text>
              </Card>
            </Col>
            <Col xs={12} sm={8}>
              <Card size="small" styles={{ body: { padding: '10px 14px', background: 'rgba(0,0,0,0.02)' } }}>
                <Text style={{ fontSize: 11, color: 'var(--text-disabled)' }}>吉利方</Text>
                <br />
                <Text strong style={{ color: 'var(--text-primary)', fontSize: 14 }}>
                  {luckyGuide.luckyDirection}
                </Text>
              </Card>
            </Col>
            <Col xs={12} sm={8}>
              <Card size="small" styles={{ body: { padding: '10px 14px', background: 'rgba(0,0,0,0.02)' } }}>
                <Text style={{ fontSize: 11, color: 'var(--text-disabled)' }}>吉时</Text>
                <br />
                <Text strong style={{ color: 'var(--text-primary)', fontSize: 13 }}>
                  {(() => {
                    const jiTimes = lunar.getTimes().filter(t => t.getTianShenType() === '吉').map(t => t.getZhi());
                    return jiTimes.length > 0 ? jiTimes.join('、') + '时' : '详见时辰表';
                  })()}
                </Text>
              </Card>
            </Col>
            <Col xs={12} sm={8}>
              <Card size="small" styles={{ body: { padding: '10px 14px', background: 'rgba(0,0,0,0.02)' } }}>
                <Text style={{ fontSize: 11, color: 'var(--text-disabled)' }}>贵人属相</Text>
                <br />
                <Text strong style={{ color: 'var(--text-primary)', fontSize: 14 }}>
                  {luckyGuide.guiRenZodiacs.join('、')}
                </Text>
              </Card>
            </Col>
            <Col xs={12} sm={8}>
              <Card size="small" styles={{ body: { padding: '10px 14px', background: 'rgba(0,0,0,0.02)' } }}>
                <Text style={{ fontSize: 11, color: 'var(--text-disabled)' }}>开运物</Text>
                <br />
                <Text strong style={{ color: 'var(--text-primary)', fontSize: 13 }}>
                  {luckyGuide.luckyItem}
                </Text>
              </Card>
            </Col>
          </Row>
        </Card>
      </motion.div>

      {/* 出行提示 */}
      {travelAdvice && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card
            size="small"
            style={{
              marginBottom: 16, borderColor: 'var(--border-light)',
              borderLeft: `3px solid ${
                travelAdvice.level === 'good' ? 'var(--wx-wood)' :
                travelAdvice.level === 'caution' ? 'var(--wx-fire)' :
                'var(--wx-water)'
              }`,
            }}
          >
            <Space>
              <span style={{ fontSize: 18 }}>
                {travelAdvice.level === 'good' ? '🌤️' : travelAdvice.level === 'caution' ? '⚠️' : '🌥️'}
              </span>
              <Text style={{ color: 'var(--text-body)', fontSize: 14 }}>{travelAdvice.text}</Text>
            </Space>
          </Card>
        </motion.div>
      )}

      {/* 纳音信息 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card size="small" style={{ borderColor: 'var(--border-light)', marginBottom: 16 }}>
          <Row gutter={8}>
            <Col xs={8}>
              <Text style={{ fontSize: 12, color: 'var(--text-disabled)' }}>日纳音：{lunar.getDayNaYin()}</Text>
            </Col>
            <Col xs={8}>
              <Text style={{ fontSize: 12, color: 'var(--text-disabled)' }}>天神：{lunar.getDayTianShen() || '—'}</Text>
            </Col>
            <Col xs={8}>
              <Text style={{ fontSize: 12, color: 'var(--text-disabled)' }}>
                冲：{lunar.getDayChong() || '—'}｜煞：{lunar.getDaySha() || '—'}
              </Text>
            </Col>
          </Row>
        </Card>
      </motion.div>

      {/* 时辰宜忌：全天12时辰 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
        <Card
          title={<span style={{ color: 'var(--text-primary)' }}>⏰ 时辰宜忌（全12时辰）</span>}
          style={{ marginBottom: 16, borderColor: 'var(--border-light)' }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-light)' }}>
                  <th style={{ padding: '6px 4px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: 12, textAlign: 'left', minWidth: 72 }}>时辰</th>
                  <th style={{ padding: '6px 4px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: 12, textAlign: 'left', minWidth: 48 }}>干支</th>
                  <th style={{ padding: '6px 4px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: 12, textAlign: 'left', minWidth: 48 }}>吉凶</th>
                  <th style={{ padding: '6px 4px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: 12, textAlign: 'left', minWidth: 64 }}>天神</th>
                  <th style={{ padding: '6px 4px', color: 'var(--wx-wood)', fontWeight: 500, fontSize: 12, textAlign: 'left' }}>宜</th>
                  <th style={{ padding: '6px 4px', color: 'var(--wx-fire)', fontWeight: 500, fontSize: 12, textAlign: 'left' }}>忌</th>
                </tr>
              </thead>
              <tbody>
                {lunar.getTimes().map((t, i) => {
                  const zhi = t.getZhi();
                  const label = SHICHEN_NAMES[zhi] || `${zhi}时`;
                  const isJi = t.getTianShenType() === '吉';
                  const yi = t.getYi();
                  const ji = t.getJi();

                  return (
                    <tr key={i} style={{
                      borderBottom: '1px solid var(--border-light)',
                      background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)',
                    }}>
                      <td style={{ padding: '6px 4px', color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {label}
                      </td>
                      <td style={{ padding: '6px 4px', color: 'var(--text-body)', fontSize: 11 }}>
                        {t.getGanZhi()}
                      </td>
                      <td style={{ padding: '6px 4px' }}>
                        <span style={{
                          display: 'inline-block', width: 28, height: 18, lineHeight: '18px',
                          textAlign: 'center', borderRadius: 4, fontSize: 10, fontWeight: 600,
                          background: isJi ? 'rgba(91,140,90,0.1)' : 'rgba(199,91,91,0.08)',
                          color: isJi ? 'var(--wx-wood)' : 'var(--wx-fire)',
                        }}>
                          {isJi ? '吉' : '凶'}
                        </span>
                      </td>
                      <td style={{ padding: '6px 4px', color: 'var(--text-body)', fontSize: 11, whiteSpace: 'nowrap' }}>
                        {t.getTianShen() || '—'}
                      </td>
                      <td style={{ padding: '6px 4px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                          {yi.length > 0
                            ? yi.slice(0, 5).map((item) => (
                              <Tag key={item} style={{
                                margin: 0, fontSize: 10, lineHeight: '16px',
                                background: 'rgba(91,140,90,0.04)', color: 'var(--wx-wood)', border: 'none',
                              }}>{item}</Tag>
                            ))
                            : <Text style={{ fontSize: 10, color: 'var(--text-disabled)' }}>—</Text>
                          }
                        </div>
                      </td>
                      <td style={{ padding: '6px 4px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                          {ji.length > 0
                            ? ji.slice(0, 5).map((item) => (
                              <Tag key={item} style={{
                                margin: 0, fontSize: 10, lineHeight: '16px',
                                background: 'rgba(199,91,91,0.04)', color: 'var(--wx-fire)', border: 'none',
                              }}>{item}</Tag>
                            ))
                            : <Text style={{ fontSize: 10, color: 'var(--text-disabled)' }}>—</Text>
                          }
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      {/* 刷新按钮 */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Button
          icon={<RefreshCw size={16} />}
          onClick={() => window.location.reload()}
          type="text"
          style={{ color: 'var(--text-secondary)' }}
        >
          每天自动刷新
        </Button>
      </div>
    </div>
  );
}
