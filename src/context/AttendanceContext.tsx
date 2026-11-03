import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
} from 'react';
import { useSchedule } from '@/context/ScheduleContext';
import {
  type AttendanceRecord,
  type AttendanceSettings,
  type SubjectAttendanceStat,
  type OverallAttendanceSummary,
  loadAttendanceRecords,
  saveAttendanceRecords,
  loadAttendanceSettings,
  saveAttendanceSettings,
  loadPromptedKeys,
  savePromptedKeys,
  classOccurrenceKey,
  todayDateStr,
  computeStats,
} from '@/lib/attendance';
import type { ClassSession } from '@/lib/data';

// ─── Context types ────────────────────────────────────────────────────────────

export interface PendingPrompt {
  session: ClassSession;
  date: string;
  occurrenceKey: string;
}

export interface AttendanceContextType {
  records: AttendanceRecord[];
  settings: AttendanceSettings;
  stats: SubjectAttendanceStat[];
  overall: OverallAttendanceSummary;
  /** The class that just ended and needs an attendance response. null = no prompt. */
  pendingPrompt: PendingPrompt | null;
  /** Record a missed class directly (from Schedule or UI) */
  recordMissedClass: (subject: string, sessionId?: string, note?: string) => AttendanceRecord;
  /** Record an attended class */
  recordAttendedClass: (subject: string, sessionId?: string, note?: string) => AttendanceRecord;
  /** User taps "Yes, I attended" on auto prompt */
  recordAttended: (occurrenceKey: string, session: ClassSession, date: string) => void;
  /** User taps "No, I skipped" on auto prompt */
  recordAbsent: (occurrenceKey: string, session: ClassSession, date: string) => void;
  /** Dismiss the prompt without recording */
  dismissPrompt: () => void;
  /** Update how many absences are allowed for a subject (or the global default) */
  updateMaxAbsences: (subject: string | '__default__', value: number) => void;
  /** Manually delete an attendance record (with immediate state update) */
  deleteRecord: (id: string) => void;
  /** Wipe all records */
  clearAllRecords: () => void;
  /** Undo the most recently recorded absence for a specific subject or globally */
  undoLastAbsence: (subject?: string) => AttendanceRecord | null;
  /** Get stats for a specific subject */
  getSubjectStat: (subject: string) => SubjectAttendanceStat | undefined;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AttendanceProvider({ children }: { children: ReactNode }) {
  const { schedule } = useSchedule();

  const [records, setRecords] = useState<AttendanceRecord[]>(() => loadAttendanceRecords());
  const [settings, setSettings] = useState<AttendanceSettings>(() => loadAttendanceSettings());
  const [pendingPrompt, setPendingPrompt] = useState<PendingPrompt | null>(null);
  const promptedKeysRef = useRef<Set<string>>(loadPromptedKeys());

  // ── Persist records whenever they change ───────────────────────────────────
  useEffect(() => {
    saveAttendanceRecords(records);
  }, [records]);

  useEffect(() => {
    saveAttendanceSettings(settings);
  }, [settings]);

  // ── Poll every 60 s: look for classes that just ended ────────────────────
  useEffect(() => {
    function checkForEndedClasses() {
      const now = new Date();
      const todayDay = now.getDay(); // 0=Sun … 6=Sat
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const dateStr = todayDateStr();

      for (const session of schedule) {
        if (session.day !== todayDay) continue;

        const [endH, endM] = session.endTime.split(':').map(Number);
        const endMinutes = endH * 60 + endM;

        // Class ended within the last 30 minutes (so we don't miss short absences)
        const minutesSinceEnd = nowMinutes - endMinutes;
        if (minutesSinceEnd < 0 || minutesSinceEnd > 30) continue;

        const key = classOccurrenceKey(session.id, dateStr);
        if (promptedKeysRef.current.has(key)) continue; // already asked

        // Mark as prompted immediately so concurrent ticks don't double-fire
        promptedKeysRef.current = new Set([...promptedKeysRef.current, key]);
        savePromptedKeys(promptedKeysRef.current);

        setPendingPrompt({ session, date: dateStr, occurrenceKey: key });
        break; // prompt one at a time
      }
    }

    checkForEndedClasses();
    const id = setInterval(checkForEndedClasses, 60_000);
    return () => clearInterval(id);
  }, [schedule]);

  // ── Direct recording helpers (Schedule page action) ──────────────────────────
  const recordMissedClass = useCallback(
    (subject: string, sessionId?: string, note: string = 'From Schedule'): AttendanceRecord => {
      const newRecord: AttendanceRecord = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        sessionId,
        subject,
        date: todayDateStr(),
        attended: false,
        recordedAt: new Date().toISOString(),
        note,
      };

      setRecords(prev => [...prev, newRecord]);
      return newRecord;
    },
    []
  );

