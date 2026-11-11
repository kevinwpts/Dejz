import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Inställningar för App Store-appen (iOS). Se APP_STORE.md för hela guiden.
 * appId måste vara samma som Bundle ID i Apple Developer / App Store Connect.
 */
const config: CapacitorConfig = {
  appId: 'se.dejz.app',
  appName: 'Dejz',
  webDir: 'dist',
  ios: {
    contentInset: 'never', // appen sköter själv avstånd till notch och hemknapp (safe-area)
    backgroundColor: '#F5F4FA',
    scheme: 'Dejz',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: '#F5F4FA',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DEFAULT',
      overlaysWebView: true,
    },
  },
};

export default config;
