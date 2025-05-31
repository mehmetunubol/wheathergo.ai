
// src/ai/ai-config.ts
export const AVAILABLE_MODELS = [
  { id: 'googleai/gemini-1.5-flash-latest', name: 'Gemini 1.5 Flash' },
  { id: 'googleai/gemini-1.5-pro-latest', name: 'Gemini 1.5 Pro' },
  { id: 'googleai/gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Image Gen)' },
  { id: 'local/custom-llm', name: 'Custom Local LLM' },
  // Add more models as they become available or relevant
] as const;

export type ModelId = typeof AVAILABLE_MODELS[number]['id'];

export interface FlowConfig {
  id: string; // Matches the 'name' property in ai.defineFlow or a unique key for flows using ai.generate
  displayName: string;
  defaultModel: ModelId;
  compatibleModels: ReadonlyArray<ModelId>; // To restrict which models can be selected for a flow
}

export const FLOW_CONFIGS: ReadonlyArray<FlowConfig> = [
  {
    id: 'suggestClothingFlow',
    displayName: 'Clothing Suggestions',
    defaultModel: 'googleai/gemini-1.5-flash-latest',
    compatibleModels: ['googleai/gemini-1.5-flash-latest', 'googleai/gemini-1.5-pro-latest', 'local/custom-llm'],
  },
  {
    id: 'activitySuggestionsFlow',
    displayName: 'Activity Suggestions',
    defaultModel: 'googleai/gemini-1.5-flash-latest',
    compatibleModels: ['googleai/gemini-1.5-flash-latest', 'googleai/gemini-1.5-pro-latest', 'local/custom-llm'],
  },
  {
    id: 'generateBlogContentFlow',
    displayName: 'Blog Content Generation',
    defaultModel: 'googleai/gemini-1.5-flash-latest',
    compatibleModels: ['googleai/gemini-1.5-flash-latest', 'googleai/gemini-1.5-pro-latest', 'local/custom-llm'],
  },
  {
    id: 'guessWeatherFlow',
    displayName: 'Guess Weather (AI Estimate)',
    defaultModel: 'googleai/gemini-1.5-flash-latest',
    compatibleModels: ['googleai/gemini-1.5-flash-latest', 'googleai/gemini-1.5-pro-latest', 'local/custom-llm'],
  },
  {
    id: 'generateVisualOutfitMainFlow',
    displayName: 'Outfit Image Generation',
    defaultModel: 'googleai/gemini-2.0-flash-exp',
    compatibleModels: ['googleai/gemini-2.0-flash-exp'],
  },
  {
    id: 'translateTextsFlow',
    displayName: 'Text Translation (for Image Prompts)',
    defaultModel: 'googleai/gemini-1.5-flash-latest',
    compatibleModels: ['googleai/gemini-1.5-flash-latest', 'googleai/gemini-1.5-pro-latest', 'local/custom-llm'],
  },
];
