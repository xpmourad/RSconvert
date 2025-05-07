// src/lib/actions.ts
'use server';

import { z } from 'zod';
import { removeBackgroundFromImageUrl } from '@/ai/flows/remove-background';
import type { ActionResultState } from '@/lib/types';

const ImageUrlSchema = z.string().url({ message: "Invalid URL format. Please enter a valid image URL." });

function extractErrorMessage(error: unknown): string {
  let finalErrorMessage = 'An unexpected error occurred during background removal.';
  if (error instanceof Error) {
      finalErrorMessage = error.message;
  } else if (typeof error === 'string') {
      finalErrorMessage = error;
  } else {
      try {
          const gError = error as any;
          if (gError && gError.message) {
              finalErrorMessage = String(gError.message);
          } else if (gError && gError.details) {
               finalErrorMessage = String(gError.details);
          } else if (gError && typeof gError.toString === 'function' && gError.toString() !== '[object Object]') {
              finalErrorMessage = gError.toString();
          }
          else {
              finalErrorMessage = 'An unknown error structure was caught.';
          }
      } catch (e) {
          finalErrorMessage = 'Caught a non-standard error that could not be processed.';
      }
  }
  return finalErrorMessage;
}

export async function processImageUrlAction(
  prevState: ActionResultState, 
  formData: FormData
): Promise<ActionResultState> {
  const imageUrl = formData.get('imageUrl') as string;
  const uniqueId = prevState?.id || crypto.randomUUID(); // Use previous ID if available for retry, else new

  const validatedFields = ImageUrlSchema.safeParse(imageUrl);

  if (!validatedFields.success) {
    return {
      id: uniqueId,
      originalUrl: typeof imageUrl === 'string' ? imageUrl : undefined,
      error: validatedFields.error.flatten().formErrors.join(', '),
      processedUrl: null,
    };
  }

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
    console.error('Error processing image from URL:', error);
    const errorMessage = extractErrorMessage(error);
    return {
      id: uniqueId,
      originalUrl: validatedFields.data,
      error: `Failed to process image: ${errorMessage}`,
      processedUrl: null,
    };
  }
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const ImageFileSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, "File is empty.")
  .refine(
    (file) => file.size <= MAX_FILE_SIZE,
    `Max file size is 5MB.`
  )
  .refine(
    (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
    "Only .jpg, .jpeg, .png and .webp formats are supported."
  );


export async function processImageUploadAction(
  prevState: ActionResultState, 
  formData: FormData
): Promise<ActionResultState> {
  const imageFile = formData.get('imageFile');
  const uniqueId = prevState?.id || crypto.randomUUID(); // Use previous ID if available for retry, else new
  
  const validatedFile = ImageFileSchema.safeParse(imageFile);

  if (!validatedFile.success) {
    return {
      id: uniqueId,
      originalUrl: imageFile instanceof File ? imageFile.name : 'Invalid file',
      error: validatedFile.error.flatten().formErrors.join(', '),
      processedUrl: null,
    };
  }
  
  const file = validatedFile.data;

  let originalDataUri = '';
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    originalDataUri = `data:${file.type};base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error('Error converting file to data URI:', error);
    return {
      id: uniqueId,
      originalUrl: file.name,
      error: 'Failed to read the uploaded file.',
      processedUrl: null,
    };
  }

  try {
    const result = await removeBackgroundFromImageUrl({ imageUrl: originalDataUri });
    if (result.backgroundRemovedDataUri) {
      return {
        id: uniqueId,
        originalUrl: originalDataUri, 
        processedUrl: result.backgroundRemovedDataUri,
        error: null,
      };
    } else {
      return {
        id: uniqueId,
        originalUrl: originalDataUri,
        error: 'AI processing failed to return an image from the uploaded file.',
        processedUrl: null,
      };
    }
  } catch (error) {
    console.error('Error processing uploaded image:', error);
    const errorMessage = extractErrorMessage(error);
    return {
      id: uniqueId,
      originalUrl: originalDataUri,
      error: `Failed to process uploaded image: ${errorMessage}`,
      processedUrl: null,
    };
  }
}