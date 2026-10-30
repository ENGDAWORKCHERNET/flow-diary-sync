import { useEffect } from 'react';
import { useSchedule } from '@/context/ScheduleContext';
import { checkAndTriggerClassReminder } from '@/lib/notifications';

export function useClassReminders() {
  const { schedule } = useSchedule();

  useEffect(() => {
    if (!schedule || schedule.length === 0) return;

    // Check immediately on mount or schedule change
    checkAndTriggerClassReminder(schedule);

    // Periodic check every 30 seconds
    const interval = setInterval(() => {
      checkAndTriggerClassReminder(schedule);
    }, 30_000);

    // Also check when student returns to tab / unlocks screen
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkAndTriggerClassReminder(schedule);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [schedule]);
}
