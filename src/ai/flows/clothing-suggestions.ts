
'use server';

/**
 * @fileOverview This file defines a Genkit flow for providing clothing suggestions based on weather conditions and user profiles.
 *
 * - suggestClothing - A function that generates clothing suggestions.
 * - ClothingSuggestionsInput - The input type for the suggestClothing function.
 * - ClothingSuggestionsOutput - The return type for the suggestClothing function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { Language } from '@/types';
import { getFlowAppSettings } from '@/lib/settings-service';
import { FLOW_CONFIGS } from '@/ai/ai-config';

const ClothingSuggestionsInputSchema = z.object({
  weatherCondition: z.string().describe('The current weather condition (e.g., sunny, rainy, cloudy, snowy).'),
  temperature: z.number().describe('The current temperature in Celsius.'),
  familyProfile: z.string().describe('A description of the family members, including ages and any relevant sensitivities (e.g., baby, pet allergies).'),
  location: z.string().describe('The current location of the user.'),
  language: z.enum(['en', 'tr']).optional().default('en').describe('The language for the suggestions.'),
});
export type ClothingSuggestionsInput = z.infer<typeof ClothingSuggestionsInputSchema>;

const ClothingSuggestionsOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('An array of clothing suggestions appropriate for the weather conditions and family profile.'),
  reasoning: z.string().describe('The reasoning behind the clothing suggestions.'),
});
export type ClothingSuggestionsOutput = z.infer<typeof ClothingSuggestionsOutputSchema>;

export async function suggestClothing(input: ClothingSuggestionsInput): Promise<ClothingSuggestionsOutput> {
  return suggestClothingFlow(input);
}

const getPromptTemplate = (language: Language = 'en') => {
  const respondInLang = language === 'tr' ? "Lütfen Türkçe yanıt ver." : "Please respond in English.";
  
  const basePrompt = language === 'tr' ?
  `Sen hava koşullarına, sıcaklığa, aile profiline ve konuma göre giysi önerileri sunan kişisel bir stilist AI'sın.

  Hava Durumu: {{{weatherCondition}}}
  Sıcaklık: {{{temperature}}}°C
  Aile Profili: {{{familyProfile}}}
  Konum: {{{location}}}

  Hava durumunu ve aile profilinde belirtilen hassasiyetleri göz önünde bulundurarak her aile üyesi için özel giysi önerileri sun. Her önerinin gerekçesini açıkla.
  Önerileri bir dize dizisi olarak ve gerekçeyi ayrı bir dize olarak döndür.
  ${respondInLang}`
  :
  `You are a personal stylist AI that provides clothing suggestions based on the weather conditions, temperature, familyProfile, and location.

  Weather Condition: {{{weatherCondition}}}
  Temperature: {{{temperature}}}°C
  Family Profile: {{{familyProfile}}}
  Location: {{{location}}}

  Provide specific clothing suggestions for each family member considering the weather and any sensitivities mentioned in the family profile. Explain your reasoning for each suggestion.
  Return the suggestions in an array of strings, and the reasoning in a separate string.
  ${respondInLang}`;

  return basePrompt;
};


const suggestClothingFlow = ai.defineFlow(
  {
    name: 'suggestClothingFlow',
    inputSchema: ClothingSuggestionsInputSchema,
    outputSchema: ClothingSuggestionsOutputSchema,
  },
  async (input) => {
    const appSettings = await getFlowAppSettings();
    const flowConfig = FLOW_CONFIGS.find(fc => fc.id === 'suggestClothingFlow');
    const modelId = appSettings.flowModelOverrides?.['suggestClothingFlow'] || flowConfig?.defaultModel || 'googleai/gemini-1.5-flash-latest';

    const promptTemplate = getPromptTemplate(input.language);
    
    const dynamicPrompt = ai.definePrompt({
        name: `clothingSuggestionsDynamicPrompt_${input.language}`, 
        model: modelId as any, 
        input: { schema: ClothingSuggestionsInputSchema },
        output: { schema: ClothingSuggestionsOutputSchema },
        prompt: promptTemplate,
    });

    try {
      const {output} = await dynamicPrompt(input);
      if (!output) {
        console.error('Clothing suggestions prompt returned no output, but did not throw. Input:', input);
        return { suggestions: [], reasoning: input.language === 'tr' ? "Şu anda öneri oluşturulamadı." : "Could not generate suggestions at this time." };
      }
      return output;
    } catch (error: any) {
      console.error('Error in suggestClothingFlow with model', modelId, ':', error);
      const errorMessage = error.message || String(error);
      if (errorMessage.includes('429') || 
          errorMessage.toLowerCase().includes('quota') ||
          errorMessage.toLowerCase().includes('rate limit') ||
          errorMessage.toLowerCase().includes('model is overloaded') || 
          errorMessage.toLowerCase().includes('service is currently unavailable')) {
        const busyMessage = input.language === 'tr' 
          ? "AI öneri servisi şu anda meşgul veya limit aşıldı. Lütfen birazdan tekrar deneyin." 
          : "AI suggestion service is currently busy or rate limited. Please try again in a moment.";
        return { 
          suggestions: [busyMessage], 
          reasoning: ""
        };
      }
      throw error; 
    }
  }
);
