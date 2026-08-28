/**
 * Same-tab signal fired whenever a schedule proposal is approved (applied).
 * Lets the sidebar's applied-schedule list refresh itself without polling or
 * a shared store, mirroring newChatSignal.ts.
 */
const SCHEDULE_APPLIED_EVENT = 'koner:schedule-applied';

export function notifyScheduleApplied(): void {
  window.dispatchEvent(new Event(SCHEDULE_APPLIED_EVENT));
}

export function onScheduleApplied(handler: () => void): () => void {
  window.addEventListener(SCHEDULE_APPLIED_EVENT, handler);
  return () => window.removeEventListener(SCHEDULE_APPLIED_EVENT, handler);
}
