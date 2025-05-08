
'use client';

import { useState, useCallback, useEffect } from 'react';
import ImageUrlForm from '@/components/image-url-form';
import ImageGrid from '@/components/image-grid';
import type { ImageItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Github, Palette, Trash2, Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Debounce function
function debounce<T extends (...args: any[]) => any>(func: T, delay: number) {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function(this: ThisParameterType<T>, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}


export default function Home() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [processedImageIds, setProcessedImageIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();


  const handleImageProcessed = useCallback((newImage: ImageItem) => {
    setImages((prevImages) => {
      if (processedImageIds.has(newImage.id)) {
         const existingImageIndex = prevImages.findIndex(img => img.id === newImage.id);
         if (existingImageIndex !== -1) {
           const updatedImages = [...prevImages];
           updatedImages[existingImageIndex] = newImage;
           return updatedImages;
         }
      }
      setProcessedImageIds(prevIds => new Set(prevIds).add(newImage.id));
      return [newImage, ...prevImages.filter(img => img.id !== newImage.id)]; 
    });
  }, [processedImageIds]);


  const handleClearImages = () => {
    setImages([]);
    setProcessedImageIds(new Set());
  };

  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setDarkMode(isDark);
  }, []);

  const toggleTheme = () => {
    const isCurrentlyDark = document.documentElement.classList.contains('dark');
    if (isCurrentlyDark) {
      document.documentElement.classList.remove('dark');
      setDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      setDarkMode(true);
    }
  };

  const handleCopyRepoUrl = async () => {
    try {
      await navigator.clipboard.writeText('https://github.com/firebase/studio-examples');
      toast({
        title: "Copied to clipboard!",
        description: "Repository URL has been copied.",
        icon: <CheckCircle2 className="h-5 w-5 text-primary" />,
      });
    } catch (err) {
      console.error('Failed to copy repository URL: ', err);
      toast({
        variant: "destructive",
        title: "Failed to copy",
        description: "Could not copy the repository URL to clipboard.",
        icon: <AlertCircle className="h-5 w-5 text-destructive-foreground" />,
      });
    }
  };
  

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-screen-2xl items-center justify-between">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="h-8 w-8 mr-2 text-primary">
              <rect width="256" height="256" fill="none"/>
              <path d="M160,40H96A56,56,0,0,0,40,96v64a56,56,0,0,0,56,56h64a56,56,0,0,0,56-56V96A56,56,0,0,0,160,40ZM128,176a48,48,0,1,1,48-48A48.05,48.05,0,0,1,128,176Z" fill="currentColor"/>
              <circle cx="180" cy="76" r="12" fill="currentColor"/>
            </svg>
            <h1 className="text-2xl font-bold text-foreground">Image Streamer</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
              <Palette className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleCopyRepoUrl} aria-label="Copy repository URL to clipboard">
              <Copy className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <a href="https://github.com/firebase/studio-examples" target="_blank" rel="noopener noreferrer" aria-label="View source on GitHub">
                <Github className="h-5 w-5" />
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <section className="mb-12">
          <ImageUrlForm onImageProcessed={handleImageProcessed} />
        </section>

        <section>
          {images.length > 0 && (
            <div className="flex justify-end mb-4">
              <Button variant="outline" onClick={handleClearImages}>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear All Images
              </Button>
            </div>
          )}
          <ImageGrid images={images} />
        </section>
      </main>

      <footer className="py-6 md:px-8 md:py-0 border-t border-border/40">
        <div className="container flex flex-col items-center justify-center gap-4 md:h-20 md:flex-row">
          <p className="text-balance text-center text-sm leading-loose text-muted-foreground">
            Built with Next.js, Tailwind CSS, and Firebase Genkit. Hosted on Firebase.
          </p>
        </div>
      </footer>
    </div>
  );
}
