import React from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { C } from './components';
import { DAY_SHORT, MONTHS, addDays, parseDate, todayStr } from '../util';

export function DateStrip({ value, onChange, days = 21, isOpen }: {
  value: string; onChange: (d: string) => void; days?: number; isOpen?: (d: string) => boolean;
}) {
  const t = todayStr();
  const list = Array.from({ length: days }, (_, i) => addDays(t, i));
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12, flexGrow: 0 }}
      contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
      {list.map((d) => {
        const dt = parseDate(d);
        const sel = d === value;
        const open = isOpen ? isOpen(d) : true;
        return (
          <Pressable key={d} onPress={() => onChange(d)} accessibilityLabel={`Tarih ${d}`} testID={`date-${d}`} style={{
            width: 58, paddingVertical: 8, borderRadius: 12, alignItems: 'center', borderWidth: 1,
            backgroundColor: sel ? C.navy : open ? '#fff' : C.disabled, borderColor: sel ? C.navy : C.border,
          }}>
            <Text style={{ fontSize: 12, color: sel ? C.goldSoft : open ? C.muted : C.disabledText }}>
              {d === t ? 'Bugün' : DAY_SHORT[dt.getDay()]}
            </Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: sel ? '#fff' : open ? C.text : C.disabledText }}>{dt.getDate()}</Text>
            <Text style={{ fontSize: 11, color: sel ? C.goldSoft : open ? C.muted : C.disabledText }}>{MONTHS[dt.getMonth()].slice(0, 3)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
