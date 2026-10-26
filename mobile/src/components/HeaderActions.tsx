import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { useStore } from '@/lib/store';
import { C, F } from '@/lib/theme';
import { Dot, T, tap } from './ui';

/** Health sync status plus the avatar that opens Settings. */
export function HeaderActions() {
  const name = useStore((s) => s.data.name);
  const enabled = useStore((s) => s.data.healthEnabled);
  const syncedAt = useStore((s) => s.data.healthSyncedAt);
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || 'ME';
  const label = !enabled
    ? 'Health off'
    : syncedAt
      ? `Synced ${new Date(syncedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
      : 'Syncing';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Dot color={enabled && syncedAt ? C.green : C.faint} />
        <T v="meta" style={{ fontSize: 12 }}>
          {label}
        </T>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open settings"
        hitSlop={8}
        onPress={() => {
          tap();
          router.push('/settings');
        }}
        style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.raised, alignItems: 'center', justifyContent: 'center' }}>
        <T style={{ fontFamily: F.semibold, fontSize: 11.5, letterSpacing: 0.6, color: C.muted }}>{initials}</T>
      </Pressable>
    </View>
  );
}
