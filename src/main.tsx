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
          colorBgContainer: '#FFFFFF',
          colorBgElevated: '#FFFFFF',
          colorBgLayout: '#F7F5F0',
          colorText: '#4A4A4A',
          colorTextHeading: '#1A1A1A',
          colorTextSecondary: '#8C8C8C',
          colorTextDisabled: '#BFBFBF',
          colorBorder: 'rgba(0,0,0,0.06)',
          colorBorderSecondary: 'rgba(0,0,0,0.04)',
          colorBgBase: '#F7F5F0',
          fontFamily: "'PingFang SC', 'Microsoft YaHei', '微软雅黑', sans-serif",
          fontSize: 15,
          borderRadius: 16,
          borderRadiusLG: 16,
          borderRadiusSM: 12,
          borderRadiusXS: 8,
          lineHeight: 1.8,
          paddingLG: 24,
          paddingMD: 16,
          paddingSM: 12,
          paddingXS: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)',
          boxShadowSecondary: '0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.05)',
          controlHeightLG: 48,
          controlHeight: 40,
          fontSizeLG: 15,
          fontSizeSM: 13,
          fontWeightStrong: 500,
        },
        components: {
          Card: {
            paddingLG: 24,
            borderRadiusLG: 16,
          },
          Button: {
            primaryShadow: 'none',
            borderRadius: 16,
            borderRadiusLG: 16,
            borderRadiusSM: 12,
            fontWeight: 500,
            controlHeightLG: 48,
            controlHeight: 40,
          },
          Input: {
            borderRadius: 12,
            borderRadiusLG: 12,
            borderRadiusSM: 8,
            controlHeight: 40,
            controlHeightLG: 48,
          },
          Select: {
            borderRadius: 12,
            controlHeight: 40,
          },
          Tag: {
            borderRadiusSM: 8,
            fontSizeSM: 12,
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
