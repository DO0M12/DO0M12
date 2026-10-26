import type { Area } from './types';
import { C } from './theme';

export const STAGES = ['Idea', 'Script', 'Record', 'Edit', 'Scheduled', 'Posted'];
export const PLATFORMS = ['YouTube', 'Shorts', 'TikTok', 'Twitch', 'Instagram', 'X'];

export const AREA: Record<Area, { label: string; color: string }> = {
  biz: { label: 'Business', color: C.blue },
  media: { label: 'Content', color: C.violet },
  health: { label: 'Health', color: C.green },
};

export interface Workout {
  t: string;
  min: number;
  items: [string, string][];
}

/** Indexed by Date.getDay(): built for someone who sits at a desk for long hours. */
export const WORKOUTS: Workout[] = [
  { t: 'Recovery', min: 30, items: [['Full-body stretch', '15 min'], ['Easy walk outside', '10 min'], ['Weekly review with Coach', '5 min']] },
  { t: 'Upper push', min: 35, items: [['Push-ups', '3 × 10–15'], ['Dumbbell floor press', '3 × 10'], ['Overhead press', '3 × 10'], ['Bench dips', '3 × 12'], ['Plank', '3 × 40 s']] },
  { t: 'Mobility', min: 45, items: [['Hip flexor stretch', '2 × 45 s / side'], ['Thoracic openers', '2 × 10'], ['Wrist & forearm stretch', '2 × 30 s'], ['Chin tucks', '2 × 10'], ['Brisk walk', '30 min']] },
  { t: 'Upper pull', min: 35, items: [['Dumbbell row', '3 × 10 / arm'], ['Band pull-aparts', '3 × 15'], ['Reverse fly', '3 × 12'], ['Biceps curl', '3 × 12'], ['Dead hang', '3 × 20 s']] },
  { t: 'Zone 2 cardio', min: 40, items: [['Bike, jog or incline walk', '30 min'], ['Wrist extensor stretch', '2 × 30 s'], ['Glute bridge', '2 × 15']] },
  { t: 'Lower body', min: 40, items: [['Goblet squat', '3 × 12'], ['Romanian deadlift', '3 × 10'], ['Reverse lunge', '3 × 8 / leg'], ['Calf raise', '3 × 15'], ['Glute bridge', '3 × 15']] },
  { t: 'Active outdoors', min: 55, items: [['Hoops, hike, bike or swim', '45 min'], ['Cool-down stretch', '10 min']] },
];

export const DEFAULT_HABITS = [
  'Protein with breakfast',
  '20-20-20 eye breaks while gaming',
  'Engage with community for 15 min',
  'No screens 30 min before bed',
  '10 min learning (editing, business, health)',
];

export const DEFAULT_LAUNCH = [
  'Hook lands in the first 5 seconds',
  'Thumbnail readable at phone size',
  'Title under 60 characters, keyword first',
  'Description, tags and chapters filled in',
  'End screen and pinned comment set',
  '2–3 Shorts or TikToks clipped from it',
  'Shared to Discord, X and Instagram stories',
];

export type AdvisorId = 'manager' | 'media' | 'coach';

export interface Advisor {
  name: string;
  sub: string;
  mono: string;
  color: string;
  system: (channel: string) => string;
  quick: string[];
}

export const ADVISORS: Record<AdvisorId, Advisor> = {
  manager: {
    name: 'Chief of Staff',
    sub: 'Priorities, schedule, sponsors, money',
    mono: 'CS',
    color: C.blue,
    system: (channel) =>
      `You are the chief of staff and business manager for ${channel}, a gaming content creator. Be direct and practical. Help them prioritize, plan their day and week, handle sponsor and brand deals, and protect time for content and health. Keep answers short with clear next steps.`,
    quick: ['Plan my day', 'What should I drop this week?', 'Draft a sponsor outreach email'],
  },
  media: {
    name: 'Creative Director',
    sub: 'Ideas, titles, thumbnails, growth',
    mono: 'CD',
    color: C.violet,
    system: (channel) =>
      `You are the creative director for ${channel}, a gaming channel. You know YouTube, Shorts, TikTok and Twitch. Give concrete titles, hooks, thumbnail concepts and posting plans. Keep answers tight.`,
    quick: ['5 video ideas from my idea bank', '3 titles for my next upload', "Plan this week's posting schedule"],
  },
  coach: {
    name: 'Performance Coach',
    sub: 'Training, nutrition, sleep, posture',
    mono: 'PC',
    color: C.green,
    system: (channel) =>
      `You are the performance coach for the creator behind ${channel}. They game and edit at a desk for long hours and may wear a Whoop or Garmin that syncs sleep, HRV, resting heart rate and workouts. Give safe, realistic advice on training, recovery, nutrition, sleep, posture and wrist health, grounded in their numbers. You are not a doctor; suggest seeing one for pain or medical concerns. Keep answers short.`,
    quick: ["I have 15 minutes, adjust today's workout", 'How recovered am I based on my HRV?', 'Help me fix my sleep schedule'],
  },
};
