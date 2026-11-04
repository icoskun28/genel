import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api } from '../../api';
import { useNav } from '../../nav';
import { SubscriptionPlan, UserProfile } from '../../types';
import { Badge, Button, C, Card, Empty, Field, Footer, Header, Loading, Muted, Screen, notify, s } from '../../ui/components';
import { addDays, errorMessage, formatDate, isValidDate, isValidEmail, planLabel, subscriptionActive, todayStr } from '../../util';

export function AdminHome() {
  const nav = useNav();
  const [barbers, setBarbers] = useState<UserProfile[] | null>(null);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    try {
      setBarbers(await api.listBarbers());
    } catch (e) {
      notify('Hata', errorMessage(e));
      setBarbers([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, nav.depth]);

  const list = (barbers ?? []).filter((b) =>
    (b.name + ' ' + (b.shopName ?? '') + ' ' + b.email).toLocaleLowerCase('tr').includes(filter.toLocaleLowerCase('tr')));
  const activeCount = (barbers ?? []).filter(subscriptionActive).length;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="Yönetici Paneli" subtitle="Berber / kuaför abonelikleri"
        right={<Pressable onPress={() => nav.push({ name: 'profile' })} accessibilityLabel="Profil"><Text style={{ fontSize: 22 }}>⚙️</Text></Pressable>} />
      <Screen>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Card style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 26, fontWeight: '800', color: C.navy }}>{barbers?.length ?? '-'}</Text>
            <Muted>Toplam işletme</Muted>
          </Card>
          <Card style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 26, fontWeight: '800', color: C.ok }}>{barbers ? activeCount : '-'}</Text>
            <Muted>Aktif abonelik</Muted>
          </Card>
        </View>
        <Button title="+ Yeni Berber / Kuaför Ekle" onPress={() => nav.push({ name: 'barberEdit', barberId: null })} />
        <View style={{ height: 12 }} />
        <Field label="Ara" value={filter} onChangeText={setFilter} placeholder="İsim, işletme veya e-posta" />
        {barbers === null ? <Loading /> : list.length === 0 ? <Empty text="Kayıtlı berber / kuaför yok." /> : list.map((b) => {
          const ok = subscriptionActive(b);
          return (
            <Pressable key={b.id} onPress={() => nav.push({ name: 'barberEdit', barberId: b.id })} accessibilityLabel={b.shopName ?? b.name}>
              <Card>
                <View style={s.row}>
                  <Text style={[s.title, { flex: 1, marginBottom: 0 }]} numberOfLines={1}>{b.shopName || b.name}</Text>
                  <Badge text={ok ? 'Aktif' : b.active === false ? 'Pasif' : 'Süresi doldu'} tone={ok ? 'ok' : 'danger'} />
                </View>
                <Muted>{b.name} · {b.email}</Muted>
                <Muted>Abonelik: {planLabel(b.subscription?.plan)} · Bitiş: {b.subscription ? formatDate(b.subscription.endsAt) : '-'}</Muted>
              </Card>
            </Pressable>
          );
        })}
        <Footer />
      </Screen>
    </View>
  );
}

const PLANS: { key: SubscriptionPlan; label: string; days: number }[] = [
  { key: 'deneme', label: 'Deneme (14 gün)', days: 14 },
  { key: 'aylik', label: 'Aylık', days: 30 },
  { key: 'yillik', label: 'Yıllık', days: 365 },
];

