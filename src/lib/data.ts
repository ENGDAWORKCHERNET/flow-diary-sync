export interface ClassSession {
  id: string;
  subject: string;
  day: number; // 0=Sun,1=Mon...6=Sat
  startTime: string; // "14:00"
  endTime: string; // "15:30"
  colorClass: string;
  room?: string;
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
}

export const SUBJECTS = [
  'Discrete Mathematics',
  'Web Design & Development I',
  'Statistics & Probability',
] as const;

export const SUBJECT_COLOR: Record<string, string> = {
  'Discrete Mathematics': 'subject-math',
  'Web Design & Development I': 'subject-web',
  'Statistics & Probability': 'subject-stats',
};

export const SCHEDULE: ClassSession[] = [
  { id: '1', subject: 'Discrete Mathematics', day: 1, startTime: '14:00', endTime: '15:30', colorClass: 'subject-math', room: 'LR201' },
  { id: '2', subject: 'Statistics & Probability', day: 1, startTime: '15:45', endTime: '17:15', colorClass: 'subject-stats', room: 'LR302' },
  { id: '3', subject: 'Web Design & Development I', day: 2, startTime: '14:00', endTime: '15:30', colorClass: 'subject-web', room: 'LR202' },
  { id: '4', subject: 'Web Design & Development I', day: 4, startTime: '14:00', endTime: '15:30', colorClass: 'subject-web', room: 'LR202' },
  { id: '5', subject: 'Statistics & Probability', day: 4, startTime: '15:45', endTime: '17:15', colorClass: 'subject-stats', room: 'LR302' },
  { id: '6', subject: 'Discrete Mathematics', day: 6, startTime: '08:00', endTime: '09:30', colorClass: 'subject-math', room: 'LR601' },
];

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

export function getTodayClasses(): ClassSession[] {
  const today = new Date().getDay();
  return SCHEDULE.filter(s => s.day === today);
}

export function getNextClass(): { session: ClassSession; minutesUntil: number } | null {
  const now = new Date();
  const today = now.getDay();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Check today's remaining classes
  const todayClasses = SCHEDULE.filter(s => s.day === today);
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
    const dayClasses = SCHEDULE.filter(s => s.day === checkDay).sort((a, b) => a.startTime.localeCompare(b.startTime));
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

export function getCurrentClass(): ClassSession | null {
  const now = new Date();
  const today = now.getDay();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return SCHEDULE.find(s => {
    if (s.day !== today) return false;
    const [sh, sm] = s.startTime.split(':').map(Number);
    const [eh, em] = s.endTime.split(':').map(Number);
    return nowMinutes >= sh * 60 + sm && nowMinutes < eh * 60 + em;
  }) || null;
}

const TASKS_KEY = 'studyflow_tasks';

const DEFAULT_TASKS: Task[] = [
  {
    id: '1',
    title: 'Discrete Math Problem Set 5',
    description: 'Complete exercises 3.1–3.15 on graph theory',
    dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
    priority: 'high',
    subject: 'Discrete Mathematics',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Build Portfolio Website',
    description: 'HTML/CSS responsive layout with 3 pages',
    dueDate: new Date(Date.now() + 5 * 86400000).toISOString(),
    priority: 'medium',
    subject: 'Web Design & Development I',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'Statistics Quiz Prep',
    description: 'Review chapters 4–6 on probability distributions',
    dueDate: new Date(Date.now() + 1 * 86400000).toISOString(),
    priority: 'high',
    subject: 'Statistics & Probability',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: '4',
    title: 'Read Chapter 4 — Relations',
    description: 'Discrete math textbook chapter on relations and functions',
    dueDate: new Date(Date.now() - 1 * 86400000).toISOString(),
    priority: 'low',
    subject: 'Discrete Mathematics',
    completed: true,
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
];

export function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  saveTasks(DEFAULT_TASKS);
  return DEFAULT_TASKS;
}

export function saveTasks(tasks: Task[]): void {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
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
