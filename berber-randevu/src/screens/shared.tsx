import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { api } from '../api';
import { useAuth, useNav } from '../nav';
import { Appointment, Message } from '../types';
import {
  Badge, Button, C, Card, Field, Footer, Header, Loading, Muted, Screen, confirm, notify, s,
} from '../ui/components';
import { DAY_SHORT, errorMessage, formatDate, isPastSlot, isValidTime, makeQr, parseQr, statusLabel } from '../util';

export function QrCard({ kind, id, title, hint }: { kind: 'B' | 'C'; id: string; title: string; hint: string }) {
  const code = makeQr(kind, id);
  return (
    <Card style={{ alignItems: 'center' }}>
      <Text style={s.title}>{title}</Text>
      <View style={{ padding: 12, backgroundColor: '#fff', borderRadius: 12 }}>
        <QRCode value={code} size={200} color={C.navy} />
      </View>
      <Muted style={{ textAlign: 'center', marginTop: 10 }}>{hint}</Muted>
      <Text selectable style={{ marginTop: 8, fontSize: 12, color: C.muted }} testID="qr-code-text">Kod: {code}</Text>
    </Card>
  );
}

/** Karekod okutma ekranı. mode='customer': müşteri berber kodunu okutur; mode='barber': berber müşteri kodunu okutur */
export function ScanScreen({ mode }: { mode: 'barber' | 'customer' }) {
  const nav = useNav();
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [manual, setManual] = useState('');
  const [busy, setBusy] = useState(false);
  const handled = useRef(false);
  const useCamera = Platform.OS !== 'web';

  const handle = async (data: string) => {
    if (handled.current || !user) return;
    const parsed = parseQr(data);
    const expected = mode === 'customer' ? 'B' : 'C';
    if (!parsed || parsed.kind !== expected) {
      notify('Geçersiz karekod', mode === 'customer'
        ? 'Lütfen berberinizin / kuaförünüzün uygulamadaki karekodunu okutun.'
        : 'Lütfen müşterinizin uygulamadaki karekodunu okutun.');
      return;
    }
    handled.current = true;
    setBusy(true);
    try {
      const link = mode === 'customer' ? await api.linkCustomer(parsed.id, user.id) : await api.linkCustomer(user.id, parsed.id);
      notify('Eklendi', mode === 'customer' ? `${link.shopName} listenize eklendi.` : `${link.customerName} müşterilerinize eklendi.`);
      nav.pop();
    } catch (e) {
      handled.current = false;
      notify('Eklenemedi', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="Karekod Okut" subtitle={mode === 'customer' ? 'Berber / kuaför ekle' : 'Müşteri ekle'} onBack={nav.pop} />
      <Screen>
        {useCamera ? (
          permission?.granted ? (
            <View style={{ height: 320, borderRadius: 16, overflow: 'hidden', marginBottom: 12, backgroundColor: '#000' }}>
              <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={busy ? undefined : (r) => handle(r.data)} />
            </View>
          ) : (
            <Card>
              <Muted style={{ marginBottom: 10 }}>Karekod okutmak için kamera izni gerekiyor.</Muted>
              <Button title="Kamera İzni Ver" onPress={requestPermission} />
            </Card>
          )
        ) : null}
        <Card>
          <Text style={s.title}>Kodu elle girin</Text>
          <Muted style={{ marginBottom: 10 }}>Karekodun altındaki kodu yazabilirsiniz (ör. BRANDEVU:{mode === 'customer' ? 'B' : 'C'}:...).</Muted>
          <Field label="Kod" value={manual} onChangeText={setManual} autoCapitalize="characters" placeholder="BRANDEVU:..." />
          <Button title="Ekle" onPress={() => handle(manual.trim().replace(/^KOD:\s*/i, ''))} loading={busy} />
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}

export function AppointmentScreen({ appointmentId }: { appointmentId: string }) {
  const nav = useNav();
  const { user } = useAuth();
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const [a, m] = await Promise.all([api.getAppointment(appointmentId), api.listMessages(appointmentId)]);
      setAppt(a);
      setMessages(m);
    } catch (e) {
      notify('Hata', errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) return null;
  const isBarber = user.role === 'barber';

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const m = await api.sendMessage(appointmentId, user, text);
      setMessages((x) => [...x, m]);
      setText('');
    } catch (e) {
      notify('Gönderilemedi', errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const cancel = async () => {
    if (!appt) return;
    if (!(await confirm('Randevu iptali', 'Bu randevuyu iptal etmek istediğinize emin misiniz?', 'İptal Et'))) return;
    try {
      await api.cancelAppointment(appt);
      await load();
    } catch (e) {
      notify('İptal edilemedi', errorMessage(e));
    }
  };

  const complete = async () => {
    if (!appt) return;
    try {
      await api.completeAppointment(appt);
      await load();
    } catch (e) {
      notify('Hata', errorMessage(e));
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="Randevu Detayı" onBack={nav.pop} />
      {loading ? <Loading /> : !appt ? <Muted style={{ margin: 16 }}>Randevu bulunamadı.</Muted> : (
        <Screen>
          <Card>
            <View style={s.row}>
              <Text style={s.title}>{isBarber ? appt.customerName : appt.shopName}</Text>
              <Badge text={statusLabel(appt)} tone={appt.status === 'booked' ? 'ok' : appt.status === 'done' ? 'gold' : 'danger'} />
            </View>
            <Text style={{ fontSize: 16, color: C.text }}>{formatDate(appt.date)}</Text>
            <Text style={{ fontSize: 28, fontWeight: '800', color: C.navy, marginVertical: 4 }}>{appt.time}</Text>
            {isBarber && appt.customerPhone ? <Muted>Telefon: {appt.customerPhone}</Muted> : null}
            {!isBarber ? <Muted>{appt.barberName}</Muted> : null}
            {appt.note ? (
              <View style={{ marginTop: 10, backgroundColor: C.goldSoft, borderRadius: 10, padding: 10 }}>
                <Text style={{ fontWeight: '700', color: '#8A6A2A', marginBottom: 2 }}>Müşteri notu</Text>
                <Text style={{ color: C.text }}>{appt.note}</Text>
              </View>
            ) : null}
            {appt.status === 'booked' ? (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <View style={{ flex: 1 }}><Button title="İptal Et" variant="danger" onPress={cancel} small /></View>
                {isBarber && isPastSlot(appt.date, appt.time) ? (
                  <View style={{ flex: 1 }}><Button title="Tamamlandı" variant="secondary" onPress={complete} small /></View>
                ) : null}
              </View>
            ) : null}
          </Card>

          <Card>
            <Text style={s.title}>Sorular ve Mesajlar</Text>
            {messages.length === 0 ? <Muted>Henüz mesaj yok. {isBarber ? 'Müşterinize' : 'Berberinize'} soru sorabilir veya açıklama yazabilirsiniz.</Muted> : null}
            {messages.map((m) => {
              const mine = m.senderId === user.id;
              return (
                <View key={m.id} style={{
                  alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '85%', marginVertical: 4, padding: 10, borderRadius: 12,
                  backgroundColor: mine ? C.navy : C.disabled,
                }}>
                  <Text style={{ fontSize: 11, color: mine ? C.goldSoft : C.muted, marginBottom: 2 }}>
                    {m.senderName} · {new Date(m.createdAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text style={{ color: mine ? '#fff' : C.text, fontSize: 15 }}>{m.text}</Text>
                </View>
              );
            })}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'flex-end' }}>
              <TextInput value={text} onChangeText={setText} placeholder="Mesajınızı yazın..." multiline accessibilityLabel="Mesaj"
                placeholderTextColor={C.disabledText} style={[s.input, { flex: 1, maxHeight: 120 }]} />
              <Button title="Gönder" onPress={send} loading={sending} small />
            </View>
            <Pressable onPress={load} style={{ marginTop: 10, alignSelf: 'center' }}>
              <Text style={{ color: C.navy, fontWeight: '600' }}>↻ Yenile</Text>
            </Pressable>
          </Card>
        </Screen>
      )}
    </KeyboardAvoidingView>
  );
}

/** Profil ve ayarlar (tüm roller) */
export function ProfileScreen() {
  const nav = useNav();
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [shopName, setShopName] = useState(user?.shopName ?? '');
  const [address, setAddress] = useState(user?.address ?? '');
  const [workStart, setWorkStart] = useState(user?.workStart ?? '09:00');
  const [workEnd, setWorkEnd] = useState(user?.workEnd ?? '19:00');
  const [slot, setSlot] = useState(String(user?.slotMinutes ?? 30));
  const [days, setDays] = useState<number[]>(user?.workDays ?? [1, 2, 3, 4, 5, 6]);
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  const isBarber = user.role === 'barber';

  const save = async () => {
    if (name.trim().length < 2) return notify('Eksik bilgi', 'Adınızı girin.');
    const data: Record<string, unknown> = { name: name.trim(), phone: phone.trim() };
    if (isBarber) {
      const n = parseInt(slot, 10);
      if (!isValidTime(workStart) || !isValidTime(workEnd) || workStart >= workEnd) {
        return notify('Çalışma saatleri', 'Saatleri SS:DD biçiminde girin (ör. 09:00 - 19:00).');
      }
      if (!(n >= 10 && n <= 240)) return notify('Randevu süresi', '10 ile 240 dakika arasında bir değer girin.');
      Object.assign(data, { shopName: shopName.trim(), address: address.trim(), workStart, workEnd, slotMinutes: n, workDays: [...days].sort() });
    }
    setBusy(true);
    try {
      await api.updateUser(user.id, data);
      await refreshUser();
      notify('Kaydedildi', 'Bilgileriniz güncellendi.');
    } catch (e) {
      notify('Kaydedilemedi', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const toggleDay = (d: number) => setDays((x) => (x.includes(d) ? x.filter((y) => y !== d) : [...x, d]));

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="Profil ve Ayarlar" subtitle={user.email} onBack={nav.pop} />
      <Screen>
        <Card>
          <Field label="Ad Soyad" value={name} onChangeText={setName} />
          <Field label="Telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          {isBarber ? (
            <>
              <Field label="İşletme adı" value={shopName} onChangeText={setShopName} />
              <Field label="Adres" value={address} onChangeText={setAddress} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><Field label="Açılış (SS:DD)" value={workStart} onChangeText={setWorkStart} /></View>
                <View style={{ flex: 1 }}><Field label="Kapanış (SS:DD)" value={workEnd} onChangeText={setWorkEnd} /></View>
              </View>
              <Field label="Randevu süresi (dakika)" value={slot} onChangeText={setSlot} keyboardType="number-pad" />
              <Text style={s.label}>Çalışma günleri</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <Pressable key={d} onPress={() => toggleDay(d)} accessibilityLabel={DAY_SHORT[d]} style={{
                    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1,
                    borderColor: days.includes(d) ? C.navy : C.border, backgroundColor: days.includes(d) ? C.navy : '#fff',
                  }}>
                    <Text style={{ color: days.includes(d) ? '#fff' : C.muted, fontWeight: '600' }}>{DAY_SHORT[d]}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
          <Button title="Kaydet" onPress={save} loading={busy} />
        </Card>
        <Card>
          <Button title="Şifre Değiştir" variant="secondary" onPress={() => nav.push({ name: 'changePassword' })} />
          <View style={{ height: 8 }} />
          <Button title="Çıkış Yap" variant="danger" onPress={async () => { await api.logout(); nav.reset(); }} />
        </Card>
        <Footer />
      </Screen>
    </KeyboardAvoidingView>
  );
}

export function AppointmentRow({ a, perspective, onPress }: { a: Appointment; perspective: 'barber' | 'customer'; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Randevu ${a.date} ${a.time}`}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
        <View style={{ width: 64, alignItems: 'center', backgroundColor: C.goldSoft, borderRadius: 10, paddingVertical: 8 }}>
          <Text style={{ fontWeight: '800', fontSize: 17, color: C.navy }}>{a.time}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', fontSize: 16, color: C.text }} numberOfLines={1}>
            {perspective === 'barber' ? a.customerName : a.shopName}
          </Text>
          <Muted>{formatDate(a.date)}</Muted>
          {a.note ? <Muted style={{ fontSize: 13 }} >📝 {a.note.length > 40 ? a.note.slice(0, 40) + '…' : a.note}</Muted> : null}
        </View>
        <Badge text={statusLabel(a)} tone={a.status === 'booked' ? 'ok' : a.status === 'done' ? 'gold' : 'danger'} />
      </Card>
    </Pressable>
  );
}

export { Footer };
