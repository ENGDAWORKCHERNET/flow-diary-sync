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

interface AttendanceContextType {
  records: AttendanceRecord[];
  settings: AttendanceSettings;
  stats: SubjectAttendanceStat[];
  /** The class that just ended and needs an attendance response. null = no prompt. */
  pendingPrompt: PendingPrompt | null;
  /** User taps "Yes, I attended" */
  recordAttended: (occurrenceKey: string, session: ClassSession, date: string) => void;
  /** User taps "No, I skipped" */
  recordAbsent: (occurrenceKey: string, session: ClassSession, date: string) => void;
  /** Dismiss the prompt without recording (user can answer later via the log) */
  dismissPrompt: () => void;
  /** Update how many absences are allowed for a subject (or the global default) */
  updateMaxAbsences: (subject: string | '__default__', value: number) => void;
  /** Manually delete an attendance record */
  deleteRecord: (id: string) => void;
  /** Wipe all records */
  clearAllRecords: () => void;
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
  useEffect(() => { saveAttendanceRecords(records); }, [records]);
  useEffect(() => { saveAttendanceSettings(settings); }, [settings]);

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

    checkForEndedClasses(); // run immediately on mount / schedule change
    const id = setInterval(checkForEndedClasses, 60_000);
    return () => clearInterval(id);
  }, [schedule]);

  // ── Record helpers ─────────────────────────────────────────────────────────
  const addRecord = useCallback(
    (session: ClassSession, date: string, attended: boolean) => {
      const record: AttendanceRecord = {
        id: crypto.randomUUID?.() ?? `att_${Date.now()}`,
        sessionId: session.id,
        subject: session.subject,
        date,
        attended,
        recordedAt: new Date().toISOString(),
      };
      setRecords(prev => [...prev, record]);
    },
    [],
  );

  const recordAttended = useCallback(
    (occurrenceKey: string, session: ClassSession, date: string) => {
      addRecord(session, date, true);
      setPendingPrompt(p => (p?.occurrenceKey === occurrenceKey ? null : p));
    },
    [addRecord],
  );

  const recordAbsent = useCallback(
    (occurrenceKey: string, session: ClassSession, date: string) => {
      addRecord(session, date, false);
      setPendingPrompt(p => (p?.occurrenceKey === occurrenceKey ? null : p));
    },
    [addRecord],
  );

  const dismissPrompt = useCallback(() => setPendingPrompt(null), []);

  const updateMaxAbsences = useCallback((subject: string | '__default__', value: number) => {
    setSettings(prev => {
      if (subject === '__default__') {
        return { ...prev, defaultMaxAbsences: value };
      }
      return { ...prev, perSubject: { ...prev.perSubject, [subject]: value } };
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

  const stats = useMemo(() => computeStats(records, settings), [records, settings]);

  const value = useMemo<AttendanceContextType>(
    () => ({
      records,
      settings,
      stats,
      pendingPrompt,
      recordAttended,
      recordAbsent,
      dismissPrompt,
      updateMaxAbsences,
      deleteRecord,
      clearAllRecords,
    }),
    [
      records, settings, stats, pendingPrompt,
      recordAttended, recordAbsent, dismissPrompt,
      updateMaxAbsences, deleteRecord, clearAllRecords,
    ],
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
