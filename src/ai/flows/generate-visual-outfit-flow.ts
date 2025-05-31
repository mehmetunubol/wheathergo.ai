
'use server';
/**
 * @fileOverview Generates a visual representation of an outfit based on weather, profile, and clothing suggestions.
 * This flow orchestrates translation if needed, then constructs a prompt for image generation.
 *
 * - generateVisualOutfit - A function that generates an image.
 * - GenerateVisualOutfitInput - The input type for the function.
 * - GenerateVisualOutfitOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { WeatherData, ClothingSuggestionsOutput, Language } from '@/types';
import { translateTextsForImagePrompt, type TranslateTextsForImagePromptInput } from './translate-texts-for-image-prompt-flow';
import { getFlowAppSettings } from '@/lib/settings-service';
import { FLOW_CONFIGS } from '@/ai/ai-config';

const WeatherDataSchema = z.object({
  temperature: z.number(),
  condition: z.string(),
  conditionCode: z.string(),
  humidity: z.number(),
  windSpeed: z.number(),
  location: z.string(),
  date: z.string(), 
  description: z.string(),
  isDay: z.boolean().optional().default(true),
  forecast: z.array(z.any()).optional(),
  isGuessed: z.boolean().optional().default(false),
});

const ClothingSuggestionsOutputSchema = z.object({
  suggestions: z.array(z.string()),
  reasoning: z.string(),
});

const GenerateVisualOutfitInputSchema = z.object({
  weatherData: WeatherDataSchema.describe('The current weather data.'),
  familyProfile: z.string().describe('A description of the family profile, possibly in the source language.'),
  clothingSuggestions: ClothingSuggestionsOutputSchema.describe('The AI-generated clothing suggestions, possibly in the source language.'),
  language: z.enum(['en', 'tr']).describe('The source language of the input texts.'),
});
export type GenerateVisualOutfitInput = z.infer<typeof GenerateVisualOutfitInputSchema>;

const GenerateVisualOutfitOutputSchema = z.object({
  generatedImageUrl: z.string().url().nullable().describe('The data URI of the generated image, or null if generation failed.'),
});
export type GenerateVisualOutfitOutput = z.infer<typeof GenerateVisualOutfitOutputSchema>;

export async function generateVisualOutfit(input: GenerateVisualOutfitInput): Promise<GenerateVisualOutfitOutput> {
  return generateVisualOutfitMainFlow(input);
}

const generateVisualOutfitMainFlow = ai.defineFlow(
  {
    name: 'generateVisualOutfitMainFlow',
    inputSchema: GenerateVisualOutfitInputSchema,
    outputSchema: GenerateVisualOutfitOutputSchema,
  },
  async (input: GenerateVisualOutfitInput) => {
    let englishFamilyProfile = input.familyProfile;
    let englishWeatherCondition = input.weatherData.condition;
    let englishClothingSuggestions = input.clothingSuggestions.suggestions;

    if (input.language !== 'en') {
      try {
        const translationInput: TranslateTextsForImagePromptInput = {
          familyProfile: input.familyProfile,
          weatherCondition: input.weatherData.condition,
          clothingSuggestions: input.clothingSuggestions.suggestions,
          sourceLanguage: input.language,
        };
        const translationResult = await translateTextsForImagePrompt(translationInput);
        englishFamilyProfile = translationResult.translatedFamilyProfile;
        englishWeatherCondition = translationResult.translatedWeatherCondition;
        englishClothingSuggestions = translationResult.translatedClothingSuggestions;
        console.log("Translated texts for image prompt:", translationResult);
      } catch (translationError) {
        console.error("Translation step failed for image prompt generation:", translationError);
      }
    }

    const dayNightContext = input.weatherData.isDay === false ? "nighttime scene" : "daytime scene";
    const imageStyle = "Charming fashion illustration, stylized, clear focus on clothing items.";

    const imagePrompt = `
      Generate an image in a '${imageStyle}' style.
      Depict: ${englishFamilyProfile}.
      They are wearing: ${englishClothingSuggestions.join(', ')}.
      The setting is '${input.weatherData.location}' experiencing '${englishWeatherCondition}' weather at ${input.weatherData.temperature}°C.
      It is a ${dayNightContext}.
      The image should clearly show the people and their attire in the described environment.

      CRITICAL INSTRUCTION: Do NOT include any of this instructional text, or any other text from this prompt, directly visible within the main subject or background of the generated image. The image should be purely visual without embedded text from these instructions.
    `;
    console.log("Final Image Prompt for AI generation:", imagePrompt);

    const appSettings = await getFlowAppSettings();
    const flowConfig = FLOW_CONFIGS.find(fc => fc.id === 'generateVisualOutfitMainFlow');
    const modelId = appSettings.flowModelOverrides?.['generateVisualOutfitMainFlow'] || flowConfig?.defaultModel || 'googleai/gemini-2.0-flash-exp';

    try {
      const { media, finishReason, ...rest } = await ai.generate({
        model: modelId as any,
        prompt: imagePrompt,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          safetySettings: [
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          ],
        },
      });

      if (media && media.url) {
        if (finishReason && finishReason !== 'stop' && finishReason !== 'length') {
          console.warn(`Image generation finished with reason: ${finishReason}. Full response:`, JSON.stringify(rest));
        }
        return { generatedImageUrl: media.url };
      } else {
        const reasonText = (typeof finishReason === 'string' && finishReason.trim() !== '') ? finishReason : 'unknown';
        console.error('AI image generation failed to produce an image URL.', 'Finish Reason:', reasonText, 'Full Response:', JSON.stringify(rest));
        throw new Error(`AI image generation failed to produce an image URL. Reason: ${reasonText}.`);
      }
    } catch (error: any) {
      console.error('Error in image generation step with model', modelId, ':', error);
      let finalErrorMessage = 'Failed to generate outfit visualization image.';
      if (error && typeof error.message === 'string') {
        if (error.message.toLowerCase().includes('api key not valid')) {
          finalErrorMessage = 'Image generation failed: API key issue. Please contact support.';
        } else if (error.message.startsWith('AI image generation failed to produce an image URL')) {
          finalErrorMessage = error.message;
        } else {
          finalErrorMessage = `Failed to generate outfit image: ${error.message}`;
        }
      } else if (error) {
          finalErrorMessage = `Failed to generate outfit image due to an unexpected error: ${String(error)}`;
      }
      if (typeof error.message !== 'string') console.error("Original error object (non-string message):", error);
      throw new Error(finalErrorMessage);
    }
  }
);
