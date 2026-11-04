/**
 * Uygulama yapılandırması.
 *
 * Firebase bilgileri boş bırakılırsa uygulama DEMO modunda çalışır:
 * tüm veriler cihazda saklanır (test amaçlı). Gerçek kullanım için
 * Firebase konsolundan aldığınız web yapılandırmasını aşağıya ya da
 * EXPO_PUBLIC_FIREBASE_* ortam değişkenlerine yazın (bkz. README.md).
 */
export const APP_VERSION = 'Beta 0.1';
export const COPYRIGHT = '© 2026 Coşkun Fotos Ltd. Şti. Tüm hakları saklıdır.';

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

export const isFirebaseConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

/** QR kod içerik öneki: BRANDEVU:B:<berberId> veya BRANDEVU:C:<müşteriId> */
export const QR_PREFIX = 'BRANDEVU';
