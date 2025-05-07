'use client';

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { ImageItem } from '@/lib/types';

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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-4 md:p-6">
      {images.map((item) => (
        <Card key={item.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out animate-fadeIn">
          <CardHeader>
            <CardTitle className="text-lg truncate">Image ID: {item.id.substring(0,8)}</CardTitle>
            {item.error && <CardDescription className="text-destructive">{item.error}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-md font-semibold mb-2 text-foreground/80">Original Image</h3>
              <div className="aspect-video relative rounded-md overflow-hidden bg-muted">
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
                <div className="aspect-video relative rounded-md overflow-hidden bg-muted">
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
        </Card>
      ))}
    </div>
  );
}

// Add to globals.css or a separate CSS file imported in layout.tsx for the animation
// @keyframes fadeIn {
//   from { opacity: 0; transform: translateY(10px); }
//   to { opacity: 1; transform: translateY(0); }
// }
// .animate-fadeIn {
//   animation: fadeIn 0.5s ease-out forwards;
// }
