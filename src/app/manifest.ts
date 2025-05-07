import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Image Streamer',
    short_name: 'ImageStreamer',
    description: 'Easily remove backgrounds from images using AI.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f0f4f8', // Corresponds to light grey-blue background
    theme_color: '#008080', // Corresponds to teal accent
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}