
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

const ClothingSuggestionsInputSchema = z.object({
  weatherCondition: z.string().describe('The current weather condition (e.g., sunny, rainy, cloudy, snowy).'),
  temperature: z.number().describe('The current temperature in Celsius.'),
  familyProfile: z.string().describe('A description of the family members, including ages and any relevant sensitivities (e.g., baby, pet allergies).'),
  location: z.string().describe('The current location of the user.'),
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

const prompt = ai.definePrompt({
  name: 'clothingSuggestionsPrompt',
  input: {schema: ClothingSuggestionsInputSchema},
  output: {schema: ClothingSuggestionsOutputSchema},
  prompt: `You are a personal stylist AI that provides clothing suggestions based on the weather conditions, temperature, family profile, and location.

  Weather Condition: {{{weatherCondition}}}
  Temperature: {{{temperature}}}°C
  Family Profile: {{{familyProfile}}}
  Location: {{{location}}}

  Provide specific clothing suggestions for each family member considering the weather and any sensitivities mentioned in the family profile. Explain your reasoning for each suggestion.
  Return the suggestions in an array of strings, and the reasoning in a separate string.
  `,
});

const suggestClothingFlow = ai.defineFlow(
  {
    name: 'suggestClothingFlow',
    inputSchema: ClothingSuggestionsInputSchema,
    outputSchema: ClothingSuggestionsOutputSchema,
  },
  async (input) => {
    try {
      const {output} = await prompt(input);
      if (!output) {
        // This case should ideally be handled by the prompt throwing an error if generation fails.
        // However, as a fallback, return an empty/default response adhering to the schema.
        console.error('Clothing suggestions prompt returned no output, but did not throw. Input:', input);
        return { suggestions: [], reasoning: "Could not generate suggestions at this time." };
      }
      return output;
    } catch (error) {
      console.error('Error in suggestClothingFlow:', error);
      // Re-throw the error to be caught by the client-side caller
      throw error;
    }
  }
);

