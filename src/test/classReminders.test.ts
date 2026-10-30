import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkAndTriggerClassReminder,
  clearNotifiedClasses,
  getNotifiedClasses,
  NOTIFIED_CLASSES_STORAGE_KEY,
} from '@/lib/notifications';
import { type ClassSession } from '@/lib/data';

describe('Class Notification Reminders (15 mins before class)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearNotifiedClasses();
  });

  const sampleClass: ClassSession = {
    id: 'class-1',
    subject: 'SE2205 - Computer Organization',
    day: 1, // Monday
    startTime: '14:00',
    endTime: '15:30',
    room: 'LR 301',
    colorClass: 'subject-math',
  };

  it('triggers a reminder when class starts in 15 minutes and includes the room number', () => {
    // Current time: Monday at 13:45 (15 minutes before 14:00)
    // Note: Month is 0-indexed in JS Date: month 9 is October
    const monday1345 = new Date(2026, 9, 26, 13, 45, 0); // Oct 26, 2026 is a Monday (day 1)
    expect(monday1345.getDay()).toBe(1);

    const result = checkAndTriggerClassReminder([sampleClass], monday1345, { showInAppToast: false });

    expect(result.notified).toBe(true);
    expect(result.minutesUntil).toBe(15);
    expect(result.session?.subject).toBe('SE2205 - Computer Organization');
    expect(result.session?.room).toBe('LR 301');

    // Verify it is recorded in storage so it won't duplicate
    const records = getNotifiedClasses();
    const keys = Object.keys(records);
    expect(keys.length).toBe(1);
    expect(keys[0]).toContain('class-1');
  });

  it('does not re-notify for the same class on the same day (anti-spam de-duplication)', () => {
    const monday1345 = new Date(2026, 9, 26, 13, 45, 0);

    // First check triggers notification
    const first = checkAndTriggerClassReminder([sampleClass], monday1345, { showInAppToast: false });
    expect(first.notified).toBe(true);

    // Second check 1 minute later at 13:46
    const monday1346 = new Date(2026, 9, 26, 13, 46, 0);
    const second = checkAndTriggerClassReminder([sampleClass], monday1346, { showInAppToast: false });
    expect(second.notified).toBe(false);
  });

  it('does not trigger if the class is more than 15 minutes away', () => {
    // Monday at 13:30 (30 minutes before 14:00)
    const monday1330 = new Date(2026, 9, 26, 13, 30, 0);
    const result = checkAndTriggerClassReminder([sampleClass], monday1330, { showInAppToast: false });
    expect(result.notified).toBe(false);
  });

  it('does not trigger if the class already started', () => {
    // Monday at 14:05 (5 minutes after class started)
    const monday1405 = new Date(2026, 9, 26, 14, 5, 0);
    const result = checkAndTriggerClassReminder([sampleClass], monday1405, { showInAppToast: false });
    expect(result.notified).toBe(false);
  });

  it('triggers when a class without a room starts in 10 minutes', () => {
    const onlineClass: ClassSession = {
      id: 'class-online',
      subject: 'SE2223 - Web Development',
      day: 1,
      startTime: '10:00',
      endTime: '11:30',
      colorClass: 'subject-web',
    };

    // Monday at 09:50 (10 minutes before 10:00)
    const monday0950 = new Date(2026, 9, 26, 9, 50, 0);
    const result = checkAndTriggerClassReminder([onlineClass], monday0950, { showInAppToast: false });

    expect(result.notified).toBe(true);
    expect(result.minutesUntil).toBe(10);
    expect(result.session?.room).toBeUndefined();
  });
});
