import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { UserProvider } from './context/UserContext';
import { ToastProvider } from './components/Toast';
import AppLayout from './components/Layout';
import Home from './pages/Home';
import PageSkeleton from './components/Skeleton';

const Bazi = React.lazy(() => import('./pages/Bazi'));
const Ziwei = React.lazy(() => import('./pages/Ziwei'));
const Nayin = React.lazy(() => import('./pages/Nayin'));
const Liuyao = React.lazy(() => import('./pages/Liuyao'));
const Meihua = React.lazy(() => import('./pages/Meihua'));
const Fengshui = React.lazy(() => import('./pages/Fengshui'));
const Dream = React.lazy(() => import('./pages/Dream'));
const Lingqian = React.lazy(() => import('./pages/Lingqian'));
const AncientBooks = React.lazy(() => import('./pages/AncientBooks'));
const History = React.lazy(() => import('./pages/History'));
const Profile = React.lazy(() => import('./pages/Profile'));
const DailyFortune = React.lazy(() => import('./pages/DailyFortune'));

export default function App() {
  return (
    <UserProvider>
      <ToastProvider>
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
            <Route path="/nayin" element={
              <Suspense fallback={<PageSkeleton />}><Nayin /></Suspense>
            } />
            <Route path="/liuyao" element={
              <Suspense fallback={<PageSkeleton />}><Liuyao /></Suspense>
            } />
            <Route path="/meihua" element={
              <Suspense fallback={<PageSkeleton />}><Meihua /></Suspense>
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
          </Route>
        </Routes>
      </ToastProvider>
    </UserProvider>
  );
}
