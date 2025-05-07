// src/components/image-url-form.tsx
'use client';

import { useEffect, useActionState } from 'react'; // Updated import
import { useFormStatus } from 'react-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { processImageUrlAction, processImageUploadAction } from '@/lib/actions';
import type { ActionResultState, ImageItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle2, Link2, UploadCloud } from 'lucide-react';

interface ImageUrlFormProps {
  onImageProcessed: (image: ImageItem) => void;
}

const initialFormState: ActionResultState = {
  id: undefined,
  originalUrl: undefined,
  processedUrl: null,
  error: null,
};

// Custom hook to handle form processing effects (toasts, callbacks)
function useFormProcessingEffect(
  formState: ActionResultState | undefined,
  toastHook: ReturnType<typeof useToast>['toast'],
  onImageProcessedCallback: (image: ImageItem) => void,
  formTypeLabel: 'URL' | 'Upload' // For potentially customizing messages
) {
  useEffect(() => {
    if (!formState || !formState.id) return; // Only act if formState has an ID (meaning a submission happened)

    if (formState.error) {
      toastHook({
        variant: 'destructive',
        title: `${formTypeLabel} Processing Error`,
        description: formState.error,
        icon: <AlertCircle className="h-5 w-5 text-destructive-foreground" />,
      });
    } else if (formState.originalUrl && formState.processedUrl) {
      toastHook({
        title: 'Success!',
        description: `Image background removed via ${formTypeLabel}.`,
        icon: <CheckCircle2 className="h-5 w-5 text-primary" />,
      });
      onImageProcessedCallback({
        id: formState.id,
        originalUrl: formState.originalUrl,
        processedUrl: formState.processedUrl,
      });
    } else if (formState.originalUrl && !formState.processedUrl && !formState.error) {
       toastHook({
        variant: 'destructive',
        title: `${formTypeLabel} Processing Incomplete`,
        description: 'AI processing did not return a result. Please try another image or method.',
        icon: <AlertCircle className="h-5 w-5 text-destructive-foreground" />,
      });
    }
  }, [formState, toastHook, onImageProcessedCallback, formTypeLabel]);
}


const Spinner = () => (
  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

function ProcessUrlSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
      {pending ? <Spinner /> : <Link2 className="mr-2 h-5 w-5" />}
      {pending ? 'Processing...' : 'Process URL'}
    </Button>
  );
}

function ProcessFileSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
      {pending ? <Spinner /> : <UploadCloud className="mr-2 h-5 w-5" />}
      {pending ? 'Processing...' : 'Upload & Process'}
    </Button>
  );
}

export default function ImageUrlForm({ onImageProcessed }: ImageUrlFormProps) {
  const [urlFormState, urlFormAction] = useActionState(processImageUrlAction, initialFormState); // Updated usage
  const [fileUploadFormState, fileUploadFormAction] = useActionState(processImageUploadAction, initialFormState); // Updated usage
  const { toast } = useToast();

  useFormProcessingEffect(urlFormState, toast, onImageProcessed, 'URL');
  useFormProcessingEffect(fileUploadFormState, toast, onImageProcessed, 'Upload');

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">AI Background Remover</CardTitle>
        <CardDescription className="text-center text-muted-foreground">
          Remove image backgrounds by providing a URL or uploading a file directly from your device.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <form action={urlFormAction} className="space-y-4">
          <div>
            <Label htmlFor="imageUrl" className="text-sm font-medium">Image URL</Label>
            <Input
              id="imageUrl"
              name="imageUrl"
              type="url"
              placeholder="https://example.com/your-image.jpg"
              required
              className="focus:ring-accent focus:border-accent mt-1"
            />
            {urlFormState?.error && urlFormState?.id && ( // Show error only if submission happened
              <p className="text-sm text-destructive flex items-center mt-1"><AlertCircle className="w-4 h-4 mr-1" /> {urlFormState.error}</p>
            )}
          </div>
          <div className="flex justify-center">
            <ProcessUrlSubmitButton />
          </div>
        </form>

        <Separator />

        <form action={fileUploadFormAction} className="space-y-4">
          <div>
            <Label htmlFor="imageFile" className="text-sm font-medium">Image File</Label>
            <Input
              id="imageFile"
              name="imageFile"
              type="file"
              required
              accept="image/png, image/jpeg, image/jpg, image/webp"
              className="mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-input file:bg-background file:text-sm file:font-medium file:text-foreground hover:file:bg-accent hover:file:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
             <p className="text-xs text-muted-foreground mt-1">Max 5MB. Supported formats: PNG, JPG, JPEG, WEBP.</p>
            {fileUploadFormState?.error && fileUploadFormState?.id && ( // Show error only if submission happened
              <p className="text-sm text-destructive flex items-center mt-1"><AlertCircle className="w-4 h-4 mr-1" /> {fileUploadFormState.error}</p>
            )}
          </div>
          <div className="flex justify-center">
            <ProcessFileSubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
