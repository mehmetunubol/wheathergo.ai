
'use server';
/**
 * @fileOverview Genkit model definition for a custom local LLM HTTP endpoint.
 *
 * ## Configuration
 *
 * Set the `LOCAL_LLM_ENDPOINT_URL` environment variable in your .env file to the URL of your local LLM.
 * e.g., `LOCAL_LLM_ENDPOINT_URL="http://localhost:11434/api/generate"` (Example for Ollama, assuming non-streaming)
 *
 * ## Local LLM HTTP Endpoint Protocol
 *
 * Your local LLM endpoint is expected to:
 * - Accept `POST` requests.
 * - Expect `Content-Type: application/json`.
 * - Request Body Format:
 *   ```json
 *   {
 *     "prompt": "The user's prompt string",
 *     "model": "<identifier_from_config_modelIdentifier>", // Optional: Sent if provided in Genkit config. For Ollama, this is the model tag (e.g., "llama3:latest").
 *     "config": { // Optional: Sent if provided in Genkit config.
 *       "temperature": 0.7,
 *       "maxTokens": 1024 // Note: Ollama uses "num_predict" in an "options" object for maxTokens. Adapt your endpoint or this code if needed.
 *       // ... any other parameters your local LLM supports can be passed via Genkit's config
 *     }
 *   }
 *   ```
 * - Respond with `200 OK` and `Content-Type: application/json`.
 * - Response Body Format (minimum expected):
 *   ```json
 *   {
 *     "text": "The LLM's generated text response"
 *   }
 *   ```
 *   (Optional) For more detailed responses, you can also include:
 *   ```json
 *   {
 *     "text": "The LLM's generated text response",
 *     "finishReason": "stop" // e.g., "stop", "length", "error"
 *     // ... other fields your model might return
 *   }
 *   ```
 *
 * ## Usage in Genkit Flows
 *
 * After ensuring this file is imported (e.g., in `src/ai/dev.ts`), you can use this model:
 *
 * ```typescript
 * import { ai } from '@/ai/genkit';
 * // ...
 * const { text } = await ai.generate({
 *   model: 'local/custom-llm', // Must match the 'name' provided in ai.defineModel
 *   prompt: "Translate 'hello' to French.",
 *   config: {
 *     temperature: 0.5,
 *     maxTokens: 50,
 *     modelIdentifier: "my-french-translation-model" // This will be sent as "model" in the JSON to your local LLM
 *   },
 * });
 * console.log(text);
 * ```
 */

import { ai } from '@/ai/genkit';
import { generateNotFoundError, generateSystemError, type GenerateRequest, type GenerateResponse } from 'genkit';
import { z } from 'zod';

const LOCAL_LLM_ENDPOINT_URL = process.env.LOCAL_LLM_ENDPOINT_URL;

const localLLMConfigSchema = z.object({
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  modelIdentifier: z.string().optional().describe('Optional: Identifier for the specific model at the local endpoint (e.g., "llama3" for Ollama). This is sent as "model" in the request to your local LLM.'),
  // You can add other known config parameters your local LLM might support here
});

export const customLocalLLM = ai.defineModel(
  {
    name: 'local/custom-llm',
    label: 'Custom Local LLM',
    configSchema: localLLMConfigSchema,
    supports: {
      multiturn: false, // Set to true if your local API and this code handle chat history
      tools: false,
      media: false,
      systemRole: false,
      output: ['text'],
    },
  },
  async (request: GenerateRequest): Promise<GenerateResponse> => {
    if (!LOCAL_LLM_ENDPOINT_URL) {
      throw generateSystemError(
        'Local LLM endpoint URL is not configured. Please set LOCAL_LLM_ENDPOINT_URL in your .env file.'
      );
    }

    let promptText = '';
    // Genkit v1.x uses request.prompt for string prompts, or request.messages for structured prompts.
    // We'll prioritize request.prompt if it's a string, otherwise take the last user message.
    if (typeof request.prompt === 'string') {
        promptText = request.prompt;
    } else if (request.messages && request.messages.length > 0) {
      const lastMessage = request.messages[request.messages.length - 1];
      promptText = lastMessage.content.map(part => part.text || '').join('');
    }


    if (!promptText) {
      throw generateNotFoundError('Prompt is empty.');
    }

    const { modelIdentifier, ...llmSpecificConfig } = request.config || {};

    const requestPayload = {
      prompt: promptText,
      model: modelIdentifier, // Pass modelIdentifier as 'model'
      config: llmSpecificConfig, // Pass other config parameters
    };

    try {
      const httpResponse = await fetch(LOCAL_LLM_ENDPOINT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      if (!httpResponse.ok) {
        const errorBody = await httpResponse.text();
        throw generateSystemError(
          `Local LLM request failed with status ${httpResponse.status} ${httpResponse.statusText}: ${errorBody}`
        );
      }

      const responseData = await httpResponse.json();

      if (typeof responseData.text !== 'string') {
        // Attempt to handle Ollama-like response structure if "text" is missing but "response" exists
        if (typeof responseData.response === 'string') {
            responseData.text = responseData.response;
        } else {
            throw generateSystemError(
            'Local LLM response is missing a "text" (or "response") field, or it is not a string.'
            );
        }
      }
      
      // Determine finishReason: Ollama uses "done: true" when finished.
      let finishReason = 'stop'; // Default
      if (responseData.done === false) {
        finishReason = 'length'; // Or another appropriate reason if known
      } else if (responseData.finishReason && typeof responseData.finishReason === 'string') {
        finishReason = responseData.finishReason;
      }


      return {
        candidates: [
          {
            index: 0,
            finishReason: finishReason,
            message: {
              role: 'model',
              content: [{ text: responseData.text }],
            },
          },
        ],
        // Example: Extracting usage if your local model provides it in a compatible format
        // usage: responseData.usage ? {
        //   inputTokens: responseData.usage.prompt_tokens,
        //   outputTokens: responseData.usage.completion_tokens,
        //   totalTokens: responseData.usage.total_tokens,
        // } : undefined,
      };
    } catch (error: any) {
      if (error.name === 'SystemError' || error.name === 'NotFoundError') throw error; // Re-throw Genkit errors
      console