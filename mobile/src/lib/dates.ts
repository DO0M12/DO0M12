export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const dkey = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const daysAgo = (n: number, from: Date = new Date()) => {
  const d = new Date(from);
  d.setDate(d.getDate() - n);
  return d;
};

export const startOfDay = (d: Date) => {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  return s;
};

export const fromKey = (k: string) => new Date(`${k}T12:00:00`);

/** Monday 00:00 of the current week. */
export const weekStart = (now: Date = new Date()) => {
  const d = startOfDay(now);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
};

export const fmtDate = (k: string) => fromKey(k).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export const fmtTime = (hm: string) => {
  const [h, m] = hm.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

/** 7.5 -> "7h 30m" */
export const fmtH = (h: number) => {
  const m = Math.round((h % 1) * 60);
  return `${Math.floor(h)}h${m ? ` ${m}m` : ''}`;
};

export const greeting = (now: Date = new Date()) => {
  const h = now.getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

/**
 * The day a sleep sample counts toward. Anything ending before 6pm belongs to
 * that morning's day; a late-evening end rolls to the next day.
 */
export const nightKey = (end: Date) => (end.getHours() < 18 ? dkey(end) : dkey(daysAgo(-1, end)));
