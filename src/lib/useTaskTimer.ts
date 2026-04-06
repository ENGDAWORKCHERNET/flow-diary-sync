import { useState, useEffect, useCallback } from 'react';

export interface TimerState {
  taskId: string | null;
  startTick: number | null; // ms timestamp when last started
  accumulated: number; // accumulated seconds
}

const TIMER_KEY = 'studyflow_timer_state';

export function getPersistedTimer(): TimerState {
  try {
    const raw = localStorage.getItem(TIMER_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { taskId: null, startTick: null, accumulated: 0 };
}

function setPersistedTimer(state: TimerState) {
  localStorage.setItem(TIMER_KEY, JSON.stringify(state));
}

export function useTaskTimer(forTaskId?: string) {
  const [state, setState] = useState<TimerState>(getPersistedTimer());
  const [elapsed, setElapsed] = useState(0);

  // Sync elapsed every second
  useEffect(() => {
    let interval: number;

    const tick = () => {
      const current = getPersistedTimer();
      // Only track if it matches the current task id context (or no context passed)
      if (forTaskId && current.taskId !== forTaskId) {
        setElapsed(0);
        return;
      }
      
      if (current.taskId && current.startTick) {
        const diff = Math.floor((Date.now() - current.startTick) / 1000);
        setElapsed(current.accumulated + diff);
      } else if (current.taskId) {
        setElapsed(current.accumulated);
      } else {
        setElapsed(0);
      }
    };
    
    interval = window.setInterval(tick, 1000);
    tick(); // initial tick
    
    return () => window.clearInterval(interval);
  }, [forTaskId, state.startTick, state.taskId]);

  const start = useCallback((taskId: string) => {
     let cur = getPersistedTimer();
     if (cur.taskId && cur.taskId !== taskId) {
       // Switching tasks without stopping, we silently overwrite for now.
       cur = { taskId, startTick: null, accumulated: 0 };
     }
     if (!cur.startTick) {
       const next = { taskId, startTick: Date.now(), accumulated: cur.accumulated || 0 };
       setPersistedTimer(next);
       setState(next);
     }
  }, []);

  const pause = useCallback(() => {
     const cur = getPersistedTimer();
     if (cur.startTick) {
       const diff = Math.floor((Date.now() - cur.startTick) / 1000);
       const next = { ...cur, startTick: null, accumulated: cur.accumulated + diff };
       setPersistedTimer(next);
       setState(next);
     }
  }, []);

  // Stop returns the full duration for caller to save
  const stop = useCallback(() => {
     const cur = getPersistedTimer();
     let total = cur.accumulated;
     if (cur.startTick) {
       total += Math.floor((Date.now() - cur.startTick) / 1000);
     }
     const next = { taskId: null, startTick: null, accumulated: 0 };
     setPersistedTimer(next);
     setState(next);
     return total; // return seconds
  }, []);

  const isRunning = state.startTick !== null && state.taskId === forTaskId;
  const isPaused = state.startTick === null && state.taskId === forTaskId && state.accumulated > 0;

  return { state, elapsed, start, pause, stop, isRunning, isPaused };
}
