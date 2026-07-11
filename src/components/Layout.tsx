import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Layout, Button, Typography, Space, Form, Tag, message, Dropdown,
} from 'antd';
import { useUser, getCityLng } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import type { StoredUser } from '../context/UserContext';
import ErrorBoundary from '../components/ErrorBoundary';
import ProfileDrawer from './ProfileDrawer';
import UserModal from './UserModal';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserCircle, History, ChevronLeft, Home,
  Compass, Star, Moon, Sparkles, Waves, Flower2,
  ScrollText, Binary, House, BookOpen, Sun,
} from 'lucide-react';
import ScrollTop from './ScrollTop';

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

const MODULE_NAMES: Record<string, { title: string; icon: React.ReactNode }> = {
  '/': { title: '爻一爻', icon: null },
  '/daily': { title: '每日一爻', icon: <Sun size={18} strokeWidth={1.5} /> },
  '/bazi': { title: '八字排盘', icon: <Binary size={18} strokeWidth={1.5} /> },
  '/ziwei': { title: '紫微斗数', icon: <Star size={18} strokeWidth={1.5} /> },
  '/nayin': { title: '纳音查询', icon: <Waves size={18} strokeWidth={1.5} /> },
  '/liuyao': { title: '六爻占卜', icon: <Sparkles size={18} strokeWidth={1.5} /> },
  '/meihua': { title: '梅花易数', icon: <Flower2 size={18} strokeWidth={1.5} /> },
  '/fengshui': { title: '风水相宅', icon: <Compass size={18} strokeWidth={1.5} /> },
  '/ancient': { title: '古籍经典', icon: <BookOpen size={18} strokeWidth={1.5} /> },
  '/dream': { title: '周公解梦', icon: <Moon size={18} strokeWidth={1.5} /> },
  '/lingqian': { title: '灵签抽签', icon: <ScrollText size={18} strokeWidth={1.5} /> },
  '/history': { title: '查询历史', icon: <History size={18} strokeWidth={1.5} /> },
  '/profile': { title: '个人档案', icon: <UserCircle size={18} strokeWidth={1.5} /> },
};

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const { user: authUser, signOut } = useAuth();
  const {
    profile, setProfile, hasProfile, currentUser,
    users, addUser, updateUser, deleteUser, switchUser,
    age, zodiacAnimal, zodiacSign, syncing, synced,
  } = useUser();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form] = Form.useForm();
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<StoredUser | null>(null);
  const [userForm] = Form.useForm();
  const [scrolled, setScrolled] = useState(false);

  const currentModule = MODULE_NAMES[location.pathname];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
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

    message.success('用户档案已保存');
    setDrawerOpen(false);
  };

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
      message.success('用户已创建');
    }
    setUserModalOpen(false);
    setEditingUser(null);
  };

  const handleDeleteUser = (id: string) => {
    deleteUser(id);
    message.success('用户已删除');
  };

  const formatBirth = (u: StoredUser) => {
    return `${u.birthYear}/${String(u.birthMonth).padStart(2, '0')}/${String(u.birthDay).padStart(2, '0')}`;
  };

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--bg-warm)' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          height: 56,
          background: scrolled
            ? 'rgba(247,245,240,0.92)'
            : 'rgba(247,245,240,0.75)',
          backdropFilter: 'blur(12px) saturate(180%)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          transition: 'background 0.25s var(--ease-out)',
        }}
      >
        {/* 左侧 */}
        <Space style={{ minWidth: 100 }}>
          {isHome ? (
            <Text strong style={{
              fontSize: 20,
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '0.04em',
            }}>
              爻一爻
            </Text>
          ) : (
            <>
              <Button
                type="text"
                icon={<ChevronLeft size={20} strokeWidth={1.5} />}
                onClick={() => navigate(-1)}
                style={{ color: 'var(--text-body)', padding: 0, width: 36, height: 36 }}
              />
              {currentModule && (
                <Space size={6}>
                  <span style={{ color: 'var(--text-secondary)' }}>{currentModule.icon}</span>
                  <Text style={{
                    color: 'var(--text-primary)',
                    fontSize: 16,
                    fontFamily: 'var(--font-title)',
                    fontWeight: 500,
                    letterSpacing: '0.03em',
                  }}>
                    {currentModule.title}
                  </Text>
                </Space>
              )}
            </>
          )}
        </Space>

        {/* 右侧 */}
        <Space style={{ minWidth: 100, justifyContent: 'flex-end' }}>
          {!authUser && (
            <Button
              type="text"
              size="small"
              onClick={() => navigate('/auth')}
              style={{
                color: 'var(--text-primary)', fontWeight: 500,
                border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-btn-sm)',
              }}
            >
              登录
            </Button>
          )}

          {authUser && (
            <Dropdown
              menu={{
                items: [
                  { key: 'profile', label: '个人档案', onClick: () => navigate('/profile') },
                  { type: 'divider' },
                  {
                    key: 'logout', label: '退出登录', danger: true,
                    onClick: async () => {
                      await signOut();
                      message.success('已退出登录');
                      navigate('/');
                    },
                  },
                ],
              }}
              placement="bottomRight"
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: 'var(--text-primary)',
                  color: 'var(--text-inverse)',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  opacity: syncing ? 0.5 : 1,
                  transition: 'opacity 0.3s',
                }}
                title={syncing ? '同步中...' : synced ? '已同步' : currentUser?.name || ''}
              >
                {currentUser?.name?.charAt(0) || authUser.email?.charAt(0)?.toUpperCase()}
              </span>
            </Dropdown>
          )}

          {!authUser && currentUser && (
            <span
              onClick={() => navigate('/profile')}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 34, height: 34, borderRadius: '50%',
                background: 'var(--text-primary)', color: 'var(--text-inverse)',
                fontWeight: 600, fontSize: 14, cursor: 'pointer',
              }}
            >
              {currentUser.name.charAt(0)}
            </span>
          )}

          {!isHome && (
            <Button
              type="text"
              icon={<Home size={20} strokeWidth={1.5} />}
              onClick={() => navigate('/')}
              style={{ color: 'var(--text-secondary)' }}
            />
          )}
        </Space>
      </Header>

      {/* 当前用户信息条 */}
      {currentUser && !isHome && (
        <div style={{
          textAlign: 'center',
          padding: '8px 16px',
          background: 'rgba(0,0,0,0.02)',
          borderBottom: '1px solid rgba(0,0,0,0.04)',
          cursor: 'pointer',
        }} onClick={() => navigate('/profile')}>
          <Space size="small" wrap>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 24, height: 24, borderRadius: '50%', background: 'var(--text-primary)',
              color: 'var(--text-inverse)', fontWeight: 600, fontSize: 12,
            }}>
              {currentUser.name.charAt(0)}
            </span>
            <Text style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 500 }}>
              {currentUser.name}
            </Text>
            <Tag>{currentUser.gender}</Tag>
            <Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
              {formatBirth(currentUser)}
            </Text>
            {age !== null && <Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{age}岁</Text>}
            {zodiacAnimal && <Tag>{zodiacAnimal}</Tag>}
            {authUser && (
              <Tag color={synced ? 'green' : 'processing'} style={{ fontSize: 11 }}>
                {syncing ? '同步中' : synced ? '已同步' : '未同步'}
              </Tag>
            )}
          </Space>
        </div>
      )}

      <Content style={{
        padding: isHome ? 0 : '20px',
        maxWidth: 800,
        margin: '0 auto',
        width: '100%',
        background: 'transparent',
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <ErrorBoundary moduleName={location.pathname}>
              <Outlet />
            </ErrorBoundary>
          </motion.div>
        </AnimatePresence>
      </Content>

      <Footer style={{
        textAlign: 'center',
        background: 'transparent',
        color: 'var(--text-disabled)',
        padding: '16px',
        fontSize: 12,
      }}>
        仅供娱乐 · 不具科学依据
      </Footer>
      <ScrollTop />

      {/* 档案设置 Drawer */}
      <ProfileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        form={form}
        birthplaceLng={profile.birthplaceLng}
        onSave={handleSaveProfile}
      />

      {/* 用户管理 Modal */}
      <UserModal
        open={userModalOpen}
        editingUser={editingUser}
        form={userForm}
        users={users}
        currentUser={currentUser}
        onClose={() => { setUserModalOpen(false); setEditingUser(null); }}
        onSave={handleSaveUser}
        onEdit={openUserModal}
        onDelete={handleDeleteUser}
        onSwitch={switchUser}
        formatBirth={formatBirth}
      />
    </Layout>
  );
}
