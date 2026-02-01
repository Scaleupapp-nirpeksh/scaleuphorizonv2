/**
 * Organization Module
 *
 * Handles organization (tenant) management, memberships, roles, and invitations.
 * Provides multi-tenancy support for the platform.
 *
 * Endpoints:
 * - POST   /organizations                    - Create organization
 * - GET    /organizations                    - List user's organizations
 * - GET    /organizations/:id                - Get organization details
 * - PUT    /organizations/:id                - Update organization
 * - DELETE /organizations/:id                - Delete organization
 * - POST   /organizations/:id/switch         - Switch active organization
 * - POST   /organizations/:id/leave          - Leave organization
 * - POST   /organizations/:id/transfer-ownership - Transfer ownership
 *
 * Member Endpoints:
 * - POST   /organizations/:id/members        - Invite member
 * - GET    /organizations/:id/members        - List members
 * - GET    /organizations/:id/members/:mid   - Get member
 * - PUT    /organizations/:id/members/:mid   - Update member role
 * - DELETE /organizations/:id/members/:mid   - Remove member
 *
 * Invitation Endpoints:
 * - GET    /organizations/invitations        - Get pending invitations
 * - POST   /organizations/accept-invitation  - Accept invitation
 * - POST   /organizations/decline-invitation - Decline invitation
 */

// Models
export * from './models';

// Services
export * from './services';

// Controllers
export * from './controllers';

// Routes
export * from './routes';

// Schemas
export * from './schemas';

// Types
export * from './types';

// Constants
export * from './constants';

// Default export is the router
export { organizationRoutes as default } from './routes';
