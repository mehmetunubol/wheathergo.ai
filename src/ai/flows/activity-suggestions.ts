'use server';

/**
 * @fileOverview Provides activity suggestions based on weather and user profiles.
 *
 * - suggestActivities - A function that returns activity suggestions.
 * - ActivitySuggestionsInput - The input type for the suggestActivities function.
 * - ActivitySuggestionsOutput - The return type for the suggestActivities function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ActivitySuggestionsInputSchema = z.object({
  weatherCondition: z.string().describe('The current weather condition (e.g., sunny, rainy, cloudy).'),
  temperature: z.number().describe('The current temperature in Celsius.'),
  familyProfile: z
    .string()
    .describe(
      'A description of the family profile, including ages and any relevant sensitivities or preferences. For example: Two adults, one child (age 5), and a dog.  The child has pollen allergies.'
    ),
  timeOfDay: z.string().describe('The current time of day (e.g., morning, afternoon, evening).'),
  locationPreferences: z.string().optional().describe('Optional preferences of user location. Defaults to current location if not provided'),
});
export type ActivitySuggestionsInput = z.infer<typeof ActivitySuggestionsInputSchema>;

const ActivitySuggestionsOutputSchema = z.object({
  indoorActivities: z.array(z.string()).describe('A list of suggested indoor activities.'),
  outdoorActivities: z.array(z.string()).describe('A list of suggested outdoor activities.'),
});
export type ActivitySuggestionsOutput = z.infer<typeof ActivitySuggestionsOutputSchema>;

export async function suggestActivities(input: ActivitySuggestionsInput): Promise<ActivitySuggestionsOutput> {
  return activitySuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'activitySuggestionsPrompt',
  input: {schema: ActivitySuggestionsInputSchema},
  output: {schema: ActivitySuggestionsOutputSchema},
  prompt: `You are a helpful assistant that suggests activities based on weather conditions and family profiles.

  Weather Condition: {{{weatherCondition}}}
  Temperature: {{{temperature}}} Celsius
  Family Profile: {{{familyProfile}}}
  Time of Day: {{{timeOfDay}}}
  Location Preferences: {{{locationPreferences}}}

  Based on this information, suggest some indoor and outdoor activities that the family might enjoy.
  Consider the family's profile when making suggestions.  For example, if they have young children, suggest activities that are appropriate for young children.
  Pay extra attention to any allergies or sensitives listed in the family profile.
  Provide the activities in JSON format.
  `,
});

const activitySuggestionsFlow = ai.defineFlow(
  {
    name: 'activitySuggestionsFlow',
    inputSchema: ActivitySuggestionsInputSchema,
    outputSchema: ActivitySuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
