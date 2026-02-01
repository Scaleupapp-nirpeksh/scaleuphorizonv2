# Auth Module - Frontend Integration Guide

## Overview

The Auth module handles user authentication, registration, password management, and email verification. It provides JWT-based authentication with access and refresh tokens.

## Base URL

```
/api/v1/auth
```

## Authentication

Most endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Token Management

The auth system uses two types of tokens:

| Token Type | Expiry | Purpose |
|------------|--------|---------|
| Access Token | 15 minutes | API authentication |
| Refresh Token | 7 days | Obtaining new access tokens |

### Token Refresh Strategy

1. Store both tokens securely (httpOnly cookies or secure storage)
2. Use access token for API requests
3. When you receive a 401 error with "Access token expired", use the refresh token to get new tokens
4. If refresh fails, redirect user to login

---

## Endpoints

### POST /register

Create a new user account.

**Request Body:**

```typescript
interface RegisterRequest {
  email: string;       // Valid email address
  password: string;    // Min 8 chars, must contain uppercase, lowercase, and number
  firstName: string;   // 1-50 characters
  lastName: string;    // 1-50 characters
}
```

**Response (201 Created):**

```typescript
interface AuthResponse {
  success: true;
  data: {
    user: User;
    tokens: TokenPair;
  };
  message: "Registration successful";
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | VALIDATION_ERROR | Invalid input data |
| 409 | CONFLICT | Email already exists |

**Example:**

```typescript
const response = await fetch('/api/v1/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'john@example.com',
    password: 'SecurePass123',
    firstName: 'John',
    lastName: 'Doe'
  })
});

const { data } = await response.json();
// Store tokens
localStorage.setItem('accessToken', data.tokens.accessToken);
localStorage.setItem('refreshToken', data.tokens.refreshToken);
```

---

### POST /login

Authenticate user and receive tokens.

**Request Body:**

```typescript
interface LoginRequest {
  email: string;
  password: string;
}
```

**Response (200 OK):**

```typescript
interface AuthResponse {
  success: true;
  data: {
    user: User;
    tokens: TokenPair;
  };
  message: "Login successful";
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Invalid email or password |
| 401 | UNAUTHORIZED | Account is deactivated |

---

### POST /logout

Invalidate the current refresh token.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**

```typescript
interface LogoutRequest {
  refreshToken: string;
}
```

**Response (200 OK):**

```typescript
interface MessageResponse {
  success: true;
  message: "Logout successful";
}
```

---

### POST /refresh-token

Get new access and refresh tokens.

**Request Body:**

```typescript
interface RefreshTokenRequest {
  refreshToken: string;
}
```

**Response (200 OK):**

```typescript
interface TokenRefreshResponse {
  success: true;
  data: {
    tokens: TokenPair;
  };
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Invalid or expired refresh token |
| 401 | UNAUTHORIZED | Password was changed, please login again |

**Example (Axios Interceptor):**

```typescript
axios.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post('/api/v1/auth/refresh-token', {
          refreshToken
        });

        localStorage.setItem('accessToken', data.data.tokens.accessToken);
        localStorage.setItem('refreshToken', data.data.tokens.refreshToken);