  const recordAttendedClass = useCallback(
    (subject: string, sessionId?: string, note: string = 'Manual Attended'): AttendanceRecord => {
      const newRecord: AttendanceRecord = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        sessionId,
        subject,
        date: todayDateStr(),
        attended: true,
        recordedAt: new Date().toISOString(),
        note,
      };

      setRecords(prev => [...prev, newRecord]);
      return newRecord;
    },
    []
  );

  // ── Auto-prompt actions ───────────────────────────────────────────────────
  const recordAttended = useCallback(
    (occurrenceKey: string, session: ClassSession, date: string) => {
      const record: AttendanceRecord = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        sessionId: session.id,
        subject: session.subject,
        date,
        attended: true,
        recordedAt: new Date().toISOString(),
        note: 'Auto-Prompt',
      };
      setRecords(prev => [...prev, record]);
      setPendingPrompt(p => (p?.occurrenceKey === occurrenceKey ? null : p));
    },
    []
  );

  const recordAbsent = useCallback(
    (occurrenceKey: string, session: ClassSession, date: string) => {
      const record: AttendanceRecord = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        sessionId: session.id,
        subject: session.subject,
        date,
        attended: false,
        recordedAt: new Date().toISOString(),
        note: 'Auto-Prompt',
      };
      setRecords(prev => [...prev, record]);
      setPendingPrompt(p => (p?.occurrenceKey === occurrenceKey ? null : p));
    },
    []
  );

  const dismissPrompt = useCallback(() => setPendingPrompt(null), []);

  const updateMaxAbsences = useCallback((subject: string | '__default__', value: number) => {
    setSettings(prev => {
      if (subject === '__default__') {
        return { ...prev, defaultMaxAbsences: Math.max(1, value) };
      }
      return {
        ...prev,
        perSubject: { ...prev.perSubject, [subject]: Math.max(1, value) },
      };
    });
  }, []);

  const deleteRecord = useCallback((id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
  }, []);

  const clearAllRecords = useCallback(() => {
    setRecords([]);
    promptedKeysRef.current = new Set();
    savePromptedKeys(promptedKeysRef.current);
  }, []);

  const undoLastAbsence = useCallback((subject?: string): AttendanceRecord | null => {
    let removedRecord: AttendanceRecord | null = null;

    setRecords(prev => {
      // Find the latest missed record (optionally matching subject)
      const missedIndices: number[] = [];
      prev.forEach((r, idx) => {
        if (!r.attended && (!subject || r.subject === subject)) {
          missedIndices.push(idx);
        }
      });

      if (missedIndices.length === 0) return prev;

      const targetIdx = missedIndices[missedIndices.length - 1];
      removedRecord = prev[targetIdx];
      return prev.filter((_, idx) => idx !== targetIdx);
    });

    return removedRecord;
  }, []);

  const scheduledSubjects = useMemo(() => {
    return Array.from(new Set(schedule.map(s => s.subject).filter(Boolean)));
  }, [schedule]);

  const { subjectStats, overall } = useMemo(() => {
    return computeStats(records, settings, scheduledSubjects);
  }, [records, settings, scheduledSubjects]);

  const getSubjectStat = useCallback(
    (subject: string) => {
      return subjectStats.find(s => s.subject === subject);
    },
    [subjectStats]
  );

  const value = useMemo<AttendanceContextType>(
    () => ({
      records,
      settings,
      stats: subjectStats,
      overall,
      pendingPrompt,
      recordMissedClass,
      recordAttendedClass,
      recordAttended,
      recordAbsent,
      dismissPrompt,
      updateMaxAbsences,
      deleteRecord,
      clearAllRecords,
      undoLastAbsence,
      getSubjectStat,
    }),
    [
      records,
      settings,
      subjectStats,
      overall,
      pendingPrompt,
      recordMissedClass,
      recordAttendedClass,
      recordAttended,
      recordAbsent,
      dismissPrompt,
      updateMaxAbsences,
      deleteRecord,
      clearAllRecords,
      undoLastAbsence,
      getSubjectStat,
    ]
  );

  return (
    <AttendanceContext.Provider value={value}>
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendance() {
  const ctx = useContext(AttendanceContext);
  if (!ctx) throw new Error('useAttendance must be used inside AttendanceProvider');
  return ctx;
}
