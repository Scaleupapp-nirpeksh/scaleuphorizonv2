# Organization Module - Frontend Integration Guide

## Overview

The Organization module provides multi-tenancy support for the platform. Users can create and manage multiple organizations (companies), invite team members, and control access through role-based permissions.

## Base URL

```
/api/v1/organizations
```

## Authentication

All endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

---

## Roles & Permissions

| Role | Permissions |
|------|-------------|
| **Owner** | Full access, can delete org, transfer ownership |
| **Admin** | Manage members, edit org settings, full data access |
| **Member** | Read/write data, view members |
| **Viewer** | Read-only access |

---

## Organization Endpoints

### POST /organizations

Create a new organization. The creating user becomes the owner.

**Request Body:**

```typescript
interface CreateOrganizationRequest {
  name: string;           // Required, 1-100 chars
  description?: string;   // Optional, max 500 chars
  logo?: string;          // URL
  website?: string;       // URL
  industry?: Industry;    // See Industry enum
  size?: CompanySize;     // startup | small | medium | large | enterprise
  foundedYear?: number;   // 1900-current year
  settings?: {
    fiscalYearStart?: number;  // 1-12 (month)
    currency?: Currency;       // USD, EUR, GBP, INR, etc.
    timezone?: string;         // e.g., "America/New_York"
    dateFormat?: DateFormat;   // YYYY-MM-DD, MM/DD/YYYY, etc.
  };
}
```

**Response (201 Created):**

```typescript
interface OrganizationResponse {
  success: true;
  data: Organization;
  message: "Organization created successfully";
}
```

**Example:**

```typescript
const response = await api.post('/organizations', {
  name: 'Acme Corp',
  industry: 'technology',
  size: 'startup',
  settings: {
    currency: 'USD',
    fiscalYearStart: 1
  }
});
```

---

### GET /organizations

List all organizations the user is a member of.

**Response (200 OK):**

```typescript
interface OrganizationListResponse {
  success: true;
  data: Organization[];
}
```

---

### GET /organizations/:id

Get organization details.

**Response (200 OK):**

```typescript
interface SingleOrganizationResponse {
  success: true;
  data: Organization;
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 403 | FORBIDDEN | User not a member |
| 404 | NOT_FOUND | Organization not found |

---

### PUT /organizations/:id

Update organization details. Requires **owner** or **admin** role.

**Request Body:**

```typescript
interface UpdateOrganizationRequest {
  name?: string;
  description?: string;
  logo?: string;
  website?: string;
  industry?: Industry;
  size?: CompanySize;
  foundedYear?: number;
  settings?: OrganizationSettings;
}
```

---

### DELETE /organizations/:id

Delete (deactivate) organization. **Owner only.**

**Response (200 OK):**

```typescript
{
  success: true,
  message: "Organization deleted successfully"
}
```

---

### POST /organizations/:id/switch

Switch active organization context. Updates `lastAccessedAt` for the membership.

---

### POST /organizations/:id/leave

Leave an organization. **Cannot be used by owner** (must transfer ownership first).

---

### POST /organizations/:id/transfer-ownership

Transfer organization ownership to another member. **Owner only.**

**Request Body:**

```typescript
{
  newOwnerId: string;  // Member's user ID
}
```

---

## Member Endpoints

### POST /organizations/:id/members

Invite a user to the organization. Requires **owner** or **admin** role.

**Request Body:**

```typescript
interface InviteMemberRequest {
  email: string;           // User's email
  role: 'admin' | 'member' | 'viewer';  // Cannot invite as owner
}
```

**Response (201 Created):**

```typescript
interface InvitationResponse {
  success: true;
  data: {
    membership: Membership;
    invitationUrl?: string;  // Only in development
  };
  message: "Invitation sent successfully";
}
```

**Notes:**
- If user doesn't exist, a placeholder account is created
- Invitation expires after 7 days
- In production, send the invitation link via email

---

### GET /organizations/:id/members

List all members of the organization.

**Response (200 OK):**

```typescript
interface MemberListResponse {
  success: true;
  data: Membership[];
}
```

---

### PUT /organizations/:id/members/:memberId

Update member role. Requires **owner** or **admin** role.

**Request Body:**

```typescript
{
  role: 'admin' | 'member' | 'viewer';
}
```

**Restrictions:**
- Cannot change owner's role (use transfer ownership)
- Only owner can change admin roles
- Cannot set role to 'owner'

---

### DELETE /organizations/:id/members/:memberId

Remove member from organization. Requires **owner** or **admin** role.

**Response:** 204 No Content

**Restrictions:**
- Cannot remove owner
- Only owner can remove admins

---

## Invitation Endpoints

### GET /organizations/invitations

Get all pending invitations for the authenticated user.

**Response (200 OK):**

```typescript
{
  success: true,
  data: Membership[]  // With populated organization info
}
```

---

### POST /organizations/accept-invitation

Accept a pending invitation.

**Request Body:**

```typescript
{
  token: string;  // Invitation token
}
```

**Response (200 OK):**

```typescript
{
  success: true,
  data: Membership;
  message: "Invitation accepted"
}
```

---

### POST /organizations/decline-invitation

Decline a pending invitation.

**Request Body:**

```typescript
{
  token: string;
}
```

---

## TypeScript Types

```typescript
interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  industry?: Industry;
  size?: CompanySize;
  foundedYear?: number;
  settings: OrganizationSettings;
  owner: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface OrganizationSettings {
  fiscalYearStart: number;
  currency: Currency;
  timezone: string;
  dateFormat: DateFormat;
}

