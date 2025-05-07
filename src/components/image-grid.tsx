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

    // Try to get a filename from originalUrl or default
    let fileName = 'image-bg-removed.png';
    try {
      const urlParts = originalUrl.split('/');
      const originalFileNameWithExt = urlParts.pop();
      if (originalFileNameWithExt) {
        const nameParts = originalFileNameWithExt.split('.');
        if (nameParts.length > 1) nameParts.pop(); // remove original extension
        fileName = `${nameParts.join('.')}-bg-removed.png`; // add new extension
      }
    } catch (e) {
      // fallback to default if parsing fails
      console.warn("Could not parse original filename, using default.", e);
    }
    
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-4 md:p-6">
      {images.map((item) => (
        <Card key={item.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out animate-fadeIn flex flex-col">
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
                  layout="fill"
                  objectFit="contain"
                  data-ai-hint="abstract landscape"
                  className="transition-opacity duration-500 opacity-0 group-hover:opacity-100"
                  onLoadingComplete={(image) => image.classList.remove('opacity-0')}
                />
              </div>
            </div>
            {item.processedUrl && (
              <div>
                <h3 className="text-md font-semibold mb-2 text-foreground/80">Background Removed</h3>
                <div className="aspect-video relative rounded-md overflow-hidden bg-white border"> {/* Changed background to white for better transparency visibility */}
                  <Image
                    src={item.processedUrl}
                    alt="Background Removed"
                    layout="fill"
                    objectFit="contain"
                    data-ai-hint="portrait studio"
                    className="transition-opacity duration-500 opacity-0 group-hover:opacity-100"
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
