// src/lib/actions.ts
'use server';

import { z } from 'zod';
import { removeBackgroundFromImageUrl } from '@/ai/flows/remove-background';
import type { ActionResultState } from '@/lib/types';

const ImageUrlSchema = z.string().url({ message: "Invalid URL format. Please enter a valid image URL." });

// Simplified error message generation for client
function getClientErrorMessage(error: unknown, actionType: 'URL' | 'File Upload'): string {
  console.error(`[Action Error - ${actionType}] Raw error:`, error); // Log the full error server-side

  if (error instanceof Error) {
    if (error.message.includes('API key') || error.message.includes('PERMISSION_DENIED') || error.message.includes('Failed precondition') || error.message.includes('IAM')) {
      return 'Error: API key issue (invalid, missing, or lacking permissions). Please verify your GEMINI_API_KEY and its Google Cloud project configuration (e.g., billing, API enabled).';
    }
    if (error.message.toLowerCase().includes('candidate was blocked due to safety')) {
      return 'Error: Image processing was blocked by safety filters. The image might contain content that violates safety policies.';
    }
    if (error.message.toLowerCase().includes('user location is not supported')) {
        return 'Error: Your location is not supported for this AI service. The API may have regional restrictions.';
    }
     if (error.message.toLowerCase().includes('model text not found') || error.message.toLowerCase().includes('no media')) {
        return 'Error: The AI model did not return the expected image data. The input image might be unsuitable or the service is busy. Try a different image or try again later.';
    }
    // For other specific errors, provide a less verbose message
    return `Processing Error: ${error.message.substring(0, 150)}${error.message.length > 150 ? '...' : ''}`;
  }
  if (typeof error === 'string') {
    if (error.length > 200) return `Processing Error: ${error.substring(0, 200)}...`;
    return `Processing Error: ${error}`;
  }
  return 'An unexpected error occurred during image processing. Please check server logs or try again later.';
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
    const clientErrorMessage = getClientErrorMessage(error, 'URL');
    return {
      id: uniqueId,
      originalUrl: validatedFields.data,
      error: clientErrorMessage,
      processedUrl: null,
    };
  }
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const ImageFileSchema = z
  .instanceof(File, { message: "No file provided or invalid file type."})
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
  } else if (!(imageFile instanceof File)) {
     return {
      id: uniqueId,
      originalUrl: 'No file selected',
      error: 'Please select an image file to upload.',
      processedUrl: null,
    };
  }


  const validatedFile = ImageFileSchema.safeParse(imageFile);

  if (!validatedFile.success) {
    return {
      id: uniqueId,
      originalUrl: originalInputContext, // Use file name if available, even if validation fails
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
    console.error(`[Action: ${uniqueId}] Error converting file ${originalInputContext} to data URI:`, error);
    return {
      id: uniqueId,
      originalUrl: originalInputContext,
      error: 'Failed to read the uploaded file. It might be corrupted.',
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
    const clientErrorMessage = getClientErrorMessage(error, 'File Upload');
    return {
      id: uniqueId,
      originalUrl: originalDataUri,
      error: clientErrorMessage,
      processedUrl: null,
    };
  }
}

