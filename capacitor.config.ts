import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'technology.ambient.circledays',
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
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0d9488',
      showSpinner: false,
      launchFadeOutDuration: 300,
    },
  },
};

export default config;
