import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { api } from '../../api';
import { useAuth, useNav, useSticky } from '../../nav';
import { Appointment, BarberCustomerLink } from '../../types';
import { Badge, Button, C, Card, Empty, Footer, Header, Loading, Muted, Tabs, confirm, notify, s } from '../../ui/components';
import { DateStrip } from '../../ui/DateStrip';
import {
  errorMessage, formatDate, generateSlots, isPastSlot, isUpcoming, isWorkDay, planLabel, sortAppointments, subscriptionActive, todayStr,
} from '../../util';
import { AppointmentRow, QrCard } from '../shared';

type Tab = 'takvim' | 'yaklasan' | 'musteriler' | 'karekod';

export function BarberHome() {
  const { user } = useAuth();
  const nav = useNav();
  const [tab, setTab] = useSticky<Tab>('barber.tab', 'takvim');
  const [appts, setAppts] = useState<Appointment[] | null>(null);
  const [customers, setCustomers] = useState<BarberCustomerLink[] | null>(null);
  const [date, setDate] = useSticky('barber.date', todayStr());
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [a, c] = await Promise.all([api.listAppointmentsOfBarber(user.id), api.listCustomersOfBarber(user.id)]);
      setAppts(sortAppointments(a));
      setCustomers(c);
    } catch (e) {
      notify('Hata', errorMessage(e));
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load, nav.depth]);

  if (!user) return null;

  if (!subscriptionActive(user)) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Header title={user.shopName || user.name} subtitle="Abonelik" />
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Card style={{ borderColor: C.danger }}>
            <Text style={[s.title, { color: C.danger }]}>Aboneliğiniz aktif değil</Text>
            <Muted>
              {user.active === false ? 'Hesabınız pasif durumda.' : `Abonelik bitiş tarihi: ${user.subscription ? formatDate(user.subscription.endsAt) : '-'}.`}
              {' '}Uygulamayı kullanmaya devam etmek için aylık veya yıllık abonelik yenilemesi için bizimle iletişime geçin.
            </Muted>
          </Card>
          <Button title="Profil / Çıkış" variant="secondary" onPress={() => nav.push({ name: 'profile' })} />
          <Footer />
        </ScrollView>
      </View>
    );
  }

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const dayAppts = (appts ?? []).filter((a) => a.date === date && a.status !== 'cancelled');
  const byTime = new Map(dayAppts.map((a) => [a.time, a]));
  const slots = generateSlots(user);
  const upcoming = (appts ?? []).filter(isUpcoming);
  const todayCount = (appts ?? []).filter((a) => a.date === todayStr() && a.status === 'booked').length;

  const removeCustomer = async (c: BarberCustomerLink) => {
    if (!(await confirm('Müşteriyi kaldır', `${c.customerName} listenizden kaldırılsın mı?`, 'Kaldır'))) return;
    try {
      await api.unlinkCustomer(user.id, c.customerId);
      await load();
    } catch (e) {
      notify('Hata', errorMessage(e));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title={user.shopName || user.name} subtitle={`Bugün ${todayCount} randevu · ${planLabel(user.subscription?.plan)} abonelik`}
        right={<Pressable onPress={() => nav.push({ name: 'profile' })} accessibilityLabel="Profil"><Text style={{ fontSize: 22 }}>⚙️</Text></Pressable>} />
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { key: 'takvim', label: 'Takvim' }, { key: 'yaklasan', label: 'Yaklaşan' },
        { key: 'musteriler', label: 'Müşteriler' }, { key: 'karekod', label: 'Karekod' },
      ]} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        {appts === null ? <Loading /> : null}

        {appts && tab === 'takvim' ? (
          <>
            <DateStrip value={date} onChange={setDate} isOpen={(d) => isWorkDay(user, d)} />
            <Text style={[s.title, { marginBottom: 10 }]}>{formatDate(date)}</Text>
            {!isWorkDay(user, date) ? <Empty text="Bu gün kapalı (çalışma günü değil)." /> : slots.map((t) => {
              const a = byTime.get(t);
              const past = isPastSlot(date, t);
              return (
                <Pressable key={t} disabled={!a} onPress={() => a && nav.push({ name: 'appointment', appointmentId: a.id })}
                  accessibilityLabel={`Saat ${t}`}>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginBottom: 6, borderRadius: 10,
                    backgroundColor: a ? C.navy : '#fff', borderWidth: 1, borderColor: a ? C.navy : C.border, opacity: past && !a ? 0.5 : 1,
                  }}>
                    <Text style={{ width: 52, fontWeight: '800', fontSize: 16, color: a ? C.gold : C.text }}>{t}</Text>
                    <View style={{ flex: 1 }}>
                      {a ? (
                        <>
                          <Text style={{ color: '#fff', fontWeight: '700' }}>{a.customerName}</Text>
                          {a.note ? <Text style={{ color: C.goldSoft, fontSize: 13 }} numberOfLines={1}>📝 {a.note}</Text> : null}
                        </>
                      ) : <Text style={{ color: C.muted }}>{past ? 'Geçti' : 'Boş'}</Text>}
                    </View>
                    {a?.status === 'done' ? <Badge text="Tamamlandı" tone="gold" /> : null}
                  </View>
                </Pressable>
              );
            })}
          </>
        ) : null}

        {appts && tab === 'yaklasan' ? (
          upcoming.length === 0 ? <Empty text="Yaklaşan randevu yok." /> : upcoming.map((a) => (
            <AppointmentRow key={a.id} a={a} perspective="barber" onPress={() => nav.push({ name: 'appointment', appointmentId: a.id })} />
          ))
        ) : null}

        {appts && tab === 'musteriler' ? (
          <>
            <Button title="📷 Müşteri Karekodu Okut" onPress={() => nav.push({ name: 'scan', mode: 'barber' })} />
            <Muted style={{ marginVertical: 10 }}>
              Müşteriniz sizin karekodunuzu (Karekod sekmesi) okutarak da kendini ekleyebilir.
            </Muted>
            {(customers ?? []).length === 0 ? <Empty text="Henüz müşteri eklenmedi." /> : (customers ?? []).map((c) => {
              const count = (appts ?? []).filter((a) => a.customerId === c.customerId && a.status !== 'cancelled').length;
              return (
                <Card key={c.id} style={s.row as object}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', fontSize: 16, color: C.text }}>{c.customerName}</Text>
                    <Muted>{c.customerPhone || 'Telefon yok'} · {count} randevu</Muted>
                  </View>
                  <Button title="Kaldır" variant="ghost" small onPress={() => removeCustomer(c)} />
                </Card>
              );
            })}
          </>
        ) : null}

        {appts && tab === 'karekod' ? (
          <>
            <QrCard kind="B" id={user.id} title={user.shopName || user.name}
              hint="Müşterileriniz bu karekodu uygulamadan okutarak sizi ekler ve randevu alabilir. Dükkanınıza asabilirsiniz." />
            <Footer />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
