# File Uploads API Documentation

## Overview

The Uploads module provides file upload functionality using AWS S3. It supports both server-side uploads (via `multipart/form-data`) and client-side uploads using presigned URLs.

**Base URL:** `/api/v1/uploads`

---

## Configuration

### Required Environment Variables

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=ap-south-1
S3_BUCKET_NAME=scaleup-horizon-uploads
```

### S3 Bucket Configuration

Your S3 bucket needs the following CORS configuration for client-side uploads:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

### IAM Policy for S3 User

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:HeadObject"
      ],
      "Resource": "arn:aws:s3:::scaleup-horizon-uploads/*"
    }
  ]
}
```

---

## Upload Folders & Categories

### Folders

| Folder | Purpose | Max Size |
|--------|---------|----------|
| `avatars` | User profile pictures | 5MB |
| `logos` | Organization logos | 5MB |
| `receipts` | Expense receipts | 10MB |
| `documents` | General documents | 25MB |
| `attachments` | Task/meeting attachments | 25MB |
| `reports` | Investor reports | 25MB |

### File Categories & Allowed Types

| Category | Allowed MIME Types |
|----------|-------------------|
| `image` | `image/jpeg`, `image/png`, `image/gif`, `image/webp` |
| `document` | `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `text/csv` |
| `receipt` | `image/jpeg`, `image/png`, `application/pdf` |
| `all` | All of the above |

---

## API Endpoints

### Get Upload Configuration

Check if uploads are configured and get allowed file types.

```http
GET /api/v1/uploads/config
```

**Response:**
```json
{
  "success": true,
  "data": {
    "configured": true,
    "folders": ["avatars", "receipts", "documents", "attachments", "reports", "logos"],
    "categories": ["image", "document", "receipt", "all"],
    "limits": {
      "avatar": "5MB",
      "receipt": "10MB",
      "document": "25MB",
      "attachment": "25MB"
    },
    "allowedTypes": {
      "image": ["image/jpeg", "image/png", "image/gif", "image/webp"],
      "document": ["application/pdf", "..."],
      "receipt": ["image/jpeg", "image/png", "application/pdf"]
    }
  }
}
```

---

## Server-Side Uploads

For smaller files or when you need server-side processing.

### Upload Avatar

```http
POST /api/v1/uploads/avatar
Content-Type: multipart/form-data
Authorization: Bearer <token>
X-Organization-Id: <org-id>
```

**Request:**
- Field name: `file`
- Max size: 5MB
- Allowed types: image/*

**Response:**
```json
{
  "success": true,
  "data": {
    "key": "avatars/org123/user456/1706745600000-a1b2c3d4.jpg",
    "url": "https://bucket.s3.region.amazonaws.com/avatars/org123/user456/1706745600000-a1b2c3d4.jpg",
    "filename": "1706745600000-a1b2c3d4.jpg",
    "originalName": "profile-photo.jpg",
    "mimeType": "image/jpeg",
    "size": 245678,
    "bucket": "scaleup-horizon-uploads"
  }
}
```

### Upload Logo

```http
POST /api/v1/uploads/logo
Content-Type: multipart/form-data
```

### Upload Receipt

```http
POST /api/v1/uploads/receipt
Content-Type: multipart/form-data
```

### Upload Document

```http
POST /api/v1/uploads/document
Content-Type: multipart/form-data
```

### Upload Report

```http
POST /api/v1/uploads/report
Content-Type: multipart/form-data
```

### Upload Multiple Attachments

```http
POST /api/v1/uploads/attachments
Content-Type: multipart/form-data
```

**Request:**
- Field name: `files`
- Max files: 5
- Max size per file: 25MB

**Response:**
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "key": "attachments/org123/...",
        "url": "https://...",
        "filename": "...",
        "originalName": "document1.pdf",
        "mimeType": "application/pdf",
        "size": 1234567,
        "bucket": "scaleup-horizon-uploads"
      }
    ],
    "count": 3
  }
}
```

---

## Client-Side Uploads (Presigned URLs)

For large files or better UX with progress indicators.

### Get Presigned Upload URL

```http
POST /api/v1/uploads/presigned
Authorization: Bearer <token>
X-Organization-Id: <org-id>
Content-Type: application/json
```

**Request Body:**
```json
{
  "filename": "quarterly-report.pdf",
  "mimeType": "application/pdf",
  "folder": "reports",
  "category": "document"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://bucket.s3.region.amazonaws.com/reports/org123/...?X-Amz-Signature=...",
    "key": "reports/org123/1706745600000-a1b2c3d4.pdf",
    "publicUrl": "https://bucket.s3.region.amazonaws.com/reports/org123/1706745600000-a1b2c3d4.pdf",
    "expiresAt": "2024-02-01T12:00:00.000Z"
  }
}
```

### Client-Side Upload Example (JavaScript)

```javascript
async function uploadFile(file, folder, category) {
  // 1. Get presigned URL from backend
  const response = await fetch('/api/v1/uploads/presigned', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-Organization-Id': organizationId,
    },
    body: JSON.stringify({
      filename: file.name,
      mimeType: file.type,
      folder,
      category,
    }),
  });

  const { data } = await response.json();

  // 2. Upload directly to S3
  await fetch(data.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });

  // 3. Return the public URL
  return {
    key: data.key,
    url: data.publicUrl,
  };
}

// Usage
const file = document.querySelector('input[type="file"]').files[0];
const result = await uploadFile(file, 'documents', 'document');
console.log('Uploaded to:', result.url);
```

