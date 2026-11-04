/**
 * DEMO veri katmanı: tüm veriler cihazın yerel deposunda (AsyncStorage) tutulur.
 * Firebase yapılandırılmadığında kullanılır. Test ve tanıtım amaçlıdır.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Api, Appointment, BarberCustomerLink, Message, UserProfile } from '../types';
import { addDays, slotId, todayStr } from '../util';

interface StoredUser extends UserProfile {
  password: string;
}

interface Db {
  users: Record<string, StoredUser>;
  links: Record<string, BarberCustomerLink>;
  busy: Record<string, { barberId: string; date: string; time: string; appointmentId: string; customerId: string }>;
  appointments: Record<string, Appointment>;
  messages: Message[];
}

const DB_KEY = 'berber_randevu_demo_db_v1';
const SESSION_KEY = 'berber_randevu_demo_session_v1';

const now = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function seed(): Db {
  const created = now();
  const admin: StoredUser = {
    id: 'admin1', email: 'admin@demo.com', password: 'admin123', name: 'Sistem Yöneticisi', role: 'admin', createdAt: created,
  };
  const barber: StoredUser = {
    id: 'berber1', email: 'berber@demo.com', password: 'berber123', name: 'Ahmet Usta', phone: '0555 111 22 33',
    role: 'barber', createdAt: created, shopName: 'Ahmet Usta Erkek Kuaförü', address: 'Atatürk Cad. No:12',
    workStart: '09:00', workEnd: '19:00', slotMinutes: 30, workDays: [1, 2, 3, 4, 5, 6],
    subscription: { plan: 'deneme', endsAt: addDays(todayStr(), 30) }, active: true,
  };
  const customer: StoredUser = {
    id: 'musteri1', email: 'musteri@demo.com', password: 'musteri123', name: 'Mehmet Yılmaz', phone: '0532 444 55 66',
    role: 'customer', createdAt: created,
  };
  return { users: { [admin.id]: admin, [barber.id]: barber, [customer.id]: customer }, links: {}, busy: {}, appointments: {}, messages: [] };
}

let cache: Db | null = null;

async function load(): Promise<Db> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(DB_KEY);
    cache = raw ? (JSON.parse(raw) as Db) : seed();
  } catch {
    cache = seed();
  }
  return cache;
}

async function save(db: Db): Promise<void> {
  cache = db;
  try {
    await AsyncStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    /* depolama yoksa yalnızca bellekte tutulur */
  }
}

const strip = (u: StoredUser): UserProfile => {
  const { password: _p, ...rest } = u;
  return rest;
};

const listeners = new Set<(u: UserProfile | null) => void>();
let currentId: string | null = null;

async function emit() {
  const db = await load();
  const u = currentId && db.users[currentId] ? strip(db.users[currentId]) : null;
  listeners.forEach((l) => l(u));
}

async function setSession(id: string | null) {
  currentId = id;
  try {
    if (id) await AsyncStorage.setItem(SESSION_KEY, id);
    else await AsyncStorage.removeItem(SESSION_KEY);
  } catch {
    /* yok say */
  }
  await emit();
}

function fail(msg: string): never {
  throw new Error(msg);
}

function requireUser(db: Db): StoredUser {
  if (!currentId || !db.users[currentId]) fail('Oturum açmanız gerekiyor.');
  return db.users[currentId];
}

const delay = () => new Promise((r) => setTimeout(r, 120));

