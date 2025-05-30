
'use server';
/**
 * @fileOverview A Genkit flow to generate blog post content using AI.
 *
 * - generateBlogContent - A function that generates blog content based on a title and optional prompt.
 * - GenerateBlogContentInput - The input type for the generateBlogContent function.
 * - GenerateBlogContentOutput - The return type for the generateBlogContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { Language } from '@/types';
import { getFlowAppSettings } from '@/lib/settings-service';
import { FLOW_CONFIGS } from '@/ai/ai-config';

const GenerateBlogContentInputSchema = z.object({
  title: z.string().describe('The title of the blog post for which content needs to be generated.'),
  promptDetails: z.string().optional().describe('Optional additional details or a specific prompt to guide content generation.'),
  language: z.enum(['en', 'tr']).optional().default('en').describe('The language for the generated content.'),
});
export type GenerateBlogContentInput = z.infer<typeof GenerateBlogContentInputSchema>;

const GenerateBlogContentOutputSchema = z.object({
  generatedContent: z.string().describe('The AI-generated content for the blog post, in Markdown format.'),
});
export type GenerateBlogContentOutput = z.infer<typeof GenerateBlogContentOutputSchema>;

export async function generateBlogContent(input: GenerateBlogContentInput): Promise<GenerateBlogContentOutput> {
  return generateBlogContentFlow(input);
}

const getPromptTemplate = (language: Language = 'en') => {
  const respondInLang = language === 'tr' ? "Lütfen Türkçe yanıt ver." : "Please respond in English.";
  const markdownInstruction = language === 'tr' ? "Lütfen içeriği Markdown formatında oluştur." : "Please generate the content in Markdown format.";
  const basePrompt = language === 'tr' ?
  `
  Aşağıdaki başlığa sahip bir blog yazısı için ilgi çekici ve bilgilendirici içerik oluştur: "{{{title}}}".
  Blog yazısı iyi yapılandırılmış, okunması kolay ve hedef kitle için değerli olmalıdır.
  {{#if promptDetails}}
  İçeriği oluştururken aşağıdaki ek ayrıntıları veya yönlendirmeleri dikkate al:
  "{{{promptDetails}}}"
  {{/if}}
  Uzun ve kapsamlı bir blog yazısı oluştur. ${markdownInstruction}
  ${respondInLang}
  `
  :
  `
  Generate engaging and informative blog post content for a blog post titled: "{{{title}}}".
  The blog post should be well-structured, easy to read, and valuable for the target audience.
  {{#if promptDetails}}
  Consider the following additional details or prompt when generating the content:
  "{{{promptDetails}}}"
  {{/if}}
  Generate a lengthy and comprehensive blog post. ${markdownInstruction}
  ${respondInLang}
  `;
  return basePrompt;
}

const generateBlogContentFlow = ai.defineFlow(
  {
    name: 'generateBlogContentFlow',
    inputSchema: GenerateBlogContentInputSchema,
    outputSchema: GenerateBlogContentOutputSchema,
  },
  async (input) => {
    const appSettings = await getFlowAppSettings();
    const flowConfig = FLOW_CONFIGS.find(fc => fc.id === 'generateBlogContentFlow');
    const modelId = appSettings.flowModelOverrides?.['generateBlogContentFlow'] || flowConfig?.defaultModel || 'googleai/gemini-1.5-flash-latest';

    const promptTemplate = getPromptTemplate(input.language);
    
    const dynamicPrompt = ai.definePrompt({
      name: `generateBlogContentDynamicPrompt_${input.language}`,
      model: modelId as any,
      input: {schema: GenerateBlogContentInputSchema},
      output: {schema: GenerateBlogContentOutputSchema},
      prompt: promptTemplate,
      config: { 
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      }
    });
    try {
      const {output} = await dynamicPrompt(input);
      if (!output || !output.generatedContent) {
        console.error('AI blog content generation returned no output or empty content. Input:', input);
        return { generatedContent: input.language === 'tr' ? "İçerik üretilemedi." : "Could not generate content." };
      }
      return output;
    } catch (error) {
      console.error('Error in generateBlogContentFlow with model', modelId, ':', error);
      throw error; 
    }
  }
);