### Upload with Progress (using XMLHttpRequest)

```javascript
function uploadWithProgress(file, folder, category, onProgress) {
  return new Promise(async (resolve, reject) => {
    // Get presigned URL
    const response = await fetch('/api/v1/uploads/presigned', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization-Id': organizationId,
      },
      body: JSON.stringify({
        filename: file.name,
        mimeType: file.type,
        folder,
        category,
      }),
    });

    const { data } = await response.json();

    // Upload with progress
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100;
        onProgress(percentComplete);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        resolve({ key: data.key, url: data.publicUrl });
      } else {
        reject(new Error('Upload failed'));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Upload failed')));

    xhr.open('PUT', data.uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}

// Usage
await uploadWithProgress(file, 'documents', 'document', (progress) => {
  console.log(`Upload progress: ${progress.toFixed(0)}%`);
});
```

---

## Get Presigned Download URL

For private files that shouldn't be publicly accessible.

```http
POST /api/v1/uploads/presigned/download
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "key": "reports/org123/1706745600000-a1b2c3d4.pdf",
  "expiresIn": 3600
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://bucket.s3.region.amazonaws.com/reports/...?X-Amz-Signature=...",
    "expiresAt": "2024-02-01T12:00:00.000Z"
  }
}
```

---

## File Management

### Delete Single File

```http
DELETE /api/v1/uploads/file
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "key": "avatars/org123/user456/1706745600000-a1b2c3d4.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

### Delete Multiple Files

```http
DELETE /api/v1/uploads/files
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "keys": [
    "attachments/org123/file1.pdf",
    "attachments/org123/file2.pdf"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "2 files deleted successfully"
}
```

### Check if File Exists

```http
GET /api/v1/uploads/file/{key}/exists
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "exists": true
  }
}
```

### Get File Metadata

```http
GET /api/v1/uploads/file/{key}/metadata
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "contentType": "application/pdf",
    "size": 1234567,
    "lastModified": "2024-02-01T10:00:00.000Z",
    "metadata": {
      "originalName": "quarterly-report.pdf",
      "uploadedAt": "2024-02-01T10:00:00.000Z",
      "organizationId": "org123",
      "userId": "user456"
    }
  }
}
```

---

## Error Handling

### Common Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | `BAD_REQUEST` | Invalid file type or file too large |
| 400 | `BAD_REQUEST` | AWS S3 not configured |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 500 | `INTERNAL_ERROR` | S3 operation failed |

### Error Response Example

```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid file type: video/mp4. Allowed: image/jpeg, image/png, image/gif, image/webp"
  }
}
```

---

## Frontend Integration Examples

### React Hook for File Upload

```typescript
import { useState } from 'react';
import { useAuth } from './useAuth';

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
}

export function useFileUpload() {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
  });
  const { accessToken, organizationId } = useAuth();

  const upload = async (
    file: File,
    folder: string,
    category: string = 'all'
  ): Promise<{ key: string; url: string } | null> => {
    setState({ isUploading: true, progress: 0, error: null });

    try {
      // Get presigned URL
      const presignedRes = await fetch('/api/v1/uploads/presigned', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Organization-Id': organizationId,
        },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type,
          folder,
          category,
        }),
      });

      if (!presignedRes.ok) {
        const error = await presignedRes.json();
        throw new Error(error.error?.message || 'Failed to get upload URL');
      }

      const { data } = await presignedRes.json();

      // Upload to S3 with progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setState((prev) => ({
              ...prev,
              progress: (e.loaded / e.total) * 100,
            }));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            resolve();
          } else {
            reject(new Error('Upload to S3 failed'));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error')));

        xhr.open('PUT', data.uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      setState({ isUploading: false, progress: 100, error: null });
      return { key: data.key, url: data.publicUrl };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      setState({ isUploading: false, progress: 0, error: message });
      return null;
    }
  };

  const deleteFile = async (key: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/v1/uploads/file', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Organization-Id': organizationId,
        },
        body: JSON.stringify({ key }),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  return { ...state, upload, deleteFile };
}
```

### Usage in Component

```tsx
function AvatarUpload() {
  const { isUploading, progress, error, upload } = useFileUpload();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await upload(file, 'avatars', 'image');
    if (result) {
      setAvatarUrl(result.url);
      // Update user profile with new avatar URL
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        disabled={isUploading}
      />

      {isUploading && (
        <div className="progress-bar">
          <div style={{ width: `${progress}%` }} />
          <span>{progress.toFixed(0)}%</span>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {avatarUrl && <img src={avatarUrl} alt="Avatar" />}
    </div>
  );
}
```

---

## Best Practices

1. **Use presigned URLs for large files** - Better UX with progress tracking
2. **Validate on frontend first** - Check file type and size before uploading
3. **Store the key, not just URL** - Keys are more portable if bucket changes
4. **Clean up unused files** - Delete old files when replacing (e.g., avatar update)
5. **Use appropriate categories** - Helps with validation and organization
6. **Handle errors gracefully** - S3 can fail; always have error states

---

## Security Considerations

1. **Files are stored with organization/user context** in the key path
2. **Presigned URLs expire** - Default 1 hour for uploads, configurable for downloads
3. **File type validation** happens both client and server-side
4. **Size limits prevent abuse** - Different limits for different file types
5. **Consider making bucket private** and using presigned download URLs for sensitive files
