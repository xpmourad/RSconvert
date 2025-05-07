// src/ai/flows/remove-background.ts
'use server';
/**
 * @fileOverview A background removal AI agent.
 *
 * - removeBackgroundFromImageUrl - A function that handles the background removal process.
 * - RemoveBackgroundFromImageUrlInput - The input type for the removeBackgroundFromImageUrl function.
 * - RemoveBackgroundFromImageUrlOutput - The return type for the removeBackgroundFromImageUrl function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RemoveBackgroundFromImageUrlInputSchema = z.object({
  imageUrl: z
    .string()
    .describe("An image URL or a data URI (e.g., 'data:image/png;base64,...') to remove the background from."),
});
export type RemoveBackgroundFromImageUrlInput = z.infer<typeof RemoveBackgroundFromImageUrlInputSchema>;

const RemoveBackgroundFromImageUrlOutputSchema = z.object({
  backgroundRemovedDataUri: z
    .string()
    .describe("The image with the background removed, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type RemoveBackgroundFromImageUrlOutput = z.infer<typeof RemoveBackgroundFromImageUrlOutputSchema>;

export async function removeBackgroundFromImageUrl(input: RemoveBackgroundFromImageUrlInput): Promise<RemoveBackgroundFromImageUrlOutput> {
  return removeBackgroundFromImageUrlFlow(input);
}

const removeBackgroundFromImageUrlFlow = ai.defineFlow(
  {
    name: 'removeBackgroundFromImageUrlFlow',
    inputSchema: RemoveBackgroundFromImageUrlInputSchema,
    outputSchema: RemoveBackgroundFromImageUrlOutputSchema,
  },
  async input => {
    console.log(`Starting background removal for image (first 100 chars): ${input.imageUrl.substring(0, 100)}...`);
    
    try {
      const {media, text} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp', 
        prompt: [
          {media: {url: input.imageUrl}},
          {text: 'Your task is to segment the main subject from this image and make the background transparent. Ensure the output is only the processed image of the subject with a transparent background. The output image should be in a format that supports transparency, like PNG.'}
        ],
        config: {
          responseModalities: ['TEXT', 'IMAGE'], 
        },
      });

      console.log('Background removal - AI text response:', text);

      if (!media || !media.url) {
        const errorMessage = `AI model did not return an image for background removal. Diagnostic text from AI: "${text || 'No text response.'}"`;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }
      
      console.log(`Background removal successful. Media URL (first 100 chars): ${media.url.substring(0,100)}`);
      return {backgroundRemovedDataUri: media.url};

    } catch (flowError) {
        console.error("Error during removeBackgroundFromImageUrlFlow execution:", flowError);
        let message = "An unexpected error occurred in the AI flow.";
        if (flowError instanceof Error) {
            message = flowError.message;
        } else if (typeof flowError === 'string') {
            message = flowError;
        } else {
            try {
                const gError = flowError as any;
                if (gError && gError.message) {
                    message = String(gError.message);
                } else if (gError && gError.details) {
                    message = String(gError.details);
                } else if (gError && typeof gError.toString === 'function' && gError.toString() !== '[object Object]') {
                    message = gError.toString();
                } else {
                    message = `Non-Error object thrown in flow: ${JSON.stringify(flowError)}`;
                }
            } catch (e) {
                message = "Non-Error object thrown in flow, and it could not be stringified.";
            }
        }
        // Prepend a more specific error message for API key issues.
        if (message.includes('API key') || message.includes('GEMINI_API_KEY') || message.includes('GOOGLE_API_KEY')) {
          message = `API Key Error: ${message}. Please ensure your GEMINI_API_KEY is correctly set in your .env file and the server is restarted.`;
        } else {
          message = `AI Flow Error: ${message}`;
        }
        throw new Error(message);
    }
  }
);
