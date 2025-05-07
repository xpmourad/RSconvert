export interface ImageItem {
  id: string;
  originalUrl: string;
  processedUrl?: string | null;
  error?: string | null;
}

export interface ActionResultState {
  id?: string;
  originalUrl?: string;
  processedUrl?: string | null;
  error?: string | null;
}
