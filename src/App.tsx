import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { UserProvider } from './context/UserContext';
import { ToastProvider } from './components/Toast';
import IosInstallHint from './components/IosInstallHint';
import AppLayout from './components/Layout';
import Home from './pages/Home';
import PageSkeleton from './components/Skeleton';

// ⚠️ 只有 Home 可以静态引入——它是落地页，同步渲染才不会白屏。
//    Auth 以前也是静态引入，于是登录页的 Card/Input/Divider/Alert 与 4 个图标
//    被绑进首屏，而绝大多数用户整场都不会进 /auth。
const Auth = React.lazy(() => import('./pages/Auth'));
const Bazi = React.lazy(() => import('./pages/Bazi'));
const Ziwei = React.lazy(() => import('./pages/Ziwei'));
const Nayin = React.lazy(() => import('./pages/Nayin'));
const Liuyao = React.lazy(() => import('./pages/Liuyao'));
const Meihua = React.lazy(() => import('./pages/Meihua'));
const Daliuren = React.lazy(() => import('./pages/Daliuren'));
const Fengshui = React.lazy(() => import('./pages/Fengshui'));
const Dream = React.lazy(() => import('./pages/Dream'));
const Lingqian = React.lazy(() => import('./pages/Lingqian'));
const AncientBooks = React.lazy(() => import('./pages/AncientBooks'));
const History = React.lazy(() => import('./pages/History'));
const Profile = React.lazy(() => import('./pages/Profile'));
const DailyFortune = React.lazy(() => import('./pages/DailyFortune'));
const HePan = React.lazy(() => import('./pages/HePan'));
const ChartCompare = React.lazy(() => import('./pages/ChartCompare'));

export default function App() {
  return (
    <AuthProvider>
      <UserProvider>
        <ToastProvider>
        <IosInstallHint />
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/daily" element={
              <Suspense fallback={<PageSkeleton />}><DailyFortune /></Suspense>
            } />
            <Route path="/bazi" element={
              <Suspense fallback={<PageSkeleton />}><Bazi /></Suspense>
            } />
            <Route path="/ziwei" element={
              <Suspense fallback={<PageSkeleton />}><Ziwei /></Suspense>
            } />
            <Route path="/hepan" element={
              <Suspense fallback={<PageSkeleton />}><HePan /></Suspense>
            } />
            <Route path="/compare" element={
              <Suspense fallback={<PageSkeleton />}><ChartCompare /></Suspense>
            } />
            <Route path="/nayin" element={
              <Suspense fallback={<PageSkeleton />}><Nayin /></Suspense>
            } />
            <Route path="/liuyao" element={
              <Suspense fallback={<PageSkeleton />}><Liuyao /></Suspense>
            } />
            <Route path="/meihua" element={
              <Suspense fallback={<PageSkeleton />}><Meihua /></Suspense>
            } />
            <Route path="/daliuren" element={
              <Suspense fallback={<PageSkeleton />}><Daliuren /></Suspense>
            } />
            <Route path="/fengshui" element={
              <Suspense fallback={<PageSkeleton />}><Fengshui /></Suspense>
            } />
            <Route path="/dream" element={
              <Suspense fallback={<PageSkeleton />}><Dream /></Suspense>
            } />
            <Route path="/lingqian" element={
              <Suspense fallback={<PageSkeleton />}><Lingqian /></Suspense>
            } />
            <Route path="/ancient" element={
              <Suspense fallback={<PageSkeleton />}><AncientBooks /></Suspense>
            } />
            <Route path="/history" element={
              <Suspense fallback={<PageSkeleton />}><History /></Suspense>
            } />
            <Route path="/profile" element={
              <Suspense fallback={<PageSkeleton />}><Profile /></Suspense>
            } />
            <Route path="/auth" element={
              <Suspense fallback={<PageSkeleton />}><Auth /></Suspense>
            } />
          </Route>
        </Routes>
      </ToastProvider>
    </UserProvider>
    </AuthProvider>
  );
}
