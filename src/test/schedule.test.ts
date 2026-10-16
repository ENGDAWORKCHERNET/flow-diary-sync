import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadSchedule,
  saveSchedule,
  checkScheduleOverlap,
  getTodayClasses,
  getNextClass,
  getCurrentClass,
  SCHEDULE,
  SCHEDULE_KEY,
  type ClassSession,
} from '@/lib/data';

describe('Schedule Management & Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('falls back to default SCHEDULE when localStorage is empty', () => {
    const loaded = loadSchedule();
    expect(loaded).toEqual(SCHEDULE);
  });

  it('persists and loads custom schedule from localStorage', () => {
    const customSchedule: ClassSession[] = [
      {
        id: 'test-1',
        subject: 'SE2205 (Computer Organization & Architecture)',
        day: 1,
        startTime: '10:00',
        endTime: '11:30',
        colorClass: 'subject-math',
        room: 'LR 101',
      },
    ];

    saveSchedule(customSchedule);
    const loaded = loadSchedule();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('test-1');
    expect(loaded[0].room).toBe('LR 101');
  });

  it('validates overlapping classes on the same day', () => {
    const existing: ClassSession[] = [
      {
        id: 'c1',
        subject: 'SE2205 (Computer Organization & Architecture)',
        day: 1,
        startTime: '14:00',
        endTime: '15:30',
        colorClass: 'subject-math',
      },
    ];

    // Overlapping: 14:30 - 16:00
    const overlap1 = checkScheduleOverlap(existing, {
      day: 1,
      startTime: '14:30',
      endTime: '16:00',
    });
    expect(overlap1.hasOverlap).toBe(true);

    // Overlapping: exactly the same time 14:00 - 15:30
    const overlap2 = checkScheduleOverlap(existing, {
      day: 1,
      startTime: '14:00',
      endTime: '15:30',
    });
    expect(overlap2.hasOverlap).toBe(true);

    // Not overlapping: earlier time 12:00 - 13:30
    const noOverlap1 = checkScheduleOverlap(existing, {
      day: 1,
      startTime: '12:00',
      endTime: '13:30',
    });
    expect(noOverlap1.hasOverlap).toBe(false);

    // Not overlapping: adjacent time 15:30 - 17:00
    const noOverlap2 = checkScheduleOverlap(existing, {
      day: 1,
      startTime: '15:30',
      endTime: '17:00',
    });
    expect(noOverlap2.hasOverlap).toBe(false);

    // Not overlapping: same time but different day
    const differentDay = checkScheduleOverlap(existing, {
      day: 2,
      startTime: '14:00',
      endTime: '15:30',
    });
    expect(differentDay.hasOverlap).toBe(false);
  });

  it('does not flag self as overlapping when editing existing class', () => {
    const existing: ClassSession[] = [
      {
        id: 'c1',
        subject: 'SE2205 (Computer Organization & Architecture)',
        day: 1,
        startTime: '14:00',
        endTime: '15:30',
        colorClass: 'subject-math',
      },
    ];

    const result = checkScheduleOverlap(existing, {
      id: 'c1',
      day: 1,
      startTime: '14:00',
      endTime: '15:30',
    });
    expect(result.hasOverlap).toBe(false);
  });

  it('rejects candidate if startTime >= endTime', () => {
    const existing: ClassSession[] = [];
    const result = checkScheduleOverlap(existing, {
      day: 1,
      startTime: '15:00',
      endTime: '14:00',
    });
    expect(result.hasOverlap).toBe(true);
    expect(result.error).toContain('End time must be after start time');
  });

  it('computes next class and current class accurately', () => {
    const schedule: ClassSession[] = [
      {
        id: 'c1',
        subject: 'Morning Class',
        day: 1, // Monday
        startTime: '09:00',
        endTime: '10:30',
        colorClass: 'subject-math',
      },
    ];

    // Simulate Monday 08:30 AM (before class)
    const mondayMorning = new Date('2026-10-19T08:30:00'); // Oct 19, 2026 is Monday
    const next = getNextClass(schedule, mondayMorning);
    expect(next).not.toBeNull();
    expect(next?.session.subject).toBe('Morning Class');
    expect(next?.minutesUntil).toBe(30);

    // Simulate Monday 09:15 AM (during class)
    const duringClass = new Date('2026-10-19T09:15:00');
    const current = getCurrentClass(schedule, duringClass);
    expect(current).not.toBeNull();
    expect(current?.subject).toBe('Morning Class');
  });
});
