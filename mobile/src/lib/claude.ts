import Anthropic from '@anthropic-ai/sdk';
import { fetch as expoFetch } from 'expo/fetch';
import * as SecureStore from 'expo-secure-store';

import { ADVISORS, STAGES, WORKOUTS, type AdvisorId } from './data';
import { DAYS, daysAgo, dkey } from './dates';
import { baseline, dayOf, dayScore, scores, sleepFor } from './scores';
import type { Data } from './types';

const KEY_NAME = 'anthropic_api_key';
const MODEL = 'claude-opus-5-5';

export const getApiKey = () => SecureStore.getItemAsync(KEY_NAME);
export const setApiKey = (key: string) =>
  key ? SecureStore.setItemAsync(KEY_NAME, key.trim()) : SecureStore.deleteItemAsync(KEY_NAME);

export type ChatTurn = Anthropic.Beta.BetaMessageParam;

/** A snapshot of the user's live data that every advisor gets with the first question. */
export function buildContext(data: Data, now: Date = new Date()): string {
  const k = dkey(now);
  const d = dayOf(data, k);
  const r = scores(data, k, now);
  const last7 = Array.from({ length: 7 }, (_, i) => dkey(daysAgo(7 - i, now)))
    .filter((key) => data.days[key])
    .map((key) => {
      const x = data.days[key];
      return {
        date: key,
        dayScore: dayScore(data, key, now),
        sleepHours: sleepFor(x),
        hrv: x.health?.hrv ?? null,
        restingHR: x.health?.restingHR ?? null,
        steps: x.health?.steps ?? null,
        workouts: x.health?.workouts.map((w) => `${w.name} ${w.minutes} min`) ?? [],
        trainingMarkedDone: x.workout,
        water: x.water,
        energy: x.energy ?? null,
        weight: x.weight ?? null,
        focusBlocks: x.focus,
      };
    });
  return JSON.stringify({
    now: now.toString(),
    scoresToday: { readiness: r.readiness.score, execution: r.execution.score, activity: r.activity.score },
    baselines: { hrv: baseline(data, k, 'hrv'), restingHR: baseline(data, k, 'restingHR') },
    openTasks: data.tasks.filter((t) => !t.done).map((t) => ({ task: t.t, area: t.area, priority: t.pri })),
    production: data.content.filter((c) => c.stage < 5).map((c) => ({ title: c.title, platform: c.plat, stage: STAGES[c.stage], due: c.due || null })),
    shipped: data.content.filter((c) => c.stage === 5).map((c) => ({ title: c.title, platform: c.plat, posted: c.postedAt ?? null })),
    uploadTargetPerWeek: data.goals.uploads,
    ideas: data.ideas.map((i) => i.t),
    streamSchedule: data.streams.map((s) => `${DAYS[s.day]} ${s.time} ${s.title}`),
    todaysPlannedTraining: WORKOUTS[now.getDay()],
    today: {
      sleepHours: sleepFor(d),
      sleepTarget: data.goals.sleep,
      deepSleepMin: d.health?.deepMin ?? null,
      remSleepMin: d.health?.remMin ?? null,
      hrv: d.health?.hrv ?? null,
      restingHR: d.health?.restingHR ?? null,
      steps: d.health?.steps ?? null,
      wearableWorkouts: d.health?.workouts ?? [],
      water: d.water,
      waterTarget: data.goals.water,
      energy: d.energy ?? null,
      habitsDone: d.habits,
      habits: data.habits,
    },
    last7Days: last7,
  });
}

export class AdvisorError extends Error {}

/**
 * Sends the conversation to Claude and returns the assistant turn to append.
 * The whole content array is returned (not just the text) because thinking blocks
 * have to be passed back unchanged on the next request.
 */
export async function askAdvisor(advisor: AdvisorId, history: ChatTurn[], data: Data): Promise<ChatTurn> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new AdvisorError('Add your Claude API key in Settings to use advisors.');

  // The key lives only on this device. Before shipping to other people, move this
  // call behind your own server so the key is never in the app.
  const client = new Anthropic({
    apiKey,
    fetch: expoFetch as unknown as typeof globalThis.fetch,
    timeout: 120_000,
  });

  try {
    const res = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      // If a safety classifier declines, the API retries on a fallback model in the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      // Chat answers do well at low effort; raise it for deeper planning.
      output_config: { effort: 'low' },
      system: [
        {
          type: 'text',
          text: `${ADVISORS[advisor].system(data.name)}\nThe user's live data from the Cadence app arrives as JSON with their first message. Use it when it helps. Write plain text with short paragraphs or simple dashes; no markdown headings or bold.`,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: history,
    });
    if (res.stop_reason === 'refusal') {
      throw new AdvisorError("That one couldn't be answered. Try rephrasing the question.");
    }
    return { role: 'assistant', content: res.content };
  } catch (e) {
    if (e instanceof AdvisorError) throw e;
    if (e instanceof Anthropic.AuthenticationError) throw new AdvisorError('Your API key was rejected. Check it in Settings.');
    if (e instanceof Anthropic.RateLimitError) throw new AdvisorError('Too many requests right now. Try again in a minute.');
    if (e instanceof Anthropic.APIConnectionError) throw new AdvisorError("Couldn't reach Claude. Check your connection.");
    if (e instanceof Anthropic.APIError) throw new AdvisorError(`Claude returned an error (${e.status ?? 'unknown'}). Try again shortly.`);
    throw new AdvisorError('Something went wrong. Try again.');
  }
}

/** First message of a conversation carries the data snapshot. */
export const firstTurn = (question: string, data: Data): ChatTurn => ({
  role: 'user',
  content: `My data right now:\n${buildContext(data)}\n\n${question}`,
});

export const textOf = (turn: ChatTurn): string =>
  typeof turn.content === 'string'
    ? turn.content
    : (turn.content ?? [])
        .map((b) => (b.type === 'text' ? b.text : ''))
        .join('')
        .trim();