        originalRequest.headers.Authorization = `Bearer ${data.data.tokens.accessToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        // Redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

---

### GET /me

Get the current authenticated user's profile.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**

```typescript
interface UserProfileResponse {
  success: true;
  data: User;
}
```

---

### PUT /me

Update the current user's profile.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**

```typescript
interface UpdateProfileRequest {
  firstName?: string;  // 1-50 characters
  lastName?: string;   // 1-50 characters
  avatar?: string;     // Valid URL
}
```

**Response (200 OK):**

```typescript
interface UserProfileResponse {
  success: true;
  data: User;
  message: "Profile updated";
}
```

---

### PUT /change-password

Change the current user's password.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**

```typescript
interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;  // Min 8 chars, uppercase, lowercase, number
}
```

**Response (200 OK):**

```typescript
interface MessageResponse {
  success: true;
  message: "Password changed successfully";
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | BAD_REQUEST | Current password is incorrect |
| 400 | BAD_REQUEST | New password must be different |

**Note:** After password change, all existing refresh tokens are invalidated. User will need to login again on other devices.

---

### POST /forgot-password

Request a password reset email.

**Request Body:**

```typescript
interface ForgotPasswordRequest {
  email: string;
}
```

**Response (200 OK):**

```typescript
// Production
interface MessageResponse {
  success: true;
  message: "If the email exists, a password reset link has been sent";
}

// Development (includes token for testing)
interface DevResponse {
  success: true;
  data: {
    message: string;
    devToken: string;      // Only in development
    expiresAt: string;     // ISO date string
  };
}
```

**Note:** For security, this endpoint always returns success even if the email doesn't exist.

---

### POST /reset-password

Reset password using the token from email.

**Request Body:**

```typescript
interface ResetPasswordRequest {
  token: string;      // Token from reset email
  password: string;   // New password (min 8 chars, uppercase, lowercase, number)
}
```

**Response (200 OK):**

```typescript
interface MessageResponse {
  success: true;
  message: "Password reset successful";
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | BAD_REQUEST | Invalid or expired reset token |

---

### POST /request-verification

Request an email verification link.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**

```typescript
// Production
interface MessageResponse {
  success: true;
  message: "Verification email sent";
}

// Development
interface DevResponse {
  success: true;
  data: {
    message: string;
    devToken: string;
    expiresAt: string;
  };
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | BAD_REQUEST | Email is already verified |

---

### POST /verify-email

Verify email using the token from verification email.

**Request Body:**

```typescript
interface VerifyEmailRequest {
  token: string;
}
```

**Response (200 OK):**

```typescript
interface MessageResponse {
  success: true;
  message: "Email verified successfully";
}
```

---

## TypeScript Types

```typescript
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatar?: string;
  isEmailVerified: boolean;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;  // Access token expiry in seconds
}
```

---

## UI Components Needed

1. **LoginForm** - Email/password form with validation
2. **RegisterForm** - Registration form with password requirements display
3. **ForgotPasswordForm** - Email input for password reset
4. **ResetPasswordForm** - New password form (accessed via email link)
5. **ProfileSettings** - Edit name, avatar
6. **ChangePasswordForm** - Current/new password form
7. **EmailVerificationBanner** - Prompt for unverified users

---

## User Flows

### Registration Flow

```
1. User fills registration form
2. Submit to POST /register
3. On success:
   - Store tokens
   - Redirect to dashboard
   - Show email verification banner
4. On error:
   - Display validation errors
   - Handle "email exists" case
```

### Login Flow

```
1. User enters credentials
2. Submit to POST /login
3. On success:
   - Store tokens
   - Redirect to intended page or dashboard
4. On 401:
   - Show "Invalid credentials" error
   - Handle "Account deactivated" case
```

### Password Reset Flow

```
1. User clicks "Forgot Password"
2. User enters email
3. Submit to POST /forgot-password
4. Show "Check your email" message
5. User clicks link in email
6. Redirect to reset page with token in URL
7. User enters new password
8. Submit to POST /reset-password
9. Redirect to login with success message
```

### Token Refresh Flow

```
1. API request returns 401 "Access token expired"
2. Call POST /refresh-token with refresh token
3. On success:
   - Update stored tokens
   - Retry original request
4. On failure:
   - Clear tokens
   - Redirect to login
```

---

## State Management

### React Context Example

```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: UpdateProfileRequest) => Promise<void>;
}
```

### Redux Slice Example

```typescript
interface AuthState {
  user: User | null;
  tokens: TokenPair | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Actions
- auth/login
- auth/register
- auth/logout
- auth/refreshToken
- auth/getProfile
- auth/updateProfile
- auth/changePassword
```

---

## Error Handling

### Common Errors

| Error Code | Description | UI Action |
|------------|-------------|-----------|
| VALIDATION_ERROR | Invalid input | Show field-level errors |
| UNAUTHORIZED | Not authenticated | Redirect to login |
| FORBIDDEN | No permission | Show access denied message |
| CONFLICT | Duplicate resource | Show "already exists" message |
| NOT_FOUND | Resource not found | Show 404 page |

### Validation Error Format

```typescript
interface ValidationError {
  success: false;
  error: {
    code: "VALIDATION_ERROR";
    message: "Validation failed";
    details: {
      errors: Array<{
        field: string;
        message: string;
      }>;
    };
  };
}
```

### Error Display Example

```typescript
const handleError = (error: ApiError) => {
  if (error.code === 'VALIDATION_ERROR') {
    const fieldErrors = error.details.errors.reduce((acc, err) => ({
      ...acc,
      [err.field]: err.message
    }), {});
    setFormErrors(fieldErrors);
  } else {
    toast.error(error.message);
  }
};
```

---

## Security Considerations

1. **Token Storage:**
   - Prefer httpOnly cookies for tokens (requires backend cookie setup)
   - If using localStorage, be aware of XSS risks
   - Never store tokens in sessionStorage for persistent login

2. **Password Requirements:**
   - Minimum 8 characters
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one number

3. **Rate Limiting:**
   - Login attempts are rate limited
   - After multiple failures, temporary lockout may occur

4. **Session Management:**
   - Users can have multiple active sessions
   - Password change invalidates all sessions
   - Logout only affects current session
