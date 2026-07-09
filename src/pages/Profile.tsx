import { useState } from 'react';
import {
  Card, Typography, Button, Form, Input, Radio, InputNumber,
  Select, Cascader, Divider, Space, Tag, message, Popconfirm,
  Empty, Row, Col, Checkbox, Alert,
} from 'antd';
import {
  UserAddOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { useUser, getCityLng } from '../context/UserContext';
import type { StoredUser } from '../context/UserContext';
import { pcaCode } from 'cn-division';
import { LunarYear } from 'lunar-typescript';

const { Title, Text } = Typography;

const SHI_CHEN_OPTIONS = [
  { label: '子时(23-1)', value: 0 },
  { label: '丑时(1-3)', value: 2 },
  { label: '寅时(3-5)', value: 4 },
  { label: '卯时(5-7)', value: 6 },
  { label: '辰时(7-9)', value: 8 },
  { label: '巳时(9-11)', value: 10 },
  { label: '午时(11-13)', value: 12 },
  { label: '未时(13-15)', value: 14 },
  { label: '申时(15-17)', value: 16 },
  { label: '酉时(17-19)', value: 18 },
  { label: '戌时(19-21)', value: 20 },
  { label: '亥时(21-23)', value: 22 },
];

const LUNAR_MONTH_OPTIONS = [
  { label: '正月', value: 1 }, { label: '二月', value: 2 },
  { label: '三月', value: 3 }, { label: '四月', value: 4 },
  { label: '五月', value: 5 }, { label: '六月', value: 6 },
  { label: '七月', value: 7 }, { label: '八月', value: 8 },
  { label: '九月', value: 9 }, { label: '十月', value: 10 },
  { label: '冬月', value: 11 }, { label: '腊月', value: 12 },
];

const LUNAR_DAY_OPTIONS = Array.from({ length: 30 }, (_, i) => ({ label: `${i + 1}`, value: i + 1 }));

export default function Profile() {
  const {
    users, currentUser, addUser, updateUser, deleteUser, switchUser,
    history,
  } = useUser();
  const [editing, setEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [calendar, setCalendar] = useState<'solar' | 'lunar'>('solar');
  const [lunarYear, setLunarYear] = useState<number>(2000);
  const [hasLeap, setHasLeap] = useState(false);

  // 紫微/八字模块查询过的时间
  const moduleLastQuery = (name: string) => {
    const m = history.filter(h => h.module === name && h.userId === currentUser?.id);
    return m.length > 0 ? m[0].timestamp : null;
  };

  const formatTimeAgo = (isoStr: string) => {
    const diff = Date.now() - new Date(isoStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return minutes <= 1 ? '刚刚' : `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}天前`;
    return `${Math.floor(days / 30)}个月前`;
  };

  const formatBirth = (u: StoredUser) =>
    `${u.birthYear}/${String(u.birthMonth).padStart(2, '0')}/${String(u.birthDay).padStart(2, '0')}`;

  // 生成农历年份选项
  const getLunarYearOptions = () => {
    const opts: { label: string; value: number }[] = [];
    for (let y = 1900; y <= 2100; y++) {
      const lunar = LunarYear.fromYear(y);
      opts.push({
        label: `${lunar.getGanZhi()}年（${y}）`,
        value: y,
      });
    }
    return opts;
  };

  const onCalendarChange = (v: 'solar' | 'lunar') => {
    setCalendar(v);
    if (v === 'lunar') {
      const y = form.getFieldValue('birthYear') || 2000;
      setLunarYear(y);
      const leap = LunarYear.fromYear(y).getLeapMonth();
      setHasLeap(leap > 0);
    }
  };

  const onLunarYearChange = (y: number) => {
    setLunarYear(y);
    const leap = LunarYear.fromYear(y).getLeapMonth();
    setHasLeap(leap > 0);
    // 如果切换到没有闰月的年份，取消闰月勾选
    if (leap <= 0) {
      form.setFieldValue('isLeapMonth', false);
    }
  };

  const openNew = () => {
    setEditingId(null);
    setCalendar('solar');
    setLunarYear(2000);
    setHasLeap(false);
    form.resetFields();
    form.setFieldsValue({ birthCalendar: 'solar', birthHour: 12, birthMinute: 0, gender: '男' });
    setEditing(true);
  };

  const openEdit = (u: StoredUser) => {
    setEditingId(u.id);
    const cal = u.birthCalendar || 'solar';
    setCalendar(cal);
    if (cal === 'lunar') {
      setLunarYear(u.birthYear);
      const leap = LunarYear.fromYear(u.birthYear).getLeapMonth();
      setHasLeap(leap > 0);
    }
    form.setFieldsValue({
      name: u.name,
      gender: u.gender,
      birthCalendar: cal,
      birthYear: u.birthYear,
      birthMonth: u.birthMonth,
      birthDay: u.birthDay,
      birthHour: u.birthHour,
      birthMinute: u.birthMinute || 0,
      isLeapMonth: u.isLeapMonth || false,
      birthplace: [u.birthplace.province, u.birthplace.city, u.birthplace.district].filter(Boolean),
    });
    setEditing(true);
  };

  const handleSave = () => {
    const values = form.getFieldsValue();
    const { name, gender, birthYear, birthMonth, birthDay, birthHour, birthMinute, birthCalendar, isLeapMonth, birthplace } = values;

    if (!name || !gender || !birthYear || !birthMonth || !birthDay || birthHour === undefined) {
      message.warning('请填写完整的档案信息');
      return;
    }

    let province = '', city = '', district = '', lng = 120;
    if (birthplace && birthplace.length >= 2) {
      province = birthplace[0];
      city = birthplace[1];
      district = birthplace[2] || '';
      lng = getCityLng(province, city);
    }

    const data = {
      name, gender,
      birthYear, birthMonth, birthDay,
      birthHour, birthMinute: birthMinute || 0,
      birthCalendar: birthCalendar || 'solar',
      isLeapMonth: isLeapMonth || false,
      birthplace: { province, city, district, longitude: lng },
    };

    if (editingId) {
      updateUser(editingId, data);
      message.success('档案已更新');
    } else {
      addUser(data);
      message.success('档案已创建并设为当前');
    }
    setEditing(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    deleteUser(id);
    message.success('档案已删除');
  };

  return (
    <div style={{ padding: '16px 0', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>
          <span role="img" aria-label="profile">👤</span> 个人档案
        </Title>
        <Button type="primary" icon={<UserAddOutlined />} onClick={openNew}>新增档案</Button>
      </div>

      {users.length === 0 && !editing && (
        <Alert
          message="还没有创建个人档案"
          description="创建档案后，八字排盘、紫微斗数等模块将自动读取你的出生信息，无需重复填写。你也可以为家人朋友创建多个档案。"
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
          action={<Button type="primary" onClick={openNew}>立即创建</Button>}
        />
      )}

      {/* 档案卡片列表 */}
      {users.length > 0 && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {users.map(u => (
            <Col xs={24} sm={12} key={u.id}>
              <Card
                size="small"
                style={{
                  borderTop: '4px solid #e0c27b',
                  border: u.id === currentUser?.id ? '2px solid #e0c27b' : undefined,
                  background: u.id === currentUser?.id ? '#fffdf0' : '#fff',
                }}
                title={
                  <Space>
                    <span style={{
                      display: 'inline-block', width: 32, height: 32, borderRadius: '50%',
                      background: '#e0c27b', color: '#1a1a2e', textAlign: 'center', lineHeight: '32px',
                      fontWeight: 'bold',
                    }}>{u.name.charAt(0)}</span>
                    <Text strong>{u.name}</Text>
                    <Tag color={u.gender === '男' ? 'blue' : 'pink'}>{u.gender}</Tag>
                    <Tag>{u.birthCalendar === 'solar' ? '公历' : '农历'}</Tag>
                  </Space>
                }
                extra={
                  u.id === currentUser?.id && (
                    <Tag color="gold" icon={<CheckCircleOutlined />}>当前使用</Tag>
                  )
                }
                actions={[
                  <Button key="switch" type="link" icon={<SwapOutlined />}
                    disabled={u.id === currentUser?.id}
                    onClick={() => { switchUser(u.id); message.success(`已切换到「${u.name}」`); }}>
                    {u.id === currentUser?.id ? '当前' : '切换'}
                  </Button>,
                  <Button key="edit" type="link" icon={<EditOutlined />} onClick={() => openEdit(u)}>编辑</Button>,
                  <Popconfirm key="del" title="确定删除此档案？" onConfirm={() => handleDelete(u.id)} okText="删除" cancelText="取消">
                    <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
                  </Popconfirm>,
                ]}
              >
                <Text type="secondary" style={{ fontSize: 13 }}>
                  出生：{formatBirth(u)} · {u.birthHour}:{String(u.birthMinute || 0).padStart(2, '0')}
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: 13 }}>
                  出生地：{u.birthplace.province}{u.birthplace.city}{u.birthplace.district || ''}
                  {u.birthplace.longitude !== 120 && ` (${u.birthplace.longitude}°E)`}
                </Text>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* 编辑/新增表单 */}
      {editing && (
        <Card title={editingId ? '编辑档案' : '新增档案'} style={{ marginBottom: 24 }}>
          <Form form={form} layout="vertical" size="middle"
            initialValues={{ birthCalendar: 'solar', birthHour: 12, birthMinute: 0, gender: '男' }}>
            <Form.Item name="name" label="档案名称" rules={[{ required: true, message: '请输入档案名称' }]}>
              <Input placeholder="如：我自己、张三" />
            </Form.Item>

            <Form.Item name="gender" label="性别" rules={[{ required: true }]}>
              <Radio.Group>
                <Radio.Button value="男">男</Radio.Button>
                <Radio.Button value="女">女</Radio.Button>
              </Radio.Group>
            </Form.Item>

            <Form.Item name="birthCalendar" label="历法">
              <Radio.Group onChange={(e) => onCalendarChange(e.target.value)}>
                <Radio.Button value="solar">🌞 公历</Radio.Button>
                <Radio.Button value="lunar">🌙 农历</Radio.Button>
              </Radio.Group>
            </Form.Item>

            <Divider>出生时间</Divider>

            {calendar === 'solar' ? (
              <>
                <Space wrap size="middle">
                  <Form.Item name="birthYear" label="年" rules={[{ required: true }]}>
                    <InputNumber min={1900} max={2100} placeholder="1990" style={{ width: 90 }} />
                  </Form.Item>
                  <Form.Item name="birthMonth" label="月" rules={[{ required: true }]}>
                    <Select style={{ width: 75 }} placeholder="月" options={
                      Array.from({ length: 12 }, (_, i) => ({ label: `${i + 1}`, value: i + 1 }))
                    } />
                  </Form.Item>
                  <Form.Item name="birthDay" label="日" rules={[{ required: true }]}>
                    <Select style={{ width: 75 }} placeholder="日" options={
                      Array.from({ length: 31 }, (_, i) => ({ label: `${i + 1}`, value: i + 1 }))
                    } />
                  </Form.Item>
                </Space>
                <Space wrap size="middle">
                  <Form.Item name="birthHour" label="时" rules={[{ required: true }]}>
                    <Select style={{ width: 85 }} placeholder="时" options={
                      Array.from({ length: 24 }, (_, i) => ({ label: `${i}时`, value: i }))
                    } />
                  </Form.Item>
                  <Form.Item name="birthMinute" label="分">
                    <Select style={{ width: 85 }} placeholder="分" options={
                      [0, 15, 30, 45].map(v => ({ label: `${v}分`, value: v }))
                    } />
                  </Form.Item>
                </Space>
              </>
            ) : (
              <>
                <Form.Item name="birthYear" label="出生年份" rules={[{ required: true }]}>
                  <Select
                    showSearch
                    style={{ width: '100%' }}
                    placeholder="选择农历年份"
                    options={getLunarYearOptions()}
                    onChange={(v) => onLunarYearChange(v)}
                  />
                </Form.Item>

                <Space wrap size="middle">
                  <Form.Item name="birthMonth" label="月份" rules={[{ required: true }]}>
                    <Select style={{ width: 100 }} placeholder="月"
                      options={(() => {
                        const opts = [...LUNAR_MONTH_OPTIONS];
                        if (hasLeap) {
                          const leapMonth = LunarYear.fromYear(lunarYear).getLeapMonth();
                          opts.splice(leapMonth, 0, { label: `闰${leapMonth}月`, value: leapMonth + 0.5 });
                        }
                        return opts;
                      })()}
                    />
                  </Form.Item>
                  <Form.Item name="birthDay" label="日期" rules={[{ required: true }]}>
                    <Select style={{ width: 80 }} placeholder="日" options={LUNAR_DAY_OPTIONS} />
                  </Form.Item>
                </Space>

                {hasLeap && (
                  <Form.Item name="isLeapMonth" valuePropName="checked">
                    <Checkbox>闰月</Checkbox>
                  </Form.Item>
                )}

                <Form.Item name="birthHour" label="出生时辰" rules={[{ required: true }]}>
                  <Select style={{ width: '100%' }} placeholder="选择时辰" options={SHI_CHEN_OPTIONS} />
                </Form.Item>
              </>
            )}

            <Divider>出生地（用于真太阳时校正）</Divider>
            <Form.Item name="birthplace" label="省/市/区">
              <Cascader options={pcaCode} fieldNames={{ label: 'n', value: 'c', children: 'ch' }}
                placeholder="请选择省市区" changeOnSelect style={{ width: '100%' }} />
            </Form.Item>
            <Text type="secondary" style={{ fontSize: 12 }}>
              默认经度：120°E（北京时间）。真太阳时 = 北京时间 + (当地经度 - 120) × 4分钟。
            </Text>

            <div style={{ marginTop: 16 }}>
              <Button type="primary" onClick={handleSave} size="large">
                💾 {editingId ? '保存修改' : '创建档案'}
              </Button>
              <Button style={{ marginLeft: 8 }} onClick={() => { setEditing(false); setEditingId(null); }}>
                取消
              </Button>
            </div>
          </Form>
        </Card>
      )}

      {/* 已关联查询 */}
      {currentUser && (
        <Card title="📊 已关联查询" size="small">
          {(() => {
            const modules = [
              { name: 'bazi', label: '八字排盘' },
              { name: 'ziwei', label: '紫微斗数' },
              { name: 'liuyao', label: '六爻占卜' },
              { name: 'meihua', label: '梅花易数' },
              { name: 'fengshui', label: '风水相宅' },
            ];
            const items = modules.filter(m => {
              return history.some(h => h.module === m.name && h.userId === currentUser.id);
            });
            if (items.length === 0) return <Text type="secondary">暂无查询记录</Text>;
            return (
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {items.map(m => {
                  const t = history.find(h => h.module === m.name && h.userId === currentUser.id)!;
                  return (
                    <div key={m.name} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>· {m.label}</Text>
                      <Text type="secondary">上次查询 {formatTimeAgo(t.timestamp)}</Text>
                    </div>
                  );
                })}
              </Space>
            );
          })()}
        </Card>
      )}
    </div>
  );
}
