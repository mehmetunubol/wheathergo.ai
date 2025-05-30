
'use server';
/**
 * @fileOverview Generates a visual representation of an outfit based on weather, profile, and clothing suggestions.
 *
 * - generateVisualOutfit - A function that generates an image.
 * - GenerateVisualOutfitInput - The input type for the function.
 * - GenerateVisualOutfitOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { WeatherData, ClothingSuggestionsOutput, Language } from '@/types';

// Define Zod schemas for WeatherData and ClothingSuggestionsOutput to be used within the flow input
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
  forecast: z.array(z.any()).optional(), // Simplified for this context
  isGuessed: z.boolean().optional().default(false),
});

const ClothingSuggestionsOutputSchema = z.object({
  suggestions: z.array(z.string()),
  reasoning: z.string(),
});

// NOT EXPORTED
const GenerateVisualOutfitInputSchema = z.object({
  weatherData: WeatherDataSchema.describe('The current weather data.'),
  familyProfile: z.string().describe('A description of the family profile.'),
  clothingSuggestions: ClothingSuggestionsOutputSchema.describe('The AI-generated clothing suggestions.'),
  language: z.enum(['en', 'tr']).describe('The language of the input text, to guide potential internal translation for the image prompt.'),
});
export type GenerateVisualOutfitInput = z.infer<typeof GenerateVisualOutfitInputSchema>;

// NOT EXPORTED
const GenerateVisualOutfitOutputSchema = z.object({
  generatedImageUrl: z.string().url().nullable().describe('The data URI of the generated image, or null if generation failed.'),
});
export type GenerateVisualOutfitOutput = z.infer<typeof GenerateVisualOutfitOutputSchema>;

const getPromptTemplate = (language: Language, isDay: boolean | undefined) => {
  let translationInstruction = '';
  if (language === 'tr') {
    translationInstruction = `
    IMPORTANT INSTRUCTION FOR TURKISH INPUT:
    The 'Family Profile' and 'Clothing Suggestions' might be in Turkish.
    First, conceptually translate these Turkish inputs into English visual descriptions.
    For example, if weather condition is 'Açık', interpret as 'Clear' or 'Sunny' for the image.
    If Family Profile is 'genç bir anne ve bebek', understand this as 'a young mother and her baby' for subject depiction.
    Then, use these English descriptions to create the final image prompt.
    The final image prompt MUST be in English.
    `;
  }

  const dayNightContext = isDay === false ? "nighttime scene" : "daytime scene";
  const imageStyle = "Charming fashion illustration, stylized, clear focus on clothing items.";

  return `
    ${translationInstruction}

    You are an AI image generation assistant. Your task is to generate an image based on the following visual description.
    Style: ${imageStyle}

    Visual Description Construction:
    - Subjects: From the 'Family Profile' ({{{familyProfile}}}), derive a concise visual characterization in English. For example, if the profile means 'a young mother and her baby', depict exactly that: a young woman with a baby, not other adults. Focus on the number and general types of people (e.g., 'a solo traveler', 'two adults and a toddler').
    - Attire: The subjects should be wearing clothing items suitable for the 'Suggested Clothing Items' ({{#each clothingSuggestions.suggestions}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}). If clothing items are in Turkish, ensure the visual description for the image is in English.
    - Environment: Place the subjects in '{{{weatherData.location}}}' experiencing '{{{weatherData.condition}}}' weather at {{{weatherData.temperature}}}°C. The scene should be a ${dayNightContext}. If weather condition is in Turkish (e.g., 'Açık'), interpret as 'Clear' or 'Sunny' for the image.

    Based on the above, create an image. The image should clearly depict the people wearing the suggested clothing in the described weather and location context.
    Ensure the output image is a single, coherent scene. Do not include any of this instructional text in the image.
  `;
};

export async function generateVisualOutfit(input: GenerateVisualOutfitInput): Promise<GenerateVisualOutfitOutput> {
  return generateVisualOutfitFlow(input);
}

const generateVisualOutfitFlow = ai.defineFlow(
  {
    name: 'generateVisualOutfitFlow',
    inputSchema: GenerateVisualOutfitInputSchema,
    outputSchema: GenerateVisualOutfitOutputSchema,
  },
  async (input: GenerateVisualOutfitInput) => {
    const imagePrompt = getPromptTemplate(input.language, input.weatherData.isDay);
    console.log("Full Image Prompt for AI generation:", imagePrompt); // For debugging

    try {
      const { media, finishReason, ...rest } = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp', // Crucial: Use the image-capable model
        prompt: imagePrompt,
        config: {
          responseModalities: ['TEXT', 'IMAGE'], // Must request both
           safetySettings: [ // Less restrictive for creative content
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
        console.error('AI image generation failed to produce an image URL.', 'Finish Reason:', finishReason, 'Full Response:', JSON.stringify(rest));
        // Ensure finishReason is a string for the error message
        const reasonText = (typeof finishReason === 'string' && finishReason.trim() !== '') ? finishReason : 'unknown';
        throw new Error(`AI image generation failed to produce an image URL. Reason: ${reasonText}.`);
      }
    } catch (error: any) {
      console.error('Error in generateVisualOutfitFlow execution:', error);
      let finalErrorMessage = 'Failed to generate outfit visualization image.';
      if (error && typeof error.message === 'string') {
        if (error.message.toLowerCase().includes('api key not valid')) {
          finalErrorMessage = 'Image generation failed: API key issue. Please contact support.';
        } else if (error.message.startsWith('AI image generation failed to produce an image URL')) {
          finalErrorMessage = error.message; // Use the more specific message from the try block
        } else {
          finalErrorMessage = `Failed to generate outfit image: ${error.message}`;
        }
      } else if (error) {
          finalErrorMessage = `Failed to generate outfit image due to an unexpected error: ${String(error)}`;
      }
      // Log the original error object for full details if it's not a simple string message
      if (typeof error.message !== 'string') console.error("Original error object (non-string message):", error);
      
      throw new Error(finalErrorMessage);
    }
  }
);