export const demoApi: Api = {
  mode: 'demo',

  onAuthChanged(cb) {
    listeners.add(cb);
    (async () => {
      let id: string | null = null;
      try {
        id = await AsyncStorage.getItem(SESSION_KEY);
      } catch {
        id = null;
      }
      const db = await load();
      currentId = id && db.users[id] ? id : null;
      cb(currentId ? strip(db.users[currentId]) : null);
    })();
    return () => listeners.delete(cb);
  },

  async login(email, password) {
    await delay();
    const db = await load();
    const u = Object.values(db.users).find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u || u.password !== password) fail('E-posta veya şifre hatalı.');
    await setSession(u.id);
    return strip(u);
  },

  async logout() {
    await setSession(null);
  },

  async registerCustomer({ name, email, phone, password }) {
    await delay();
    const db = await load();
    const e = email.trim().toLowerCase();
    if (Object.values(db.users).some((x) => x.email.toLowerCase() === e)) fail('Bu e-posta zaten kayıtlı.');
    if (password.length < 6) fail('Şifre en az 6 karakter olmalı.');
    const u: StoredUser = { id: uid(), email: e, password, name: name.trim(), phone: phone.trim(), role: 'customer', createdAt: now() };
    db.users[u.id] = u;
    await save(db);
    await setSession(u.id);
    return strip(u);
  },

  async resetPassword(email) {
    await delay();
    const db = await load();
    const u = Object.values(db.users).find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u) fail('Bu e-posta ile kayıtlı kullanıcı yok.');
    u.password = '123456';
    await save(db);
    return 'Demo modu: e-posta gönderilmez. Şifreniz "123456" olarak sıfırlandı. Giriş yaptıktan sonra değiştirin.';
  },

  async changePassword(currentPassword, newPassword) {
    const db = await load();
    const u = requireUser(db);
    if (u.password !== currentPassword) fail('Mevcut şifre hatalı.');
    if (newPassword.length < 6) fail('Yeni şifre en az 6 karakter olmalı.');
    u.password = newPassword;
    await save(db);
  },

  async getUser(id) {
    const db = await load();
    return db.users[id] ? strip(db.users[id]) : null;
  },

  async updateUser(id, data) {
    const db = await load();
    const me = requireUser(db);
    if (me.id !== id && me.role !== 'admin') fail('Bu işlem için yetkiniz yok.');
    if (!db.users[id]) fail('Kullanıcı bulunamadı.');
    const { role: _r, id: _i, email: _e, ...safe } = data;
    const allowed = me.role === 'admin' ? safe : (({ subscription: _s, active: _a, ...rest }) => rest)(safe);
    db.users[id] = { ...db.users[id], ...allowed };
    await save(db);
    if (id === currentId) await emit();
  },

  async listBarbers() {
    const db = await load();
    return Object.values(db.users).filter((u) => u.role === 'barber').map(strip).sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  },

  async createBarber(input) {
    await delay();
    const db = await load();
    if (requireUser(db).role !== 'admin') fail('Bu işlem için yetkiniz yok.');
    const e = input.email.trim().toLowerCase();
    if (Object.values(db.users).some((x) => x.email.toLowerCase() === e)) fail('Bu e-posta zaten kayıtlı.');
    if (input.password.length < 6) fail('Şifre en az 6 karakter olmalı.');
    const u: StoredUser = {
      id: uid(), email: e, password: input.password, name: input.name.trim(), phone: input.phone.trim(), role: 'barber',
      createdAt: now(), shopName: input.shopName.trim(), address: input.address.trim(), workStart: '09:00', workEnd: '19:00',
      slotMinutes: 30, workDays: [1, 2, 3, 4, 5, 6], subscription: { plan: input.plan, endsAt: input.endsAt }, active: true,
    };
    db.users[u.id] = u;
    await save(db);
    return strip(u);
  },

  async linkCustomer(barberId, customerId) {
    const db = await load();
    const me = requireUser(db);
    if (me.id !== barberId && me.id !== customerId) fail('Bu işlem için yetkiniz yok.');
    const b = db.users[barberId];
    const c = db.users[customerId];
    if (!b || b.role !== 'barber') fail('Berber / kuaför bulunamadı.');
    if (!c || c.role !== 'customer') fail('Müşteri bulunamadı.');
    const id = `${barberId}_${customerId}`;
    const link: BarberCustomerLink = db.links[id] ?? {
      id, barberId, customerId, barberName: b.name, shopName: b.shopName ?? b.name, customerName: c.name,
      customerPhone: c.phone ?? '', createdAt: now(),
    };
    db.links[id] = link;
    await save(db);
    return link;
  },

  async unlinkCustomer(barberId, customerId) {
    const db = await load();
    delete db.links[`${barberId}_${customerId}`];
    await save(db);
  },

  async listCustomersOfBarber(barberId) {
    const db = await load();
    return Object.values(db.links).filter((l) => l.barberId === barberId).sort((a, b) => a.customerName.localeCompare(b.customerName, 'tr'));
  },

  async listBarbersOfCustomer(customerId) {
    const db = await load();
    return Object.values(db.links).filter((l) => l.customerId === customerId);
  },

  async getBusyTimes(barberId, date) {
    const db = await load();
    return Object.values(db.busy).filter((b) => b.barberId === barberId && b.date === date).map((b) => b.time);
  },

  async book({ barberId, customerId, date, time, note }) {
    await delay();
    const db = await load();
    const me = requireUser(db);
    if (me.id !== customerId && me.id !== barberId) fail('Bu işlem için yetkiniz yok.');
    const sid = slotId(barberId, date, time);
    if (db.busy[sid]) fail('Bu saat dilimi az önce doldu. Lütfen başka bir saat seçin.');
    const b = db.users[barberId];
    const c = db.users[customerId];
    if (!b || !c) fail('Kullanıcı bulunamadı.');
    const appt: Appointment = {
      id: uid(), barberId, customerId, barberName: b.name, shopName: b.shopName ?? b.name, customerName: c.name,
      customerPhone: c.phone ?? '', date, time, note: note.trim(), status: 'booked', createdAt: now(),
    };
    db.appointments[appt.id] = appt;
    db.busy[sid] = { barberId, date, time, appointmentId: appt.id, customerId };
    await save(db);
    return appt;
  },

  async listAppointmentsOfBarber(barberId) {
    const db = await load();
    return Object.values(db.appointments).filter((a) => a.barberId === barberId);
  },

  async listAppointmentsOfCustomer(customerId) {
    const db = await load();
    return Object.values(db.appointments).filter((a) => a.customerId === customerId);
  },

  async getAppointment(id) {
    const db = await load();
    return db.appointments[id] ?? null;
  },

  async cancelAppointment(appt) {
    const db = await load();
    const a = db.appointments[appt.id];
    if (!a) fail('Randevu bulunamadı.');
    a.status = 'cancelled';
    delete db.busy[slotId(a.barberId, a.date, a.time)];
    await save(db);
  },

  async completeAppointment(appt) {
    const db = await load();
    const a = db.appointments[appt.id];
    if (!a) fail('Randevu bulunamadı.');
    a.status = 'done';
    await save(db);
  },

  async listMessages(appointmentId) {
    const db = await load();
    return db.messages.filter((m) => m.appointmentId === appointmentId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  async sendMessage(appointmentId, sender, text) {
    const db = await load();
    const m: Message = {
      id: uid(), appointmentId, senderId: sender.id, senderRole: sender.role, senderName: sender.name, text: text.trim(), createdAt: now(),
    };
    db.messages.push(m);
    await save(db);
    return m;
  },
};
