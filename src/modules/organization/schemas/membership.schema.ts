import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

// ============================================
// Enums
// ============================================

export const roleSchema = z.enum(['owner', 'admin', 'member', 'viewer']);

export const invitationStatusSchema = z.enum(['pending', 'accepted', 'declined', 'expired']);

// ============================================
// Member User Schema (for populated responses)
// ============================================

export const memberUserSchema = z
  .object({
    id: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
    email: z.string().email().openapi({ example: 'john@example.com' }),
    firstName: z.string().openapi({ example: 'John' }),
    lastName: z.string().openapi({ example: 'Doe' }),
    avatar: z.string().optional().openapi({ example: 'https://example.com/avatar.jpg' }),
  })
  .openapi('MemberUser');

// ============================================
// Membership Response Schema
// ============================================

export const membershipResponseSchema = z
  .object({
    id: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
    user: memberUserSchema,
    organization: z.string().openapi({ example: '507f1f77bcf86cd799439012' }),
    role: roleSchema.openapi({ example: 'member' }),
    invitedBy: z.string().optional().openapi({ example: '507f1f77bcf86cd799439013' }),
    invitedAt: z.string().datetime().optional().openapi({ example: '2024-01-01T00:00:00.000Z' }),
    invitationStatus: invitationStatusSchema.openapi({ example: 'accepted' }),
    joinedAt: z.string().datetime().optional().openapi({ example: '2024-01-02T00:00:00.000Z' }),
    isActive: z.boolean().openapi({ example: true }),
    lastAccessedAt: z
      .string()
      .datetime()
      .optional()
      .openapi({ example: '2024-01-15T10:30:00.000Z' }),
    createdAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
    updatedAt: z.string().datetime().openapi({ example: '2024-01-15T10:30:00.000Z' }),
  })
  .openapi('Membership');

// ============================================
// Request Schemas
// ============================================

/**
 * Invite member request
 */
export const inviteMemberSchema = z.object({
  body: z
    .object({
      email: z
        .string()
        .email('Invalid email address')
        .openapi({ example: 'newmember@example.com' }),
      role: roleSchema
        .refine((val) => val !== 'owner', {
          message: 'Cannot invite as owner',
        })
        .openapi({ example: 'member' }),
    })
    .openapi('InviteMemberRequest'),
});

/**
 * Update member role request
 */
export const updateMemberRoleSchema = z.object({
  body: z
    .object({
      role: roleSchema
        .refine((val) => val !== 'owner', {
          message: 'Cannot change role to owner',
        })
        .openapi({ example: 'admin' }),
    })
    .openapi('UpdateMemberRoleRequest'),
});

/**
 * Accept invitation request
 */
export const acceptInvitationSchema = z.object({
  body: z
    .object({
      token: z.string().min(1, 'Invitation token is required').openapi({ example: 'abc123def456' }),
    })
    .openapi('AcceptInvitationRequest'),
});

/**
 * Member ID parameter
 */
export const memberIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Organization ID is required'),
    memberId: z.string().min(1, 'Member ID is required'),
  }),
});

// ============================================
// Response Schemas
// ============================================

export const memberListResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.array(membershipResponseSchema),
  })
  .openapi('MemberListResponse');

export const singleMemberResponseSchema = z
  .object({
    success: z.literal(true),
    data: membershipResponseSchema,
  })
  .openapi('SingleMemberResponse');

export const invitationResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      membership: membershipResponseSchema,
      invitationUrl: z.string().optional().openapi({
        example: 'https://app.scaleup.com/invite/abc123',
        description: 'Invitation URL (only in development)',
      }),
    }),
    message: z.string(),
  })
  .openapi('InvitationResponse');

// ============================================
// Type Exports
// ============================================

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>['body'];
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>['body'];
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>['body'];
export type MembershipResponse = z.infer<typeof membershipResponseSchema>;
