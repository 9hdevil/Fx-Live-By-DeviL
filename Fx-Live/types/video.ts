export type VideoSourceType = 'local' | 'google_drive' | 'google_drive_link';
export type VideoStatus = 'pending' | 'importing' | 'ready' | 'processing' | 'failed';

export interface Video {
  id: number;
  filename: string;
  original_name: string;
  file_path: string;
  thumbnail_path?: string | null;
  duration?: number;
  file_size: number;
  created_at: string;
  // Google Drive fields
  source_type: VideoSourceType;
  drive_file_id?: string | null;
  drive_url?: string | null;
  mime_type?: string | null;
  status: VideoStatus;
  updated_at?: string | null;
}