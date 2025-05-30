
'use server';
/**
 * @fileOverview A Genkit flow to translate specific texts (family profile, weather condition, clothing suggestions)
 * from a source language to English, optimized for subsequent image prompt generation.
 *
 * - translateTextsForImagePrompt - A function that translates texts to English.
 * - TranslateTextsForImagePromptInput - The input type for the function.
 * - TranslateTextsForImagePromptOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { Language } from '@/types';

const TranslateTextsForImagePromptInputSchema = z.object({
  familyProfile: z.string().describe('The family profile text, possibly in the source language.'),
  weatherCondition: z.string().describe('The weather condition text, possibly in the source language.'),
  clothingSuggestions: z.array(z.string()).describe('A list of clothing suggestions, possibly in the source language.'),
  sourceLanguage: z.enum(['en', 'tr']).describe('The source language of the texts (e.g., "tr" for Turkish).'),
});
export type TranslateTextsForImagePromptInput = z.infer<typeof TranslateTextsForImagePromptInputSchema>;

const TranslateTextsForImagePromptOutputSchema = z.object({
  translatedFamilyProfile: z.string().describe('The family profile text, translated into English with a focus on visual descriptors.'),
  translatedWeatherCondition: z.string().describe('The weather condition text, translated into concise English.'),
  translatedClothingSuggestions: z.array(z.string()).describe('The list of clothing suggestions, translated into English.'),
});
export type TranslateTextsForImagePromptOutput = z.infer<typeof TranslateTextsForImagePromptOutputSchema>;

export async function translateTextsForImagePrompt(input: TranslateTextsForImagePromptInput): Promise<TranslateTextsForImagePromptOutput> {
  // If source language is already English, no need to translate
  if (input.sourceLanguage === 'en') {
    return {
      translatedFamilyProfile: input.familyProfile,
      translatedWeatherCondition: input.weatherCondition,
      translatedClothingSuggestions: input.clothingSuggestions,
    };
  }
  return translateTextsFlow(input);
}

const getLanguageName = (langCode: Language) => {
    if (langCode === 'tr') return 'Turkish';
    return 'English';
}

const translateTextsFlow = ai.defineFlow(
  {
    name: 'translateTextsFlow',
    inputSchema: TranslateTextsForImagePromptInputSchema,
    outputSchema: TranslateTextsForImagePromptOutputSchema,
  },
  async (input) => {
    const sourceLangName = getLanguageName(input.sourceLanguage);
    const promptText = `You are an expert translator specializing in converting descriptive text into concise English suitable for image generation prompts.
Translate the following texts from ${sourceLangName} to English.
Focus on capturing the visual essence and key descriptive terms.

Texts to translate:
1. Family Profile (describe the subjects visually, e.g., "a young mother and her baby", "a family with two children and a dog"):
   "${input.familyProfile}"

2. Weather Condition (e.g., "Clear", "Snowy", "Rainy"):
   "${input.weatherCondition}"

3. Clothing Suggestions (list of items):
{{#each clothingSuggestions}}
   - {{{this}}}
{{/each}}

Return ONLY the translated English texts in the specified JSON output format.
The "translatedFamilyProfile" should be a concise visual description of the people.
The "translatedWeatherCondition" should be a short phrase.
The "translatedClothingSuggestions" should be an array of translated clothing item names.`;

    const prompt = ai.definePrompt({
      name: 'translateTextsForImagePrompt',
      model: 'googleai/gemini-1.5-flash-latest', // Explicitly specify the model
      input: {schema: TranslateTextsForImagePromptInputSchema},
      output: {schema: TranslateTextsForImagePromptOutputSchema},
      prompt: promptText,
    });

    try {
      const {output} = await prompt(input);
      if (!output) {
        console.error('Translation flow returned no output. Input:', input);
        // Fallback to original if translation fails, or handle error more specifically
        return {
          translatedFamilyProfile: input.familyProfile,
          translatedWeatherCondition: input.weatherCondition,
          translatedClothingSuggestions: input.clothingSuggestions,
        };
      }
      return output;
    } catch (error) {
      console.error('Error in translateTextsFlow:', error);
      // Fallback to original texts if translation fails
      return {
        translatedFamilyProfile: `Original (translation failed): ${input.familyProfile}`,
        translatedWeatherCondition: `Original (translation failed): ${input.weatherCondition}`,
        translatedClothingSuggestions: input.clothingSuggestions.map(s => `Original (translation failed): ${s}`),
      };
    }
  }
);

