import { useRef } from 'react';
import { Alert, Platform, Pressable, TextInput, View } from 'react-native';

import { Trend, WeekBars } from '@/components/charts';
import { HeaderActions } from '@/components/HeaderActions';
import { Btn, Card, CardHead, Empty, Row, Screen, Stepper, T, success, tap } from '@/components/ui';
import { WORKOUTS } from '@/lib/data';
import { DAYS, daysAgo, dkey, fmtH } from '@/lib/dates';
import { HEALTH_SOURCE, requestHealthAccess } from '@/lib/health';
import { baseline, dayOf, dayScore, sleepFor, trainingSessions } from '@/lib/scores';
import { useStore, useToday } from '@/lib/store';
import { syncHealth } from '@/lib/sync';
import { C, F } from '@/lib/theme';

export default function Body() {
  const data = useStore((s) => s.data);
  const mutate = useStore((s) => s.mutate);
  const mutateToday = useStore((s) => s.mutateToday);
  const day = useToday();
  const k = dkey();
  const w = WORKOUTS[new Date().getDay()];
  const h = day.health;
  const sessions = trainingSessions(h);
  const sleep = sleepFor(day);

  // Uncontrolled so typing stays smooth; the key remounts it when the saved value changes.
  const weightText = useRef('');

  const connect = async () => {
    try {
      await requestHealthAccess();
      mutate((d) => void (d.healthEnabled = true));
      await syncHealth(true);
      success();
    } catch {
      Alert.alert('Could not connect', `Open ${HEALTH_SOURCE ?? 'your health app'} and check that Cadence is allowed to read data.`);
    }
  };

  // Last 7 days for the bar chart, oldest first.
  const week = Array.from({ length: 7 }, (_, i) => daysAgo(6 - i));
  const weekScores = week.map((d) => dayScore(data, dkey(d)));
  const weekAvg = weekScores.filter((x): x is number => x != null);

  const hrvPts: [number, number][] = [];
  const weightPts: [number, number][] = [];
  for (let i = 29; i >= 0; i--) {
    const x = data.days[dkey(daysAgo(i))];
    if (i < 14 && x?.health?.hrv != null) hrvPts.push([13 - i, x.health.hrv]);
    if (x?.weight) weightPts.push([29 - i, x.weight]);
  }
  const hrvBase = baseline(data, k, 'hrv');
  const rhrBase = baseline(data, k, 'restingHR');
  const recentWorkouts = Array.from({ length: 7 }, (_, i) => dayOf(data, dkey(daysAgo(i))).health?.workouts ?? []).flat().slice(0, 6);
  const lastW = weightPts[weightPts.length - 1];
  const wDiff = lastW && weightPts.length > 1 ? lastW[1] - weightPts[0][1] : 0;

  return (
    <Screen eyebrow={`${new Date().toLocaleDateString(undefined, { weekday: 'long' })} · ${w.t}`} title="Body" right={<HeaderActions />} onRefresh={() => syncHealth(true)}>
      {!data.healthEnabled ? (
        <Card>
          <CardHead title="Wearable" />
          <T v="h2">Connect your Whoop or Garmin</T>
          <T v="meta" style={{ fontSize: 14, lineHeight: 20 }}>
            {HEALTH_SOURCE
              ? `Whoop and Garmin Connect both sync sleep, HRV, resting heart rate and workouts into ${HEALTH_SOURCE}. Turn that on in their apps, then connect Cadence to read it. Your data stays on this phone.`
              : 'Wearable data is available in the iPhone and Android apps.'}
          </T>
          {HEALTH_SOURCE ? <Btn label={`Connect ${HEALTH_SOURCE}`} icon="heart" onPress={connect} /> : null}
        </Card>
      ) : (
        <Card>
          <CardHead title={`Last night · ${HEALTH_SOURCE ?? 'Health'}`} right={data.healthSyncedAt ? `Updated ${new Date(data.healthSyncedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : undefined} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 18 }}>
            <Metric label="Sleep" value={h?.sleepHours != null ? fmtH(h.sleepHours) : '—'} sub={h?.deepMin != null || h?.remMin != null ? `Deep ${h?.deepMin ?? 0}m · REM ${h?.remMin ?? 0}m` : undefined} />
            <Metric label="HRV" value={h?.hrv != null ? `${h.hrv}` : '—'} unit="ms" sub={vsBase(h?.hrv, hrvBase)} />
            <Metric label="Resting HR" value={h?.restingHR != null ? `${h.restingHR}` : '—'} unit="bpm" sub={vsBase(h?.restingHR, rhrBase)} />
            <Metric label="Steps" value={h?.steps != null ? h.steps.toLocaleString() : '—'} sub={`Goal ${data.goals.steps.toLocaleString()}`} />
          </View>
          {!h || (h.sleepHours == null && h.hrv == null && h.steps == null) ? (
            <T v="meta" style={{ fontSize: 13.5, lineHeight: 19 }}>
              Nothing from today yet. Open the Whoop or Garmin Connect app so it syncs, then pull down to refresh.
            </T>
          ) : null}
        </Card>
      )}

      {data.healthEnabled ? (
        <Card>
          <CardHead title="Recent workouts" right="7 days" />
          {recentWorkouts.length ? (
            <View>
              {recentWorkouts.map((x, i) => (
                <Row key={x.id} first={i === 0}>
                  <View style={{ flex: 1 }}>
                    <T>{x.name}</T>
                    <T v="small">{new Date(x.start).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</T>
                  </View>
                  <T v="num" style={{ fontSize: 17 }}>
                    {x.minutes} min
                  </T>
                  {x.km != null || x.kcal != null ? (
                    <T v="meta" style={{ minWidth: 64, textAlign: 'right' }}>
                      {x.km != null ? `${x.km} km` : `${x.kcal} kcal`}
                    </T>
                  ) : null}
                </Row>
              ))}
            </View>
          ) : (
            <Empty>No workouts recorded in the last week.</Empty>
          )}
        </Card>
      ) : null}

      <Card>
        <CardHead title="Today's training" right={`About ${w.min} min`} />
        <T v="h2">{w.t}</T>
        <View>
          {w.items.map(([n, dose], i) => (
            <Row key={n} first={i === 0}>
              <T style={{ flex: 1 }}>{n}</T>
              <T v="meta" style={{ fontSize: 13.5 }}>
                {dose}
              </T>
            </Row>
          ))}
        </View>
        {sessions.length ? (
          <Btn label={`Logged by wearable · ${sessions[0].name} ${sessions[0].minutes} min`} kind="complete" icon="check" onPress={() => {}} />
        ) : (
          <Btn
            label={day.workout ? 'Completed' : 'Mark complete'}
            kind={day.workout ? 'complete' : 'primary'}
            icon={day.workout ? 'check' : undefined}
            onPress={() => {
              if (!day.workout) success();
              mutateToday((d) => void (d.workout = !d.workout));
            }}
          />
        )}
      </Card>

      <Card>
        <CardHead title="Check-in" right="Today" />
        <View>
          <Row first style={{ justifyContent: 'space-between' }}>
            <View>
              <T>Sleep</T>
              {day.sleep == null && h?.sleepHours != null ? <T v="small">From {HEALTH_SOURCE ?? 'your wearable'}</T> : null}
            </View>
            <Stepper
              label="sleep"
              value={sleep ? fmtH(sleep) : '—'}
              onMinus={() => mutateToday((d) => void (d.sleep = sleep ? Math.max(0, sleep - 0.5) || null : null))}
              onPlus={() => mutateToday((d) => void (d.sleep = sleep ? Math.min(14, sleep + 0.5) : 7))}
            />
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <T>Energy</T>
            <View style={{ flexDirection: 'row', gap: 4, backgroundColor: C.bg, borderRadius: 12, padding: 3 }}>
              {[1, 2, 3, 4, 5].map((n) => {
                const on = day.energy === n;
                return (
                  <Pressable
                    key={n}
                    accessibilityRole="button"
                    accessibilityLabel={`Energy ${n} of 5`}
                    accessibilityState={{ selected: on }}
                    onPress={() => {
                      tap();
                      mutateToday((d) => void (d.energy = d.energy === n ? null : n));
                    }}
                    style={{ width: 36, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.ink : 'transparent' }}>
                    <T style={{ fontFamily: F.num, fontSize: 16, color: on ? C.bg : C.muted }}>{n}</T>
                  </Pressable>
                );
              })}
            </View>
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <T>Weight</T>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 }}>
              <TextInput
                key={`weight-${k}-${day.weight ?? ''}`}
                defaultValue={day.weight != null ? String(day.weight) : ''}
                onChangeText={(t) => (weightText.current = t)}
                onEndEditing={() => {
                  const v = parseFloat(weightText.current);
                  mutateToday((d) => void (d.weight = Number.isFinite(v) && v > 0 ? v : null));
                }}
                keyboardType="decimal-pad"
                placeholder="—"
                placeholderTextColor={C.faint}
                accessibilityLabel="Weight in pounds"
                style={{ width: 72, textAlign: 'right', color: C.ink, fontFamily: F.num, fontSize: 20, paddingVertical: Platform.OS === 'android' ? 2 : 6 }}
              />
              <T v="meta">lb</T>
            </View>
          </Row>
        </View>
      </Card>

      <Card>
        <CardHead title="Hydration" right={`${day.water} of ${data.goals.water} glasses`} />
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {Array.from({ length: data.goals.water }, (_, i) => (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={`Set water to ${i + 1} glasses`}
              onPress={() => {
                tap();
                mutateToday((d) => void (d.water = d.water === i + 1 ? i : i + 1));
              }}
              style={{ flex: 1, height: 30, borderRadius: 7, backgroundColor: i < day.water ? C.blue : C.raised }}
            />
          ))}
        </View>
        <Row style={{ justifyContent: 'space-between', paddingBottom: 0 }}>
          <View style={{ flexShrink: 1 }}>
            <T>Desk breaks</T>
            <T v="small">Stand, stretch wrists, look 20 ft away</T>
          </View>
          <Stepper label="desk breaks" value={String(day.breaks)} onMinus={() => mutateToday((d) => void (d.breaks = Math.max(0, d.breaks - 1)))} onPlus={() => mutateToday((d) => void d.breaks++)} />
        </Row>
      </Card>

      <Card>
        <CardHead title="Day score · 7 days" right={weekAvg.length ? `Avg ${Math.round(weekAvg.reduce((a, b) => a + b, 0) / weekAvg.length)}` : undefined} />
        <WeekBars values={weekScores} labels={week.map((d, i) => (i === 6 ? 'Today' : DAYS[d.getDay()]))} />
      </Card>

      {hrvPts.length >= 2 ? (
        <Card>
          <CardHead title="HRV · 14 days" right={hrvBase ? `7-day avg ${Math.round(hrvBase)} ms` : undefined} />
          <Trend points={hrvPts} span={14} color={C.green} />
        </Card>
      ) : null}

      <Card>
        <CardHead title="Weight · 30 days" right={lastW ? `${lastW[1].toFixed(1)} lb${weightPts.length > 1 ? ` · ${wDiff > 0 ? '+' : wDiff < 0 ? '−' : ''}${Math.abs(wDiff).toFixed(1)}` : ''}` : undefined} />
        {weightPts.length >= 2 ? <Trend points={weightPts} span={30} /> : <Empty>Log weight on two or more days to see a trend.</Empty>}
      </Card>

      <Card>
        <CardHead title="Targets" />
        <View>
          <Row first style={{ justifyContent: 'space-between' }}>
            <T>Water</T>
            <Stepper small label="water target" value={`${data.goals.water} glasses`} onMinus={() => mutate((d) => void (d.goals.water = Math.max(1, d.goals.water - 1)))} onPlus={() => mutate((d) => void (d.goals.water = Math.min(16, d.goals.water + 1)))} />
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <T>Sleep</T>
            <Stepper small label="sleep target" value={fmtH(data.goals.sleep)} onMinus={() => mutate((d) => void (d.goals.sleep = Math.max(5, d.goals.sleep - 0.5)))} onPlus={() => mutate((d) => void (d.goals.sleep = Math.min(11, d.goals.sleep + 0.5)))} />
          </Row>
          <Row style={{ justifyContent: 'space-between', paddingBottom: 0 }}>
            <T>Steps</T>
            <Stepper small label="step target" value={data.goals.steps.toLocaleString()} onMinus={() => mutate((d) => void (d.goals.steps = Math.max(2000, d.goals.steps - 1000)))} onPlus={() => mutate((d) => void (d.goals.steps = Math.min(30000, d.goals.steps + 1000)))} />
          </Row>
        </View>
      </Card>
    </Screen>
  );
}

function Metric({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub?: string }) {
  return (
    <View style={{ width: '50%', gap: 3 }}>
      <T v="kicker">{label}</T>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <T style={{ fontFamily: F.numBold, fontSize: 30, lineHeight: 34, color: C.ink }}>{value}</T>
        {unit && value !== '—' ? <T v="meta">{unit}</T> : null}
      </View>
      {sub ? <T v="small">{sub}</T> : null}
    </View>
  );
}

/** "▲ 6 vs avg" comparison against the 7-day baseline. */
function vsBase(v: number | undefined, base: number | null): string | undefined {
  if (base == null) return 'Building baseline';
  if (v == null) return undefined;
  const diff = Math.round(v - base);
  return diff === 0 ? 'At your average' : `${diff > 0 ? '▲' : '▼'} ${Math.abs(diff)} vs avg`;
}
