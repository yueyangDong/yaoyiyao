import { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Layout, Button, Typography, Space, Drawer, Form,
  Radio, InputNumber, Cascader, Tag, Divider, message,
  Select, List, Popconfirm, Input, Modal,
} from 'antd';
import {
  ArrowLeftOutlined, HomeOutlined, UserOutlined, SettingOutlined,
  PlusOutlined, DeleteOutlined, EditOutlined, SwapOutlined, IdcardOutlined,
  SoundOutlined, SoundFilled,
} from '@ant-design/icons';
import { useUser, getCityLng } from '../context/UserContext';
import type { StoredUser } from '../context/UserContext';
import { pcaCode } from 'cn-division';
import ErrorBoundary from '../components/ErrorBoundary';
import { motion, AnimatePresence } from 'framer-motion';

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

// 模块路由→名称映射 (用于导航栏中显示)
const MODULE_NAMES: Record<string, { title: string; icon: string }> = {
  '/': { title: '首页', icon: '☯' },
  '/bazi': { title: '八字排盘', icon: '🔮' },
  '/ziwei': { title: '紫微斗数', icon: '⭐' },
  '/nayin': { title: '纳音查询', icon: '🌊' },
  '/liuyao': { title: '六爻占卜', icon: '⚡' },
  '/meihua': { title: '梅花易数', icon: '🌸' },
  '/fengshui': { title: '风水相宅', icon: '🏠' },
  '/mianxiang': { title: '看面相', icon: '😊' },
  '/dream': { title: '周公解梦', icon: '🌙' },
  '/lingqian': { title: '灵签抽签', icon: '🏮' },
  '/history': { title: '查询历史', icon: '📋' },
  '/profile': { title: '个人档案', icon: '🪪' },
};

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const {
    profile, setProfile, hasProfile, currentUser,
    users, addUser, updateUser, deleteUser, switchUser,
    age, zodiacAnimal, zodiacSign,
  } = useUser();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form] = Form.useForm();
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<StoredUser | null>(null);
  const [userForm] = Form.useForm();
  const [soundOn, setSoundOn] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const currentModule = MODULE_NAMES[location.pathname];

  // 滚动监听：下滚→背景加深
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 鼠标光晕跟随
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const el = document.getElementById('app-mouse-glow');
      if (el) {
        el.style.left = `${e.clientX}px`;
        el.style.top = `${e.clientY}px`;
      }
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSaveProfile = () => {
    const values = form.getFieldsValue();
    const { gender, birthYear, birthMonth, birthDay, birthHour, birthMinute, birthplace } = values;

    if (!gender || !birthYear) {
      message.warning('请至少填写性别和出生年份');
      return;
    }

    let lng = 120;
    let birthplaceStr: string | null = null;
    if (birthplace && birthplace.length >= 2) {
      const province = birthplace[0];
      const city = birthplace[1];
      const district = birthplace[2] || '';
      birthplaceStr = `${province},${city},${district}`;
      lng = getCityLng(province, city);
    }

    setProfile({
      gender,
      birthYear,
      birthMonth: birthMonth || null,
      birthDay: birthDay || null,
      birthHour: birthHour ?? null,
      birthMinute: birthMinute ?? null,
      birthplace: birthplaceStr,
      birthplaceLng: lng,
    });

    message.success('用户档案已保存，各模块将自动读取');
    setDrawerOpen(false);
  };

  // 打开添加/编辑用户弹窗
  const openUserModal = (user?: StoredUser) => {
    if (user) {
      setEditingUser(user);
      userForm.setFieldsValue({
        name: user.name,
        gender: user.gender,
        birthYear: user.birthYear,
        birthMonth: user.birthMonth,
        birthDay: user.birthDay,
        birthHour: user.birthHour,
        birthMinute: user.birthMinute,
        birthCalendar: user.birthCalendar,
        birthplace: [user.birthplace.province, user.birthplace.city, user.birthplace.district].filter(Boolean),
      });
    } else {
      setEditingUser(null);
      userForm.resetFields();
    }
    setUserModalOpen(true);
  };

  // 保存用户
  const handleSaveUser = () => {
    const values = userForm.getFieldsValue();
    const { name, gender, birthYear, birthMonth, birthDay, birthHour, birthMinute, birthCalendar, birthplace } = values;

    if (!name || !gender || !birthYear || !birthMonth || !birthDay || birthHour === undefined) {
      message.warning('请填写完整的用户信息');
      return;
    }

    let lng = 120;
    let province = '', city = '', district = '';
    if (birthplace && birthplace.length >= 2) {
      province = birthplace[0];
      city = birthplace[1];
      district = birthplace[2] || '';
      lng = getCityLng(province, city);
    }

    if (editingUser) {
      updateUser(editingUser.id, {
        name, gender, birthYear, birthMonth, birthDay,
        birthHour, birthMinute: birthMinute || 0,
        birthCalendar: birthCalendar || 'solar',
        isLeapMonth: false,
        birthplace: { province, city, district, longitude: lng },
      });
      message.success('用户信息已更新');
    } else {
      addUser({
        name, gender, birthYear, birthMonth, birthDay,
        birthHour, birthMinute: birthMinute || 0,
        birthCalendar: birthCalendar || 'solar',
        isLeapMonth: false,
        birthplace: { province, city, district, longitude: lng },
      });
      message.success('用户已创建并切换为当前用户');
    }
    setUserModalOpen(false);
    setEditingUser(null);
  };

  // 删除用户
  const handleDeleteUser = (id: string) => {
    deleteUser(id);
    message.success('用户已删除');
  };

  // 格式化出生日期
  const formatBirth = (u: StoredUser) => {
    return `${u.birthYear}/${String(u.birthMonth).padStart(2, '0')}/${String(u.birthDay).padStart(2, '0')}`;
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#08080f' }}>
      {/* 鼠标光晕 */}
      <div id="app-mouse-glow" />

      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          height: 56,
          background: scrolled
            ? 'rgba(8,8,15,0.95)'
            : 'rgba(8,8,15,0.75)',
          borderBottom: '1px solid rgba(201,169,110,0.15)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          transition: 'background 200ms ease',
        }}
      >
        {/* 左侧：太极 + 回首页 */}
        <Space style={{ minWidth: 120 }}>
          <span
            onClick={() => navigate('/')}
            style={{
              fontSize: 22, cursor: 'pointer', color: '#c9a96e',
              fontFamily: 'serif',
            }}
            title="回首页"
          >
            ☯
          </span>
          {!isHome && (
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(-1)}
              style={{ color: '#c9a96e', fontSize: 13 }}
            >
              返回
            </Button>
          )}
        </Space>

        {/* 中间：当前模块名 */}
        <div style={{ textAlign: 'center' }}>
          <Text strong style={{
            color: '#c9a96e', fontSize: 18, letterSpacing: 4,
            fontFamily: 'var(--font-title)',
          }}>
            {currentModule ? `${currentModule.icon} ${currentModule.title}` : '☯ 玄学命理'}
          </Text>
        </div>

        {/* 右侧：用户 + 音效 + 功能 */}
        <Space style={{ minWidth: 120, justifyContent: 'flex-end' }}>
          {/* 音效开关 */}
          <Button
            type="text"
            icon={soundOn ? <SoundFilled style={{ color: '#c9a96e' }} /> : <SoundOutlined style={{ color: '#555' }} />}
            onClick={() => setSoundOn(!soundOn)}
            title={soundOn ? '关闭音效' : '开启音效'}
          />

          {/* 用户头像 */}
          {currentUser ? (
            <span
              onClick={() => navigate('/profile')}
              style={{
                display: 'inline-block', width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, #c9a96e, #8b6914)',
                color: '#08080f', textAlign: 'center', lineHeight: '32px',
                fontWeight: 'bold', fontSize: 14, cursor: 'pointer',
                border: '2px solid rgba(201,169,110,0.5)',
              }}
              title={`${currentUser.name} - 点击管理档案`}
            >
              {currentUser.name.charAt(0)}
            </span>
          ) : (
            <Button
              type="text"
              icon={<UserOutlined />}
              onClick={() => navigate('/profile')}
              style={{ color: '#c9a96e' }}
              title="创建个人档案"
            />
          )}

          {/* 主页按钮 */}
          {!isHome && (
            <Button type="text" icon={<HomeOutlined />} onClick={() => navigate('/')} style={{ color: '#c9a96e' }} />
          )}
        </Space>
      </Header>

      {/* 当前用户信息条 */}
      {currentUser && (
        <div style={{
          textAlign: 'center', padding: '6px 16px',
          background: 'linear-gradient(90deg, rgba(20,15,8,0.9), rgba(30,20,10,0.9), rgba(20,15,8,0.9))',
          borderBottom: '1px solid rgba(201,169,110,0.15)',
          cursor: 'pointer',
        }}
        onClick={() => navigate('/profile')}
        title="点击管理档案">
          <Space size="middle" wrap>
            <span style={{
              display: 'inline-block', width: 28, height: 28, borderRadius: '50%',
              background: 'linear-gradient(135deg, #c9a96e, #8b6914)',
              color: '#08080f', textAlign: 'center', lineHeight: '28px',
              fontWeight: 'bold', fontSize: 13,
            }}>
              {currentUser.name.charAt(0)}
            </span>
            <Text strong style={{ color: '#c9a96e' }}>{currentUser.name}</Text>
            <Tag color={currentUser.gender === '男' ? 'blue' : 'pink'}>{currentUser.gender}</Tag>
            <Text style={{ color: '#8b7355', fontSize: 12 }}>
              {formatBirth(currentUser)} {currentUser.birthCalendar === 'solar' ? '公历' : '农历'}
            </Text>
            {age !== null && <Tag>{age}岁</Tag>}
            {zodiacAnimal && <Tag color="orange">{zodiacAnimal}</Tag>}
            {zodiacSign && <Tag color="purple">{zodiacSign}</Tag>}
          </Space>
        </div>
      )}

      <Content style={{
        padding: isHome ? 0 : '16px',
        maxWidth: 1200,
        margin: '0 auto',
        width: '100%',
        background: 'transparent',
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <ErrorBoundary moduleName={location.pathname}>
              <Outlet />
            </ErrorBoundary>
          </motion.div>
        </AnimatePresence>
      </Content>

      <Footer style={{
        textAlign: 'center',
        background: '#08080f',
        color: '#555',
        padding: '12px 16px',
        borderTop: '1px solid rgba(201,169,110,0.08)',
      }}>
        <Text style={{ color: '#555', fontSize: 12 }}>
          ⚠ 免责声明：本应用仅供娱乐，不构成任何决策依据，所有结果不具科学依据。
        </Text>
      </Footer>

      {/* 档案设置 Drawer */}
      <Drawer
        title={<><SettingOutlined /> 用户档案设置</>}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={380}
        extra={<Button type="primary" onClick={handleSaveProfile}>保存档案</Button>}
      >
        <Form form={form} layout="vertical" size="middle">
          <Form.Item name="gender" label="性别" rules={[{ required: true, message: '请选择性别' }]}>
            <Radio.Group>
              <Radio.Button value="male">男</Radio.Button>
              <Radio.Button value="female">女</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Divider>出生时间</Divider>
          <Space wrap>
            <Form.Item name="birthYear" label="年" rules={[{ required: true }]}>
              <InputNumber min={1900} max={2100} placeholder="1990" style={{ width: 80 }} />
            </Form.Item>
            <Form.Item name="birthMonth" label="月">
              <InputNumber min={1} max={12} placeholder="1" style={{ width: 65 }} />
            </Form.Item>
            <Form.Item name="birthDay" label="日">
              <InputNumber min={1} max={31} placeholder="1" style={{ width: 65 }} />
            </Form.Item>
          </Space>
          <Space wrap>
            <Form.Item name="birthHour" label="时">
              <InputNumber min={0} max={23} placeholder="0" style={{ width: 65 }} />
            </Form.Item>
            <Form.Item name="birthMinute" label="分">
              <InputNumber min={0} max={59} placeholder="0" style={{ width: 65 }} />
            </Form.Item>
          </Space>

          <Divider>出生地（可选，用于真太阳时校正）</Divider>
          <Form.Item name="birthplace" label="省/市/区">
            <Cascader
              options={pcaCode}
              fieldNames={{ label: 'n', value: 'c', children: 'ch' }}
              placeholder="请选择省市区"
              changeOnSelect
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Text type="secondary" style={{ fontSize: 12 }}>
            默认经度：120°E（北京时间）。真太阳时 = 北京时间 + (当地经度 - 120) × 4分钟。
            {profile.birthplaceLng && profile.birthplaceLng !== 120 && (
              <Tag color="blue" style={{ marginLeft: 8 }}>当前经度：{profile.birthplaceLng}°E</Tag>
            )}
          </Text>
        </Form>
      </Drawer>

      {/* 用户管理 Modal */}
      <Modal
        title={editingUser ? '编辑用户' : '添加用户'}
        open={userModalOpen}
        onCancel={() => { setUserModalOpen(false); setEditingUser(null); }}
        onOk={handleSaveUser}
        width={600}
        okText="保存"
        cancelText="取消"
      >
        <Form form={userForm} layout="vertical" size="middle">
          <Form.Item name="name" label="姓名/昵称" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="如：张三" />
          </Form.Item>

          <Form.Item name="gender" label="性别" rules={[{ required: true, message: '请选择性别' }]}>
            <Radio.Group>
              <Radio.Button value="男">男</Radio.Button>
              <Radio.Button value="女">女</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item name="birthCalendar" label="历法">
            <Radio.Group>
              <Radio.Button value="solar">公历</Radio.Button>
              <Radio.Button value="lunar">农历</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Divider>出生时间</Divider>
          <Space wrap>
            <Form.Item name="birthYear" label="年" rules={[{ required: true }]}>
              <InputNumber min={1900} max={2100} placeholder="1990" style={{ width: 80 }} />
            </Form.Item>
            <Form.Item name="birthMonth" label="月" rules={[{ required: true }]}>
              <InputNumber min={1} max={12} placeholder="1" style={{ width: 65 }} />
            </Form.Item>
            <Form.Item name="birthDay" label="日" rules={[{ required: true }]}>
              <InputNumber min={1} max={31} placeholder="1" style={{ width: 65 }} />
            </Form.Item>
          </Space>
          <Space wrap>
            <Form.Item name="birthHour" label="时" rules={[{ required: true }]}>
              <InputNumber min={0} max={23} placeholder="0" style={{ width: 65 }} />
            </Form.Item>
            <Form.Item name="birthMinute" label="分">
              <InputNumber min={0} max={59} placeholder="0" style={{ width: 65 }} />
            </Form.Item>
          </Space>

          <Form.Item name="birthplace" label="出生地">
            <Cascader
              options={pcaCode}
              fieldNames={{ label: 'n', value: 'c', children: 'ch' }}
              placeholder="请选择省市区"
              changeOnSelect
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>

        {/* 已有用户列表 */}
        {users.length > 0 && (
          <>
            <Divider>已有用户</Divider>
            <List
              size="small"
              dataSource={users}
              renderItem={(u) => (
                <List.Item
                  actions={[
                    <Button
                      key="switch"
                      type="link"
                      size="small"
                      icon={<SwapOutlined />}
                      onClick={() => {
                        switchUser(u.id);
                        message.success(`已切换到「${u.name}」`);
                        setUserModalOpen(false);
                        setEditingUser(null);
                      }}
                      disabled={u.id === currentUser?.id}
                    >
                      {u.id === currentUser?.id ? '当前' : '切换'}
                    </Button>,
                    <Button key="edit" type="link" size="small" icon={<EditOutlined />}
                      onClick={() => openUserModal(u)} />,
                    <Popconfirm
                      key="del"
                      title="确定删除此用户？"
                      onConfirm={() => handleDeleteUser(u.id)}
                      okText="删除"
                      cancelText="取消"
                    >
                      <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <span style={{
                        display: 'inline-block', width: 32, height: 32, borderRadius: '50%',
                        background: '#e0c27b', color: '#1a1a2e', textAlign: 'center', lineHeight: '32px',
                        fontWeight: 'bold',
                      }}>
                        {u.name.charAt(0)}
                      </span>
                    }
                    title={<Space>
                      <Text strong>{u.name}</Text>
                      <Tag>{u.gender}</Tag>
                    </Space>}
                    description={`${formatBirth(u)} ${u.birthCalendar === 'solar' ? '公历' : '农历'}`}
                  />
                </List.Item>
              )}
            />
          </>
        )}
      </Modal>
    </Layout>
  );
}
