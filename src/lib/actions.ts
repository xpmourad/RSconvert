// src/lib/actions.ts
'use server';

import { z } from 'zod';
import { removeBackgroundFromImageUrl } from '@/ai/flows/remove-background';
import type { ActionResultState } from '@/lib/types';

const ImageUrlSchema = z.string().url({ message: "Invalid URL format. Please enter a valid image URL." });

// Refined error extraction
function extractErrorMessage(error: unknown, defaultMessage: string = 'An unexpected error occurred.'): string {
  // Server-side logging of the raw error for better debugging
  console.error("[extractErrorMessage] Attempting to extract error message from:", error);

  if (error instanceof Error) {
    let msg = error.message;
    if ((error as any).cause) {
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
          causeMsg += "Unstringifyable nested cause.";
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
      return anyError.message;
    }
    if (anyError && typeof anyError.details === 'string') { // Common in Google API errors
      return anyError.details;
    }
    const str = String(error);
    if (str !== '[object Object]' && str.trim() !== '') {
      return str;
    }
    try {
      const jsonStr = JSON.stringify(error);
      return jsonStr;
    } catch (stringifyError) {
      return defaultMessage + " (Could not stringify error details)";
    }
  } catch (e) {
    return defaultMessage + " (Error processing the error object itself)";
  }
}

export async function processImageUrlAction(
  prevState: ActionResultState, 
  formData: FormData
): Promise<ActionResultState> {
  const imageUrl = formData.get('imageUrl') as string;
  const uniqueId = prevState?.id && typeof prevState.id === 'string' ? prevState.id : crypto.randomUUID();

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
    console.log(`[Action: ${uniqueId}] Processing URL: ${validatedFields.data.substring(0,100)}...`);
    const result = await removeBackgroundFromImageUrl({ imageUrl: validatedFields.data });
    if (result.backgroundRemovedDataUri) {
      console.log(`[Action: ${uniqueId}] Success for URL. Processed URI (first 100): ${result.backgroundRemovedDataUri.substring(0,100)}`);
      return {
        id: uniqueId,
        originalUrl: validatedFields.data,
        processedUrl: result.backgroundRemovedDataUri,
        error: null,
      };
    } else {
      console.warn(`[Action: ${uniqueId}] AI processing (URL) did not return an image. Original URL (first 100): ${validatedFields.data.substring(0,100)}`);
      return {
        id: uniqueId,
        originalUrl: validatedFields.data,
        error: 'AI processing did not return an image. The image might be unsuitable or the service encountered an issue.',
        processedUrl: null,
      };
    }
  } catch (error) {
    console.error(`[Action: ${uniqueId}] Error processing image from URL '${validatedFields.data.substring(0,100)}...':`, error);
    const errorMessage = extractErrorMessage(error, 'Failed to process image due to an internal server error.');
    return {
      id: uniqueId,
      originalUrl: validatedFields.data,
      error: `Error: ${errorMessage}`,
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
  const uniqueId = prevState?.id && typeof prevState.id === 'string' ? prevState.id : crypto.randomUUID();
  
  let originalInputContext = 'Uploaded file';
  if (imageFile instanceof File && imageFile.name) {
    originalInputContext = imageFile.name;
  }

  const validatedFile = ImageFileSchema.safeParse(imageFile);

  if (!validatedFile.success) {
    return {
      id: uniqueId,
      originalUrl: originalInputContext,
      error: validatedFile.error.flatten().formErrors.join(', '),
      processedUrl: null,
    };
  }
  
  const file = validatedFile.data;
  originalInputContext = file.name; // Use validated file name

  let originalDataUri = '';
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    originalDataUri = `data:${file.type};base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error(`[Action: ${uniqueId}] Error converting file to data URI for ${originalInputContext}:`, error);
    return {
      id: uniqueId,
      originalUrl: originalInputContext,
      error: 'Failed to read the uploaded file. It might be corrupted or too large for buffer conversion.',
      processedUrl: null,
    };
  }

  try {
    console.log(`[Action: ${uniqueId}] Processing uploaded file: ${originalInputContext} (Data URI (first 100): ${originalDataUri.substring(0,100)}...)`);
    const result = await removeBackgroundFromImageUrl({ imageUrl: originalDataUri });
    if (result.backgroundRemovedDataUri) {
      console.log(`[Action: ${uniqueId}] Success for uploaded file ${originalInputContext}. Processed URI (first 100): ${result.backgroundRemovedDataUri.substring(0,100)}`);
      return {
        id: uniqueId,
        originalUrl: originalDataUri, 
        processedUrl: result.backgroundRemovedDataUri,
        error: null,
      };
    } else {
       console.warn(`[Action: ${uniqueId}] AI processing (file upload) did not return an image for ${originalInputContext}.`);
      return {
        id: uniqueId,
        originalUrl: originalDataUri,
        error: 'AI processing did not return an image from the uploaded file. The image might be unsuitable or the service encountered an issue.',
        processedUrl: null,
      };
    }
  } catch (error) {
    console.error(`[Action: ${uniqueId}] Error processing uploaded image ${originalInputContext}:`, error);
    const errorMessage = extractErrorMessage(error, 'Failed to process uploaded image due to an internal server error.');
    return {
      id: uniqueId,
      originalUrl: originalDataUri,
      error: `Error: ${errorMessage}`,
      processedUrl: null,
    };
  }
}
