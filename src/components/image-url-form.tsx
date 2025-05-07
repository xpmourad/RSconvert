'use client';

import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { processImageUrlAction } from '@/lib/actions';
import type { ActionResultState, ImageItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle2, Image as ImageIcon } from 'lucide-react';

interface ImageUrlFormProps {
  onImageProcessed: (image: ImageItem) => void;
}

const initialState: ActionResultState = {
  id: undefined,
  originalUrl: undefined,
  processedUrl: null,
  error: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
      {pending ? (
        <>
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing...
        </>
      ) : (
        <>
          <ImageIcon className="mr-2 h-5 w-5" />
          Remove Background
        </>
      )}
    </Button>
  );
}

export default function ImageUrlForm({ onImageProcessed }: ImageUrlFormProps) {
  const [state, formAction] = useFormState(processImageUrlAction, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state?.error) {
      toast({
        variant: 'destructive',
        title: 'Processing Error',
        description: state.error,
        icon: <AlertCircle className="h-5 w-5 text-destructive-foreground" />,
      });
    } else if (state?.id && state?.originalUrl && state?.processedUrl) {
      toast({
        title: 'Success!',
        description: 'Image background removed.',
        icon: <CheckCircle2 className="h-5 w-5 text-primary" />,
      });
      onImageProcessed({
        id: state.id,
        originalUrl: state.originalUrl,
        processedUrl: state.processedUrl,
      });
    } else if (state?.id && state?.originalUrl && !state.processedUrl && !state.error) {
       // Case where AI processing started but didn't complete successfully or returned no image
       toast({
        variant: 'destructive',
        title: 'Processing Incomplete',
        description: 'AI processing did not return a result. Please try another image.',
        icon: <AlertCircle className="h-5 w-5 text-destructive-foreground" />,
      });
    }
  }, [state, toast, onImageProcessed]);

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">AI Background Remover</CardTitle>
        <CardDescription className="text-center text-muted-foreground">
          Enter an image URL to automatically remove its background using AI.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="imageUrl" className="text-sm font-medium">Image URL</Label>
            <Input
              id="imageUrl"
              name="imageUrl"
              type="url"
              placeholder="https://example.com/your-image.jpg"
              required
              className="focus:ring-accent focus:border-accent"
            />
          </div>
          {state?.error && (
             <p className="text-sm text-destructive flex items-center"><AlertCircle className="w-4 h-4 mr-1" /> {state.error}</p>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <SubmitButton />
        </CardFooter>
      </form>
    </Card>
  );
}
