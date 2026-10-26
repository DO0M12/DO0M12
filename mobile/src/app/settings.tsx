import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn, Card, CardHead, Row, T, success } from '@/components/ui';
import { getApiKey, setApiKey } from '@/lib/claude';
import { HEALTH_SOURCE, openHealthSettings, requestHealthAccess } from '@/lib/health';
import { ensurePermission, syncReminders } from '@/lib/notifications';
import { fresh, useStore } from '@/lib/store';
import { syncHealth } from '@/lib/sync';
import { C, F, GUTTER } from '@/lib/theme';
import type { Reminders } from '@/lib/types';

const REMINDERS: { key: keyof Reminders; label: string; sub: string }[] = [
  { key: 'morning', label: 'Morning plan', sub: 'Daily at 8:45' },
  { key: 'hydration', label: 'Hydration', sub: '11:00, 14:00 and 17:00' },
  { key: 'breaks', label: 'Desk breaks', sub: '13:30, 16:30 and 21:00' },
  { key: 'streams', label: 'Stream reminders', sub: '30 minutes before each stream' },
];

const input = { backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: C.ink, fontFamily: F.regular, fontSize: 15 } as const;

export default function Settings() {
  const insets = useSafeAreaInsets();
  const data = useStore((s) => s.data);
  const mutate = useStore((s) => s.mutate);
  const [name, setName] = useState(data.name);
  const [key, setKey] = useState('');
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    getApiKey().then(setSavedKey).catch(() => setSavedKey(null));
  }, []);

  const connectHealth = async () => {
    setSyncing(true);
    try {
      await requestHealthAccess();
      mutate((d) => void (d.healthEnabled = true));
      await syncHealth(true);
      success();
    } catch {
      Alert.alert('Could not connect', `Check that Cadence is allowed to read data in ${HEALTH_SOURCE}.`);
    } finally {
      setSyncing(false);
    }
  };

  const toggleReminder = async (k: keyof Reminders, on: boolean) => {
    if (on && !(await ensurePermission())) {
      Alert.alert('Notifications are off', 'Allow notifications for Cadence in Settings to get reminders.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]);
      return;
    }
    mutate((d) => void (d.reminders[k] = on));
    const s = useStore.getState().data;
    await syncReminders(s.reminders, s.streams).catch(() => {});
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: GUTTER, paddingBottom: insets.bottom + 40, gap: 12 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
        <T v="h2">Settings</T>
        <Btn label="Done" kind="secondary" onPress={() => router.back()} style={{ paddingVertical: 8 }} />
      </View>

      <Card>
        <CardHead title="Profile" />
        <TextInput
          value={name}
          onChangeText={setName}
          onEndEditing={() => mutate((d) => void (d.name = name.trim() || fresh().name))}
          placeholder="Channel or brand name"
          placeholderTextColor={C.faint}
          accessibilityLabel="Channel or brand name"
          style={input}
        />
        <T v="small">Shown in Studio and given to your advisors.</T>
      </Card>

      <Card>
        <CardHead title="Wearable" right={data.healthEnabled ? 'Connected' : undefined} />
        {HEALTH_SOURCE ? (
          <>
            <T v="meta" style={{ fontSize: 14, lineHeight: 20 }}>
              {`Cadence reads sleep, HRV, resting heart rate, steps and workouts from ${HEALTH_SOURCE}. In the Whoop app turn on the ${HEALTH_SOURCE} integration; in Garmin Connect, enable ${HEALTH_SOURCE} under Connected Apps.`}
            </T>
            {data.healthEnabled ? (
              <View style={{ gap: 8 }}>
                <Btn label={syncing ? 'Syncing…' : 'Sync now'} icon="refresh-cw" disabled={syncing} onPress={async () => { setSyncing(true); await syncHealth(true); setSyncing(false); }} />
                <Btn label={`Manage access in ${HEALTH_SOURCE}`} kind="secondary" onPress={openHealthSettings} />
                <Btn label="Stop syncing" kind="text" onPress={() => mutate((d) => void (d.healthEnabled = false))} />
              </View>
            ) : (
              <Btn label={syncing ? 'Connecting…' : `Connect ${HEALTH_SOURCE}`} icon="heart" disabled={syncing} onPress={connectHealth} />
            )}
          </>
        ) : (
          <T v="meta">Wearable data is available in the iPhone and Android apps.</T>
        )}
      </Card>

      <Card>
        <CardHead title="Advisors" right={savedKey ? 'Key saved' : undefined} />
        <T v="meta" style={{ fontSize: 14, lineHeight: 20 }}>
          Advisors use your own Claude API key. It is stored encrypted on this phone and only sent to Anthropic.
        </T>
        <TextInput
          value={key}
          onChangeText={setKey}
          placeholder={savedKey ? `sk-ant-…${savedKey.slice(-4)}` : 'sk-ant-…'}
          placeholderTextColor={C.faint}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          accessibilityLabel="Claude API key"
          style={input}
        />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn
            label="Save key"
            disabled={!key.trim()}
            style={{ flex: 1 }}
            onPress={async () => {
              await setApiKey(key);
              setSavedKey(key.trim());
              setKey('');
              success();
            }}
          />
          {savedKey ? (
            <Btn
              label="Remove"
              kind="secondary"
              onPress={async () => {
                await setApiKey('');
                setSavedKey(null);
              }}
            />
          ) : null}
        </View>
        <T v="small" onPress={() => Linking.openURL('https://console.anthropic.com/settings/keys')}>
          Create a key at console.anthropic.com
        </T>
      </Card>

      <Card>
        <CardHead title="Reminders" />
        <View>
          {REMINDERS.map((r, i) => (
            <Row key={r.key} first={i === 0} style={{ justifyContent: 'space-between' }}>
              <View style={{ flexShrink: 1 }}>
                <T>{r.label}</T>
                <T v="small">{r.sub}</T>
              </View>
              <Switch
                value={data.reminders[r.key]}
                onValueChange={(v) => toggleReminder(r.key, v)}
                trackColor={{ false: C.raised, true: C.green }}
                thumbColor={C.ink}
                accessibilityLabel={r.label}
              />
            </Row>
          ))}
        </View>
      </Card>

      <Card>
        <CardHead title="Data" />
        <T v="meta" style={{ fontSize: 14, lineHeight: 20 }}>
          Everything you enter stays on this phone. Deleting the app deletes it.
        </T>
        <Btn
          label="Erase all data"
          kind="secondary"
          onPress={() =>
            Alert.alert('Erase all data?', 'Tasks, content, logs and settings will be deleted. Your API key stays saved.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Erase', style: 'destructive', onPress: () => useStore.setState({ data: fresh() }) },
            ])
          }
        />
      </Card>

      <T v="small" style={{ textAlign: 'center', paddingTop: 8 }}>
        Cadence {Constants.expoConfig?.version ?? ''}
      </T>
    </ScrollView>
  );
}
