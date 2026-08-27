import { apiFetch } from './client';
import type { ConversationMessageDto } from '../types/conversation';

export function getConversation(): Promise<ConversationMessageDto[]> {
  return apiFetch<ConversationMessageDto[]>('/conversation');
}
