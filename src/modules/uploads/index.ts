/**
 * Uploads Module
 *
 * Handles file uploads to AWS S3 with support for:
 * - Direct server-side uploads
 * - Presigned URLs for client-side uploads
 * - Multiple file types (images, documents, receipts)
 * - File management (delete, metadata)
 */

export { uploadRoutes } from './routes';
export { uploadController, UploadController } from './controllers';
export * from './schemas';
