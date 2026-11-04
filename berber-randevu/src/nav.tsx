import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { BackHandler } from 'react-native';
import { UserProfile } from './types';

/** Basit yığın (stack) tabanlı gezinme */
export type Route =
  | { name: 'home' }
  | { name: 'forgot' }
  | { name: 'register' }
  | { name: 'changePassword' }
  | { name: 'book'; barberId: string }
  | { name: 'appointment'; appointmentId: string }
  | { name: 'scan'; mode: 'barber' | 'customer' }
  | { name: 'barberEdit'; barberId: string | null }
  | { name: 'profile' };

interface NavCtx {
  route: Route;
  push: (r: Route) => void;
  pop: () => void;
  reset: () => void;
  depth: number;
}

const Ctx = createContext<NavCtx | null>(null);

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<Route[]>([{ name: 'home' }]);
  const push = useCallback((r: Route) => setStack((st) => [...st, r]), []);
  const pop = useCallback(() => setStack((st) => (st.length > 1 ? st.slice(0, -1) : st)), []);
  const reset = useCallback(() => setStack([{ name: 'home' }]), []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 1) {
        pop();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [stack.length, pop]);

  const value = useMemo(() => ({ route: stack[stack.length - 1], push, pop, reset, depth: stack.length }), [stack, push, pop, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNav(): NavCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('NavProvider eksik');
  return c;
}

interface AuthCtx {
  user: UserProfile | null;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthCtx>({ user: null, refreshUser: async () => undefined });
export const useAuth = () => useContext(AuthContext);

/** Ekranlar arası geçişte korunan basit durum (ör. seçili sekme) */
const memo = new Map<string, unknown>();
export function useSticky<T>(key: string, initial: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => (memo.has(key) ? (memo.get(key) as T) : initial));
  const set = useCallback((nv: T) => {
    memo.set(key, nv);
    setV(nv);
  }, [key]);
  return [v, set];
}
export function clearSticky() {
  memo.clear();
}
