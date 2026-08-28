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
];

export const DEFAULT_AI_MODEL_ID = AI_MODEL_OPTIONS[0].id;
