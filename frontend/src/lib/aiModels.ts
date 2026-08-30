export interface AiModelOption {
  id: string;
  label: string;
  /** The specific underlying model version currently powering this option. */
  version: string;
}

/**
 * The list backing the Profile page's "AI Model" selector. Adding a future
 * model is just adding an entry here - the dropdown renders whatever is
 * listed, with no other code changes required.
 */
export const AI_MODEL_OPTIONS: AiModelOption[] = [
  { id: 'gemini', label: 'Gemini', version: 'Gemini 3.5 Flash-Lite' },
  { id: 'deepseek', label: 'DeepSeek', version: 'DeepSeek V4 Flash' },
];

export const DEFAULT_AI_MODEL_ID = AI_MODEL_OPTIONS[0].id;

/**
 * Display label for a provider id as returned by the backend (AiAnalyzeResponse.providerId,
 * sourced from ILlmService.ProviderId - backend config/routing, never the model's own
 * text). Falls back to the raw id if it's ever not (yet) listed above.
 */
export function getModelLabel(providerId: string): string {
  return AI_MODEL_OPTIONS.find((option) => option.id === providerId)?.version ?? providerId;
}
