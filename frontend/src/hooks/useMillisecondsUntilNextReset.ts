import { useEffect, useState } from 'react';

function msUntilNextLocalMidnight(): number {
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return nextMidnight.getTime() - now.getTime();
}

/**
 * Milliseconds remaining until the Dashboard's next daily reset (local midnight).
 * This only drives the countdown display — it never touches stored records.
 */
export function useMillisecondsUntilNextReset(): number {
  const [remainingMs, setRemainingMs] = useState(msUntilNextLocalMidnight);

  useEffect(() => {
    const id = setInterval(() => setRemainingMs(msUntilNextLocalMidnight()), 30_000);
    return () => clearInterval(id);
  }, []);

  return remainingMs;
}
