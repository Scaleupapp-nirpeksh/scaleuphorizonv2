import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

/**
 * User response schema (public user data)
 */
export const userResponseSchema = z
  .object({
    id: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
    email: z.string().email().openapi({ example: 'john@example.com' }),
    firstName: z.string().openapi({ example: 'John' }),
    lastName: z.string().openapi({ example: 'Doe' }),
    fullName: z.string().openapi({ example: 'John Doe' }),
    avatar: z.string().optional().openapi({ example: 'https://example.com/avatar.jpg' }),
    isEmailVerified: z.boolean().openapi({ example: true }),
    isActive: z.boolean().openapi({ example: true }),
    lastLoginAt: z.string().datetime().optional().openapi({ example: '2024-01-15T10:30:00.000Z' }),
    createdAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
    updatedAt: z.string().datetime().openapi({ example: '2024-01-15T10:30:00.000Z' }),
  })
  .openapi('User');

/**
 * User update schema
 */
export const updateUserSchema = z
  .object({
    firstName: z
      .string()
      .min(1)
      .max(50)
      .optional()
      .openapi({ example: 'John' }),
    lastName: z
      .string()
      .min(1)
      .max(50)
      .optional()
      .openapi({ example: 'Doe' }),
    avatar: z
      .string()
      .url()
      .optional()
      .openapi({ example: 'https://example.com/avatar.jpg' }),
  })
  .openapi('UpdateUser');

export type UserResponse = z.infer<typeof userResponseSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
