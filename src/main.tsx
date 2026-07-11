import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import 'antd/dist/reset.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
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
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>
);
