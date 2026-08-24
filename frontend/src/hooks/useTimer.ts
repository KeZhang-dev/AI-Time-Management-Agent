import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'timetracker.activeTimer';

export type TimerStatus = 'idle' | 'running' | 'paused';

interface StoredTimerState {
  status: 'running' | 'paused';
  /** epoch ms the current running segment started; meaningless while paused */
  segmentStartedAt: number;
  /** ms banked from segments that have already ended (via pause) */
  accumulatedMs: number;
  /** epoch ms of the very first Start press */
  startedAt: number;
}

interface TimerSpan {
  startIso: string;
  endIso: string;
}

function readStored(): StoredTimerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredTimerState;
    if (parsed.status !== 'running' && parsed.status !== 'paused') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStored(state: StoredTimerState | null) {
  try {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable (private browsing, quota, etc.) — timer just
    // won't survive a refresh, which is a reasonable degradation.
  }
}

/**
 * A live start/pause/resume/stop timer, persisted to localStorage so it
 * survives a refresh or navigating away and back. Paused time is excluded
 * from the elapsed total, and — since the backend only stores a single
 * start/end span — the record saved on stop uses `startedAt` as StartTime
 * and `startedAt + elapsedMs` as EndTime, so the saved duration always
 * matches what the user watched tick up, even if wall-clock stop time
 * came later because of a pause.
 */
export function useTimer() {
  const [stored, setStored] = useState<StoredTimerState | null>(() => readStored());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (stored?.status !== 'running') return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [stored?.status]);

  const status: TimerStatus = stored?.status ?? 'idle';
  const elapsedMs = stored
    ? stored.accumulatedMs + (stored.status === 'running' ? now - stored.segmentStartedAt : 0)
    : 0;

  const start = useCallback(() => {
    const next: StoredTimerState = {
      status: 'running',
      segmentStartedAt: Date.now(),
      accumulatedMs: 0,
      startedAt: Date.now(),
    };
    writeStored(next);
    setStored(next);
    setNow(Date.now());
  }, []);

  const pause = useCallback(() => {
    setStored((prev) => {
      if (!prev || prev.status !== 'running') return prev;
      const next: StoredTimerState = {
        ...prev,
        status: 'paused',
        accumulatedMs: prev.accumulatedMs + (Date.now() - prev.segmentStartedAt),
      };
      writeStored(next);
      return next;
    });
  }, []);

  const resume = useCallback(() => {
    setStored((prev) => {
      if (!prev || prev.status !== 'paused') return prev;
      const next: StoredTimerState = { ...prev, status: 'running', segmentStartedAt: Date.now() };
      writeStored(next);
      setNow(Date.now());
      return next;
    });
  }, []);

  /** Computes the start/end span the current session would save, without clearing it. */
  const computeSpan = useCallback((): TimerSpan | null => {
    if (!stored) return null;
    const finalElapsedMs =
      stored.accumulatedMs + (stored.status === 'running' ? Date.now() - stored.segmentStartedAt : 0);
    return {
      startIso: new Date(stored.startedAt).toISOString(),
      endIso: new Date(stored.startedAt + finalElapsedMs).toISOString(),
    };
  }, [stored]);

  /** Clears the active session — call after a successful save, or to discard it. */
  const reset = useCallback(() => {
    writeStored(null);
    setStored(null);
  }, []);

  return { status, elapsedMs, start, pause, resume, computeSpan, reset };
}
