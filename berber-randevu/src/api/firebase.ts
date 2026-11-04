/**
 * Firebase (Authentication + Cloud Firestore) veri katmanı.
 * Yapılandırma src/config.ts içindeki firebaseConfig'ten okunur.
 * Güvenlik kuralları: firestore.rules
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, deleteApp, getApps, initializeApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import {
  Auth, EmailAuthProvider, createUserWithEmailAndPassword, getAuth, initializeAuth, onAuthStateChanged,
  reauthenticateWithCredential, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, updatePassword,
} from 'firebase/auth';
import {
  Firestore, addDoc, collection, deleteDoc, doc, getDoc, getDocs, getFirestore, query, runTransaction, setDoc,
  updateDoc, where,
} from 'firebase/firestore';
import { firebaseConfig } from '../config';
import { Api, Appointment, BarberCustomerLink, Message, UserProfile } from '../types';
import { slotId } from '../util';

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

function init() {
  if (app) return;
  app = getApps()[0] ?? initializeApp(firebaseConfig);
  if (Platform.OS === 'web') {
    auth = getAuth(app);
  } else {
    // React Native'de oturumun kalıcı olması için AsyncStorage kullanılır
    const getRNPersistence = (FirebaseAuth as unknown as { getReactNativePersistence?: (s: unknown) => FirebaseAuth.Persistence })
      .getReactNativePersistence;
    try {
      auth = initializeAuth(app, getRNPersistence ? { persistence: getRNPersistence(AsyncStorage) } : {});
    } catch {
      auth = getAuth(app);
    }
  }
  db = getFirestore(app);
}

const now = () => new Date().toISOString();

function fail(msg: string): never {
  throw new Error(msg);
}

async function readUser(id: string): Promise<UserProfile | null> {
  const s = await getDoc(doc(db, 'users', id));
  return s.exists() ? ({ ...(s.data() as UserProfile), id: s.id }) : null;
}

function me(): string {
  const u = auth.currentUser;
  if (!u) fail('Oturum açmanız gerekiyor.');
  return u.uid;
}

export const firebaseApi: Api = {
  mode: 'firebase',

  onAuthChanged(cb) {
    init();
    return onAuthStateChanged(auth, async (fu) => {
      if (!fu) return cb(null);
      try {
        cb(await readUser(fu.uid));
      } catch {
        cb(null);
      }
    });
  },

  async login(email, password) {
    init();
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const u = await readUser(cred.user.uid);
    if (!u) {
      await signOut(auth);
      fail('Kullanıcı profili bulunamadı. Yöneticiyle iletişime geçin.');
    }
    return u;
  },

  async logout() {
    init();
    await signOut(auth);
  },

  async registerCustomer({ name, email, phone, password }) {
    init();
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const u: UserProfile = { id: cred.user.uid, email: email.trim().toLowerCase(), name: name.trim(), phone: phone.trim(), role: 'customer', createdAt: now() };
    await setDoc(doc(db, 'users', u.id), u);
    return u;
  },

  async resetPassword(email) {
    init();
    await sendPasswordResetEmail(auth, email.trim());
    return 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Gelen kutunuzu (ve istenmeyen klasörünü) kontrol edin.';
  },

  async changePassword(currentPassword, newPassword) {
    init();
    const u = auth.currentUser;
    if (!u || !u.email) fail('Oturum açmanız gerekiyor.');
    await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, currentPassword));
    await updatePassword(u, newPassword);
  },

  async getUser(id) {
    init();
    return readUser(id);
  },

  async updateUser(id, data) {
    init();
    const { id: _i, role: _r, email: _e, ...safe } = data;
    await updateDoc(doc(db, 'users', id), safe as Record<string, unknown>);
  },

  async listBarbers() {
    init();
    const s = await getDocs(query(collection(db, 'users'), where('role', '==', 'barber')));
    return s.docs.map((d) => ({ ...(d.data() as UserProfile), id: d.id })).sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  },

  async createBarber(input) {
    init();
    // Yöneticinin oturumu kapanmasın diye ikincil bir Firebase örneği ile hesap açılır
    const secondary = initializeApp(firebaseConfig, 'secondary-' + Date.now());
    try {
      const secAuth = getAuth(secondary);
      const cred = await createUserWithEmailAndPassword(secAuth, input.email.trim(), input.password);
      const u: UserProfile = {
        id: cred.user.uid, email: input.email.trim().toLowerCase(), name: input.name.trim(), phone: input.phone.trim(), role: 'barber',
        createdAt: now(), shopName: input.shopName.trim(), address: input.address.trim(), workStart: '09:00', workEnd: '19:00',
        slotMinutes: 30, workDays: [1, 2, 3, 4, 5, 6], subscription: { plan: input.plan, endsAt: input.endsAt }, active: true,
      };
      await setDoc(doc(db, 'users', u.id), u);
      await signOut(secAuth);
      return u;
    } finally {
      await deleteApp(secondary);
    }
  },

  async linkCustomer(barberId, customerId) {
    init();
    const id = `${barberId}_${customerId}`;
    const existing = await getDoc(doc(db, 'links', id)).catch(() => null);
    if (existing?.exists()) return { ...(existing.data() as BarberCustomerLink), id };
    const [b, c] = await Promise.all([readUser(barberId), readUser(customerId)]);
    if (!b || b.role !== 'barber') fail('Berber / kuaför bulunamadı.');
    if (!c || c.role !== 'customer') fail('Müşteri bulunamadı.');
    const link: BarberCustomerLink = {
      id, barberId, customerId, barberName: b.name, shopName: b.shopName ?? b.name, customerName: c.name,
      customerPhone: c.phone ?? '', createdAt: now(),
    };
    await setDoc(doc(db, 'links', id), link);
    return link;
  },

  async unlinkCustomer(barberId, customerId) {
    init();
    await deleteDoc(doc(db, 'links', `${barberId}_${customerId}`));
  },

  async listCustomersOfBarber(barberId) {
    init();
    const s = await getDocs(query(collection(db, 'links'), where('barberId', '==', barberId)));
    return s.docs.map((d) => d.data() as BarberCustomerLink).sort((a, b) => a.customerName.localeCompare(b.customerName, 'tr'));
  },

  async listBarbersOfCustomer(customerId) {
    init();
    const s = await getDocs(query(collection(db, 'links'), where('customerId', '==', customerId)));
    return s.docs.map((d) => d.data() as BarberCustomerLink);
  },

  async getBusyTimes(barberId, date) {
    init();
    const s = await getDocs(query(collection(db, 'busy'), where('barberId', '==', barberId), where('date', '==', date)));
    return s.docs.map((d) => (d.data() as { time: string }).time);
  },

  async book({ barberId, customerId, date, time, note }) {
    init();
    me();
    const [b, c] = await Promise.all([readUser(barberId), readUser(customerId)]);
    if (!b || !c) fail('Kullanıcı bulunamadı.');
    const busyRef = doc(db, 'busy', slotId(barberId, date, time));
    const apptRef = doc(collection(db, 'appointments'));
    const appt: Appointment = {
      id: apptRef.id, barberId, customerId, barberName: b.name, shopName: b.shopName ?? b.name, customerName: c.name,
      customerPhone: c.phone ?? '', date, time, note: note.trim(), status: 'booked', createdAt: now(),
    };
    // Aynı saate iki randevu alınmasını engelleyen işlem (transaction)
    await runTransaction(db, async (tx) => {
      const busy = await tx.get(busyRef);
      if (busy.exists()) fail('Bu saat dilimi az önce doldu. Lütfen başka bir saat seçin.');
      tx.set(busyRef, { barberId, date, time, appointmentId: apptRef.id, customerId });
      tx.set(apptRef, appt);
    });
    return appt;
  },

  async listAppointmentsOfBarber(barberId) {
    init();
    const s = await getDocs(query(collection(db, 'appointments'), where('barberId', '==', barberId)));
    return s.docs.map((d) => ({ ...(d.data() as Appointment), id: d.id }));
  },

  async listAppointmentsOfCustomer(customerId) {
    init();
    const s = await getDocs(query(collection(db, 'appointments'), where('customerId', '==', customerId)));
    return s.docs.map((d) => ({ ...(d.data() as Appointment), id: d.id }));
  },

  async getAppointment(id) {
    init();
    const s = await getDoc(doc(db, 'appointments', id));
    return s.exists() ? ({ ...(s.data() as Appointment), id: s.id }) : null;
  },

  async cancelAppointment(appt) {
    init();
    await updateDoc(doc(db, 'appointments', appt.id), { status: 'cancelled' });
    await deleteDoc(doc(db, 'busy', slotId(appt.barberId, appt.date, appt.time))).catch(() => undefined);
  },

  async completeAppointment(appt) {
    init();
    await updateDoc(doc(db, 'appointments', appt.id), { status: 'done' });
  },

  async listMessages(appointmentId) {
    init();
    const s = await getDocs(collection(db, 'appointments', appointmentId, 'messages'));
    return s.docs
      .map((d) => ({ ...(d.data() as Message), id: d.id }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  async sendMessage(appointmentId, sender, text) {
    init();
    const m: Omit<Message, 'id'> = {
      appointmentId, senderId: sender.id, senderRole: sender.role, senderName: sender.name, text: text.trim(), createdAt: now(),
    };
    const ref = await addDoc(collection(db, 'appointments', appointmentId, 'messages'), m);
    return { ...m, id: ref.id };
  },
};
