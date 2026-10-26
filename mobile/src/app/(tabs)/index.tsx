import Feather from '@expo/vector-icons/Feather';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { HeaderActions } from '@/components/HeaderActions';
import { Ring } from '@/components/Ring';
import { AddInput, Card, CardHead, Chips, Empty, IconBtn, Row, Screen, Seg, T, Tick, success, tap } from '@/components/ui';
import { AREA } from '@/lib/data';
import { dkey, greeting } from '@/lib/dates';
import { cancelNotification, scheduleFocusEnd } from '@/lib/notifications';
import { readinessColor, readinessNote, scores, type RingId } from '@/lib/scores';
import { uid, useStore, useToday } from '@/lib/store';
import { syncHealth } from '@/lib/sync';
import { C, F } from '@/lib/theme';
import type { Area, Task } from '@/lib/types';

const RING: Record<RingId, { label: string; note: (s: number | null) => string; color: (s: number | null) => string }> = {
  readiness: { label: 'Readiness', note: readinessNote, color: (s) => readinessColor(s, C) },
  execution: { label: 'Execution', note: () => "How much of today's plan is done: priorities, focused work and habits.", color: () => C.blue },
  activity: { label: 'Activity', note: () => 'Training, steps, hydration and time away from the desk.', color: () => C.orange },
};

export default function Today() {
  const data = useStore((s) => s.data);
  const mutate = useStore((s) => s.mutate);
  const mutateToday = useStore((s) => s.mutateToday);
  const day = useToday();
  const [sel, setSel] = useState<RingId>('readiness');
  const [filter, setFilter] = useState<'all' | Area>('all');
  const [area, setArea] = useState<Area>('biz');

  const k = dkey();
  const R = scores(data, k);
  const priV = R.execution.rows[0].v;

  // Freeze today's priority completion into the log so history keeps it.
  useEffect(() => {
    if ((day.priDone ?? null) !== priV && data.days[k]) mutateToday((d) => (d.priDone = priV));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priV]);

  const pri = data.tasks.filter((t) => t.pri);
  const list = data.tasks.filter((t) => filter === 'all' || t.area === filter).sort((a, b) => Number(a.done) - Number(b.done));
  const cur = R[sel];
  const col = RING[sel].color(cur.score);

  const taskRow = (t: Task, i: number) => (
    <Row key={t.id} first={i === 0}>
      <Tick
        on={t.done}
        label={`Complete ${t.t}`}
        onPress={() =>
          mutate((d) => {
            const x = d.tasks.find((y) => y.id === t.id);
            if (x) x.done = !x.done;
          })
        }
      />
      <View style={{ flex: 1 }}>
        <T style={t.done ? { color: C.faint, textDecorationLine: 'line-through' } : null}>{t.t}</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: AREA[t.area].color }} />
          <T v="small">{AREA[t.area].label}</T>
        </View>
      </View>
      <IconBtn
        name="flag"
        label={t.pri ? 'Remove from priorities' : 'Make a priority'}
        color={t.pri ? C.orange : C.faint}
        onPress={() =>
          mutate((d) => {
            const x = d.tasks.find((y) => y.id === t.id);
            if (!x) return;
            if (!x.pri && d.tasks.filter((y) => y.pri).length >= 3) return;
            x.pri = !x.pri;
          })
        }
      />
      <IconBtn name="x" label={`Delete ${t.t}`} onPress={() => mutate((d) => void (d.tasks = d.tasks.filter((y) => y.id !== t.id)))} />
    </Row>
  );

  return (
    <Screen eyebrow={new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} title={greeting()} right={<HeaderActions />} onRefresh={() => syncHealth(true)}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(Object.keys(RING) as RingId[]).map((id) => {
          const s = R[id].score;
          const on = id === sel;
          return (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityLabel={`${RING[id].label} ${s == null ? 'not available' : `${s} percent`}`}
              onPress={() => {
                tap();
                setSel(id);
              }}
              style={{ flex: 1, alignItems: 'center', gap: 10, paddingTop: 14, paddingBottom: 12, borderRadius: 18, backgroundColor: on ? C.surface : 'transparent' }}>
              <Ring score={s} color={RING[id].color(s)} size={98} />
              <T v="kicker" color={on ? C.ink : C.muted}>
                {RING[id].label}
              </T>
            </Pressable>
          );
        })}
      </View>

      <Card>
        <CardHead title={RING[sel].label} right="Contributors" />
        <T v="meta" style={{ fontSize: 13.5, lineHeight: 19 }}>
          {RING[sel].note(cur.score)}
        </T>
        {cur.rows.map((r) => (
          <View key={r.n} style={{ gap: 7 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T>{r.n}</T>
              <T v="meta">{r.txt}</T>
            </View>
            <View style={{ height: 4, borderRadius: 4, backgroundColor: C.raised, overflow: 'hidden' }}>
              <View style={{ width: `${Math.round((r.v ?? 0) * 100)}%`, height: '100%', borderRadius: 4, backgroundColor: col }} />
            </View>
          </View>
        ))}
      </Card>

      <Card>
        <CardHead title="Priorities" right={pri.length ? `${pri.filter((t) => t.done).length} of ${pri.length} done` : undefined} />
        {pri.length ? <View>{pri.map(taskRow)}</View> : <Empty>{'Flag up to three tasks below to set today’s priorities.'}</Empty>}
      </Card>

      <FocusTimer focus={day.focus} onComplete={() => mutateToday((d) => void d.focus++)} />

      <Card>
        <CardHead title="Tasks" right={<T v="meta" onPress={() => mutate((d) => void (d.tasks = d.tasks.filter((t) => !t.done)))} style={{ fontFamily: F.medium }}>Clear completed</T>} />
        <Seg
          value={filter}
          onChange={setFilter}
          options={[
            { key: 'all', label: 'All' },
            { key: 'biz', label: 'Business' },
            { key: 'media', label: 'Content' },
            { key: 'health', label: 'Health' },
          ]}
        />
        <AddInput placeholder="Add a task" onAdd={(t) => mutate((d) => void d.tasks.unshift({ id: uid(), t, area, done: false, pri: false }))} />
        <Chips value={area} onChange={setArea} options={(Object.keys(AREA) as Area[]).map((a) => ({ key: a, label: AREA[a].label }))} />
        {list.length ? <View>{list.map(taskRow)}</View> : <Empty>No tasks here yet.</Empty>}
      </Card>

      <Card>
        <CardHead title="Daily habits" right={`${day.habits.filter((h) => data.habits.includes(h)).length} of ${data.habits.length}`} />
        <View>
          {data.habits.map((h, i) => {
            const on = day.habits.includes(h);
            return (
              <Row key={h} first={i === 0}>
                <Tick on={on} label={h} onPress={() => mutateToday((d) => void (d.habits = on ? d.habits.filter((x) => x !== h) : [...d.habits, h]))} />
                <T style={[{ flex: 1 }, on ? { color: C.faint, textDecorationLine: 'line-through' } : null]}>{h}</T>
                <IconBtn name="x" label={`Remove habit ${h}`} onPress={() => mutate((d) => void (d.habits = d.habits.filter((x) => x !== h)))} />
              </Row>
            );
          })}
        </View>
        <AddInput placeholder="Add a habit" onAdd={(h) => mutate((d) => void (d.habits.includes(h) || d.habits.push(h)))} />
      </Card>
    </Screen>
  );
}

