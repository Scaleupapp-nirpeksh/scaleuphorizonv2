/**
 * Upload Routes
 *
 * API routes for file uploads
 */

import { Router } from 'express';
import { uploadController } from '../controllers';
import { protect, requireOrganization, validate, uploadPresets, handleUploadError } from '@/core/middleware';
import {
  presignedUploadSchema,
  deleteFileSchema,
  deleteMultipleFilesSchema,
  downloadUrlSchema,
} from '../schemas';

const router = Router();

// Public route - get upload configuration
router.get('/config', uploadController.getUploadConfig);

// All other routes require authentication
router.use(protect);
router.use(requireOrganization);

// ===============================
// Presigned URL endpoints (for client-side uploads)
// ===============================

/**
 * @route   POST /api/v1/uploads/presigned
 * @desc    Get presigned URL for client-side upload
 * @access  Private
 */
router.post(
  '/presigned',
  validate(presignedUploadSchema),
  uploadController.getPresignedUploadUrl
);

/**
 * @route   POST /api/v1/uploads/presigned/download
 * @desc    Get presigned URL for downloading a file
 * @access  Private
 */
router.post(
  '/presigned/download',
  validate(downloadUrlSchema),
  uploadController.getPresignedDownloadUrl
);

// ===============================
// Direct upload endpoints (server-side)
// ===============================

/**
 * @route   POST /api/v1/uploads/avatar
 * @desc    Upload avatar image
 * @access  Private
 */
router.post(
  '/avatar',
  uploadPresets.avatar('file'),
  handleUploadError,
  uploadController.uploadFile
);

/**
 * @route   POST /api/v1/uploads/logo
 * @desc    Upload organization logo
 * @access  Private
 */
router.post(
  '/logo',
  uploadPresets.logo('file'),
  handleUploadError,
  uploadController.uploadFile
);

/**
 * @route   POST /api/v1/uploads/receipt
 * @desc    Upload receipt (for expenses)
 * @access  Private
 */
router.post(
  '/receipt',
  uploadPresets.receipt('file'),
  handleUploadError,
  uploadController.uploadFile
);

/**
 * @route   POST /api/v1/uploads/document
 * @desc    Upload document
 * @access  Private
 */
router.post(
  '/document',
  uploadPresets.document('file'),
  handleUploadError,
  uploadController.uploadFile
);

/**
 * @route   POST /api/v1/uploads/report
 * @desc    Upload investor report
 * @access  Private
 */
router.post(
  '/report',
  uploadPresets.report('file'),
  handleUploadError,
  uploadController.uploadFile
);

/**
 * @route   POST /api/v1/uploads/attachments
 * @desc    Upload multiple attachments (up to 5)
 * @access  Private
 */
router.post(
  '/attachments',
  uploadPresets.attachments('files', 5),
  handleUploadError,
  uploadController.uploadMultipleFiles
);

// ===============================
// File management endpoints
// ===============================

/**
 * @route   DELETE /api/v1/uploads/file
 * @desc    Delete a single file
 * @access  Private
 */
router.delete(
  '/file',
  validate(deleteFileSchema),
  uploadController.deleteFile
);

/**
 * @route   DELETE /api/v1/uploads/files
 * @desc    Delete multiple files
 * @access  Private
 */
router.delete(
  '/files',
  validate(deleteMultipleFilesSchema),
  uploadController.deleteMultipleFiles
);

/**
 * @route   GET /api/v1/uploads/file/:key/exists
 * @desc    Check if file exists
 * @access  Private
 */
router.get('/file/:key(*)/exists', uploadController.checkFileExists);

/**
 * @route   GET /api/v1/uploads/file/:key/metadata
 * @desc    Get file metadata
 * @access  Private
 */
router.get('/file/:key(*)/metadata', uploadController.getFileMetadata);

export default router;
