import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { useState, type ComponentProps, type ReactNode } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, F, GUTTER, RADIUS } from '@/lib/theme';

export type IconName = ComponentProps<typeof Feather>['name'];

export const tap = () => Haptics.selectionAsync().catch(() => {});
export const success = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

type Variant = 'body' | 'small' | 'kicker' | 'meta' | 'h1' | 'h2' | 'title' | 'num' | 'strong';

const variants: Record<Variant, TextStyle> = {
  body: { fontFamily: F.regular, fontSize: 15, lineHeight: 21, color: C.ink },
  strong: { fontFamily: F.semibold, fontSize: 15, lineHeight: 21, color: C.ink },
  small: { fontFamily: F.regular, fontSize: 12.5, lineHeight: 17, color: C.muted },
  kicker: { fontFamily: F.semibold, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: C.muted },
  meta: { fontFamily: F.regular, fontSize: 13, color: C.muted, fontVariant: ['tabular-nums'] },
  h1: { fontFamily: F.semibold, fontSize: 30, lineHeight: 35, letterSpacing: -0.4, color: C.ink },
  h2: { fontFamily: F.semibold, fontSize: 22, lineHeight: 27, letterSpacing: -0.2, color: C.ink },
  title: { fontFamily: F.semibold, fontSize: 17, color: C.ink },
  num: { fontFamily: F.num, fontSize: 20, color: C.ink, fontVariant: ['tabular-nums'] },
};

export function T({ v = 'body', color, style, ...rest }: TextProps & { v?: Variant; color?: string }) {
  return <Text {...rest} style={[variants[v], color ? { color } : null, style]} />;
}

export function Screen({
  eyebrow,
  title,
  right,
  children,
  onRefresh,
}: {
  eyebrow?: string;
  title: string;
  right?: ReactNode;
  children: ReactNode;
  onRefresh?: () => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 40, paddingHorizontal: GUTTER, gap: 12 }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      refreshControl={
        onRefresh ? (
          <RefreshControl
            tintColor={C.muted}
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await onRefresh().finally(() => setRefreshing(false));
            }}
          />
        ) : undefined
      }>
      <View style={styles.top}>
        <T style={styles.wordmark}>CADENCE</T>
        {right}
      </View>
      <View style={{ paddingTop: 14, paddingBottom: 6, gap: 2 }}>
        {eyebrow ? <T v="meta">{eyebrow}</T> : null}
        <T v="h1">{title}</T>
      </View>
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function CardHead({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.cardHead}>
      <T v="kicker">{title}</T>
      {typeof right === 'string' ? <T v="meta">{right}</T> : right}
    </View>
  );
}

/** List row with a hairline above every row except the first. */
export function Row({ first, children, style }: { first?: boolean; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, first ? styles.rowFirst : null, style]}>{children}</View>;
}

export function Tick({ on, onPress, label, color = C.ink }: { on: boolean; onPress?: () => void; label: string; color?: string }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      hitSlop={10}
      disabled={!onPress}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={[styles.tick, on ? { backgroundColor: color, borderColor: color } : null]}>
      {on ? <Feather name="check" size={14} color={C.bg} /> : null}
    </Pressable>
  );
}

export function IconBtn({ name, onPress, label, color = C.faint, size = 17 }: { name: IconName; onPress: () => void; label: string; color?: string; size?: number }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.iconBtn, pressed ? { backgroundColor: C.raised } : null]}>
      <Feather name={name} size={size} color={color} />
    </Pressable>
  );
}

