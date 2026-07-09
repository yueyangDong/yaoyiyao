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
          colorPrimary: '#c9a96e',
          colorBgContainer: '#0f0f1a',
          colorBgElevated: '#0f0f1a',
          colorText: '#f5e6d3',
          colorTextSecondary: '#8b7355',
          colorBorder: 'rgba(201,169,110,0.15)',
          colorBgBase: '#08080f',
          fontFamily: "'Noto Serif SC', 'STSong', '宋体', serif",
          borderRadius: 8,
        },
      }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>
);
