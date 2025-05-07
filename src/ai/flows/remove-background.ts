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
    
    const {media, text} = await ai.generate({
      // IMPORTANT: ONLY the googleai/gemini-2.0-flash-exp model is able to generate images. You MUST use exactly this model to generate images.
      model: 'googleai/gemini-2.0-flash-exp', 
      prompt: [
        {media: {url: input.imageUrl}},
        // Refined and more explicit prompt for background removal
        {text: 'Your task is to segment the main subject from this image and make the background transparent. Output only the processed image of the subject against a transparent background.'}
      ],
      config: {
        // As per Genkit docs for image generation with gemini-2.0-flash-exp:
        // "MUST provide both TEXT and IMAGE, IMAGE only won't work"
        responseModalities: ['TEXT', 'IMAGE'], 
      },
    });

    // Log the text response from the AI for debugging purposes
    console.log('Background removal - AI text response:', text);

    if (!media || !media.url) {
      const errorMessage = `AI model did not return an image for background removal. Diagnostic text from AI: "${text || 'No text response.'}"`;
      console.error(errorMessage);
      // This error will be caught by the calling action and displayed to the user
      throw new Error(errorMessage);
    }
    
    console.log(`Background removal successful. Media URL (first 100 chars): ${media.url.substring(0,100)}`);
    return {backgroundRemovedDataUri: media.url};
  }
);