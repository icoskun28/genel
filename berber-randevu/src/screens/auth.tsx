import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { api } from '../api';
import { useNav } from '../nav';
import { Button, C, Card, Field, Footer, Header, Muted, Screen, notify, s } from '../ui/components';
import { errorMessage, isValidEmail } from '../util';
import { APP_VERSION } from '../config';

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {children}
    </KeyboardAvoidingView>
  );
}

export function LoginScreen() {
  const nav = useNav();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!isValidEmail(email) || !password) return notify('Eksik bilgi', 'E-posta ve şifrenizi girin.');
    setBusy(true);
    try {
      await api.login(email, password);
    } catch (e) {
      notify('Giriş yapılamadı', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Wrap>
      <Screen>
        <View style={{ alignItems: 'center', marginTop: 48, marginBottom: 28 }}>
          <View style={{ width: 84, height: 84, borderRadius: 22, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 40 }}>✂️</Text>
          </View>
          <Text style={{ fontSize: 26, fontWeight: '800', color: C.navy, marginTop: 14 }}>Berber Randevu</Text>
          <Muted>Berber ve kuaför randevularınız tek yerde</Muted>
          <View style={{ marginTop: 8, backgroundColor: C.goldSoft, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 }}>
            <Text style={{ color: '#8A6A2A', fontWeight: '700', fontSize: 12 }}>{APP_VERSION}</Text>
          </View>
        </View>
        <Card>
          <Field label="E-posta" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"
            autoComplete="email" placeholder="ornek@eposta.com" />
          <Field label="Şifre" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••"
            onSubmitEditing={submit} />
          <Button title="Giriş Yap" onPress={submit} loading={busy} />
          <Pressable onPress={() => nav.push({ name: 'forgot' })} style={{ marginTop: 14, alignSelf: 'center' }}>
            <Text style={{ color: C.navy, fontWeight: '600' }}>Şifremi unuttum</Text>
          </Pressable>
        </Card>
        <Card>
          <Text style={s.title}>Müşteri misiniz?</Text>
          <Muted style={{ marginBottom: 10 }}>Ücretsiz hesap açın, berberinizin karekodunu okutun ve randevunuzu alın.</Muted>
          <Button title="Müşteri Hesabı Oluştur" variant="secondary" onPress={() => nav.push({ name: 'register' })} />
          <Muted style={{ marginTop: 10, fontSize: 12 }}>
            Berber / kuaför hesapları abonelik ile açılır. Hesap için bizimle iletişime geçin.
          </Muted>
        </Card>
        {api.mode === 'demo' ? (
          <Card style={{ backgroundColor: C.goldSoft, borderColor: C.gold }}>
            <Text style={[s.title, { fontSize: 15 }]}>Demo modu (test)</Text>
            <Muted style={{ fontSize: 13 }}>Veriler bu cihazda saklanır. Hazır hesaplar:</Muted>
            <Muted style={{ fontSize: 13 }}>Yönetici: admin@demo.com / admin123</Muted>
            <Muted style={{ fontSize: 13 }}>Berber: berber@demo.com / berber123</Muted>
            <Muted style={{ fontSize: 13 }}>Müşteri: musteri@demo.com / musteri123</Muted>
          </Card>
        ) : null}
        <Footer />
      </Screen>
    </Wrap>
  );
}

export function RegisterScreen() {
  const nav = useNav();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (name.trim().length < 2) return notify('Eksik bilgi', 'Adınızı ve soyadınızı girin.');
    if (!isValidEmail(email)) return notify('Eksik bilgi', 'Geçerli bir e-posta adresi girin.');
    if (password.length < 6) return notify('Şifre', 'Şifre en az 6 karakter olmalı.');
    if (password !== password2) return notify('Şifre', 'Şifreler eşleşmiyor.');
    setBusy(true);
    try {
      await api.registerCustomer({ name, email, phone, password });
      nav.reset();
    } catch (e) {
      notify('Kayıt yapılamadı', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Wrap>
      <Header title="Müşteri Hesabı" subtitle="Yeni kayıt" onBack={nav.pop} />
      <Screen>
        <Card>
          <Field label="Ad Soyad" value={name} onChangeText={setName} placeholder="Ad Soyad" />
          <Field label="Telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="05xx xxx xx xx" />
          <Field label="E-posta" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Field label="Şifre" value={password} onChangeText={setPassword} secureTextEntry />
          <Field label="Şifre (tekrar)" value={password2} onChangeText={setPassword2} secureTextEntry />
          <Button title="Kayıt Ol" onPress={submit} loading={busy} />
        </Card>
        <Footer />
      </Screen>
    </Wrap>
  );
}

export function ForgotScreen() {
  const nav = useNav();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState('');

  const submit = async () => {
    if (!isValidEmail(email)) return notify('Eksik bilgi', 'Geçerli bir e-posta adresi girin.');
    setBusy(true);
    try {
      setInfo(await api.resetPassword(email));
    } catch (e) {
      notify('İşlem yapılamadı', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Wrap>
      <Header title="Şifre Sıfırlama" onBack={nav.pop} />
      <Screen>
        <Card>
          <Muted style={{ marginBottom: 12 }}>Hesabınıza kayıtlı e-posta adresini girin. Şifre sıfırlama bağlantısı gönderilecek.</Muted>
          <Field label="E-posta" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Button title="Sıfırlama Bağlantısı Gönder" onPress={submit} loading={busy} />
          {info ? (
            <View style={{ marginTop: 14, backgroundColor: C.okSoft, padding: 12, borderRadius: 10 }}>
              <Text style={{ color: C.ok }}>{info}</Text>
            </View>
          ) : null}
        </Card>
      </Screen>
    </Wrap>
  );
}

export function ChangePasswordScreen() {
  const nav = useNav();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [next2, setNext2] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!current) return notify('Eksik bilgi', 'Mevcut şifrenizi girin.');
    if (next.length < 6) return notify('Şifre', 'Yeni şifre en az 6 karakter olmalı.');
    if (next !== next2) return notify('Şifre', 'Yeni şifreler eşleşmiyor.');
    setBusy(true);
    try {
      await api.changePassword(current, next);
      notify('Başarılı', 'Şifreniz değiştirildi.');
      nav.pop();
    } catch (e) {
      notify('Şifre değiştirilemedi', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Wrap>
      <Header title="Şifre Değiştir" onBack={nav.pop} />
      <Screen>
        <Card>
          <Field label="Mevcut şifre" value={current} onChangeText={setCurrent} secureTextEntry />
          <Field label="Yeni şifre" value={next} onChangeText={setNext} secureTextEntry />
          <Field label="Yeni şifre (tekrar)" value={next2} onChangeText={setNext2} secureTextEntry />
          <Button title="Kaydet" onPress={submit} loading={busy} />
        </Card>
      </Screen>
    </Wrap>
  );
}