export function BarberEditScreen({ barberId }: { barberId: string | null }) {
  const nav = useNav();
  const isNew = barberId === null;
  const [loading, setLoading] = useState(!isNew);
  const [barber, setBarber] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [address, setAddress] = useState('');
  const [plan, setPlan] = useState<SubscriptionPlan>('deneme');
  const [endsAt, setEndsAt] = useState(addDays(todayStr(), 14));
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!barberId) return;
    api.getUser(barberId).then((b) => {
      if (b) {
        setBarber(b);
        setName(b.name);
        setPhone(b.phone ?? '');
        setEmail(b.email);
        setShopName(b.shopName ?? '');
        setAddress(b.address ?? '');
        setPlan(b.subscription?.plan ?? 'deneme');
        setEndsAt(b.subscription?.endsAt ?? todayStr());
        setActive(b.active !== false);
      }
      setLoading(false);
    });
  }, [barberId]);

  const choosePlan = (p: (typeof PLANS)[number]) => {
    setPlan(p.key);
    // Mevcut abonelik devam ediyorsa üzerine eklenir
    const base = barber?.subscription && barber.subscription.endsAt > todayStr() ? barber.subscription.endsAt : todayStr();
    setEndsAt(addDays(base, p.days));
  };

  const save = async () => {
    if (name.trim().length < 2 || shopName.trim().length < 2) return notify('Eksik bilgi', 'Ad soyad ve işletme adını girin.');
    if (!isValidDate(endsAt)) return notify('Tarih', 'Bitiş tarihini YYYY-AA-GG biçiminde girin.');
    setBusy(true);
    try {
      if (isNew) {
        if (!isValidEmail(email)) throw new Error('Geçerli bir e-posta adresi girin.');
        if (password.length < 6) throw new Error('Geçici şifre en az 6 karakter olmalı.');
        await api.createBarber({ email, password, name, phone, shopName, address, plan, endsAt });
        notify('Hesap oluşturuldu', `${shopName} için giriş bilgileri:\nE-posta: ${email}\nŞifre: ${password}\n\nİlk girişte şifresini değiştirmesini önerin.`);
      } else {
        await api.updateUser(barberId, { name: name.trim(), phone: phone.trim(), shopName: shopName.trim(), address: address.trim(), subscription: { plan, endsAt }, active });
        notify('Kaydedildi', 'Abonelik bilgileri güncellendi.');
      }
      nav.pop();
    } catch (e) {
      notify('Kaydedilemedi', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const sendReset = async () => {
    try {
      notify('Şifre sıfırlama', await api.resetPassword(email));
    } catch (e) {
      notify('Hata', errorMessage(e));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title={isNew ? 'Yeni Berber / Kuaför' : 'İşletme Düzenle'} subtitle={isNew ? undefined : email} onBack={nav.pop} />
      {loading ? <Loading /> : (
        <Screen>
          <Card>
            <Text style={s.title}>İşletme bilgileri</Text>
            <Field label="İşletme adı" value={shopName} onChangeText={setShopName} placeholder="Örn. Usta Erkek Kuaförü" />
            <Field label="Yetkili ad soyad" value={name} onChangeText={setName} />
            <Field label="Telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <Field label="Adres" value={address} onChangeText={setAddress} />
            {isNew ? (
              <>
                <Field label="Giriş e-postası" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
                <Field label="Geçici şifre" value={password} onChangeText={setPassword} placeholder="En az 6 karakter" />
              </>
            ) : null}
          </Card>
          <Card>
            <Text style={s.title}>Abonelik</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
              {PLANS.map((p) => (
                <Pressable key={p.key} onPress={() => choosePlan(p)} accessibilityLabel={p.label} style={{
                  paddingVertical: 8, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1,
                  borderColor: plan === p.key ? C.navy : C.border, backgroundColor: plan === p.key ? C.navy : '#fff',
                }}>
                  <Text style={{ color: plan === p.key ? '#fff' : C.text, fontWeight: '600' }}>{p.label}</Text>
                </Pressable>
              ))}
            </View>
            <Field label="Bitiş tarihi (YYYY-AA-GG)" value={endsAt} onChangeText={setEndsAt} />
            {isValidDate(endsAt) ? <Muted style={{ marginTop: -6, marginBottom: 10 }}>{formatDate(endsAt)}</Muted> : null}
            {!isNew ? (
              <Pressable onPress={() => setActive(!active)} style={[s.row, { paddingVertical: 8 }]} accessibilityLabel="Hesap durumu">
                <Text style={{ fontSize: 15, color: C.text }}>Hesap durumu</Text>
                <Badge text={active ? 'Aktif (değiştirmek için dokun)' : 'Pasif (değiştirmek için dokun)'} tone={active ? 'ok' : 'danger'} />
              </Pressable>
            ) : null}
          </Card>
          <Button title={isNew ? 'Hesabı Oluştur' : 'Kaydet'} onPress={save} loading={busy} />
          {!isNew ? <><View style={{ height: 8 }} /><Button title="Şifre Sıfırlama Gönder" variant="ghost" onPress={sendReset} /></> : null}
        </Screen>
      )}
    </View>
  );
}
