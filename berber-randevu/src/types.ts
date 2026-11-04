export type Role = 'admin' | 'barber' | 'customer';

export type SubscriptionPlan = 'deneme' | 'aylik' | 'yillik';

export interface Subscription {
  plan: SubscriptionPlan;
  /** YYYY-MM-DD, bu tarih dahil geçerli */
  endsAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: Role;
  createdAt: string;
  // Sadece berber / kuaför için
  shopName?: string;
  address?: string;
  workStart?: string; // "09:00"
  workEnd?: string; // "19:00"
  slotMinutes?: number; // 30
  workDays?: number[]; // 0=Pazar ... 6=Cumartesi
  subscription?: Subscription;
  active?: boolean;
}

export interface BarberCustomerLink {
  id: string; // barberId_customerId
  barberId: string;
  customerId: string;
  barberName: string;
  shopName: string;
  customerName: string;
  customerPhone: string;
  createdAt: string;
}

export type AppointmentStatus = 'booked' | 'cancelled' | 'done';

export interface Appointment {
  id: string;
  barberId: string;
  customerId: string;
  barberName: string;
  shopName: string;
  customerName: string;
  customerPhone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  note: string;
  status: AppointmentStatus;
  createdAt: string;
}

export interface Message {
  id: string;
  appointmentId: string;
  senderId: string;
  senderRole: Role;
  senderName: string;
  text: string;
  createdAt: string;
}

export interface NewBarberInput {
  email: string;
  password: string;
  name: string;
  phone: string;
  shopName: string;
  address: string;
  plan: SubscriptionPlan;
  endsAt: string;
}

export interface Api {
  mode: 'demo' | 'firebase';
  /** Oturum değişikliklerini dinler; aboneliği iptal eden fonksiyon döner */
  onAuthChanged(cb: (user: UserProfile | null) => void): () => void;
  login(email: string, password: string): Promise<UserProfile>;
  logout(): Promise<void>;
  registerCustomer(input: { name: string; email: string; phone: string; password: string }): Promise<UserProfile>;
  /** Şifre sıfırlama e-postası gönderir. Demo modunda bilgi mesajı döner. */
  resetPassword(email: string): Promise<string>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  getUser(id: string): Promise<UserProfile | null>;
  updateUser(id: string, data: Partial<UserProfile>): Promise<void>;

  // Yönetici
  listBarbers(): Promise<UserProfile[]>;
  createBarber(input: NewBarberInput): Promise<UserProfile>;

  // Berber - müşteri bağlantısı
  linkCustomer(barberId: string, customerId: string): Promise<BarberCustomerLink>;
  unlinkCustomer(barberId: string, customerId: string): Promise<void>;
  listCustomersOfBarber(barberId: string): Promise<BarberCustomerLink[]>;
  listBarbersOfCustomer(customerId: string): Promise<BarberCustomerLink[]>;

  // Randevu
  getBusyTimes(barberId: string, date: string): Promise<string[]>;
  book(input: { barberId: string; customerId: string; date: string; time: string; note: string }): Promise<Appointment>;
  listAppointmentsOfBarber(barberId: string): Promise<Appointment[]>;
  listAppointmentsOfCustomer(customerId: string): Promise<Appointment[]>;
  getAppointment(id: string): Promise<Appointment | null>;
  cancelAppointment(appt: Appointment): Promise<void>;
  completeAppointment(appt: Appointment): Promise<void>;

  // Mesajlar
  listMessages(appointmentId: string): Promise<Message[]>;
  sendMessage(appointmentId: string, sender: UserProfile, text: string): Promise<Message>;
}
