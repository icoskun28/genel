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

// Firebase web yapılandırması (gizli değildir; veriler firestore.rules ile korunur).
// EXPO_PUBLIC_FIREBASE_* ortam değişkenleri tanımlıysa onlar kullanılır.
// EXPO_PUBLIC_DEMO_MODE=1 verilirse Firebase yerine demo modu çalışır.
const env = (v: string | undefined, fallback: string) => (v && v.trim() ? v : fallback);

export const firebaseConfig = {
  apiKey: env(process.env.EXPO_PUBLIC_FIREBASE_API_KEY, 'AIzaSyD0l8WFfGMEuDAWosqvWe6brTIAmbmrFpE'),
  authDomain: env(process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN, 'berber-randevu-e4896.firebaseapp.com'),
  projectId: env(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID, 'berber-randevu-e4896'),
  storageBucket: env(process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET, 'berber-randevu-e4896.firebasestorage.app'),
  messagingSenderId: env(process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, '69279526394'),
  appId: env(process.env.EXPO_PUBLIC_FIREBASE_APP_ID, '1:69279526394:web:26c91a1c6872a96146c843'),
};

export const isFirebaseConfigured =
  process.env.EXPO_PUBLIC_DEMO_MODE !== '1' && !!(firebaseConfig.apiKey && firebaseConfig.projectId);

/** QR kod içerik öneki: BRANDEVU:B:<berberId> veya BRANDEVU:C:<müşteriId> */
export const QR_PREFIX = 'BRANDEVU';
