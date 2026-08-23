import { useState } from 'react';
import DotField from '@/components/DotField';

export function AppBackground() {
  const [reducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 bg-background"
      aria-hidden="true"
    >
      <DotField paused={reducedMotion} cursorRadius={40} glowRadius={40} sparkle />
    </div>
  );
}
