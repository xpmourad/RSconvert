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
    .describe("A URL of an image to remove the background from."),
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

const prompt = ai.definePrompt({
  name: 'removeBackgroundFromImageUrlPrompt',
  input: {schema: RemoveBackgroundFromImageUrlInputSchema},
  output: {schema: RemoveBackgroundFromImageUrlOutputSchema},
  prompt: `Remove the background from the image at the following URL and return the image as a data URI:

{{media url=imageUrl}}
`,
});

const removeBackgroundFromImageUrlFlow = ai.defineFlow(
  {
    name: 'removeBackgroundFromImageUrlFlow',
    inputSchema: RemoveBackgroundFromImageUrlInputSchema,
    outputSchema: RemoveBackgroundFromImageUrlOutputSchema,
  },
  async input => {
    const {media} = await ai.generate({
      // IMPORTANT: ONLY the googleai/gemini-2.0-flash-exp model is able to generate images. You MUST use exactly this model to generate images.
      model: 'googleai/gemini-2.0-flash-exp',

      // simple prompt
      prompt: [{media: {url: input.imageUrl}}, {text: 'Remove the background from this image'}],

      config: {
        responseModalities: ['TEXT', 'IMAGE'], // MUST provide both TEXT and IMAGE, IMAGE only won't work
      },
    });
    return {backgroundRemovedDataUri: media.url!};
  }
);
