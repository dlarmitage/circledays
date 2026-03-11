import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.circledays.app',
  appName: 'CircleDays',
  webDir: 'public',

  server: {
    url: 'https://circledays.ambient.technology',
    allowNavigation: [
      'circledays.ambient.technology',
      '*.ambient.technology',
      'checkout.stripe.com',
      'maps.googleapis.com',
    ],
  },

  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
  },

  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false,
      launchFadeOutDuration: 300,
    },
  },
};

export default config;
