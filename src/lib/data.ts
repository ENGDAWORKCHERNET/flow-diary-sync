export interface ClassSession {
  id: string;
  subject: string;
  day: number; // 0=Sun,1=Mon...6=Sat
  startTime: string; // "14:00"
  endTime: string; // "15:30"
  colorClass: string;
  room?: string;
  isLab?: boolean;
  labGroup?: string;
}

export interface StudySession {
  startTime: string;
  duration: number; // in seconds
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  subject: string;
  completed: boolean;
  createdAt: string;
  totalTimeSpent?: number;
  sessions?: StudySession[];
  completedAt?: string;
}

export const SUBJECTS = [
  'General',
  'Mathematics',
  'Computer Science',
  'Science',
  'Literature',
] as const;

export const SUBJECT_COLOR: Record<string, string> = {
  'General': 'subject-web',
  'Mathematics': 'subject-math',
  'Computer Science': 'subject-web',
  'Science': 'subject-stats',
  'Literature': 'subject-math',
};

export function getSubjectColor(subject: string): string {
  if (SUBJECT_COLOR[subject]) return SUBJECT_COLOR[subject];
  const colors = ['subject-math', 'subject-web', 'subject-stats'];
  let hash = 0;
  for (let i = 0; i < (subject || '').length; i++) {
    hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export const SCHEDULE: ClassSession[] = [];


export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const QUOTES = [
  "The secret of getting ahead is getting started. — Mark Twain",
  "It always seems impossible until it's done. — Nelson Mandela",
  "Success is the sum of small efforts repeated day in and day out. — Robert Collier",
  "Don't watch the clock; do what it does. Keep going. — Sam Levenson",
  "The future depends on what you do today. — Mahatma Gandhi",
  "Study hard, for the well is deep, and our brains are shallow. — Richard Baxter",
  "Education is the passport to the future. — Malcolm X",
  "Small daily improvements are the key to staggering long-term results.",
  "Push yourself, because no one else is going to do it for you.",
  "Wake up with determination. Go to bed with satisfaction.",
];

export function formatTime12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export const SCHEDULE_KEY = 'studyflow_schedule';

export interface PeriodPreset {
  name: string;
  label: string;
  startTime: string;
  endTime: string;
}

export const PERIOD_PRESETS: PeriodPreset[] = [
  { name: 'Period 1', label: 'Period 1 (08:00 – 09:30 AM)', startTime: '08:00', endTime: '09:30' },
  { name: 'Period 2', label: 'Period 2 (09:45 – 11:15 AM)', startTime: '09:45', endTime: '11:15' },
  { name: 'Period 3', label: 'Period 3 (11:30 AM – 01:00 PM)', startTime: '11:30', endTime: '13:00' },
  { name: 'Period 4', label: 'Period 4 (02:00 – 03:30 PM)', startTime: '14:00', endTime: '15:30' },
  { name: 'Period 5', label: 'Period 5 (03:30 – 05:00 PM)', startTime: '15:30', endTime: '17:00' },
];

export function loadSchedule(): ClassSession[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(SCHEDULE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Clear out old hardcoded sample timetable if present so users start fresh
        const hasLegacy = parsed.some((s: ClassSession) => s.id === '1' && typeof s.subject === 'string' && s.subject.includes('SE2205'));
        if (hasLegacy) {
          localStorage.removeItem(SCHEDULE_KEY);
          return [];
        }
        return parsed;
      }
    }
  } catch {}
  return [];
}

export function saveSchedule(schedule: ClassSession[]): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule));
    }
  } catch {}
}

