import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yaoyiyao.app',
  appName: '爻一爻',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
    backgroundColor: '#F7F5F0',
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#F7F5F0',
  },
};

export default config;
