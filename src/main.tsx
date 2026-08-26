import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { initErrorLogger } from './utils/logger';
import 'antd/dist/reset.css';
import './index.css';

// 全局错误监听（window error / unhandledrejection → localStorage 系统日志）
initErrorLogger();

// APK 内 vite base 为 './'（相对路径），Web 构建 base 为 '/yaoyiyao/'，据此派生 router basename
const basename = import.meta.env.BASE_URL === './' ? '/' : import.meta.env.BASE_URL.replace(/\/$/, '');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary moduleName="应用入口">
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1A1A1A',
          borderRadius: 16,
          fontFamily: "'PingFang SC', 'Microsoft YaHei', '微软雅黑', sans-serif",
          fontWeightStrong: 500,
        },
        components: {
          Card: {
            paddingLG: 24,
          },
          Button: {
            primaryShadow: 'none',
            fontWeight: 500,
          },
          Input: {
            borderRadius: 12,
            controlHeight: 40,
          },
          Select: {
            borderRadius: 12,
          },
          Modal: {
            borderRadiusLG: 20,
          },
          Divider: {
            colorSplit: 'rgba(0,0,0,0.06)',
          },
        },
      }}
    >
      <BrowserRouter basename={basename}>
        <App />
      </BrowserRouter>
    </ConfigProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
