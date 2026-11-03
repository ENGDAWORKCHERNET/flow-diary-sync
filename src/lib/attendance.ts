/**
 * Attendance tracker data model and localStorage helpers.
 *
 * Concepts:
 *  - AttendanceRecord: one entry per attendance event (attended or missed).
 *  - AttendanceSettings: per-subject max allowed absences (default: 5).
 *  - computeStats: evaluates attendance percentages, status, streaks, warnings.
 */

export interface AttendanceRecord {
  /** Unique ID for this record */
  id: string;
  /** ClassSession.id from the schedule (or empty/manual if not linked) */
  sessionId?: string;
  /** Subject name */
  subject: string;
  /** ISO date string (YYYY-MM-DD) */
  date: string;
  /** true = attended, false = skipped/missed */
  attended: boolean;
  /** Full ISO timestamp when recorded */
  recordedAt: string;
  /** Optional note or tag (e.g. 'From Schedule', 'Auto-Prompt') */
  note?: string;
}

export interface AttendanceSettings {
  /** Global default: how many absences are allowed before reaching limit (default: 5) */
  defaultMaxAbsences: number;
  /** Per-subject override: subject name -> max absences */
  perSubject: Record<string, number>;
}

export const DEFAULT_ATTENDANCE_SETTINGS: AttendanceSettings = {
  defaultMaxAbsences: 5,
  perSubject: {},
};

// ─── localStorage keys ───────────────────────────────────────────────────────

export const RECORDS_KEY = 'studyflow_attendance_records';
export const SETTINGS_KEY = 'studyflow_attendance_settings';
export const PROMPTED_KEY = 'studyflow_attendance_prompted';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a stable key that uniquely identifies one class occurrence */
export function classOccurrenceKey(sessionId: string, dateStr: string): string {
  return `${sessionId}__${dateStr}`;
}

/** Today's date as a YYYY-MM-DD string in local time */
export function todayDateStr(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ─── Records Persistence ─────────────────────────────────────────────────────

export function loadAttendanceRecords(): AttendanceRecord[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(RECORDS_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as AttendanceRecord[];
    }
  } catch {
    /* ignore */
  }
  return [];
}

export function saveAttendanceRecords(records: AttendanceRecord[]): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
    }
  } catch {
    /* ignore */
  }
}

// ─── Settings Persistence ────────────────────────────────────────────────────

export function loadAttendanceSettings(): AttendanceSettings {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(SETTINGS_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const def = Number(parsed.defaultMaxAbsences);
        return {
          defaultMaxAbsences: Number.isFinite(def) && def > 0 ? def : 5,
          perSubject: parsed.perSubject ?? {},
        };
      }
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_ATTENDANCE_SETTINGS };
}

export function saveAttendanceSettings(settings: AttendanceSettings): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
  } catch {
    /* ignore */
  }
}

// ─── Already-prompted set ────────────────────────────────────────────────────

export function loadPromptedKeys(): Set<string> {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(PROMPTED_KEY) : null;
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set<string>(arr);
    }
  } catch {
    /* ignore */
  }
  return new Set<string>();
}

export function savePromptedKeys(keys: Set<string>): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(PROMPTED_KEY, JSON.stringify([...keys]));
    }
  } catch {
    /* ignore */
  }
}

// ─── Status & Warning Levels ─────────────────────────────────────────────────

export type AttendanceStatus = 'good' | 'warning' | 'critical' | 'limit_reached';

export interface AttendanceWarningInfo {
  status: AttendanceStatus;
  label: string;
  message: string;
  badgeClass: string;
}

export function getAttendanceWarning(missed: number, maxAllowed: number): AttendanceWarningInfo {
  const max = Math.max(1, maxAllowed);
  const remaining = Math.max(0, max - missed);

  if (missed >= max) {
    return {
      status: 'limit_reached',
      label: 'Limit Reached',
      message: 'Maximum absence limit reached. Check your institution’s attendance policy.',
      badgeClass: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
    };
  }

  if (remaining === 1) {
    return {
      status: 'critical',
      label: 'Critical Warning',
      message: 'Warning! One more absence and you’ll reach your limit.',
      badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    };
  }

  // Warning when more than 50% of allowable absences have been used
  if (missed > 0 && missed >= Math.ceil(max * 0.5)) {
    return {
      status: 'warning',
      label: 'Caution',
      message: `Careful! You’ve missed ${missed} out of ${max} allowed classes.`,
      badgeClass: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
    };
  }

  return {
    status: 'good',
    label: 'Good Standing',
    message: missed === 0
      ? 'Perfect record! Keep attending your classes.'
      : 'You’re doing great! Keep attending your classes.',
    badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  };
}

