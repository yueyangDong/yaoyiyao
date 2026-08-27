import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Layout, Button, Typography, Space, Form, Tag, message,
} from 'antd';
import { ChevronLeft } from 'lucide-react';
import { useUser, getCityLng } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import type { StoredUser } from '../context/UserContext';
import ErrorBoundary from '../components/ErrorBoundary';
import ProfileDrawer from './ProfileDrawer';
import UserModal from './UserModal';
import { motion, AnimatePresence } from 'framer-motion';
import ScrollTop from './ScrollTop';

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const { user: authUser } = useAuth();
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
      {/* 顶部导航：返回按钮（非首页）+ 品牌标题 */}
      <Header style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '0 16px', height: 52,
        background: 'rgba(247,245,240,0.92)',
        backdropFilter: 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        {!isHome && (
          <Button
            type="text"
            icon={<ChevronLeft size={20} strokeWidth={1.5} />}
            onClick={() => navigate(-1)}
            style={{ color: 'var(--text-body)', padding: 0, width: 36, height: 36, marginRight: 4 }}
            aria-label="返回"
          />
        )}
        <Text
          strong
          onClick={() => !isHome && navigate('/')}
          style={{
            fontSize: 18,
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '0.04em',
            cursor: isHome ? 'default' : 'pointer',
          }}
        >
          爻一爻
        </Text>
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
        padding: isHome ? 0 : (isMobile ? '16px 8px 24px' : '20px'),
        maxWidth: isMobile ? 480 : 800,
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
        padding: '16px 16px 24px',
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
