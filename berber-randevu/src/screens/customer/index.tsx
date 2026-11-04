import React, { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { api } from '../../api';
import { useAuth, useNav, useSticky } from '../../nav';
import { Appointment, BarberCustomerLink, UserProfile } from '../../types';
import { Button, C, Card, Empty, Field, Footer, Header, Loading, Muted, Tabs, notify, s } from '../../ui/components';
import { DateStrip } from '../../ui/DateStrip';
import {
  errorMessage, formatDate, generateSlots, isPastSlot, isUpcoming, isWorkDay, sortAppointments, subscriptionActive, todayStr,
} from '../../util';
import { AppointmentRow, QrCard } from '../shared';

type Tab = 'berberler' | 'randevular' | 'karekod';

export function CustomerHome() {
  const { user } = useAuth();
  const nav = useNav();
  const [tab, setTab] = useSticky<Tab>('customer.tab', 'berberler');
  const [links, setLinks] = useState<BarberCustomerLink[] | null>(null);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [l, a] = await Promise.all([api.listBarbersOfCustomer(user.id), api.listAppointmentsOfCustomer(user.id)]);
      setLinks(l);
      setAppts(sortAppointments(a));
    } catch (e) {
      notify('Hata', errorMessage(e));
      setLinks([]);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load, nav.depth]);

  if (!user) return null;
  const upcoming = appts.filter(isUpcoming);
  const past = appts.filter((a) => !isUpcoming(a)).reverse();

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title={`Merhaba, ${user.name.split(' ')[0]}`} subtitle={upcoming.length ? `${upcoming.length} yaklaşan randevunuz var` : 'Randevu almak için berberinizi seçin'}
        right={<Pressable onPress={() => nav.push({ name: 'profile' })} accessibilityLabel="Profil"><Text style={{ fontSize: 22 }}>⚙️</Text></Pressable>} />
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { key: 'berberler', label: 'Berberlerim' }, { key: 'randevular', label: 'Randevularım' }, { key: 'karekod', label: 'Karekodum' },
      ]} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        {links === null ? <Loading /> : null}

        {links && tab === 'berberler' ? (
          <>
            <Button title="📷 Berber / Kuaför Karekodu Okut" onPress={() => nav.push({ name: 'scan', mode: 'customer' })} />
            <View style={{ height: 12 }} />
            {links.length === 0 ? (
              <Card style={{ backgroundColor: C.goldSoft, borderColor: C.gold }}>
                <Text style={s.title}>Henüz berberiniz yok</Text>
                <Muted>Berberinizin / kuaförünüzün uygulamadaki karekodunu okutun ya da sizin karekodunuzu (Karekodum sekmesi) ona okutun.</Muted>
              </Card>
            ) : links.map((l) => (
              <Card key={l.id}>
                <Text style={s.title}>{l.shopName}</Text>
                <Muted style={{ marginBottom: 10 }}>{l.barberName}</Muted>
                <Button title="Randevu Al" onPress={() => nav.push({ name: 'book', barberId: l.barberId })} />
              </Card>
            ))}
          </>
        ) : null}

        {links && tab === 'randevular' ? (
          <>
            <Text style={s.title}>Yaklaşan</Text>
            {upcoming.length === 0 ? <Empty text="Yaklaşan randevunuz yok." /> : upcoming.map((a) => (
              <AppointmentRow key={a.id} a={a} perspective="customer" onPress={() => nav.push({ name: 'appointment', appointmentId: a.id })} />
            ))}
            {past.length ? <Text style={[s.title, { marginTop: 12 }]}>Geçmiş / İptal</Text> : null}
            {past.map((a) => (
              <AppointmentRow key={a.id} a={a} perspective="customer" onPress={() => nav.push({ name: 'appointment', appointmentId: a.id })} />
            ))}
          </>
        ) : null}

        {links && tab === 'karekod' ? (
          <>
            <QrCard kind="C" id={user.id} title={user.name}
              hint="Berberiniz / kuaförünüz bu karekodu okutarak sizi müşterisi olarak ekleyebilir." />
            <Footer />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

export function BookScreen({ barberId }: { barberId: string }) {
  const nav = useNav();
  const { user } = useAuth();
  const [barber, setBarber] = useState<UserProfile | null>(null);
  const [date, setDate] = useState(todayStr());
  const [busyTimes, setBusyTimes] = useState<string[] | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    api.getUser(barberId).then(setBarber).catch((e) => setLoadError(errorMessage(e)));
  }, [barberId]);

  const loadBusy = useCallback(async () => {
    setBusyTimes(null);
    try {
      setBusyTimes(await api.getBusyTimes(barberId, date));
    } catch (e) {
      setBusyTimes([]);
      notify('Hata', errorMessage(e));
    }
  }, [barberId, date]);

  useEffect(() => {
    setTime(null);
    loadBusy();
  }, [loadBusy]);

  if (!user) return null;

  const book = async () => {
    if (!time) return notify('Saat seçin', 'Lütfen boş bir saat dilimi seçin.');
    setSaving(true);
    try {
      const a = await api.book({ barberId, customerId: user.id, date, time, note });
      notify('Randevunuz alındı', `${formatDate(a.date)} saat ${a.time}`);
      nav.pop();
      nav.push({ name: 'appointment', appointmentId: a.id });
    } catch (e) {
      notify('Randevu alınamadı', errorMessage(e));
      loadBusy();
    } finally {
      setSaving(false);
    }
  };

  const open = barber ? isWorkDay(barber, date) : false;
  const slots = barber ? generateSlots(barber) : [];
  const active = barber ? subscriptionActive(barber) : false;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="Randevu Al" subtitle={barber?.shopName} onBack={nav.pop} />
      {loadError ? <Muted style={{ margin: 16 }}>{loadError}</Muted> : !barber ? <Loading /> : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Card>
            <Text style={s.title}>{barber.shopName}</Text>
            <Muted>{barber.name}{barber.phone ? ` · ${barber.phone}` : ''}</Muted>
            {barber.address ? <Muted>{barber.address}</Muted> : null}
            <Muted>Çalışma saatleri: {barber.workStart} - {barber.workEnd} · {barber.slotMinutes} dk</Muted>
          </Card>
          {!active ? (
            <Card style={{ borderColor: C.danger }}>
              <Text style={{ color: C.danger }}>Bu işletme şu anda online randevu kabul etmiyor.</Text>
            </Card>
          ) : (
            <>
              <DateStrip value={date} onChange={setDate} isOpen={(d) => isWorkDay(barber, d)} />
              <Text style={[s.title, { marginBottom: 4 }]}>{formatDate(date)}</Text>
              <View style={{ flexDirection: 'row', gap: 14, marginBottom: 10 }}>
                <Legend color="#fff" border={C.border} label="Boş" />
                <Legend color={C.disabled} border={C.disabled} label="Dolu / geçmiş" />
                <Legend color={C.gold} border={C.gold} label="Seçili" />
              </View>
              {!open ? <Empty text="İşletme bu gün kapalı." /> : busyTimes === null ? <Loading /> : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                  {slots.map((t) => {
                    const taken = busyTimes.includes(t);
                    const past = isPastSlot(date, t);
                    const disabled = taken || past;
                    const sel = t === time;
                    return (
                      <Pressable key={t} disabled={disabled} onPress={() => setTime(t)} testID={`slot-${t}`}
                        accessibilityLabel={`Saat ${t}${taken ? ' dolu' : past ? ' geçti' : ''}`}
                        accessibilityState={{ disabled, selected: sel }}
                        style={{
                          width: '23%', minWidth: 70, flexGrow: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1,
                          backgroundColor: sel ? C.gold : disabled ? C.disabled : '#fff', borderColor: sel ? C.gold : disabled ? C.disabled : C.border,
                        }}>
                        <Text style={{
                          fontWeight: '700', fontSize: 15, color: sel ? C.navy : disabled ? C.disabledText : C.text,
                          textDecorationLine: taken ? 'line-through' : 'none',
                        }}>{t}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
              <Card>
                <Field label="Not / soru (isteğe bağlı)" value={note} onChangeText={setNote} multiline
                  placeholder="Örn. Saç ve sakal kesimi istiyorum." maxLength={500} />
                <Button title={time ? `${time} için Randevu Al` : 'Saat seçin'} onPress={book} loading={saving} disabled={!time} />
              </Card>
            </>
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

function Legend({ color, border, label }: { color: string; border: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: color, borderWidth: 1, borderColor: border }} />
      <Text style={{ fontSize: 12, color: C.muted }}>{label}</Text>
    </View>
  );
}
