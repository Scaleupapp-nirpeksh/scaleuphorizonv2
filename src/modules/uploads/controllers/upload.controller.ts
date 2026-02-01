/**
 * Upload Controller
 *
 * Handles file upload HTTP requests
 */

import { Request, Response } from 'express';
import { asyncHandler } from '@/core/utils';
import { HttpStatus } from '@/core/constants';
import { uploadService, type UploadFolder, type FileCategory } from '@/core/services';
import { BadRequestError } from '@/core/errors';
import type {
  PresignedUploadInput,
  DeleteFileInput,
  DeleteMultipleFilesInput,
  DownloadUrlInput,
} from '../schemas';

export class UploadController {
  /**
   * Upload a single file
   * The file is already uploaded by middleware, this just returns the result
   */
  uploadFile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.uploadedFile) {
      throw new BadRequestError('No file uploaded');
    }

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: req.uploadedFile,
    });
  });

  /**
   * Upload multiple files
   * Files are already uploaded by middleware, this just returns the results
   */
  uploadMultipleFiles = asyncHandler(async (req: Request, res: Response) => {
    if (!req.uploadedFiles || req.uploadedFiles.length === 0) {
      throw new BadRequestError('No files uploaded');
    }

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: {
        files: req.uploadedFiles,
        count: req.uploadedFiles.length,
      },
    });
  });

  /**
   * Get presigned URL for client-side upload
   */
  getPresignedUploadUrl = asyncHandler(
    async (req: Request<unknown, unknown, PresignedUploadInput>, res: Response) => {
      const { filename, mimeType, folder, category } = req.body;

      const result = await uploadService.getPresignedUploadUrl(filename, mimeType, {
        folder: folder as UploadFolder,
        category: category as FileCategory,
        organizationId: req.organizationId,
        userId: req.user?.id,
      });

      res.status(HttpStatus.OK).json({
        success: true,
        data: {
          uploadUrl: result.uploadUrl,
          key: result.key,
          publicUrl: result.publicUrl,
          expiresAt: result.expiresAt.toISOString(),
        },
      });
    }
  );

  /**
   * Get presigned URL for downloading a file
   */
  getPresignedDownloadUrl = asyncHandler(
    async (req: Request<unknown, unknown, DownloadUrlInput>, res: Response) => {
      const { key, expiresIn } = req.body;

      const result = await uploadService.getPresignedDownloadUrl(key, expiresIn);

      res.status(HttpStatus.OK).json({
        success: true,
        data: {
          downloadUrl: result.downloadUrl,
          expiresAt: result.expiresAt.toISOString(),
        },
      });
    }
  );

  /**
   * Delete a single file
   */
  deleteFile = asyncHandler(
    async (req: Request<unknown, unknown, DeleteFileInput>, res: Response) => {
      const { key } = req.body;

      await uploadService.delete(key);

      res.status(HttpStatus.OK).json({
        success: true,
        message: 'File deleted successfully',
      });
    }
  );

  /**
   * Delete multiple files
   */
  deleteMultipleFiles = asyncHandler(
    async (req: Request<unknown, unknown, DeleteMultipleFilesInput>, res: Response) => {
      const { keys } = req.body;

      await uploadService.deleteMultiple(keys);

      res.status(HttpStatus.OK).json({
        success: true,
        message: `${keys.length} files deleted successfully`,
      });
    }
  );

  /**
   * Check if a file exists
   */
  checkFileExists = asyncHandler(async (req: Request, res: Response) => {
    const { key } = req.params;

    const exists = await uploadService.exists(key);

    res.status(HttpStatus.OK).json({
      success: true,
      data: { exists },
    });
  });

  /**
   * Get file metadata
   */
  getFileMetadata = asyncHandler(async (req: Request, res: Response) => {
    const { key } = req.params;

    const metadata = await uploadService.getMetadata(key);

    res.status(HttpStatus.OK).json({
      success: true,
      data: metadata,
    });
  });

  /**
   * Get upload configuration (for frontend reference)
   */
  getUploadConfig = asyncHandler(async (_req: Request, res: Response) => {
    const isConfigured = uploadService.isConfigured();

    res.status(HttpStatus.OK).json({
      success: true,
      data: {
        configured: isConfigured,
        folders: ['avatars', 'receipts', 'documents', 'attachments', 'reports', 'logos'],
        categories: ['image', 'document', 'receipt', 'all'],
        limits: {
          avatar: '5MB',
          receipt: '10MB',
          document: '25MB',
          attachment: '25MB',
        },
        allowedTypes: {
          image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
          document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
          receipt: ['image/jpeg', 'image/png', 'application/pdf'],
        },
      },
    });
  });
}

export const uploadController = new UploadController();
