import { useState, useEffect, lazy, Suspense } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Layout, Button, Typography, Space, Form, Tag, message,
} from 'antd';
import { ChevronLeft } from 'lucide-react';
import { useUser } from '../context/UserContext';
// ⚠️ getCityLng 走动态 import（首屏组件不静态引 cn-division，省 ~200 KB gzip）
import { useAuth } from '../context/AuthContext';
import { useNarrowViewport } from '../hooks/useNarrowViewport';
import type { StoredUser } from '../context/UserContext';
import ErrorBoundary from '../components/ErrorBoundary';
// ⚠️ 这两个抽屉/弹窗内部 import 了 `cn-division`（全国区划表 ~52 KB gzip）。
//    它们原本是静态引入，于是区划表被绑进首屏——而用户可能整场都不打开档案。
//    改 lazy + 「首次打开才挂载」：首屏不请求，打开过一次后常驻（保留关闭动画）。
// ⚠️ 只写 lazy() 不够：`<X open={false} />` 仍然会被渲染 → chunk 照样在首屏请求。
//    所以下面还有 `profileMounted` / `userModalMounted` 两道闸，首屏一字节都不拉。
const ProfileDrawer = lazy(() => import('./ProfileDrawer'));
const UserModal = lazy(() => import('./UserModal'));
import { motion, AnimatePresence } from 'framer-motion';
import ScrollTop from './ScrollTop';

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';
  // 窄屏判据收口在 utils/viewport（⚠️ 是 `< 768`，必须与 antd md 互补，别改回 `<= 768`）
  const isMobile = useNarrowViewport();
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
  // 首次打开才挂载（挂载后不卸载，保留 antd 的关闭动画）
  const [profileMounted, setProfileMounted] = useState(false);
  const [userModalMounted, setUserModalMounted] = useState(false);

  const handleSaveProfile = async () => {
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
      // 动态 import：cn-division 的全国区划表 ~200 KB gzip，只有真正保存档案时才需要。
      // 静态引入会把它变成首屏依赖（用户可能整场都不填出生地）。
      const { getCityLng } = await import('../utils/solarTime');
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
    setUserModalMounted(true);
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

  const handleSaveUser = async () => {
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
      const { getCityLng } = await import('../utils/solarTime');
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

      {/* 档案设置 Drawer
          ⚠️ 现状：Layout 里没有任何入口把 drawerOpen 置 true（全仓只有 setDrawerOpen(false)），
             用户管理的 openUserModal 也只被本 Modal 自己的 onEdit 调用 → 两块都「不可达」，
             其功能已由 pages/Profile.tsx 的编辑/创建档案表单覆盖。
             暂时保留代码而不删除，等产品侧决定「补入口」还是「下线」；
             无论哪种，首屏都不该为一个打不开的抽屉付出 52 KB 区划表。 */}
      {profileMounted && (
        <Suspense fallback={null}>
          <ProfileDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            form={form}
            birthplaceLng={profile.birthplaceLng}
            onSave={handleSaveProfile}
          />
        </Suspense>
      )}

      {/* 用户管理 Modal —— 同上，仅 openUserModal 能打开，而它只被本 Modal 的 onEdit 调用 */}
      {userModalMounted && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}
    </Layout>
  );
}
