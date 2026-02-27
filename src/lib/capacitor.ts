import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

/**
 * Initialize native push notifications (only on native platforms).
 * Call once after user login.
 */
export async function initPushNotifications() {
  if (!isNative) return null;

  const { PushNotifications } = await import('@capacitor/push-notifications');

  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') return null;

  await PushNotifications.register();

  PushNotifications.addListener('registration', (token) => {
    console.log('[Push] Token:', token.value);
    // TODO: Send token.value to your backend to store for this user
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('[Push] Received:', notification);
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    console.log('[Push] Action:', action);
    // TODO: Navigate based on action.notification.data
  });

  return true;
}

/**
 * Configure native status bar (only on native platforms).
 */
export async function configureStatusBar() {
  if (!isNative) return;

  const { StatusBar, Style } = await import('@capacitor/status-bar');
  await StatusBar.setStyle({ style: Style.Dark });

  if (platform === 'android') {
    await StatusBar.setBackgroundColor({ color: '#1a7a6d' });
  }
}
