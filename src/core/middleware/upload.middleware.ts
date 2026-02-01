/**
 * Upload Middleware
 *
 * Multer-based middleware for handling file uploads with S3 integration
 */

import multer, { FileFilterCallback, StorageEngine } from 'multer';
import { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '@/core/errors';
import {
  uploadService,
  ALLOWED_FILE_TYPES,
  FILE_SIZE_LIMITS,
  type FileCategory,
  type UploadFolder,
  type UploadResult,
} from '@/core/services';

// Extend Express Request to include uploaded file info
declare global {
  namespace Express {
    interface Request {
      uploadedFile?: UploadResult;
      uploadedFiles?: UploadResult[];
    }
  }
}

// Custom storage engine that uploads directly to S3
class S3Storage implements StorageEngine {
  private folder: UploadFolder;
  private category: FileCategory;

  constructor(options: { folder: UploadFolder; category?: FileCategory }) {
    this.folder = options.folder;
    this.category = options.category || 'all';
  }

  _handleFile(
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, info?: Partial<Express.Multer.File> & { uploadResult?: UploadResult }) => void
  ): void {
    const chunks: Buffer[] = [];

    file.stream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    file.stream.on('end', async () => {
      try {
        const buffer = Buffer.concat(chunks);
        const result = await uploadService.upload(buffer, file.originalname, file.mimetype, {
          folder: this.folder,
          category: this.category,
          organizationId: req.organizationId,
          userId: req.user?.id,
        });

        cb(null, {
          size: result.size,
          uploadResult: result,
        } as Partial<Express.Multer.File> & { uploadResult: UploadResult });
      } catch (error) {
        cb(error as Error);
      }
    });

    file.stream.on('error', (err: Error) => {
      cb(err);
    });
  }

  _removeFile(
    _req: Request,
    file: Express.Multer.File & { uploadResult?: UploadResult },
    cb: (error: Error | null) => void
  ): void {
    if (file.uploadResult?.key) {
      uploadService
        .delete(file.uploadResult.key)
        .then(() => cb(null))
        .catch(cb);
    } else {
      cb(null);
    }
  }
}

// File filter factory
function createFileFilter(category: FileCategory = 'all') {
  return (_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
    const allowedTypes = ALLOWED_FILE_TYPES[category] as readonly string[];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestError(`Invalid file type: ${file.mimetype}. Allowed: ${allowedTypes.join(', ')}`));
    }
  };
}

// Memory storage for cases where we need to process before upload
const memoryStorage = multer.memoryStorage();

// Upload configuration options
interface UploadConfig {
  folder: UploadFolder;
  category?: FileCategory;
  maxSize?: number;
  maxFiles?: number;
}

/**
 * Create multer upload middleware for single file
 */
export function uploadSingle(fieldName: string, config: UploadConfig) {
  const upload = multer({
    storage: new S3Storage({ folder: config.folder, category: config.category }),
    fileFilter: createFileFilter(config.category),
    limits: {
      fileSize: config.maxSize || FILE_SIZE_LIMITS.default,
    },
  });

  return [
    upload.single(fieldName),
    // Post-processing middleware to attach result to request
    (req: Request, _res: Response, next: NextFunction) => {
      if (req.file) {
        const file = req.file as Express.Multer.File & { uploadResult?: UploadResult };
        if (file.uploadResult) {
          req.uploadedFile = file.uploadResult;
        }
      }
      next();
    },
  ];
}

/**
 * Create multer upload middleware for multiple files
 */
export function uploadMultiple(fieldName: string, config: UploadConfig & { maxFiles: number }) {
  const upload = multer({
    storage: new S3Storage({ folder: config.folder, category: config.category }),
    fileFilter: createFileFilter(config.category),
    limits: {
      fileSize: config.maxSize || FILE_SIZE_LIMITS.default,
      files: config.maxFiles,
    },
  });

  return [
    upload.array(fieldName, config.maxFiles),
    // Post-processing middleware to attach results to request
    (req: Request, _res: Response, next: NextFunction) => {
      if (req.files && Array.isArray(req.files)) {
        req.uploadedFiles = req.files
          .map((file) => (file as Express.Multer.File & { uploadResult?: UploadResult }).uploadResult)
          .filter((result): result is UploadResult => !!result);
      }
      next();
    },
  ];
}