export function checkScheduleOverlap(
  schedule: ClassSession[],
  candidate: { day: number; startTime: string; endTime: string; id?: string }
): { hasOverlap: boolean; overlappingSession?: ClassSession; error?: string } {
  if (!candidate.startTime || !candidate.endTime) {
    return { hasOverlap: true, error: 'Start time and end time are required.' };
  }
  if (candidate.startTime >= candidate.endTime) {
    return { hasOverlap: true, error: 'End time must be after start time.' };
  }

  const [candStartH, candStartM] = candidate.startTime.split(':').map(Number);
  const [candEndH, candEndM] = candidate.endTime.split(':').map(Number);
  const candStartMin = candStartH * 60 + candStartM;
  const candEndMin = candEndH * 60 + candEndM;

  for (const session of schedule) {
    if (candidate.id && session.id === candidate.id) continue;
    if (session.day !== candidate.day) continue;

    const [sh, sm] = session.startTime.split(':').map(Number);
    const [eh, em] = session.endTime.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;

    if (candStartMin < endMin && candEndMin > startMin) {
      return {
        hasOverlap: true,
        overlappingSession: session,
        error: `Time overlaps with ${session.subject} (${formatTime12(session.startTime)} – ${formatTime12(session.endTime)}).`,
      };
    }
  }

  return { hasOverlap: false };
}

export function getTodayClasses(schedule?: ClassSession[]): ClassSession[] {
  const currentSchedule = schedule || loadSchedule();
  const today = new Date().getDay();
  return currentSchedule.filter(s => s.day === today);
}

export function getNextClass(schedule?: ClassSession[], customNow?: Date): { session: ClassSession; minutesUntil: number } | null {
  const currentSchedule = schedule || loadSchedule();
  const now = customNow || new Date();
  const today = now.getDay();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Check today's remaining classes
  const todayClasses = currentSchedule.filter(s => s.day === today);
  for (const s of todayClasses) {
    const [h, m] = s.startTime.split(':').map(Number);
    const startMin = h * 60 + m;
    if (startMin > nowMinutes) {
      return { session: s, minutesUntil: startMin - nowMinutes };
    }
  }

  // Check future days (up to 7 days ahead)
  for (let d = 1; d <= 7; d++) {
    const checkDay = (today + d) % 7;
    const dayClasses = currentSchedule.filter(s => s.day === checkDay).sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (dayClasses.length > 0) {
      const s = dayClasses[0];
      const [h, m] = s.startTime.split(':').map(Number);
      const minsLeftToday = 24 * 60 - nowMinutes;
      const fullDays = (d - 1) * 24 * 60;
      const minsIntoDay = h * 60 + m;
      return { session: s, minutesUntil: minsLeftToday + fullDays + minsIntoDay };
    }
  }
  return null;
}

export function getCurrentClass(schedule?: ClassSession[], customNow?: Date): ClassSession | null {
  const currentSchedule = schedule || loadSchedule();
  const now = customNow || new Date();
  const today = now.getDay();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return currentSchedule.find(s => {
    if (s.day !== today) return false;
    const [sh, sm] = s.startTime.split(':').map(Number);
    const [eh, em] = s.endTime.split(':').map(Number);
    return nowMinutes >= sh * 60 + sm && nowMinutes < eh * 60 + em;
  }) || null;
}

const TASKS_KEY = 'studyflow_tasks';

export const DEFAULT_TASKS: Task[] = [];

export function loadTasks(): Task[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(TASKS_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Clear out legacy template tasks if present so new users start blank
        const hasLegacy = parsed.some((t: Task) => t.title === 'Discrete Math Problem Set 5' || t.title === 'Build Portfolio Website');
        if (hasLegacy) {
          localStorage.removeItem(TASKS_KEY);
          return [];
        }
        return parsed;
      }
    }
  } catch {}
  return [];
}

export function saveTasks(tasks: Task[]): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    }
  } catch {}
}

export function getDailyQuote(): string {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return QUOTES[dayOfYear % QUOTES.length];
}

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 22) return 'Good evening';
  return 'Good night';
}

export function formatCountdown(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h < 24) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh > 0 ? `${d}d ${rh}h` : `${d}d`;
}

export function isOverdue(task: Task): boolean {
  return !task.completed && new Date(task.dueDate) < new Date();
}

export function getWeekProgress(tasks: Task[]): { completed: number; total: number } {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekTasks = tasks.filter(t => new Date(t.createdAt) >= weekStart);
  return {
    completed: weekTasks.filter(t => t.completed).length,
    total: weekTasks.length,
  };
}
