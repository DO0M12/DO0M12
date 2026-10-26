import Feather from '@expo/vector-icons/Feather';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';

import { HeaderActions } from '@/components/HeaderActions';
import { Btn, Card, Pill, Screen, T, tap } from '@/components/ui';
import { AdvisorError, askAdvisor, firstTurn, getApiKey, textOf, type ChatTurn } from '@/lib/claude';
import { ADVISORS, type AdvisorId } from '@/lib/data';
import { useStore } from '@/lib/store';
import { C, F } from '@/lib/theme';

export default function Coach() {
  const data = useStore((s) => s.data);
  const [advisor, setAdvisor] = useState<AdvisorId>('manager');
  const [convo, setConvo] = useState<ChatTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  // Re-check the key whenever the tab is shown, in case it was just added in Settings.
  useFocusEffect(
    useCallback(() => {
      getApiKey()
        .then((k) => setHasKey(!!k))
        .catch(() => setHasKey(false));
    }, []),
  );

  const ask = async (q: string) => {
    q = q.trim();
    if (!q || busy) return;
    const next = [...convo, convo.length ? ({ role: 'user', content: q } as ChatTurn) : firstTurn(q, data)];
    setConvo(next);
    setText('');
    setError(null);
    setBusy(true);
    try {
      const reply = await askAdvisor(advisor, next, data);
      setConvo([...next, reply]);
    } catch (e) {
      // Drop the unanswered question so the conversation stays valid to resend.
      setConvo(convo);
      setText(q);
      setError(e instanceof AdvisorError ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen eyebrow="Advisors that see your live data" title="Coach" right={<HeaderActions />}>
      <View style={{ gap: 8 }}>
        {(Object.keys(ADVISORS) as AdvisorId[]).map((id) => {
          const a = ADVISORS[id];
          const on = id === advisor;
          return (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => {
                tap();
                if (id === advisor) return;
                setAdvisor(id);
                setConvo([]);
                setError(null);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderRadius: 16, padding: 12, paddingHorizontal: 14, borderWidth: 1.5, borderColor: on ? C.ink : 'transparent' }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: a.color, alignItems: 'center', justifyContent: 'center' }}>
                <T style={{ fontFamily: F.heavy, fontSize: 12.5, letterSpacing: 0.5, color: C.bg }}>{a.mono}</T>
              </View>
              <View style={{ flex: 1 }}>
                <T v="strong">{a.name}</T>
                <T v="small">{a.sub}</T>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Card>
        {hasKey === false ? (
          <View style={{ gap: 12 }}>
            <T v="meta" style={{ fontSize: 14, lineHeight: 20 }}>
              Advisors run on Claude. Add your Claude API key in Settings to start a conversation.
            </T>
            <Btn label="Open Settings" icon="settings" kind="secondary" onPress={() => router.push('/settings')} />
          </View>
        ) : null}

        {convo.length === 0 && hasKey ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {ADVISORS[advisor].quick.map((q) => (
              <Pill key={q} label={q} onPress={() => ask(q)} />
            ))}
          </View>
        ) : null}

        {convo.map((m, i) => {
          const me = m.role === 'user';
          // The first user turn carries the data snapshot; show only the question.
          const body = me && i === 0 ? textOf(m).split('\n\n').slice(1).join('\n\n') : textOf(m);
          return (
            <View
              key={i}
              style={{
                alignSelf: me ? 'flex-end' : 'flex-start',
                maxWidth: '88%',
                backgroundColor: me ? C.ink : C.raised,
                borderRadius: 16,
                borderBottomRightRadius: me ? 6 : 16,
                borderBottomLeftRadius: me ? 16 : 6,
                paddingVertical: 11,
                paddingHorizontal: 14,
              }}>
              <T selectable style={{ color: me ? C.bg : C.ink, fontSize: 15, lineHeight: 21 }}>
                {body}
              </T>
            </View>
          );
        })}

        {busy ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: C.raised, borderRadius: 16, paddingVertical: 11, paddingHorizontal: 14 }}>
            <ActivityIndicator size="small" color={C.muted} />
            <T v="meta">{ADVISORS[advisor].name} is thinking</T>
          </View>
        ) : null}
        {error ? <T style={{ color: C.red, fontSize: 13.5 }}>{error}</T> : null}

        {hasKey ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, backgroundColor: C.bg, borderRadius: 14, paddingLeft: 14, padding: 6 }}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={`Message ${ADVISORS[advisor].name}`}
              placeholderTextColor={C.faint}
              multiline
              accessibilityLabel="Message"
              style={{ flex: 1, color: C.ink, fontFamily: F.regular, fontSize: 15, minHeight: 40, maxHeight: 140, paddingTop: 10, paddingBottom: 8 }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send"
              disabled={busy || !text.trim()}
              onPress={() => {
                tap();
                ask(text);
              }}
              style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', opacity: busy || !text.trim() ? 0.35 : 1 }}>
              <Feather name="arrow-up" size={18} color={C.bg} />
            </Pressable>
          </View>
        ) : null}
        {convo.length ? <Btn label="New conversation" kind="text" onPress={() => setConvo([])} style={{ alignSelf: 'flex-start' }} /> : null}
      </Card>
    </Screen>
  );
}