const MODES = [
  { key: 25, label: 'Focus 25' },
  { key: 50, label: 'Deep work 50' },
  { key: 5, label: 'Break 5' },
];

function FocusTimer({ focus, onComplete }: { focus: number; onComplete: () => void }) {
  const [mode, setMode] = useState(25);
  const [left, setLeft] = useState(25 * 60);
  const [endAt, setEndAt] = useState<number | null>(null);
  const notifId = useRef<string | null>(null);

  useEffect(() => {
    if (!endAt) return;
    const id = setInterval(() => {
      const s = Math.max(0, Math.round((endAt - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) {
        setEndAt(null);
        notifId.current = null;
        success();
        if (mode !== 5) onComplete();
        setLeft(mode * 60);
      }
    }, 250);
    return () => clearInterval(id);
  }, [endAt, mode, onComplete]);

  const stop = () => {
    setEndAt(null);
    if (notifId.current) cancelNotification(notifId.current).catch(() => {});
    notifId.current = null;
  };
  const start = async () => {
    setEndAt(Date.now() + left * 1000);
    notifId.current = await scheduleFocusEnd(left, mode === 5 ? 'Break' : 'Focus block').catch(() => null);
  };
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');

  return (
    <Card>
      <CardHead title="Focus" right={`${focus} block${focus === 1 ? '' : 's'} today`} />
      <Seg
        value={mode}
        options={MODES}
        onChange={(m) => {
          stop();
          setMode(m);
          setLeft(m * 60);
        }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <T style={{ fontFamily: F.numBold, fontSize: 60, lineHeight: 64, color: C.ink, fontVariant: ['tabular-nums'] }}>
          {mm}:{ss}
        </T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <IconBtn
            name="rotate-ccw"
            label="Reset timer"
            onPress={() => {
              stop();
              setLeft(mode * 60);
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={endAt ? 'Pause timer' : 'Start timer'}
            onPress={() => {
              tap();
              if (endAt) stop();
              else start();
            }}
            style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name={endAt ? 'pause' : 'play'} size={22} color={C.bg} style={endAt ? null : { marginLeft: 3 }} />
          </Pressable>
        </View>
      </View>
    </Card>
  );
}
