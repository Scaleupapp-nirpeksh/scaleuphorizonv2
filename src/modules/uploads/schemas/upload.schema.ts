/**
 * Upload Schemas
 *
 * Zod validation schemas for file upload endpoints
 */

import { z } from 'zod';
import { UPLOAD_FOLDERS, FILE_SIZE_LIMITS, ALLOWED_FILE_TYPES } from '@/core/services';

export const presignedUploadSchema = z.object({
  body: z.object({
    filename: z.string().min(1).max(255),
    mimeType: z.string().min(1),
    folder: z.enum(['avatars', 'receipts', 'documents', 'attachments', 'reports', 'logos'] as const),
    category: z.enum(['image', 'document', 'receipt', 'all'] as const).optional().default('all'),
  }),
});

export const deleteFileSchema = z.object({
  body: z.object({
    key: z.string().min(1, 'File key is required'),
  }),
});

export const deleteMultipleFilesSchema = z.object({
  body: z.object({
    keys: z.array(z.string().min(1)).min(1).max(10),
  }),
});

export const downloadUrlSchema = z.object({
  body: z.object({
    key: z.string().min(1, 'File key is required'),
    expiresIn: z.number().min(60).max(86400).optional().default(3600),
  }),
});

// Response types
export const uploadResultSchema = z.object({
  key: z.string(),
  url: z.string().url(),
  filename: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  bucket: z.string(),
});

export const presignedUrlResponseSchema = z.object({
  uploadUrl: z.string().url(),
  key: z.string(),
  publicUrl: z.string().url(),
  expiresAt: z.string().datetime(),
});

// Type exports
export type PresignedUploadInput = z.infer<typeof presignedUploadSchema>['body'];
export type DeleteFileInput = z.infer<typeof deleteFileSchema>['body'];
export type DeleteMultipleFilesInput = z.infer<typeof deleteMultipleFilesSchema>['body'];
export type DownloadUrlInput = z.infer<typeof downloadUrlSchema>['body'];
export type UploadResult = z.infer<typeof uploadResultSchema>;
export type PresignedUrlResponse = z.infer<typeof presignedUrlResponseSchema>;

// Export constants for frontend reference
export const uploadConfig = {
  folders: Object.keys(UPLOAD_FOLDERS),
  fileSizeLimits: FILE_SIZE_LIMITS,
  allowedFileTypes: ALLOWED_FILE_TYPES,
} as const;
