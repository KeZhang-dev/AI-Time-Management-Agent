/**
 * Same-tab signal from the sidebar's "New Chat" button (rendered outside
 * SolutionPage, in AppLayout) to SolutionPage itself, which owns the actual
 * chat state and confirmation flow. Deliberately not routing/query-param
 * based, so clicking it while already on Solution doesn't touch browser history.
 */
const NEW_CHAT_EVENT = 'koner:new-chat-requested';

export function requestNewChat(): void {
  window.dispatchEvent(new Event(NEW_CHAT_EVENT));
}

export function onNewChatRequested(handler: () => void): () => void {
  window.addEventListener(NEW_CHAT_EVENT, handler);
  return () => window.removeEventListener(NEW_CHAT_EVENT, handler);
}
