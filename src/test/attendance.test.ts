import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeStats,
  getAttendanceWarning,
  todayDateStr,
  loadAttendanceRecords,
  saveAttendanceRecords,
  loadAttendanceSettings,
  saveAttendanceSettings,
  type AttendanceRecord,
  type AttendanceSettings,
  DEFAULT_ATTENDANCE_SETTINGS,
} from '@/lib/attendance';

describe('Attendance System & Calculations', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes with default settings (5 allowed absences)', () => {
    const settings = loadAttendanceSettings();
    expect(settings.defaultMaxAbsences).toBe(5);
    expect(settings.perSubject).toEqual({});
  });

  it('persists and loads attendance records', () => {
    const records: AttendanceRecord[] = [
      {
        id: 'rec-1',
        subject: 'Mathematics',
        date: todayDateStr(),
        attended: false,
        recordedAt: new Date().toISOString(),
      },
    ];

    saveAttendanceRecords(records);
    const loaded = loadAttendanceRecords();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].subject).toBe('Mathematics');
    expect(loaded[0].attended).toBe(false);
  });

  it('scenario: student records 1 missed Mathematics class (0 -> 1)', () => {
    const settings: AttendanceSettings = { defaultMaxAbsences: 5, perSubject: {} };
    const records: AttendanceRecord[] = [
      {
        id: 'rec-1',
        subject: 'Mathematics',
        date: '2026-11-03',
        attended: false,
        recordedAt: '2026-11-03T10:00:00Z',
      },
    ];

    const { subjectStats } = computeStats(records, settings, ['Mathematics']);
    const mathStat = subjectStats.find(s => s.subject === 'Mathematics');

    expect(mathStat).toBeDefined();
    expect(mathStat?.absent).toBe(1);
    expect(mathStat?.maxAbsences).toBe(5);
    expect(mathStat?.absencesLeft).toBe(4);
    expect(mathStat?.status).toBe('good');
  });

  it('scenario: student records 2 more missed classes (displays 3/5 with 2 remaining)', () => {
    const settings: AttendanceSettings = { defaultMaxAbsences: 5, perSubject: {} };
    const records: AttendanceRecord[] = [
      { id: '1', subject: 'Mathematics', date: '2026-11-01', attended: false, recordedAt: '2026-11-01T10:00:00Z' },
      { id: '2', subject: 'Mathematics', date: '2026-11-02', attended: false, recordedAt: '2026-11-02T10:00:00Z' },
      { id: '3', subject: 'Mathematics', date: '2026-11-03', attended: false, recordedAt: '2026-11-03T10:00:00Z' },
    ];

    const { subjectStats, overall } = computeStats(records, settings, ['Mathematics']);
    const mathStat = subjectStats.find(s => s.subject === 'Mathematics');

    expect(mathStat?.absent).toBe(3);
    expect(mathStat?.maxAbsences).toBe(5);
    expect(mathStat?.absencesLeft).toBe(2);
    expect(mathStat?.status).toBe('warning');
    expect(overall.totalMissed).toBe(3);
    expect(overall.totalRemainingAbsences).toBe(2);
  });

  it('triggers critical warning when 1 absence remains', () => {
    const warning = getAttendanceWarning(4, 5);
    expect(warning.status).toBe('critical');
    expect(warning.message).toContain('One more absence');
  });

  it('triggers limit reached when max absences reached or exceeded', () => {
    const warning = getAttendanceWarning(5, 5);
    expect(warning.status).toBe('limit_reached');
    expect(warning.message).toContain('Maximum absence limit reached');

    const warningOver = getAttendanceWarning(6, 5);
    expect(warningOver.status).toBe('limit_reached');
  });

  it('maintains independent attendance limits and counters per subject', () => {
    const settings: AttendanceSettings = {
      defaultMaxAbsences: 5,
      perSubject: {
        'Web Development': 3,
        'Computer Architecture': 6,
      },
    };

    const records: AttendanceRecord[] = [
      { id: '1', subject: 'Web Development', date: '2026-11-01', attended: false, recordedAt: '2026-11-01T10:00:00Z' },
      { id: '2', subject: 'Web Development', date: '2026-11-02', attended: false, recordedAt: '2026-11-02T10:00:00Z' },
      { id: '3', subject: 'Computer Architecture', date: '2026-11-01', attended: true, recordedAt: '2026-11-01T10:00:00Z' },
    ];

    const { subjectStats } = computeStats(records, settings, ['Web Development', 'Computer Architecture']);
    const web = subjectStats.find(s => s.subject === 'Web Development')!;
    const arch = subjectStats.find(s => s.subject === 'Computer Architecture')!;

    expect(web.absent).toBe(2);
    expect(web.maxAbsences).toBe(3);
    expect(web.absencesLeft).toBe(1);
    expect(web.status).toBe('critical');

    expect(arch.absent).toBe(0);
    expect(arch.attended).toBe(1);
    expect(arch.maxAbsences).toBe(6);
    expect(arch.absencesLeft).toBe(6);
    expect(arch.attendanceRate).toBe(100);
    expect(arch.status).toBe('good');
  });

  it('calculates consecutive attendance streak accurately', () => {
    const settings: AttendanceSettings = { defaultMaxAbsences: 5, perSubject: {} };
    const records: AttendanceRecord[] = [
      { id: '1', subject: 'Math', date: '2026-11-01', attended: false, recordedAt: '2026-11-01T10:00:00Z' },
      { id: '2', subject: 'Math', date: '2026-11-02', attended: true, recordedAt: '2026-11-02T10:00:00Z' },
      { id: '3', subject: 'Physics', date: '2026-11-03', attended: true, recordedAt: '2026-11-03T10:00:00Z' },
      { id: '4', subject: 'Chemistry', date: '2026-11-04', attended: true, recordedAt: '2026-11-04T10:00:00Z' },
    ];

    const { overall } = computeStats(records, settings);
    expect(overall.currentStreak).toBe(3);
    expect(overall.totalAttended).toBe(3);
    expect(overall.totalMissed).toBe(1);
  });
});
