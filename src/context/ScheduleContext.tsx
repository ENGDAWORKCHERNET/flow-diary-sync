import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import {
  type ClassSession,
  SCHEDULE,
  loadSchedule,
  saveSchedule,
  checkScheduleOverlap,
  getTodayClasses as getTodayClassesHelper,
  getNextClass as getNextClassHelper,
  getCurrentClass as getCurrentClassHelper,
} from '@/lib/data';

export interface ScheduleContextType {
  schedule: ClassSession[];
  addClass: (newSession: Omit<ClassSession, 'id'>) => { success: boolean; error?: string; id?: string };
  updateClass: (id: string, updatedSession: Omit<ClassSession, 'id'>) => { success: boolean; error?: string };
  deleteClass: (id: string) => { success: boolean };
  resetToDefault: () => void;
  getTodayClasses: () => ClassSession[];
  getNextClass: (customNow?: Date) => { session: ClassSession; minutesUntil: number } | null;
  getCurrentClass: (customNow?: Date) => ClassSession | null;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [schedule, setSchedule] = useState<ClassSession[]>(() => loadSchedule());

  const addClass = useCallback((newSession: Omit<ClassSession, 'id'>) => {
    const overlapResult = checkScheduleOverlap(schedule, newSession);
    if (overlapResult.hasOverlap) {
      return { success: false, error: overlapResult.error };
    }

    const id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `class_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullSession: ClassSession = { ...newSession, id };

    setSchedule(prev => {
      const updated = [...prev, fullSession];
      saveSchedule(updated);
      return updated;
    });

    return { success: true, id };
  }, [schedule]);

  const updateClass = useCallback((id: string, updatedSession: Omit<ClassSession, 'id'>) => {
    const overlapResult = checkScheduleOverlap(schedule, { ...updatedSession, id });
    if (overlapResult.hasOverlap) {
      return { success: false, error: overlapResult.error };
    }

    setSchedule(prev => {
      const updated = prev.map(s => (s.id === id ? { ...updatedSession, id } : s));
      saveSchedule(updated);
      return updated;
    });

    return { success: true };
  }, [schedule]);

  const deleteClass = useCallback((id: string) => {
    setSchedule(prev => {
      const updated = prev.filter(s => s.id !== id);
      saveSchedule(updated);
      return updated;
    });
    return { success: true };
  }, []);

  const resetToDefault = useCallback(() => {
    setSchedule(SCHEDULE);
    saveSchedule(SCHEDULE);
  }, []);

  const getTodayClasses = useCallback(() => {
    return getTodayClassesHelper(schedule);
  }, [schedule]);

  const getNextClass = useCallback((customNow?: Date) => {
    return getNextClassHelper(schedule, customNow);
  }, [schedule]);

  const getCurrentClass = useCallback((customNow?: Date) => {
    return getCurrentClassHelper(schedule, customNow);
  }, [schedule]);

  const value = useMemo(() => ({
    schedule,
    addClass,
    updateClass,
    deleteClass,
    resetToDefault,
    getTodayClasses,
    getNextClass,
    getCurrentClass,
  }), [
    schedule,
    addClass,
    updateClass,
    deleteClass,
    resetToDefault,
    getTodayClasses,
    getNextClass,
    getCurrentClass,
  ]);

  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule() {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
}
