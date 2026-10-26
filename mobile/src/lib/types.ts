export type Area = 'biz' | 'media' | 'health';

export interface Task {
  id: string;
  t: string;
  area: Area;
  done: boolean;
  pri: boolean;
}

export interface Content {
  id: string;
  title: string;
  plat: string;
  /** Index into STAGES; 5 means posted. */
  stage: number;
  due: string;
  postedAt?: string;
}

export interface Idea {
  id: string;
  t: string;
}

export interface Stream {
  id: string;
  /** 0 = Sunday, matching Date.getDay(). */
  day: number;
  /** 24-hour "HH:MM". */
  time: string;
  title: string;
}

export interface HealthWorkout {
  id: string;
  name: string;
  start: string;
  minutes: number;
  kcal?: number;
  km?: number;
}

/** One day of data read from Apple Health or Health Connect. */
export interface HealthDay {
  sleepHours?: number;
  deepMin?: number;
  remMin?: number;
  hrv?: number;
  restingHR?: number;
  steps?: number;
  workouts: HealthWorkout[];
}

export interface DayLog {
  water: number;
  breaks: number;
  focus: number;
  /** Manually marked training as done. */
  workout: boolean;
  habits: string[];
  /** Manually entered sleep in hours; wins over the health value when set. */
  sleep?: number | null;
  energy?: number | null;
  weight?: number | null;
  /** Share of priorities completed, frozen at the end of the day for history. */
  priDone?: number | null;
  health?: HealthDay;
}

export interface Goals {
  water: number;
  sleep: number;
  uploads: number;
  steps: number;
}

export interface Reminders {
  hydration: boolean;
  breaks: boolean;
  streams: boolean;
  morning: boolean;
}

export interface Data {
  v: number;
  name: string;
  tasks: Task[];
  content: Content[];
  ideas: Idea[];
  streams: Stream[];
  days: Record<string, DayLog>;
  habits: string[];
  launch: string[];
  launchDone: string[];
  goals: Goals;
  reminders: Reminders;
  healthEnabled: boolean;
  healthSyncedAt?: string;
}
