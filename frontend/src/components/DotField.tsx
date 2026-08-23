'use client';

import { useEffect, useRef, memo } from 'react';
import { useAnimationLoop, type Metrics } from '@/hooks/use-animation-loop';

const TWO_PI = Math.PI * 2;

interface Dot {
  ax: number;
  ay: number;
  sx: number;
  sy: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
}

interface DotFieldProps {
  dotRadius?: number;
  dotSpacing?: number;
  cursorRadius?: number;
  cursorForce?: number;
  bulgeOnly?: boolean;
  bulgeStrength?: number;
  glowRadius?: number;
  sparkle?: boolean;
  waveAmplitude?: number;
  gradientFrom?: string;
  gradientTo?: string;
  glowColor?: string;
  paused?: boolean;
  [key: string]: unknown;
}

const DotField = memo(
  ({
    dotRadius = 1.2,
    dotSpacing = 25,
    cursorRadius = 500,
    cursorForce = 20,
    bulgeOnly = true,
    bulgeStrength = 500,
    glowRadius = 200,
    sparkle = false,
    waveAmplitude = 0.5,
    gradientFrom = '#a855f7',
    gradientTo = '#b497cf',
    glowColor = '#a855f7',
    paused = false,
    ...rest
  }: DotFieldProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const glowRef = useRef<SVGCircleElement>(null);
    const dotsRef = useRef<Dot[]>([]);
    const mouseRef = useRef({
      x: -9999,
      y: -9999,
      prevX: -9999,
      prevY: -9999,
      speed: 0,
    });
    const sizeRef = useRef({ w: 0, h: 0, offsetX: 0, offsetY: 0 });
    const glowOpacity = useRef(0);
    const engagement = useRef(0);
    const isMovingRef = useRef(false);
    const moveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const propsRef = useRef<Record<string, unknown>>({});
    propsRef.current = {
      dotRadius,
      dotSpacing,
      cursorRadius,
      cursorForce,
      bulgeOnly,
      bulgeStrength,
      sparkle,
      waveAmplitude,
      gradientFrom,
      gradientTo,
      paused,
    };
    const rebuildRef = useRef<(() => void) | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const drawRef = useRef<(() => void | false) | null>(null);
    const measureRef = useRef<((m: Metrics) => void) | null>(null);

    const loop = useAnimationLoop({
      target: containerRef,
      halted: paused,
      dpr: 2,
      resizeDebounceMs: 100,
      onResize: (metrics) => measureRef.current?.(metrics),
      onFrame: () => (drawRef.current ? drawRef.current() : false),
    });

    const glowIdRef = useRef(
      `dot-field-glow-${Math.random().toString(36).slice(2, 9)}`,
    );

    useEffect(() => {
      const canvas = canvasRef.current;
      const glowEl = glowRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { alpha: true });
      if (!ctx) return;
      measureRef.current = ({
        width: w,
        height: h,
        dpr,
        bufferWidth,
        bufferHeight,
      }) => {
        const rect = canvas!.parentElement!.getBoundingClientRect();

        canvas!.width = bufferWidth;
        canvas!.height = bufferHeight;
        canvas!.style.width = `${w}px`;
        canvas!.style.height = `${h}px`;
        ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

        sizeRef.current = {
          w,
          h,
          offsetX: rect.left + window.scrollX,
          offsetY: rect.top + window.scrollY,
        };

        buildDots(w, h);
      };

      function buildDots(w: number, h: number) {
        const p = propsRef.current;
        const step = (p.dotRadius as number) + (p.dotSpacing as number);
        const cols = Math.floor(w / step);
        const rows = Math.floor(h / step);
        const padX = (w % step) / 2;
        const padY = (h % step) / 2;
        const dots: Dot[] = new Array(rows * cols);
        let idx = 0;

        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const ax = padX + col * step + step / 2;
            const ay = padY + row * step + step / 2;
            dots[idx++] = {
              ax,
              ay,
              sx: ax,
              sy: ay,
              vx: 0,
              vy: 0,
              x: ax,
              y: ay,
            };
          }
        }
        dotsRef.current = dots;
      }

      function updatePointer(pageX: number, pageY: number) {
        const s = sizeRef.current;
        mouseRef.current.x = pageX - s.offsetX;
        mouseRef.current.y = pageY - s.offsetY;

        isMovingRef.current = true;
        if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current);
        moveTimeoutRef.current = setTimeout(() => {
          isMovingRef.current = false;
        }, 500);
      }

      function onMouseMove(e: MouseEvent) {
        updatePointer(e.pageX, e.pageY);
      }

      function onTouchMove(e: TouchEvent) {
        const touch = e.touches[0];
        if (touch) updatePointer(touch.pageX, touch.pageY);
      }

      function onTouchEnd() {
        mouseRef.current.x = -9999;
        mouseRef.current.y = -9999;
      }

      function updateMouseSpeed() {
        if (propsRef.current.paused) return;
        const m = mouseRef.current;
        const dx = m.prevX - m.x;
        const dy = m.prevY - m.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        m.speed += (dist - m.speed) * 0.5;
        if (m.speed < 0.001) m.speed = 0;
        m.prevX = m.x;
        m.prevY = m.y;
      }

      const speedInterval = setInterval(updateMouseSpeed, 20);

      let frameCount = 0;

      function tick() {
        frameCount++;
        const dots = dotsRef.current;
        const m = mouseRef.current;
        const { w, h } = sizeRef.current;
        const p = propsRef.current;
        const len = dots.length;
        const t = frameCount * 0.02;

        const targetEngagement = Math.min(m.speed / 5, 1);
        engagement.current += (targetEngagement - engagement.current) * 0.06;
        if (engagement.current < 0.001) engagement.current = 0;
        const eng = engagement.current;

        glowOpacity.current += (eng - glowOpacity.current) * 0.08;

        if (glowEl) {
          glowEl.setAttribute('cx', String(m.x));
          glowEl.setAttribute('cy', String(m.y));
          glowEl.style.opacity = String(glowOpacity.current);
        }

        ctx!.clearRect(0, 0, w, h);

        const grad = ctx!.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, p.gradientFrom as string);
        grad.addColorStop(1, p.gradientTo as string);
        ctx!.fillStyle = grad;

        const cr = p.cursorRadius as number;
        const crSq = cr * cr;
        const rad = (p.dotRadius as number) / 2;
        const isBulge = p.bulgeOnly as boolean;

        ctx!.beginPath();

        for (let i = 0; i < len; i++) {
          const d = dots[i];
          const dx = m.x - d.ax;
          const dy = m.y - d.ay;
          const distSq = dx * dx + dy * dy;

          if (distSq < crSq && eng > 0.01) {
            const dist = Math.sqrt(distSq);
            if (isBulge) {
              const t = 1 - dist / cr;
              const push = t * t * (p.bulgeStrength as number) * eng;
              const angle = Math.atan2(dy, dx);
              d.sx += (d.ax - Math.cos(angle) * push - d.sx) * 0.15;
              d.sy += (d.ay - Math.sin(angle) * push - d.sy) * 0.15;
            } else {
              const angle = Math.atan2(dy, dx);
              const move = (500 / dist) * (m.speed * (p.cursorForce as number));
              d.vx += Math.cos(angle) * -move;
              d.vy += Math.sin(angle) * -move;
            }
          } else if (isBulge) {
            d.sx += (d.ax - d.sx) * 0.1;
            d.sy += (d.ay - d.sy) * 0.1;
          }

          if (!isBulge) {
            d.vx *= 0.9;
            d.vy *= 0.9;
            d.x = d.ax + d.vx;
            d.y = d.ay + d.vy;
            d.sx += (d.x - d.sx) * 0.1;
            d.sy += (d.y - d.sy) * 0.1;
          }

          let drawX = d.sx;
          let drawY = d.sy;
          if ((p.waveAmplitude as number) > 0) {
            drawY += Math.sin(d.ax * 0.03 + t) * (p.waveAmplitude as number);
            drawX +=
              Math.cos(d.ay * 0.03 + t * 0.7) *
              (p.waveAmplitude as number) *
              0.5;
          }

          if (p.sparkle && isMovingRef.current) {
            const hash = ((i * 2654435761) ^ (frameCount >> 3)) >>> 0;
            if (hash % 100 < 3) {
              ctx!.moveTo(drawX + rad * 1.8, drawY);
              ctx!.arc(drawX, drawY, rad * 1.8, 0, TWO_PI);
            } else {
              ctx!.moveTo(drawX + rad, drawY);
              ctx!.arc(drawX, drawY, rad, 0, TWO_PI);
            }
          } else {
            ctx!.moveTo(drawX + rad, drawY);
            ctx!.arc(drawX, drawY, rad, 0, TWO_PI);
          }
        }

        ctx!.fill();

        if (propsRef.current.paused) return false;
      }
      drawRef.current = tick;

      loop.resize();
      loop.start();
      window.addEventListener('mousemove', onMouseMove, { passive: true });
      window.addEventListener('touchstart', onTouchMove, { passive: true });
      window.addEventListener('touchmove', onTouchMove, { passive: true });
      window.addEventListener('touchend', onTouchEnd, { passive: true });
      window.addEventListener('touchcancel', onTouchEnd, { passive: true });

      rebuildRef.current = () => {
        const { w, h } = sizeRef.current;
        if (w > 0 && h > 0) buildDots(w, h);
      };

      return () => {
        drawRef.current = null;
        measureRef.current = null;
        clearInterval(speedInterval);
        if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('touchstart', onTouchMove);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
        window.removeEventListener('touchcancel', onTouchEnd);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      rebuildRef.current?.();
    }, [dotRadius, dotSpacing]);

    return (
      <div ref={containerRef} className="relative h-full w-full" {...rest}>
        <canvas
          ref={canvasRef}
          className="touch-none"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
          }}
        />
        <svg
          ref={svgRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          <defs>
            <radialGradient id={glowIdRef.current}>
              <stop offset="0%" stopColor={glowColor} stopOpacity="1" />
              <stop offset="100%" stopColor={glowColor} stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle
            ref={glowRef}
            cx="-9999"
            cy="-9999"
            r={glowRadius}
            fill={`url(#${glowIdRef.current})`}
            style={{ opacity: 0, willChange: 'opacity' }}
          />
        </svg>
      </div>
    );
  },
);

DotField.displayName = 'DotField';

export default DotField;