// ─── Stats helpers ────────────────────────────────────────────────────────────

export interface SubjectAttendanceStat {
  subject: string;
  attended: number;
  absent: number;
  total: number;
  maxAbsences: number;
  absencesLeft: number;
  /**
   * Percentage of classes attended.
   * If total is 0 (no records yet), rate is 100.
   */
  attendanceRate: number;
  status: AttendanceStatus;
  warning: AttendanceWarningInfo;
  atRisk: boolean;
  recentRecords: AttendanceRecord[];
}

export interface OverallAttendanceSummary {
  totalAttended: number;
  totalMissed: number;
  totalRecorded: number;
  overallRate: number;
  totalRemainingAbsences: number;
  subjectsAtRiskCount: number;
  currentStreak: number;
  motivationalMessage: string;
}

export function computeStats(
  records: AttendanceRecord[],
  settings: AttendanceSettings,
  scheduledSubjects: string[] = [],
): { subjectStats: SubjectAttendanceStat[]; overall: OverallAttendanceSummary } {
  const bySubject: Record<string, { attended: number; absent: number; records: AttendanceRecord[] }> = {};

  // Pre-seed any subjects known from the schedule so students see them immediately
  for (const s of scheduledSubjects) {
    if (s && !bySubject[s]) {
      bySubject[s] = { attended: 0, absent: 0, records: [] };
    }
  }

  for (const r of records) {
    if (!bySubject[r.subject]) {
      bySubject[r.subject] = { attended: 0, absent: 0, records: [] };
    }
    if (r.attended) {
      bySubject[r.subject].attended += 1;
    } else {
      bySubject[r.subject].absent += 1;
    }
    bySubject[r.subject].records.push(r);
  }

  const subjectStats: SubjectAttendanceStat[] = Object.entries(bySubject).map(([subject, data]) => {
    const maxAbsences = settings.perSubject[subject] ?? settings.defaultMaxAbsences;
    const total = data.attended + data.absent;
    const absencesLeft = Math.max(0, maxAbsences - data.absent);
    const attendanceRate = total === 0 ? 100 : Math.round((data.attended / total) * 100);
    const warning = getAttendanceWarning(data.absent, maxAbsences);
    const atRisk = warning.status === 'critical' || warning.status === 'limit_reached';

    const recentRecords = [...data.records].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );

    return {
      subject,
      attended: data.attended,
      absent: data.absent,
      total,
      maxAbsences,
      absencesLeft,
      attendanceRate,
      status: warning.status,
      warning,
      atRisk,
      recentRecords,
    };
  });

  // Calculate overall metrics
  const totalAttended = records.filter(r => r.attended).length;
  const totalMissed = records.filter(r => !r.attended).length;
  const totalRecorded = records.length;
  const overallRate = totalRecorded === 0 ? 100 : Math.round((totalAttended / totalRecorded) * 100);

  const totalRemainingAbsences = subjectStats.reduce((sum, s) => sum + s.absencesLeft, 0);
  const subjectsAtRiskCount = subjectStats.filter(s => s.atRisk).length;

  // Streak: count consecutive "attended" from newest to oldest
  const chronologicallySorted = [...records].sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
  );

  let currentStreak = 0;
  for (const r of chronologicallySorted) {
    if (r.attended) {
      currentStreak += 1;
    } else {
      break;
    }
  }

  let motivationalMessage = "Welcome to your Attendance Hub. Stay on top of your classes!";
  if (totalRecorded > 0) {
    if (subjectsAtRiskCount > 0) {
      motivationalMessage = `${subjectsAtRiskCount} subject${subjectsAtRiskCount === 1 ? '' : 's'} need attention. Plan your next sessions carefully!`;
    } else if (totalMissed === 0) {
      motivationalMessage = `Flawless record! You haven’t missed a single tracked class.`;
    } else if (currentStreak >= 3) {
      motivationalMessage = `On a roll! You’ve attended ${currentStreak} classes in a row.`;
    } else if (overallRate >= 85) {
      motivationalMessage = `Solid work! Your overall attendance is standing strong at ${overallRate}%.`;
    } else {
      motivationalMessage = `Every class counts. Focus on keeping your attendance high this week.`;
    }
  }

  return {
    subjectStats,
    overall: {
      totalAttended,
      totalMissed,
      totalRecorded,
      overallRate,
      totalRemainingAbsences,
      subjectsAtRiskCount,
      currentStreak,
      motivationalMessage,
    },
  };
}