export function Seg<K extends string | number>({ options, value, onChange }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  return (
    <View style={styles.seg}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={String(o.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => {
              tap();
              onChange(o.key);
            }}
            style={[styles.segBtn, on ? { backgroundColor: C.raised } : null]}>
            <T style={{ fontFamily: F.medium, fontSize: 13, color: on ? C.ink : C.muted }} numberOfLines={1}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stepper({ value, onMinus, onPlus, label, small }: { value: string; onMinus: () => void; onPlus: () => void; label: string; small?: boolean }) {
  return (
    <View style={styles.stepper}>
      <IconBtn name="minus" label={`Decrease ${label}`} onPress={onMinus} color={C.muted} size={16} />
      <T v="num" style={{ minWidth: small ? 76 : 64, textAlign: 'center', fontSize: small ? 15 : 20 }}>
        {value}
      </T>
      <IconBtn name="plus" label={`Increase ${label}`} onPress={onPlus} color={C.muted} size={16} />
    </View>
  );
}

export function Pill({ label, onPress, icon, active }: { label: string; onPress: () => void; icon?: IconName; active?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.pill, active ? { backgroundColor: C.ink } : null, pressed ? { opacity: 0.8 } : null]}>
      <T style={{ fontFamily: F.semibold, fontSize: 12.5, color: active ? C.bg : C.ink }}>{label}</T>
      {icon ? <Feather name={icon} size={14} color={active ? C.bg : C.ink} /> : null}
    </Pressable>
  );
}

export function Btn({
  label,
  onPress,
  kind = 'primary',
  icon,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'complete' | 'text';
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = { primary: C.ink, secondary: C.raised, complete: C.greenSoft, text: 'transparent' }[kind];
  const fg = { primary: C.bg, secondary: C.ink, complete: C.green, text: C.muted }[kind];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.85 : 1 },
        kind === 'text' ? { paddingHorizontal: 0, paddingVertical: 4 } : null,
        style,
      ]}>
      {icon ? <Feather name={icon} size={16} color={fg} /> : null}
      <T style={{ fontFamily: F.semibold, fontSize: kind === 'text' ? 13 : 15, color: fg }}>{label}</T>
    </Pressable>
  );
}

export function AddInput({ placeholder, onAdd, right }: { placeholder: string; onAdd: (text: string) => void; right?: ReactNode }) {
  const [text, setText] = useState('');
  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onAdd(t);
    setText('');
    tap();
  };
  return (
    <View style={styles.add}>
      <Feather name="plus" size={18} color={C.faint} />
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={C.faint}
        onSubmitEditing={submit}
        returnKeyType="done"
        submitBehavior="submit"
        style={styles.addInput}
        accessibilityLabel={placeholder}
      />
      {right}
      {text.trim() ? <Btn label="Add" onPress={submit} style={{ paddingVertical: 7, paddingHorizontal: 12 }} /> : null}
    </View>
  );
}

export function Chips<K extends string | number>({ options, value, onChange }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
      {options.map((o) => (
        <Pill key={String(o.key)} label={o.label} active={o.key === value} onPress={() => onChange(o.key)} />
      ))}
    </ScrollView>
  );
}

export const Empty = ({ children }: { children: string }) => (
  <T v="meta" style={{ fontSize: 13.5, paddingVertical: 2 }}>
    {children}
  </T>
);

export const Dot = ({ color }: { color: string }) => <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />;

export const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 },
  wordmark: { fontFamily: F.bold, fontSize: 13, letterSpacing: 4.5, color: C.ink },
  card: { backgroundColor: C.surface, borderRadius: RADIUS, padding: 18, gap: 14 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, minHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  rowFirst: { borderTopWidth: 0, paddingTop: 0 },
  tick: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: C.faint, alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  seg: { flexDirection: 'row', backgroundColor: C.bg, borderRadius: 12, padding: 3, gap: 2 },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6, borderRadius: 9 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 12, padding: 3 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C.raised, borderRadius: 99, paddingVertical: 7, paddingHorizontal: 12 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16 },
  add: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.bg, borderRadius: 12, paddingLeft: 12, paddingRight: 6, minHeight: 46 },
  addInput: { flex: 1, color: C.ink, fontFamily: F.regular, fontSize: 15, paddingVertical: 10 },
});
