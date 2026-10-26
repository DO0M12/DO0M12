import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { HeaderActions } from '@/components/HeaderActions';
import { AddInput, Btn, Card, CardHead, Chips, Empty, IconBtn, Pill, Row, Screen, Stepper, T, Tick, success } from '@/components/ui';
import { PLATFORMS, STAGES } from '@/lib/data';
import { DAYS, daysAgo, dkey, fmtDate, fmtTime, fromKey, weekStart } from '@/lib/dates';
import { uid, useStore } from '@/lib/store';
import { C, F } from '@/lib/theme';

const DUE = [
  { key: 0, label: 'No date' },
  { key: 1, label: 'Tomorrow' },
  { key: 3, label: 'In 3 days' },
  { key: 7, label: 'In a week' },
];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function Studio() {
  const data = useStore((s) => s.data);
  const mutate = useStore((s) => s.mutate);
  const [plat, setPlat] = useState('YouTube');
  const [due, setDue] = useState(0);
  const [sDay, setSDay] = useState(new Date().getDay());
  const [sTime, setSTime] = useState('19:00');
  const [sTitle, setSTitle] = useState('');

  const ws = weekStart();
  const shippedWeek = data.content.filter((c) => c.stage === 5 && c.postedAt && fromKey(c.postedAt) >= ws).length;
  const goal = data.goals.uploads;
  const left = goal - shippedWeek;
  const daysLeft = 7 - ((new Date().getDay() + 6) % 7);
  const active = data.content.filter((c) => c.stage < 5).sort((a, b) => b.stage - a.stage);
  const shipped = data.content
    .filter((c) => c.stage === 5)
    .sort((a, b) => (b.postedAt ?? '').localeCompare(a.postedAt ?? ''))
    .slice(0, 6);
  const streams = data.streams.slice().sort((a, b) => (a.day + 6) % 7 - (b.day + 6) % 7 || a.time.localeCompare(b.time));
  const today = new Date().getDay();
  const launchDone = data.launch.filter((x) => data.launchDone.includes(x)).length;
  const validTime = /^([01]?\d|2[0-3]):[0-5]\d$/.test(sTime);

  const move = (id: string, delta: number) => {
    const before = data.content.find((x) => x.id === id)?.stage ?? 0;
    if (before + delta === 5) success();
    mutate((d) => {
      const c = d.content.find((x) => x.id === id);
      if (!c) return;
      c.stage = Math.max(0, Math.min(5, c.stage + delta));
      if (c.stage === 5) c.postedAt = dkey();
      else delete c.postedAt;
    });
  };
  const remove = (id: string) => mutate((d) => void (d.content = d.content.filter((x) => x.id !== id)));

  return (
    <Screen eyebrow={data.name} title="Studio" right={<HeaderActions />}>
      <Card>
        <CardHead
          title="Uploads this week"
          right={
            <Stepper
              small
              label="weekly upload target"
              value={`Target ${goal}`}
              onMinus={() => mutate((d) => void (d.goals.uploads = Math.max(1, d.goals.uploads - 1)))}
              onPlus={() => mutate((d) => void (d.goals.uploads = Math.min(21, d.goals.uploads + 1)))}
            />
          }
        />
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <T style={{ fontFamily: F.numBold, fontSize: 54, lineHeight: 58, color: C.ink }}>{shippedWeek}</T>
          <T style={{ fontFamily: F.num, fontSize: 22, color: C.muted }}>/ {goal}</T>
        </View>
        <View style={{ height: 6, borderRadius: 6, backgroundColor: C.raised, overflow: 'hidden' }}>
          <View style={{ width: `${Math.min(100, (shippedWeek / goal) * 100)}%`, height: '100%', backgroundColor: C.violet, borderRadius: 6 }} />
        </View>
        <T v="meta" style={{ fontSize: 13.5 }}>
          {left <= 0 ? 'Weekly target hit. Anything else is a bonus.' : `${left} more to hit your target, ${daysLeft} day${daysLeft === 1 ? '' : 's'} left this week.`}
        </T>
      </Card>

      <Card>
        <CardHead title="In production" right={active.length ? `${active.length} active` : undefined} />
        <AddInput
          placeholder="New video or post"
          onAdd={(title) => mutate((d) => void d.content.push({ id: uid(), title, plat, stage: 0, due: due ? dkey(daysAgo(-due)) : '' }))}
        />
        <Chips value={plat} onChange={setPlat} options={PLATFORMS.map((p) => ({ key: p, label: p }))} />
        <Chips value={due} onChange={setDue} options={DUE} />
        {active.length ? (
          <View>
            {active.map((c, i) => (
              <Row key={c.id} first={i === 0} style={{ alignItems: 'flex-start' }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <T>{c.title}</T>
                  <T v="small">{[c.plat, STAGES[c.stage], c.due ? `Due ${fmtDate(c.due)}` : null].filter(Boolean).join(' · ')}</T>
                  <View style={{ flexDirection: 'row', gap: 3, marginTop: 8, maxWidth: 200 }}>
                    {STAGES.map((s, j) => (
                      <View key={s} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: j <= c.stage ? C.violet : C.raised }} />
                    ))}
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  {c.stage > 0 ? <IconBtn name="chevron-left" label={`Move back to ${STAGES[c.stage - 1]}`} onPress={() => move(c.id, -1)} /> : null}
                  <Pill label={STAGES[c.stage + 1]} icon="chevron-right" onPress={() => move(c.id, 1)} />
                  <IconBtn name="x" label={`Delete ${c.title}`} onPress={() => remove(c.id)} />
                </View>
              </Row>
            ))}
          </View>
        ) : (
          <Empty>Nothing in production. Add a title or develop an idea.</Empty>
        )}
      </Card>

      <Card>
        <CardHead title="Shipped" />
        {shipped.length ? (
          <View>
            {shipped.map((c, i) => (
              <Row key={c.id} first={i === 0}>
                <Tick on label="Shipped" color={C.green} />
                <View style={{ flex: 1 }}>
                  <T>{c.title}</T>
                  <T v="small">
                    {c.plat}
                    {c.postedAt ? ` · Posted ${fmtDate(c.postedAt)}` : ''}
                  </T>
                </View>
                <IconBtn name="chevron-left" label="Move back to Scheduled" onPress={() => move(c.id, -1)} />
                <IconBtn name="x" label={`Delete ${c.title}`} onPress={() => remove(c.id)} />
              </Row>
            ))}
          </View>
        ) : (
          <Empty>Finished uploads show up here.</Empty>
        )}
      </Card>

      <Card>
        <CardHead title="Stream schedule" right={data.reminders.streams ? 'Reminder 30 min before' : undefined} />
        {streams.length ? (
          <View>
            {streams.map((s, i) => (
              <Row key={s.id} first={i === 0}>
                <View style={{ width: 46, alignItems: 'center', paddingVertical: 7, borderRadius: 9, backgroundColor: s.day === today ? C.ink : C.raised }}>
                  <T v="kicker" color={s.day === today ? C.bg : C.muted} style={{ fontFamily: F.bold }}>
                    {DAYS[s.day]}
                  </T>
                </View>
                <View style={{ flex: 1 }}>
                  <T>{s.title}</T>
                  <T v="small">
                    {fmtTime(s.time)}
                    {s.day === today ? ' · Tonight' : ''}
                  </T>
                </View>
                <IconBtn name="x" label="Remove stream" onPress={() => mutate((d) => void (d.streams = d.streams.filter((x) => x.id !== s.id)))} />
              </Row>
            ))}
          </View>
        ) : (
          <Empty>Add your regular stream nights below.</Empty>
        )}
        <Chips value={sDay} onChange={setSDay} options={WEEK_ORDER.map((d) => ({ key: d, label: DAYS[d] }))} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            value={sTime}
            onChangeText={setSTime}
            placeholder="19:00"
            placeholderTextColor={C.faint}
            keyboardType="numbers-and-punctuation"
            accessibilityLabel="Start time, 24-hour"
            style={{ width: 84, backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 12, color: validTime ? C.ink : C.red, fontFamily: F.num, fontSize: 17 }}
          />
          <TextInput
            value={sTitle}
            onChangeText={setSTitle}
            placeholder="Game or show"
            placeholderTextColor={C.faint}
            accessibilityLabel="Stream title"
            style={{ flex: 1, minWidth: 0, backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 12, minHeight: 46, color: C.ink, fontFamily: F.regular, fontSize: 15 }}
          />
          <Btn
            label="Add"
            kind="secondary"
            style={{ paddingHorizontal: 14 }}
            disabled={!sTitle.trim() || !validTime}
            onPress={() => {
              const [h, m] = sTime.split(':');
              mutate((d) => void d.streams.push({ id: uid(), day: sDay, time: `${h.padStart(2, '0')}:${m}`, title: sTitle.trim() }));
              setSTitle('');
            }}
          />
        </View>
      </Card>

      <Card>
        <CardHead title="Ideas" right={data.ideas.length ? `${data.ideas.length} saved` : undefined} />
        <AddInput placeholder="Capture an idea" onAdd={(t) => mutate((d) => void d.ideas.unshift({ id: uid(), t }))} />
        {data.ideas.length ? (
          <View>
            {data.ideas.map((idea, i) => (
              <Row key={idea.id} first={i === 0}>
                <T style={{ flex: 1 }}>{idea.t}</T>
                <Pill
                  label="Develop"
                  icon="chevron-right"
                  onPress={() =>
                    mutate((d) => {
                      d.content.push({ id: uid(), title: idea.t, plat: 'YouTube', stage: 0, due: '' });
                      d.ideas = d.ideas.filter((x) => x.id !== idea.id);
                    })
                  }
                />
                <IconBtn name="x" label="Delete idea" onPress={() => mutate((d) => void (d.ideas = d.ideas.filter((x) => x.id !== idea.id)))} />
              </Row>
            ))}
          </View>
        ) : (
          <Empty>Ideas you have mid-session land here.</Empty>
        )}
      </Card>

      <Card>
        <CardHead title="Publish checklist" right={`${launchDone} of ${data.launch.length}`} />
        <View>
          {data.launch.map((item, i) => {
            const on = data.launchDone.includes(item);
            return (
              <Row key={item} first={i === 0}>
                <Tick on={on} label={item} onPress={() => mutate((d) => void (d.launchDone = on ? d.launchDone.filter((x) => x !== item) : [...d.launchDone, item]))} />
                <T style={[{ flex: 1 }, on ? { color: C.faint, textDecorationLine: 'line-through' } : null]}>{item}</T>
              </Row>
            );
          })}
        </View>
        <Btn label="Reset for next upload" kind="text" onPress={() => mutate((d) => void (d.launchDone = []))} style={{ alignSelf: 'flex-start' }} />
      </Card>
    </Screen>
  );
}
