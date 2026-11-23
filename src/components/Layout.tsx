import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Layout, Button, Typography, Space, Tag,
} from 'antd';
import { ChevronLeft } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { useNarrowViewport } from '../hooks/useNarrowViewport';
import type { StoredUser } from '../context/UserContext';
import ErrorBoundary from '../components/ErrorBoundary';
// ⚠️ 这里原来挂着一个「档案设置 Drawer」和一个「用户管理 Modal」。两者都由
//    Layout 的局部 state 控制，但全仓没有任何入口把它们打开（只有 set...false），
//    功能实际由 pages/Profile.tsx 的编辑/创建档案表单承担 → 已连同组件文件一起删除。
//    收益不只是少两个文件：它们内部 import 了 cn-division（区划表 54 KB gzip），
//    而且 Layout 为了给它们供表单调用了 Form.useForm()，把 antd Form 与
//    rc-field-form 也钉在了首屏。现在这两样都随页面走了。
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
  // ⚠️ 这里曾经还解构了 profile/setProfile/hasProfile/users/addUser/updateUser/
  //    deleteUser/switchUser —— 它们只服务于下方那两个已经删掉的抽屉/弹窗。
  const {
    currentUser,
    age, zodiacAnimal, zodiacSign, syncing, synced,
  } = useUser();

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
    </Layout>
  );
}
