'use server';

/**
 * @fileOverview An AI agent that suggests similar images based on a given image.
 *
 * - generateImageSuggestions - A function that handles the image suggestion process.
 * - GenerateImageSuggestionsInput - The input type for the generateImageSuggestions function.
 * - GenerateImageSuggestionsOutput - The return type for the generateImageSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateImageSuggestionsInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo to find similar images to, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  numSuggestions: z
    .number()
    .default(3)
    .describe('The number of similar image suggestions to generate.'),
});
export type GenerateImageSuggestionsInput = z.infer<
  typeof GenerateImageSuggestionsInputSchema
>;

const GenerateImageSuggestionsOutputSchema = z.object({
  suggestedImages: z
    .array(z.string())
    .describe('An array of data URIs of similar images.'),
});
export type GenerateImageSuggestionsOutput = z.infer<
  typeof GenerateImageSuggestionsOutputSchema
>;

export async function generateImageSuggestions(
  input: GenerateImageSuggestionsInput
): Promise<GenerateImageSuggestionsOutput> {
  return generateImageSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateImageSuggestionsPrompt',
  input: {schema: GenerateImageSuggestionsInputSchema},
  output: {schema: GenerateImageSuggestionsOutputSchema},
  prompt: `You are an AI assistant that generates similar images based on a given image.

  You will receive an image as a data URI, and you will generate {{numSuggestions}} similar images.

  Each image should be returned as a data URI.

  Original Image: {{media url=photoDataUri}}
  `,
});

const generateImageSuggestionsFlow = ai.defineFlow(
  {
    name: 'generateImageSuggestionsFlow',
    inputSchema: GenerateImageSuggestionsInputSchema,
    outputSchema: GenerateImageSuggestionsOutputSchema,
  },
  async input => {
    const suggestedImages: string[] = [];
    for (let i = 0; i < input.numSuggestions; i++) {
      const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp',
        prompt: [
          {media: {url: input.photoDataUri}},
          {text: 'generate a similar image'},
        ],
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });
      suggestedImages.push(media.url!);
    }

    return {suggestedImages};
  }
);
