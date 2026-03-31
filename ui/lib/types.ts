export interface Download {
  id: string;
  title: string;
  url: string;
  quality: string;
  format: string;
  folder: string;
  custom_name_prefix: string;
  status: string;
  msg?: string;
  percent?: number;
  speed?: number; // bytes per second
  eta?: number; // seconds remaining
  filename?: string;
  size?: number;
  error?: string;
  timestamp?: number;
  entry?: {
    filename: string;
    originalTitle?: string;
  };
}

export interface DownloadMetrics {
  downloading: number;
  queued: number;
  completed: number;
  failed: number;
}
