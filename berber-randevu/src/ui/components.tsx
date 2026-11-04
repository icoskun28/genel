import React from 'react';
import {
  ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_VERSION, COPYRIGHT } from '../config';

export const C = {
  bg: '#F4F1EA',
  card: '#FFFFFF',
  navy: '#1E2A3E',
  navySoft: '#2D3D57',
  gold: '#C29A4B',
  goldSoft: '#F3E7CF',
  text: '#1C2230',
  muted: '#6B7280',
  border: '#E3DED3',
  danger: '#B42318',
  dangerSoft: '#FDECEA',
  ok: '#1F7A4D',
  okSoft: '#E5F4EC',
  disabled: '#E9E6DF',
  disabledText: '#A8A296',
};

/** Platformdan bağımsız uyarı penceresi */
export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}

export function confirm(title: string, message: string, okText = 'Evet'): Promise<boolean> {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Vazgeç', style: 'cancel', onPress: () => resolve(false) },
      { text: okText, style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

export function Header({ title, subtitle, onBack, right }: {
  title: string; subtitle?: string; onBack?: () => void; right?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.header, { paddingTop: insets.top + 12 }]}>
      <View style={s.headerRow}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={12} style={s.backBtn} accessibilityLabel="Geri">
            <Text style={s.backText}>‹</Text>
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={s.headerSub} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );
}

export function Screen({ children, scroll = true, style }: { children: React.ReactNode; scroll?: boolean; style?: ViewStyle }) {
  const insets = useSafeAreaInsets();
  if (!scroll) return <View style={[s.screen, { paddingBottom: insets.bottom }, style]}>{children}</View>;
  return (
    <ScrollView style={s.screenScroll} contentContainerStyle={[s.screen, { paddingBottom: insets.bottom + 24 }, style]}
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={s.title}>{children}</Text>;
}

export function Muted({ children, style }: { children: React.ReactNode; style?: object }) {
  return <Text style={[s.muted, style]}>{children}</Text>;
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput placeholderTextColor={C.disabledText} style={[s.input, props.multiline && { minHeight: 80, textAlignVertical: 'top' }]}
        accessibilityLabel={label} {...props} />
    </View>
  );
}

export function Button({ title, onPress, variant = 'primary', loading, disabled, small, testID }: {
  title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; loading?: boolean;
  disabled?: boolean; small?: boolean; testID?: string;
}) {
  const bg = { primary: C.navy, secondary: C.goldSoft, danger: C.dangerSoft, ghost: 'transparent' }[variant];
  const fg = { primary: '#fff', secondary: C.navy, danger: C.danger, ghost: C.navy }[variant];
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={title} onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [s.btn, small && s.btnSmall, { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === 'ghost' && { borderWidth: 1, borderColor: C.border }]}>
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[s.btnText, small && { fontSize: 14 }, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { key: T; label: string }[]; value: T; onChange: (k: T) => void }) {
  return (
    <View style={s.tabs}>
      {tabs.map((t) => (
        <Pressable key={t.key} onPress={() => onChange(t.key)} accessibilityRole="tab" accessibilityLabel={t.label}
          style={[s.tab, value === t.key && s.tabActive]}>
          <Text style={[s.tabText, value === t.key && s.tabTextActive]}>{t.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Badge({ text, tone = 'neutral' }: { text: string; tone?: 'neutral' | 'ok' | 'danger' | 'gold' }) {
  const map = {
    neutral: [C.disabled, C.muted], ok: [C.okSoft, C.ok], danger: [C.dangerSoft, C.danger], gold: [C.goldSoft, '#8A6A2A'],
  } as const;
  return (
    <View style={[s.badge, { backgroundColor: map[tone][0] }]}>
      <Text style={[s.badgeText, { color: map[tone][1] }]}>{text}</Text>
    </View>
  );
}

export function Empty({ text }: { text: string }) {
  return <Text style={s.empty}>{text}</Text>;
}

export function Loading() {
  return <ActivityIndicator style={{ marginTop: 32 }} color={C.navy} />;
}

export function Footer() {
  return (
    <View style={{ marginTop: 24, alignItems: 'center' }}>
      <Text style={s.footer}>{COPYRIGHT}</Text>
      <Text style={s.footer}>Sürüm {APP_VERSION}</Text>
    </View>
  );
}

export const s = StyleSheet.create({
  header: { backgroundColor: C.navy, paddingHorizontal: 16, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerSub: { color: C.goldSoft, fontSize: 13, marginTop: 2 },
  backBtn: { paddingRight: 8 },
  backText: { color: '#fff', fontSize: 34, lineHeight: 34, marginTop: -4 },
  screenScroll: { flex: 1, backgroundColor: C.bg },
  screen: { padding: 16, backgroundColor: C.bg, flexGrow: 1 },
  card: { backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  title: { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 8 },
  muted: { color: C.muted, fontSize: 14 },
  label: { fontSize: 13, color: C.muted, marginBottom: 6, fontWeight: '600' },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 11, fontSize: 16, color: C.text,
  },
  btn: { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 9 },
  btnText: { fontSize: 16, fontWeight: '700' },
  tabs: { flexDirection: 'row', backgroundColor: C.navySoft, paddingHorizontal: 8, paddingBottom: 8 },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 9 },
  tabActive: { backgroundColor: C.gold },
  tabText: { color: '#D5DCE8', fontWeight: '600', fontSize: 14 },
  tabTextActive: { color: C.navy },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  empty: { color: C.muted, textAlign: 'center', marginVertical: 24, fontSize: 15 },
  footer: { color: C.muted, fontSize: 11, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