interface Membership {
  id: string;
  user: MemberUser;
  organization: string;
  role: Role;
  invitedBy?: string;
  invitedAt?: string;
  invitationStatus: InvitationStatus;
  joinedAt?: string;
  isActive: boolean;
  lastAccessedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface MemberUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}

type Role = 'owner' | 'admin' | 'member' | 'viewer';
type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';
type Industry = 'technology' | 'healthcare' | 'finance' | 'education' |
                'retail' | 'manufacturing' | 'services' | 'media' |
                'real_estate' | 'other';
type CompanySize = 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
type Currency = 'USD' | 'EUR' | 'GBP' | 'INR' | 'CAD' | 'AUD' | 'JPY' | 'CNY';
type DateFormat = 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'DD-MM-YYYY';
```

---

## UI Components Needed

1. **OrganizationList** - List of user's organizations with switch functionality
2. **OrganizationSelector** - Dropdown to switch between organizations
3. **CreateOrganizationForm** - Form to create new organization
4. **OrganizationSettings** - Edit organization details
5. **MemberList** - Table of organization members with role badges
6. **InviteMemberModal** - Form to invite new members
7. **MemberRoleDropdown** - Role selector for updating member roles
8. **PendingInvitations** - List of pending invitations with accept/decline
9. **TransferOwnershipModal** - Confirmation dialog for ownership transfer

---

## User Flows

### Creating First Organization

```
1. User completes registration
2. Redirect to "Create Organization" page
3. User fills organization details
4. Submit to POST /organizations
5. On success:
   - Store organization ID in context/state
   - Redirect to dashboard
```

### Switching Organizations

```
1. User clicks organization selector
2. Display list from GET /organizations
3. User selects different organization
4. Call POST /organizations/:id/switch
5. Update context with new organization
6. Refresh dashboard data
```

### Inviting Team Members

```
1. Admin opens member management
2. Clicks "Invite Member"
3. Enters email and selects role
4. Submit to POST /organizations/:id/members
5. System sends invitation email
6. Invited user:
   a. Receives email with link
   b. Clicks link → /invite/:token
   c. If authenticated: Accept invitation
   d. If not: Register → Accept invitation
```

### Accepting Invitation

```
1. User navigates to /invite/:token
2. If not authenticated:
   - Redirect to login
   - After login, return to /invite/:token
3. Call POST /organizations/accept-invitation
4. On success:
   - Add organization to user's list
   - Redirect to organization dashboard
```

---

## State Management

### Organization Context

```typescript
interface OrganizationState {
  organizations: Organization[];
  currentOrganization: Organization | null;
  currentMembership: Membership | null;
  members: Membership[];
  pendingInvitations: Membership[];
  isLoading: boolean;
}

interface OrganizationContextValue extends OrganizationState {
  createOrganization: (data: CreateOrganizationInput) => Promise<Organization>;
  switchOrganization: (orgId: string) => Promise<void>;
  updateOrganization: (data: UpdateOrganizationInput) => Promise<void>;
  inviteMember: (email: string, role: Role) => Promise<void>;
  updateMemberRole: (memberId: string, role: Role) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  leaveOrganization: () => Promise<void>;
  acceptInvitation: (token: string) => Promise<void>;
  declineInvitation: (token: string) => Promise<void>;
}
```

### Local Storage

Store the current organization ID for persistence:

```typescript
// On organization switch
localStorage.setItem('currentOrgId', organization.id);

// On app load
const savedOrgId = localStorage.getItem('currentOrgId');
if (savedOrgId) {
  await switchOrganization(savedOrgId);
}
```

---

## Error Handling

### Permission Errors

```typescript
// Check role before showing UI elements
const canInviteMembers = ['owner', 'admin'].includes(membership.role);
const canEditOrganization = ['owner', 'admin'].includes(membership.role);
const canDeleteOrganization = membership.role === 'owner';
```

### Common Errors

| Error Code | Description | UI Action |
|------------|-------------|-----------|
| FORBIDDEN | Insufficient permissions | Show permission denied message |
| CONFLICT | User already member | Show "already a member" toast |
| NOT_FOUND | Org/member not found | Redirect or show 404 |
| BAD_REQUEST | Invalid invitation | Show "invitation expired" message |

---

## Multi-Organization Data

When making API requests to other modules, include the organization context:

```typescript
// Option 1: Include in request header
api.defaults.headers['X-Organization-Id'] = currentOrganization.id;

// Option 2: Include in query string
const expenses = await api.get(`/tracking/expenses?organizationId=${orgId}`);
```

Most endpoints will automatically scope data by the organization context from the JWT token.

---

## Security Considerations

1. **Organization Switching**
   - Always verify membership on switch
   - Clear cached data when switching

2. **Invitation Tokens**
   - Tokens expire after 7 days
   - Each token is single-use
   - Tokens are hashed in database

3. **Role Changes**
   - Only owner can modify admin roles
   - Cannot demote yourself if you're the only admin

4. **Deletion**
   - Soft delete preserves data
   - Only owner can delete organization
   - All memberships are deactivated
