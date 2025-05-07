'use server';

import { z } from 'zod';
import { removeBackgroundFromImageUrl } from '@/ai/flows/remove-background';
import type { ActionResultState } from '@/lib/types';

const ImageUrlSchema = z.string().url({ message: "Invalid URL format. Please enter a valid image URL." });

export async function processImageUrlAction(
  prevState: ActionResultState,
  formData: FormData
): Promise<ActionResultState> {
  const imageUrl = formData.get('imageUrl') as string;

  const validatedFields = ImageUrlSchema.safeParse(imageUrl);

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.flatten().formErrors.join(', '),
    };
  }

  const uniqueId = crypto.randomUUID();

  try {
    const result = await removeBackgroundFromImageUrl({ imageUrl: validatedFields.data });
    if (result.backgroundRemovedDataUri) {
      return {
        id: uniqueId,
        originalUrl: validatedFields.data,
        processedUrl: result.backgroundRemovedDataUri,
        error: null,
      };
    } else {
      return {
        id: uniqueId,
        originalUrl: validatedFields.data,
        error: 'AI processing failed to return an image.',
        processedUrl: null,
      };
    }
  } catch (error) {
    console.error('Error processing image:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during background removal.';
    return {
      id: uniqueId,
      originalUrl: validatedFields.data,
      error: `Failed to process image: ${errorMessage}`,
      processedUrl: null,
    };
  }
}
