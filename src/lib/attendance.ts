/**
 * Attendance tracker data model and localStorage helpers.
 *
 * Key concepts:
 *  - AttendanceRecord: one entry per class occurrence (day + session + date).
 *  - AttendanceSettings: per-subject max allowed absences (skips).
 *  - A "class key" uniquely identifies a class occurrence so we never prompt
 *    for the same class twice in the same session.
 */

export interface AttendanceRecord {
  /** Unique ID for this record */
  id: string;
  /** ClassSession.id from the schedule */
  sessionId: string;
  /** Subject name */
  subject: string;
  /** ISO date string for the date this class occurred (date only, no time) */
  date: string;
  /** true = attended, false = skipped/absent */
  attended: boolean;
  /** When the user answered the prompt */
  recordedAt: string;
}

export interface AttendanceSettings {
  /** Global default: how many absences are allowed before a warning */
  defaultMaxAbsences: number;
  /** Per-subject override: subject name → max absences */
  perSubject: Record<string, number>;
}

export const DEFAULT_ATTENDANCE_SETTINGS: AttendanceSettings = {
  defaultMaxAbsences: 3,
  perSubject: {},
};

// ─── localStorage keys ───────────────────────────────────────────────────────

export const RECORDS_KEY = 'studyflow_attendance_records';
const SETTINGS_KEY = 'studyflow_attendance_settings';
const PROMPTED_KEY = 'studyflow_attendance_prompted';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a stable key that uniquely identifies one class occurrence */
export function classOccurrenceKey(sessionId: string, dateStr: string): string {
  return `${sessionId}__${dateStr}`;
}

/** Today's date as a YYYY-MM-DD string */
export function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Records ─────────────────────────────────────────────────────────────────

export function loadAttendanceRecords(): AttendanceRecord[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(RECORDS_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as AttendanceRecord[];
    }
  } catch { /* ignore */ }
  return [];
}

export function saveAttendanceRecords(records: AttendanceRecord[]): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
    }
  } catch { /* ignore */ }
}

// ─── Settings ────────────────────────────────────────────────────────────────

export function loadAttendanceSettings(): AttendanceSettings {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(SETTINGS_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          defaultMaxAbsences: Number(parsed.defaultMaxAbsences ?? 3),
          perSubject: parsed.perSubject ?? {},
        };
      }
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_ATTENDANCE_SETTINGS };
}

export function saveAttendanceSettings(settings: AttendanceSettings): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
  } catch { /* ignore */ }
}

// ─── Already-prompted set ────────────────────────────────────────────────────

export function loadPromptedKeys(): Set<string> {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(PROMPTED_KEY) : null;
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set<string>(arr);
    }
  } catch { /* ignore */ }
  return new Set<string>();
}

export function savePromptedKeys(keys: Set<string>): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(PROMPTED_KEY, JSON.stringify([...keys]));
    }
  } catch { /* ignore */ }
}

// ─── Stats helpers ────────────────────────────────────────────────────────────

export interface SubjectAttendanceStat {
  subject: string;
  attended: number;
  absent: number;
  total: number;
  maxAbsences: number;
  absencesLeft: number;
  attendanceRate: number; // 0-100
  atRisk: boolean;
}

export function computeStats(
  records: AttendanceRecord[],
  settings: AttendanceSettings,
): SubjectAttendanceStat[] {
  const bySubject: Record<string, { attended: number; absent: number }> = {};

  for (const r of records) {
    if (!bySubject[r.subject]) bySubject[r.subject] = { attended: 0, absent: 0 };
    if (r.attended) bySubject[r.subject].attended++;
    else bySubject[r.subject].absent++;
  }

  return Object.entries(bySubject).map(([subject, counts]) => {
    const maxAbsences =
      settings.perSubject[subject] ?? settings.defaultMaxAbsences;
    const total = counts.attended + counts.absent;
    const absencesLeft = Math.max(0, maxAbsences - counts.absent);
    const attendanceRate = total === 0 ? 100 : Math.round((counts.attended / total) * 100);
    const atRisk = counts.absent >= maxAbsences;

    return {
      subject,
      attended: counts.attended,
      absent: counts.absent,
      total,
      maxAbsences,
      absencesLeft,
      attendanceRate,
      atRisk,
    };
  });
}
