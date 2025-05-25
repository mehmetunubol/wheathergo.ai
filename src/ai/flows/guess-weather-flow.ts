
'use server';
/**
 * @fileOverview A Genkit flow to generate an AI-guessed weather forecast for a future date.
 *
 * - guessWeather - A function that provides an estimated weather forecast.
 * - GuessedWeatherInput - The input type for the guessWeather function.
 * - GuessedWeatherOutput - The return type for the guessWeather function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { GuessedWeatherInput as GuessedWeatherInputType , GuessedWeatherOutput } from '@/types'; // Renamed original import
import type { Language } from '@/types';

// Extend the schema for the flow itself
const GuessedWeatherFlowInputSchema = z.object({
  location: z.string().describe('The target location for the weather guess (e.g., "Paris, France", "Tokyo").'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('The target date for the weather guess, in YYYY-MM-DD format.'),
  language: z.enum(['en', 'tr']).optional().default('en').describe('The language for the forecast description.'),
});
export type GuessedWeatherInput = z.infer<typeof GuessedWeatherFlowInputSchema>;


const GuessedWeatherOutputSchema = z.object({
  temperature: z.number().describe('The estimated average daily temperature in Celsius.'),
  condition: z.string().describe('A brief text description of the most likely weather condition (e.g., "Sunny", "Partly Cloudy", "Light Rain").'),
  conditionCode: z.string().describe('A numeric WeatherAPI.com compatible condition code representing the primary condition (e.g., "1000" for Sunny, "1003" for Partly Cloudy, "1183" for Light Rain). Refer to WeatherAPI.com documentation for a list of codes. Default to "1000" if unsure but generally good weather is expected.'),
  humidity: z.number().int().min(0).max(100).describe('The estimated average daily humidity percentage (0-100).'),
  windSpeed: z.number().min(0).describe('The estimated average daily wind speed in km/h.'),
  description: z.string().describe('A slightly more detailed textual description of the estimated weather conditions for the day. Keep it concise (1-2 sentences). Example: "Expect a mostly sunny day with a gentle breeze. Temperatures will be pleasant."'),
  locationName: z.string().optional().describe('The resolved or recognized name of the location for which the forecast is made, if different from input or if input was generic.'),
});

export async function guessWeather(input: GuessedWeatherInput): Promise<GuessedWeatherOutput> {
  return guessWeatherFlow(input);
}

const getPromptTemplate = (language: Language = 'en') => {
  const respondInLang = language === 'tr' ? "Lütfen Türkçe yanıt ver." : "Please respond in English.";
  const basePrompt = language === 'tr' ?
  `
    Yardımcı bir YZ hava durumu tahmincisisin. Görevin, belirli bir konumda gelecekteki bir tarih için makul, tahmini günlük hava durumu tahmini sağlamaktır.
    Sağlanan tarih 3 günden daha ileride, bu yüzden kesin bir tahmin mümkün değil. Tahminini, biliniyorsa konum ve mevsim için genel klimatolojik örüntülere dayandır veya tipik bir gün için makul varsayımlarda bulun.

    Konum: {{{location}}}
    Tarih: {{{date}}}

    Aşağıdaki tahmini günlük değerleri sağla:
    - Ortalama Sıcaklık (Santigrat)
    - Ana Hava Durumu (örn: "Güneşli", "Parçalı Bulutlu", "Hafif Yağmurlu")
    - Ana durum için WeatherAPI.com uyumlu sayısal Durum Kodu (örn: Güneşli için 1000, Parçalı Bulutlu için 1003, Olası yer yer yağmur için 1063, Hafif yağmur için 1183). Emin değilseniz ancak genellikle iyi hava bekleniyorsa "1000" kullanın.
    - Ortalama Nem (yüzde)
    - Ortalama Rüzgar Hızı (km/s)
    - Günün hava koşullarının kısa bir açıklayıcı özeti (1-2 cümle).

    Tarih ima ediyorsa mevsimi dikkate al (örn: Kuzey Yarımküre'de Ocak kıştır).
    Konum çok genel ise (örn: "plaj"), mevsim için tipik popüler bir plaj destinasyonu iklimi varsay.
    Konum tanınırsa, açıklığa kavuşturmaya yardımcı oluyorsa tanınan adı çıktınızda 'locationName' olarak ekleyebilirsiniz.

    Çıktıyı belirtilen JSON formatında döndür.
    ${respondInLang}
  `
  :
  `
    You are a helpful AI weather forecaster. Your task is to provide a plausible, estimated daily weather forecast for a future date at a given location.
    The date provided is more than 3 days in the future, so an exact forecast isn't possible. Base your estimate on general climatological patterns for the location and season if known, or make reasonable assumptions for a typical day.

    Location: {{{location}}}
    Date: {{{date}}}

    Provide the following estimated daily values:
    - Average Temperature (Celsius)
    - Primary Weather Condition (e.g., "Sunny", "Cloudy", "Rain Showers")
    - A WeatherAPI.com compatible numeric Condition Code for the primary condition (e.g., 1000 for Sunny, 1003 for Partly Cloudy, 1063 for Patchy rain possible, 1183 for Light rain). If unsure but expecting generally good weather, use "1000".
    - Average Humidity (percentage)
    - Average Wind Speed (km/h)
    - A brief descriptive summary of the day's weather (1-2 sentences).

    Consider the season if the date implies it (e.g., January in the Northern Hemisphere is winter).
    If the location is very generic (e.g., "beach"), assume a typical popular beach destination climate for the season.
    If the location is recognized, you can include the recognized name as 'locationName' in your output if it helps clarify.

    Return the output in the specified JSON format.
    ${respondInLang}
  `;
  return basePrompt;
};

const guessWeatherFlow = ai.defineFlow(
  {
    name: 'guessWeatherFlow',
    inputSchema: GuessedWeatherFlowInputSchema, // Use the flow-specific input schema
    outputSchema: GuessedWeatherOutputSchema,
  },
  async (input) => {
    const promptTemplate = getPromptTemplate(input.language);
    const prompt = ai.definePrompt({
      name: 'guessWeatherDynamicPrompt',
      input: { schema: GuessedWeatherFlowInputSchema }, // Use the flow-specific input schema
      output: { schema: GuessedWeatherOutputSchema },
      prompt: promptTemplate,
    });

    try {
      const { output } = await prompt(input); // Pass the full input including language
      if (!output) {
        console.error('AI guess weather prompt returned no output. Input:', input);
        const desc = input.language === 'tr' ? "YZ tahmini kullanılamıyor. Lütfen tarihe yakın tekrar kontrol edin." : "AI forecast unavailable. Assuming pleasant weather. Please check closer to the date.";
        return {
          temperature: 20,
          condition: input.language === 'tr' ? "Hoş Hava" : "Pleasant",
          conditionCode: "1000",
          humidity: 60,
          windSpeed: 10,
          description: desc,
          locationName: input.location,
        };
      }
      return output;
    } catch (error) {
      console.error('Error in guessWeatherFlow:', error);
      const desc = input.language === 'tr' ? "YZ kaynaklı tahmin şu anda kullanılamıyor. Genellikle hoş bir hava varsayılıyor. Daha doğru bir tahmin için lütfen tarihe yakın tekrar kontrol edin." : "AI-generated forecast currently unavailable. Assuming generally pleasant weather. Please check closer to the date for a more accurate forecast.";
      return {
        temperature: 20,
        condition: input.language === 'tr' ? "Hoş Hava (Tahmin)" : "Pleasant (Estimate)",
        conditionCode: "1000",
        humidity: 60,
        windSpeed: 10,
        description: desc,
        locationName: input.location,
      };
    }
  }
);
