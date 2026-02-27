import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.eefe7db1979e4f2db5c08f05c428a786',
  appName: 'TenantVault',
  webDir: 'dist',
  server: {
    url: 'https://eefe7db1-979e-4f2d-b5c0-8f05c428a786.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#faf8f5',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1a7a6d',
    },
  },
};

export default config;
