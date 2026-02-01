/**
 * S3 Upload Service
 *
 * Handles file uploads to AWS S3 with support for:
 * - Direct uploads
 * - Presigned URLs for client-side uploads
 * - File deletion
 * - Multiple file types (images, documents, etc.)
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '@/config';
import { BadRequestError, InternalError } from '@/core/errors';
import crypto from 'crypto';
import path from 'path';

// Allowed file types by category
export const ALLOWED_FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
  ],
  receipt: ['image/jpeg', 'image/png', 'application/pdf'],
  all: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
  ],
} as const;

export type FileCategory = keyof typeof ALLOWED_FILE_TYPES;

// Upload folder structure
export const UPLOAD_FOLDERS = {
  avatars: 'avatars',
  receipts: 'receipts',
  documents: 'documents',
  attachments: 'attachments',
  reports: 'reports',
  logos: 'logos',
} as const;

export type UploadFolder = keyof typeof UPLOAD_FOLDERS;

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  avatar: 5 * 1024 * 1024, // 5MB
  receipt: 10 * 1024 * 1024, // 10MB
  document: 25 * 1024 * 1024, // 25MB
  attachment: 25 * 1024 * 1024, // 25MB
  default: 10 * 1024 * 1024, // 10MB
} as const;

export interface UploadOptions {
  folder: UploadFolder;
  organizationId?: string;
  userId?: string;
  customFilename?: string;
  category?: FileCategory;
  maxSize?: number;
}

export interface UploadResult {
  key: string;
  url: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  bucket: string;
}

export interface PresignedUrlResult {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  expiresAt: Date;
}

export class UploadService {
  private client: S3Client | null = null;
  private bucket: string;
  private region: string;

  constructor() {
    this.bucket = config.aws.s3BucketName || '';
    this.region = config.aws.region;

    if (this.isConfigured()) {
      this.client = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId: config.aws.accessKeyId!,
          secretAccessKey: config.aws.secretAccessKey!,
        },
      });
    }
  }

  /**
   * Check if S3 is properly configured
   */
  isConfigured(): boolean {
    return !!(
      config.aws.accessKeyId &&
      config.aws.secretAccessKey &&
      config.aws.s3BucketName
    );
  }

  /**
   * Ensure S3 is configured before operations
   */
  private ensureConfigured(): void {
    if (!this.isConfigured() || !this.client) {
      throw new BadRequestError(
        'AWS S3 is not configured. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and S3_BUCKET_NAME in environment variables.'
      );
    }
  }

  /**
   * Generate unique file key for S3
   */
  private generateKey(options: UploadOptions, originalName: string): string {
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const randomId = crypto.randomBytes(8).toString('hex');
    const filename = options.customFilename || `${timestamp}-${randomId}${ext}`;

    const parts: string[] = [UPLOAD_FOLDERS[options.folder]];

    if (options.organizationId) {
      parts.push(options.organizationId);
    }

    if (options.userId) {
      parts.push(options.userId);
    }

    parts.push(filename);

    return parts.join('/');
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(key: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  /**
   * Validate file type
   */
  private validateFileType(mimeType: string, category: FileCategory = 'all'): void {
    const allowedTypes = ALLOWED_FILE_TYPES[category] as readonly string[];
    if (!allowedTypes.includes(mimeType)) {
      throw new BadRequestError(
        `Invalid file type: ${mimeType}. Allowed types: ${allowedTypes.join(', ')}`
      );
    }
  }

  /**
   * Validate file size
   */
  private validateFileSize(size: number, maxSize?: number): void {
    const limit = maxSize || FILE_SIZE_LIMITS.default;
    if (size > limit) {
      throw new BadRequestError(
        `File size (${(size / 1024 / 1024).toFixed(2)}MB) exceeds limit (${(limit / 1024 / 1024).toFixed(2)}MB)`
      );
    }
  }

  /**
   * Upload a file to S3
   */
  async upload(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    options: UploadOptions
  ): Promise<UploadResult> {
    this.ensureConfigured();

    // Validate file
    this.validateFileType(mimeType, options.category);
    this.validateFileSize(buffer.length, options.maxSize);

    const key = this.generateKey(options, originalName);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      Metadata: {
        originalName,
        uploadedAt: new Date().toISOString(),
        ...(options.organizationId && { organizationId: options.organizationId }),
        ...(options.userId && { userId: options.userId }),
      },
    });

    try {
      await this.client!.send(command);

      return {
        key,
        url: this.getPublicUrl(key),
        filename: path.basename(key),
        originalName,
        mimeType,
        size: buffer.length,
        bucket: this.bucket,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalError(`Failed to upload file: ${message}`);
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultiple(
    files: Array<{ buffer: Buffer; originalName: string; mimeType: string }>,
    options: UploadOptions
  ): Promise<UploadResult[]> {
    const results = await Promise.all(
      files.map((file) =>
        this.upload(file.buffer, file.originalName, file.mimeType, options)
      )
    );
    return results;
  }

  /**
   * Generate presigned URL for client-side upload
   */
  async getPresignedUploadUrl(
    originalName: string,
    mimeType: string,
    options: UploadOptions,
    expiresInSeconds: number = 3600
  ): Promise<PresignedUrlResult> {
    this.ensureConfigured();

    // Validate file type
    this.validateFileType(mimeType, options.category);

    const key = this.generateKey(options, originalName);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: mimeType,
      Metadata: {
        originalName,
        uploadedAt: new Date().toISOString(),
        ...(options.organizationId && { organizationId: options.organizationId }),
        ...(options.userId && { userId: options.userId }),
      },
    });

    try {
      const uploadUrl = await getSignedUrl(this.client!, command, {
        expiresIn: expiresInSeconds,
      });

      const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

      return {
        uploadUrl,
        key,
        publicUrl: this.getPublicUrl(key),
        expiresAt,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalError(`Failed to generate presigned URL: ${message}`);
    }
  }

  /**
   * Generate presigned URL for downloading a file
   */
  async getPresignedDownloadUrl(
    key: string,
    expiresInSeconds: number = 3600
  ): Promise<{ downloadUrl: string; expiresAt: Date }> {
    this.ensureConfigured();

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      const downloadUrl = await getSignedUrl(this.client!, command, {
        expiresIn: expiresInSeconds,
      });

      const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

      return { downloadUrl, expiresAt };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalError(`Failed to generate download URL: ${message}`);
    }
  }

  /**
   * Delete a file from S3
   */
  async delete(key: string): Promise<void> {
    this.ensureConfigured();

    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      await this.client!.send(command);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalError(`Failed to delete file: ${message}`);
    }
  }

  /**
   * Delete multiple files from S3
   */
  async deleteMultiple(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.delete(key)));
  }

  /**
   * Check if a file exists in S3
   */
  async exists(key: string): Promise<boolean> {
    this.ensureConfigured();

    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      await this.client!.send(command);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file metadata from S3
   */
  async getMetadata(
    key: string
  ): Promise<{ contentType: string; size: number; lastModified: Date; metadata: Record<string, string> }> {
    this.ensureConfigured();

    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      const response = await this.client!.send(command);
      return {
        contentType: response.ContentType || 'application/octet-stream',
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        metadata: response.Metadata || {},
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalError(`Failed to get file metadata: ${message}`);
    }
  }

  /**
   * Extract key from S3 URL
   */
  extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      // Handle both path-style and virtual-hosted-style URLs
      if (urlObj.hostname.includes('.s3.')) {
        return urlObj.pathname.slice(1); // Remove leading slash
      }
      // Path-style: https://s3.region.amazonaws.com/bucket/key
      const parts = urlObj.pathname.split('/');
      return parts.slice(2).join('/');
    } catch {
      return null;
    }
  }
}

// Export singleton instance
export const uploadService = new UploadService();
