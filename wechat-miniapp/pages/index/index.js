const app = getApp();

Page({
  data: {
    webUrl: 'https://yueyangDong.github.io/yaoyiyao/'
  },

  onLoad() {
    console.log('WebView 页面加载');
  },

  onMessage(e) {
    const data = e.detail.data;
    if (data && data.type === 'share') {
      console.log('H5 请求分享', data);
    }
  },

  onError(e) {
    console.error('WebView 加载失败', e);
  }
});
