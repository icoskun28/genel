# Berber Randevu Takip — Beta 0.1

Berber ve kuaförlerden randevu almak için mobil uygulama (Android / iOS).
© 2026 **Coşkun Fotos Ltd. Şti.** — Tüm hakları saklıdır (bkz. `LICENSE`).

## Özellikler (Beta 0.1)

**Yönetici paneli**
- Berber / kuaför hesabı açma (e-posta + geçici şifre)
- Abonelik yönetimi: Deneme (14 gün), Aylık, Yıllık; bitiş tarihi, hesabı aktif/pasif yapma
- Abonelik süresi dolan işletme uygulamayı kullanamaz, müşteriler o işletmeden randevu alamaz
- İşletmeye şifre sıfırlama e-postası gönderme

**Berber / kuaför arayüzü**
- Günlük takvim: dolu saatler müşteri adı ve notuyla, boş saatler görünür
- Yaklaşan randevular, randevu iptali, "tamamlandı" işaretleme
- Müşteri listesi; müşterinin karekodunu okutarak müşteri ekleme
- İşletmenin kendi karekodu (dükkana asılabilir): müşteri okutunca otomatik eklenir
- Çalışma saatleri, randevu süresi (dk) ve çalışma günleri ayarı
- Randevu üzerinden müşteriyle mesajlaşma (soru/cevap)

**Müşteri arayüzü**
- Ücretsiz kayıt, berber/kuaför karekodu okutarak ekleme
- Randevu takvimi: dolu ve geçmiş saatler pasif, boş saatler seçilebilir
- Randevu alırken not / soru yazma, randevu sonrası mesajlaşma
- Randevularım (yaklaşan / geçmiş), iptal

**Hesap işlemleri (tüm roller):** şifre ile giriş, şifre değiştirme, şifre sıfırlama.

Reklam altyapısı bu beta sürümde **yoktur** (ileriki sürümlerde eklenecek).

## Çalışma modları

| Mod | Ne zaman | Veri |
|---|---|---|
| **Demo** | Firebase bilgisi girilmemişse (varsayılan) | Cihazda saklanır; tek cihazda deneme içindir |
| **Firebase** | `EXPO_PUBLIC_FIREBASE_*` değişkenleri tanımlıysa | Firebase Auth + Cloud Firestore; gerçek çok kullanıcılı kullanım |

Demo hesapları: `admin@demo.com / admin123`, `berber@demo.com / berber123`, `musteri@demo.com / musteri123`

## Firebase'e geçiş (gerçek kullanım)

1. https://console.firebase.google.com adresinde proje oluşturun.
2. **Authentication → Sign-in method → E-posta/Şifre** yöntemini açın.
3. **Firestore Database** oluşturun, **Kurallar** sekmesine `firestore.rules` dosyasının içeriğini yapıştırıp yayınlayın.
4. Proje ayarları → **Web uygulaması ekle** → çıkan yapılandırma değerlerini GitHub deposunda
   **Settings → Secrets and variables → Actions** altına ekleyin:
   `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`,
   `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`
5. İlk yönetici: Authentication'da bir kullanıcı oluşturun; Firestore'da `users/<kullanıcı UID>` belgesi açın:
   `{ "email": "...", "name": "Yönetici", "role": "admin", "createdAt": "2026-11-04" }`
6. Actions sekmesinden **Berber Randevu APK** iş akışını yeniden çalıştırın.

## Geliştirme

```bash
cd berber-randevu
npm install
npx expo start          # Expo Go / emülatör
npx tsc --noEmit        # tip kontrolü
```

## Android derleme (APK)

`.github/workflows/berber-randevu.yml` iş akışı, `berber-randevu/` klasöründe her değişiklikte
APK üretir ve **Releases** altında `berber-randevu-beta-0.1` sürümü olarak yayınlar.

Kalıcı imza anahtarı için (Play Store'a çıkmadan önce gerekli) şu secret'ları ekleyin:
`BERBER_KEYSTORE_B64` (base64 .jks), `BERBER_KEYSTORE_PASS`, `BERBER_KEY_ALIAS`.
Tanımlı değilse APK, test amaçlı hata ayıklama anahtarıyla imzalanır.

## Proje yapısı

```
App.tsx                  Uygulama girişi, rol bazlı yönlendirme
src/config.ts            Sürüm, telif, Firebase yapılandırması
src/types.ts             Veri modelleri ve API arayüzü
src/api/demo.ts          Demo (yerel) veri katmanı
src/api/firebase.ts      Firebase veri katmanı
src/screens/auth.tsx     Giriş, kayıt, şifre sıfırlama/değiştirme
src/screens/admin/       Yönetici paneli
src/screens/barber/      Berber / kuaför arayüzü
src/screens/customer/    Müşteri arayüzü ve randevu alma
src/screens/shared.tsx   Karekod, randevu detayı + mesajlar, profil
firestore.rules          Firestore güvenlik kuralları
```
