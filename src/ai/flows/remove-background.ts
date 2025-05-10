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
import {z}from 'genkit';

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

function safeStringifyError(error: unknown): string {
    if (error instanceof Error) {
        let msg = error.message;
        if ((error as any).cause) { // Include cause if present
            const causeError = (error as any).cause;
            let causeMsg = "Nested cause: ";
            if (causeError instanceof Error) {
                causeMsg += causeError.message;
            } else if (typeof causeError === 'string') {
                causeMsg += causeError;
            } else {
                try {
                    causeMsg += JSON.stringify(causeError);
                } catch (e) {
                    causeMsg += "Could not stringify nested cause.";
                }
            }
            msg += ` | ${causeMsg}`;
        }
        return msg;
    }
    if (typeof error === 'string') {
        return error;
    }
    try {
        const anyError = error as any;
        if (anyError && typeof anyError.message === 'string') {
            let msg = anyError.message;
            if (anyError.cause) {
                 const causeError = anyError.cause;
                 let causeMsg = "Nested cause: ";
                 if (causeError instanceof Error) {
                     causeMsg += causeError.message;
                 } else if (typeof causeError === 'string') {
                     causeMsg += causeError;
                 } else {
                     try {
                         causeMsg += JSON.stringify(causeError);
                     } catch (e) {
                         causeMsg += "Could not stringify nested cause.";
                     }
                 }
                 msg += ` | ${causeMsg}`;
            }
            return msg;
        }
        if (anyError && typeof anyError.details === 'string') { // Common in Google API errors
            return anyError.details;
        }
        // Attempt to get a string representation
        const str = String(error);
        if (str !== '[object Object]') {
            return str;
        }
        // Fallback to JSON.stringify for objects, but handle its potential failure
        try {
            return JSON.stringify(error);
        } catch (stringifyError) {
            return 'Could not stringify error object.';
        }
    } catch (e) {
        // Ultimate fallback
        return 'An unknown error occurred, and it could not be stringified.';
    }
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
          {text: 
`Your primary task is to remove the background from the provided image.
The main subject(s) of the image must be preserved.
The area that was previously the background must be made fully transparent.
The output image must be in PNG format to support transparency.
Do not replace the background with a color or pattern; it must be transparent.
Return only the image with the background removed and made transparent.`
          }
        ],
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
           safetySettings: [ // Added safety settings to be less restrictive for typical image edits
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
           ],
        },
      });

      console.log('Background removal - AI text response:', text);

      if (!media || !media.url) {
        const errorMessage = `AI model did not return an image for background removal. Diagnostic text from AI: "${text || 'No text response.'}"`;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }
      
      // Check if the returned media URL is a PNG data URI, which is expected for transparency
      if (!media.url.startsWith('data:image/png;base64,')) {
          console.warn(`AI model returned an image but it might not be a PNG with transparency. URL (first 100): ${media.url.substring(0,100)}. AI Text: "${text || 'No text response.'}"`);
          // Depending on strictness, you could throw an error here or proceed cautiously.
          // For now, let's proceed but log a warning.
      }

      console.log(`Background removal successful. Media URL (first 100 chars): ${media.url.substring(0,100)}`);
      return {backgroundRemovedDataUri: media.url};

    } catch (flowError) {
        console.error("Raw error during removeBackgroundFromImageUrlFlow execution:", flowError);
        let message = safeStringifyError(flowError);

        const apiKeyErrorKeywords = ['API key', 'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'PermissionDenied', 'IAM', 'credentials', 'authentication', 'authorization', 'forbidden'];
        const isApiKeyError = apiKeyErrorKeywords.some(keyword => message.toLowerCase().includes(keyword.toLowerCase()));

        if (isApiKeyError) {
          message = `API Key or Permissions Error: ${message}. Please ensure your GEMINI_API_KEY is correctly set in your .env file, the server is restarted, and the key has the necessary permissions for the Gemini API.`;
        } else if (message.toLowerCase().includes('candidate was blocked due to safety')) {
            message = `Image processing was blocked by safety filters. The image might contain content that violates safety policies. Diagnostic text from AI: "${(flowError as any)?.cause?.message || (flowError as any)?.message || 'No specific details.'}"`;
        }
        else {
          message = `AI Flow Error: ${message}`;
        }
        console.error("Final error message being thrown by flow:", message);
        throw new Error(message);
    }
  }
);