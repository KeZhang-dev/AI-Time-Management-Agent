import { useCallback, useEffect, useRef, type RefObject } from 'react';

export interface Metrics {
  width: number;
  height: number;
  dpr: number;
  bufferWidth: number;
  bufferHeight: number;
}

interface UseAnimationLoopOptions {
  target: RefObject<HTMLElement | null>;
  halted?: boolean;
  dpr?: number;
  resizeDebounceMs?: number;
  onResize?: (metrics: Metrics) => void;
  onFrame: () => void | false;
}

interface AnimationLoopControls {
  start: () => void;
  stop: () => void;
  resize: () => void;
}

export function useAnimationLoop({
  target,
  halted = false,
  dpr,
  resizeDebounceMs = 100,
  onResize,
  onFrame,
}: UseAnimationLoopOptions): AnimationLoopControls {
  const frameRef = useRef<number | null>(null);
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const haltedRef = useRef(halted);
  const onFrameRef = useRef(onFrame);
  const onResizeRef = useRef(onResize);

  haltedRef.current = halted;
  onFrameRef.current = onFrame;
  onResizeRef.current = onResize;

  const measure = useCallback(() => {
    const el = target.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const effectiveDpr = dpr ?? window.devicePixelRatio ?? 1;
    const metrics: Metrics = {
      width: rect.width,
      height: rect.height,
      dpr: effectiveDpr,
      bufferWidth: Math.round(rect.width * effectiveDpr),
      bufferHeight: Math.round(rect.height * effectiveDpr),
    };
    onResizeRef.current?.(metrics);
  }, [target, dpr]);

  const tick = useCallback(() => {
    if (!haltedRef.current) {
      onFrameRef.current();
    }
    frameRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const stop = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const resize = useCallback(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const el = target.current;
    if (!el) return;

    measure();

    const observer = new ResizeObserver(() => {
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = setTimeout(measure, resizeDebounceMs);
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, resizeDebounceMs]);

  useEffect(() => stop, [stop]);

  return { start, stop, resize };
}
