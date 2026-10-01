import type { CapacitorConfig } from '@capacitor/cli';

// appId ist die dauerhafte Bundle-ID für App Store und Google Play: nach der ersten Veröffentlichung nie mehr ändern
const config: CapacitorConfig = {
  appId: 'de.kiezkoenig.app',
  appName: 'Kiezkönig',
  webDir: 'dist'
};

export default config;