/**
 * Create multer upload middleware for mixed fields
 */
export function uploadFields(
  fields: Array<{ name: string; maxCount: number }>,
  config: UploadConfig
) {
  const upload = multer({
    storage: new S3Storage({ folder: config.folder, category: config.category }),
    fileFilter: createFileFilter(config.category),
    limits: {
      fileSize: config.maxSize || FILE_SIZE_LIMITS.default,
    },
  });

  return [
    upload.fields(fields),
    // Post-processing middleware
    (req: Request, _res: Response, next: NextFunction) => {
      if (req.files && typeof req.files === 'object') {
        const results: UploadResult[] = [];
        Object.values(req.files).forEach((fileArray) => {
          if (Array.isArray(fileArray)) {
            fileArray.forEach((file) => {
              const f = file as Express.Multer.File & { uploadResult?: UploadResult };
              if (f.uploadResult) {
                results.push(f.uploadResult);
              }
            });
          }
        });
        req.uploadedFiles = results;
      }
      next();
    },
  ];
}

/**
 * Memory upload for processing before S3 (e.g., image resizing)
 */
export function uploadToMemory(fieldName: string, config: Omit<UploadConfig, 'folder'>) {
  return multer({
    storage: memoryStorage,
    fileFilter: createFileFilter(config.category),
    limits: {
      fileSize: config.maxSize || FILE_SIZE_LIMITS.default,
    },
  }).single(fieldName);
}

/**
 * Pre-made upload configurations for common use cases
 */
export const uploadPresets = {
  /**
   * Avatar upload - single image, 5MB max
   */
  avatar: (fieldName: string = 'avatar') =>
    uploadSingle(fieldName, {
      folder: 'avatars',
      category: 'image',
      maxSize: FILE_SIZE_LIMITS.avatar,
    }),

  /**
   * Receipt upload - single image/PDF, 10MB max
   */
  receipt: (fieldName: string = 'receipt') =>
    uploadSingle(fieldName, {
      folder: 'receipts',
      category: 'receipt',
      maxSize: FILE_SIZE_LIMITS.receipt,
    }),

  /**
   * Document upload - single document, 25MB max
   */
  document: (fieldName: string = 'document') =>
    uploadSingle(fieldName, {
      folder: 'documents',
      category: 'document',
      maxSize: FILE_SIZE_LIMITS.document,
    }),

  /**
   * Multiple attachments - up to 5 files, 25MB each
   */
  attachments: (fieldName: string = 'attachments', maxFiles: number = 5) =>
    uploadMultiple(fieldName, {
      folder: 'attachments',
      category: 'all',
      maxSize: FILE_SIZE_LIMITS.attachment,
      maxFiles,
    }),

  /**
   * Logo upload - single image, 5MB max
   */
  logo: (fieldName: string = 'logo') =>
    uploadSingle(fieldName, {
      folder: 'logos',
      category: 'image',
      maxSize: FILE_SIZE_LIMITS.avatar,
    }),

  /**
   * Report upload - single document, 25MB max
   */
  report: (fieldName: string = 'file') =>
    uploadSingle(fieldName, {
      folder: 'reports',
      category: 'document',
      maxSize: FILE_SIZE_LIMITS.document,
    }),
};

/**
 * Error handler middleware for multer errors
 */
export function handleUploadError(
  err: Error,
  _req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return next(new BadRequestError('File too large'));
      case 'LIMIT_FILE_COUNT':
        return next(new BadRequestError('Too many files'));
      case 'LIMIT_UNEXPECTED_FILE':
        return next(new BadRequestError(`Unexpected file field: ${err.field}`));
      default:
        return next(new BadRequestError(`Upload error: ${err.message}`));
    }
  }
  next(err);
}
