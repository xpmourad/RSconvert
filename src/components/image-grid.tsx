'use client';

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import type { ImageItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface ImageGridProps {
  images: ImageItem[];
}

export default function ImageGrid({ images }: ImageGridProps) {
  if (images.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-lg text-muted-foreground">
          No images processed yet. Enter an image URL above to get started!
        </p>
      </div>
    );
  }

  const handleDownload = (dataUrl: string, originalUrl: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;

    let baseName = 'image';
    // The processed image is expected to be PNG due to background removal (transparency support)
    const processedExtension = 'png';

    try {
      if (originalUrl.startsWith('data:')) {
        // Attempt to parse MIME type from data URI to get original type for naming
        const mimeMatch = originalUrl.match(/^data:(image\/[^;]+);base64,/);
        let originalFileType = 'unknown';
        if (mimeMatch && mimeMatch[1]) {
          originalFileType = mimeMatch[1].split('/')[1] || 'unknown';
        }
        baseName = `uploaded_image_${originalFileType}`;
      } else {
        // Attempt to parse filename from URL
        const url = new URL(originalUrl);
        const pathParts = url.pathname.split('/');
        const lastPart = pathParts.pop(); // e.g., "filename.jpg" or "filename"
        if (lastPart) {
          const nameParts = lastPart.split('.');
          if (nameParts.length > 1) {
            nameParts.pop(); // Remove original extension from baseName parts
          }
          if (nameParts.length > 0) {
            baseName = nameParts.join('.');
          } else if (lastPart) {
            baseName = lastPart; // Use full lastPart if no extension was found
          }
        }
      }
    } catch (e) {
      console.warn("Could not parse original filename or URL, using default name.", e);
      baseName = 'image'; // Fallback baseName
    }
    
    const finalFileName = `${baseName}-bg-removed.${processedExtension}`;
    
    link.download = finalFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-4 md:p-6">
      {images.map((item) => (
        <Card key={item.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg truncate">Image ID: {item.id.substring(0,8)}</CardTitle>
            {item.error && <CardDescription className="text-destructive">{item.error}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4 flex-grow">
            <div>
              <h3 className="text-md font-semibold mb-2 text-foreground/80">Original Image</h3>
              <div className="aspect-video relative rounded-md overflow-hidden bg-muted border">
                <Image
                  src={item.originalUrl}
                  alt="Original"
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  data-ai-hint="abstract landscape"
                  className="object-contain transition-opacity duration-500 opacity-0 group-hover:opacity-100"
                  onLoadingComplete={(image) => image.classList.remove('opacity-0')}
                />
              </div>
            </div>
            {item.processedUrl && (
              <div>
                <h3 className="text-md font-semibold mb-2 text-foreground/80">Background Removed</h3>
                <div className="aspect-video relative rounded-md overflow-hidden bg-white border">
                  <Image
                    src={item.processedUrl}
                    alt="Background Removed"
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    data-ai-hint="portrait studio"
                    className="object-contain transition-opacity duration-500 opacity-0 group-hover:opacity-100"
                    onLoadingComplete={(image) => image.classList.remove('opacity-0')}
                  />
                </div>
              </div>
            )}
          </CardContent>
          {item.processedUrl && !item.error && (
            <CardFooter className="pt-0">
              <Button 
                onClick={() => handleDownload(item.processedUrl!, item.originalUrl)} 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                aria-label="Download processed image"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Image
              </Button>
            </CardFooter>
          )}
        </Card>
      ))}
    </div>
  );
}
