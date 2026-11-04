/**
 * Berber Randevu Takip — Beta 0.1
 * © 2026 Coşkun Fotos Ltd. Şti. Tüm hakları saklıdır.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { api } from './src/api';
import { AuthContext, NavProvider, Route, clearSticky, useAuth, useNav } from './src/nav';
import { UserProfile } from './src/types';
import { C } from './src/ui/components';
import { ChangePasswordScreen, ForgotScreen, LoginScreen, RegisterScreen } from './src/screens/auth';
import { AdminHome, BarberEditScreen } from './src/screens/admin';
import { BarberHome } from './src/screens/barber';
import { BookScreen, CustomerHome } from './src/screens/customer';
import { AppointmentScreen, ProfileScreen, ScanScreen } from './src/screens/shared';

function Router() {
  const { user } = useAuth();
  const { route, reset } = useNav();

  // Oturum değişince ana ekrana dön
  useEffect(() => {
    clearSticky();
    reset();
  }, [user?.id, reset]);

  if (!user) {
    if (route.name === 'forgot') return <ForgotScreen />;
    if (route.name === 'register') return <RegisterScreen />;
    return <LoginScreen />;
  }
  return renderRoute(route, user);
}

function renderRoute(route: Route, user: UserProfile) {
  switch (route.name) {
    case 'changePassword': return <ChangePasswordScreen />;
    case 'profile': return <ProfileScreen />;
    case 'appointment': return <AppointmentScreen appointmentId={route.appointmentId} />;
    case 'scan': return <ScanScreen mode={route.mode} />;
    case 'book': return <BookScreen barberId={route.barberId} />;
    case 'barberEdit': return user.role === 'admin' ? <BarberEditScreen barberId={route.barberId} /> : null;
    default:
      if (user.role === 'admin') return <AdminHome />;
      if (user.role === 'barber') return <BarberHome />;
      return <CustomerHome />;
  }
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => api.onAuthChanged((u) => {
    setUser(u);
    setReady(true);
  }), []);

  const refreshUser = useCallback(async () => {
    if (user) setUser(await api.getUser(user.id));
  }, [user]);

  const auth = useMemo(() => ({ user, refreshUser }), [user, refreshUser]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {!ready ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.navy }}>
          <ActivityIndicator color={C.gold} size="large" />
        </View>
      ) : (
        <AuthContext.Provider value={auth}>
          <NavProvider>
            <Router />
          </NavProvider>
        </AuthContext.Provider>
      )}
    </SafeAreaProvider>
  );
}
