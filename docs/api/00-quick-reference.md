# ScaleUp Horizon - Quick Reference Guide

A fast lookup guide for frontend developers working with the ScaleUp Horizon API.

---

## API Base URLs

```
Development:  http://localhost:5000/api/v1
Production:   https://api.scaleup-horizon.com/api/v1
Documentation: http://localhost:5000/api/v1/docs
Health Check:  http://localhost:5000/health
```

---

## Required Headers

```http
Authorization: Bearer <access_token>
X-Organization-Id: <organization_id>
Content-Type: application/json
```

---

## Authentication Quick Start

```typescript
// Login
const { data } = await api.post('/auth/login', {
  email: 'user@example.com',
  password: 'password123'
});
const { accessToken, refreshToken, user } = data;

// Set headers for all requests
api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

// Get organizations
const orgs = await api.get('/organizations');

// Set active organization
api.defaults.headers.common['X-Organization-Id'] = orgs.data[0]._id;

// Refresh token (when 401 received)
const { data: newTokens } = await api.post('/auth/refresh-token', {
  refreshToken
});
```

---

## Module Endpoints Quick Reference

### Auth (`/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Create account |
| POST | `/login` | Login |
| POST | `/logout` | Logout |
| POST | `/refresh-token` | Refresh access token |
| GET | `/me` | Get current user |
| PUT | `/me` | Update profile |
| PUT | `/change-password` | Change password |
| POST | `/forgot-password` | Request reset |
| POST | `/reset-password` | Reset password |

### Organizations (`/organizations`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create organization |
| GET | `/` | List my organizations |
| GET | `/:id` | Get organization |
| PUT | `/:id` | Update organization |
| DELETE | `/:id` | Delete organization |
| POST | `/:id/switch` | Switch active org |
| POST | `/:id/members` | Invite member |
| GET | `/:id/members` | List members |
| PUT | `/:id/members/:uid` | Update member role |
| DELETE | `/:id/members/:uid` | Remove member |

### Chart of Accounts (`/chart-of-accounts`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List accounts |
| POST | `/` | Create account |
| GET | `/tree` | Get hierarchy |
| GET | `/leaf` | Get leaf accounts only |
| GET | `/:id` | Get account |
| PUT | `/:id` | Update account |
| DELETE | `/:id` | Archive account |
| POST | `/seed` | Seed defaults |

### Planning - Budgets (`/planning/budgets`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create budget |
| GET | `/` | List budgets |
| GET | `/:id` | Get budget |
| PUT | `/:id` | Update budget |
| DELETE | `/:id` | Archive budget |
| POST | `/:id/submit` | Submit for approval |
| POST | `/:id/approve` | Approve budget |
| POST | `/:id/reject` | Reject budget |
| POST | `/:id/clone` | Clone budget |
| GET | `/:id/items` | List items |
| POST | `/:id/items` | Add item |

### Planning - Headcount (`/planning/headcount`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create plan |
| GET | `/` | List plans |
| GET | `/:id` | Get plan |
| PUT | `/:id` | Update plan |
| GET | `/:id/roles` | List roles |
| POST | `/:id/roles` | Add role |
| GET | `/:id/cost-projection` | Get costs |

### Planning - Revenue (`/planning/revenue`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create plan |
| GET | `/` | List plans |
| GET | `/:id` | Get plan |
| PUT | `/:id` | Update plan |
| GET | `/:id/streams` | List streams |
| POST | `/:id/streams` | Add stream |
| GET | `/:id/projections` | Get projections |

### Planning - Scenarios (`/planning/scenarios`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create scenario |
| GET | `/` | List scenarios |
| GET | `/:id` | Get scenario |
| PUT | `/:id` | Update scenario |
| POST | `/compare` | Compare scenarios |
| GET | `/:id/impact` | Calculate impact |

### Tracking - Transactions (`/tracking/transactions`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create transaction |
| GET | `/` | List transactions |
| GET | `/:id` | Get transaction |
| PUT | `/:id` | Update transaction |
| DELETE | `/:id` | Archive transaction |
| POST | `/bulk` | Bulk create |
| GET | `/summary` | Get summary |
| GET | `/by-category` | Group by category |

### Tracking - Expenses (`/tracking/expenses`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create expense |
| GET | `/` | List expenses |
| GET | `/:id` | Get expense |
| PUT | `/:id` | Update expense |
| DELETE | `/:id` | Archive expense |
| POST | `/:id/submit` | Submit for approval |
| POST | `/:id/approve` | Approve expense |
| POST | `/:id/reject` | Reject expense |
| POST | `/:id/pay` | Mark as paid |
| GET | `/pending-approvals` | List pending |

### Tracking - Vendors (`/tracking/vendors`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create vendor |
| GET | `/` | List vendors |
| GET | `/:id` | Get vendor |
| PUT | `/:id` | Update vendor |

### Tracking - Revenue (`/tracking/revenue`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create entry |
| GET | `/` | List entries |
| GET | `/:id` | Get entry |
| PUT | `/:id` | Update entry |
| POST | `/:id/receive` | Mark received |
| GET | `/mrr` | Get MRR/ARR |

### Tracking - Customers (`/tracking/customers`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create customer |
| GET | `/` | List customers |
| GET | `/:id` | Get customer |
| PUT | `/:id` | Update customer |

### Tracking - Bank (`/tracking/bank-accounts`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create account |
| GET | `/` | List accounts |
| GET | `/:id` | Get account |
| PUT | `/:id` | Update account |
| POST | `/:id/import` | Import CSV |
| GET | `/:id/transactions` | List bank txns |

### Tracking - Bank Transactions (`/tracking/bank-transactions`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/:id` | Get bank txn |
| POST | `/:id/match` | Match to txn |
| POST | `/:id/reconcile` | Reconcile |
| POST | `/:id/ignore` | Mark ignored |
| GET | `/unmatched` | List unmatched |

### Projection - Runway (`/projection/runway`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get current runway |
| GET | `/history` | Runway history |
| POST | `/what-if` | What-if analysis |
| GET | `/scenarios` | By scenario |

### Projection - Cash Flow (`/projection/cash-flow`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create forecast |
| GET | `/` | Get forecast |
| GET | `/monthly` | Monthly view |
| POST | `/recalculate` | Recalculate |

### Analysis - Variance (`/analysis/variance`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/budget` | Budget vs actual |
| GET | `/revenue` | Revenue vs plan |
| GET | `/by-category` | By category |
| GET | `/by-month` | By month |

### Analysis - Trends (`/analysis/trends`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/expenses` | Expense trends |
| GET | `/revenue` | Revenue trends |
| GET | `/burn-rate` | Burn rate trend |

### Analysis - Unit Economics (`/analysis/unit-economics`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | All metrics |
| GET | `/cac` | CAC |
| GET | `/ltv` | LTV |
| GET | `/cohorts` | Cohort analysis |

### Analysis - Health Score (`/analysis/health-score`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Current score |
| GET | `/breakdown` | Components |
| GET | `/history` | Score history |
| GET | `/recommendations` | Improvements |

### Fundraising - Rounds (`/fundraising/rounds`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create round |
| GET | `/` | List rounds |
| GET | `/:id` | Get round |
| PUT | `/:id` | Update round |
| POST | `/:id/close` | Close round |

### Fundraising - Investors (`/fundraising/investors`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Add investor |
| GET | `/` | List investors |
| GET | `/:id` | Get investor |
| PUT | `/:id` | Update investor |
| POST | `/:id/tranches` | Add tranche |
| PUT | `/:id/tranches/:tid` | Update tranche |

### Fundraising - Cap Table (`/fundraising/cap-table`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get cap table |
| POST | `/entries` | Add entry |
| GET | `/summary` | Ownership summary |
| GET | `/waterfall` | Waterfall analysis |
| POST | `/simulate` | Simulate round |

### Fundraising - ESOP (`/fundraising/esop`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/pool` | Create pool |
| GET | `/pool` | Get pool |
| POST | `/grants` | Create grant |
| GET | `/grants` | List grants |
| GET | `/vesting/:id` | Vesting schedule |

### Reporting - Dashboards (`/reporting/dashboards`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create dashboard |
| GET | `/` | List dashboards |
| GET | `/:id` | Get dashboard |
| PUT | `/:id` | Update dashboard |
| POST | `/:id/widgets` | Add widget |
| GET | `/executive` | Executive dash |

### Reporting - Investor Reports (`/reporting/investor-reports`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create report |
| GET | `/` | List reports |
| GET | `/:id` | Get report |
| POST | `/:id/send` | Send to investors |
| GET | `/templates` | Report templates |

### Reporting - Statements (`/reporting/statements`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/pnl` | P&L statement |
| GET | `/balance` | Balance sheet |
| GET | `/cashflow` | Cash flow statement |
| GET | `/export` | Export PDF/Excel |

### Operations - Tasks (`/operations/tasks`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create task |
| GET | `/` | List tasks |
| GET | `/:id` | Get task |
| PUT | `/:id` | Update task |
| PUT | `/:id/status` | Update status |
| POST | `/:id/comments` | Add comment |
| GET | `/my` | My tasks |
| GET | `/stats` | Task stats |

### Operations - Milestones (`/operations/milestones`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create milestone |
| GET | `/` | List milestones |
| GET | `/:id` | Get milestone |
| PUT | `/:id` | Update milestone |
| GET | `/roadmap` | Roadmap view |

### Operations - Meetings (`/operations/meetings`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create meeting |
| GET | `/` | List meetings |
| GET | `/:id` | Get meeting |
| PUT | `/:id` | Update meeting |
| POST | `/:id/complete` | Complete meeting |
| POST | `/:id/actions` | Add action item |
| GET | `/upcoming` | Upcoming meetings |

### Intelligence - Copilot (`/intelligence/copilot`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/query` | Ask question |
| GET | `/history` | Query history |
| POST | `/feedback` | Rate response |
| DELETE | `/conversation/:id` | Clear convo |

### Intelligence - Categorization (`/intelligence`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/categorize` | Categorize single |
| POST | `/categorize/bulk` | Bulk categorize |
| GET | `/categorize/suggestions` | Get suggestions |
| POST | `/categorize/feedback` | Correction feedback |

### Intelligence - Documents (`/intelligence/documents`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/parse` | Parse document |
| POST | `/detect-type` | Detect doc type |
| GET | `/types` | Supported types |

### Intelligence - Reports (`/intelligence/reports`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/generate` | Generate report |
| GET | `/types` | Report types |

### Intelligence - Meetings (`/intelligence/meetings`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/:id/prep` | Prep brief |
| POST | `/summary` | Generate summary |
| POST | `/action-items` | Extract actions |
| POST | `/follow-up-email` | Generate email |
| GET | `/investors/:id/research` | Research investor |

### Uploads (`/uploads`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/config` | Get upload config |
| POST | `/presigned` | Get presigned upload URL |
| POST | `/presigned/download` | Get presigned download URL |
| POST | `/avatar` | Upload avatar image |
| POST | `/logo` | Upload organization logo |
| POST | `/receipt` | Upload expense receipt |
| POST | `/document` | Upload document |
| POST | `/report` | Upload investor report |
| POST | `/attachments` | Upload multiple files |
| DELETE | `/file` | Delete single file |
| DELETE | `/files` | Delete multiple files |
| GET | `/file/:key/exists` | Check if file exists |
| GET | `/file/:key/metadata` | Get file metadata |

---

## Status Enums Quick Reference

### Budget Status
```typescript
'draft' | 'pending' | 'approved' | 'active' | 'archived'
```

### Expense Status
```typescript
'draft' | 'pending_approval' | 'approved' | 'rejected' | 'paid'
```

### Investor Status
```typescript
'prospect' | 'in_discussion' | 'committed' | 'invested' | 'passed'
```

### Transaction Status
```typescript
'pending' | 'cleared' | 'reconciled'
```

### Task Status
```typescript
'backlog' | 'todo' | 'in_progress' | 'done' | 'closed'
```

### Round Status
```typescript
'planning' | 'active' | 'closed' | 'cancelled'
```

### Runway Status
```typescript
'critical' | 'warning' | 'healthy'
```

### Health Score Status
```typescript
'excellent' | 'good' | 'fair' | 'poor'
```

---

## Common Query Parameters

### Pagination
```
?page=1&limit=20&sortBy=createdAt&sortOrder=desc
```

### Date Filtering
```
?dateFrom=2024-01-01&dateTo=2024-12-31
```

### Status Filtering
```
?status=active&status=pending
```

### Search
```
?search=keyword&searchFields=name,description
```

---

## Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalPages": 10,
    "totalCount": 200,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": {
      "email": "Email is required"
    }
  }
}
```

---

## HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Process response |
| 201 | Created | Resource created |
| 400 | Bad Request | Show validation errors |
| 401 | Unauthorized | Refresh token or login |
| 403 | Forbidden | Show permission error |
| 404 | Not Found | Show 404 message |
| 409 | Conflict | Resource exists |
| 422 | Unprocessable | Validation failed |
| 429 | Rate Limited | Show retry message |
| 500 | Server Error | Show generic error |

---

## Token Lifecycle

```
Access Token:  15 minutes
Refresh Token: 7 days

Token refresh flow:
1. API returns 401
2. Call POST /auth/refresh-token
3. Get new access token
4. Retry original request
5. If refresh fails, redirect to login
```

---

## Date Formats

```
API: ISO 8601 (2024-01-15T10:30:00.000Z)
Display: Configurable per org (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD)
```

---

## Currency Handling

```
Storage: Cents (integer)
Display: Formatted per org currency
Default: USD
```

---

## Role Permissions Summary

| Role | View | Create | Edit | Approve | Admin |
|------|------|--------|------|---------|-------|
| Owner | ✓ | ✓ | ✓ | ✓ | ✓ |
| Admin | ✓ | ✓ | ✓ | ✓ | ✓ |
| Member | ✓ | ✓ | ✓ | - | - |
| Viewer | ✓ | - | - | - | - |

---

## File Upload Limits

```
Avatar/Logo:   5MB  (image/jpeg, image/png, image/gif, image/webp)
Receipt:       10MB (image/jpeg, image/png, application/pdf)
Document:      25MB (pdf, doc, docx, xls, xlsx, csv)
Attachment:    25MB (all supported types)
Max files:     5 per batch upload
```

---

## Rate Limits

```
Default: 100 requests per minute
Auth endpoints: 10 requests per minute
AI endpoints: 20 requests per minute
```

---

## Documentation Index

| File | Description |
|------|-------------|
| [00-product-overview.md](00-product-overview.md) | Complete product guide |
| [00-business-workflows.md](00-business-workflows.md) | Business logic & flows |
| [00-data-models.md](00-data-models.md) | TypeScript interfaces |
| [01-auth.md](01-auth.md) | Auth API details |
| [02-organization.md](02-organization.md) | Organization API |
| [03-chart-of-accounts.md](03-chart-of-accounts.md) | Chart of Accounts API |
| [04-planning.md](04-planning.md) | Planning module API |
| [05-tracking.md](05-tracking.md) | Tracking module API |
| [06-projection.md](06-projection.md) | Projection module API |
| [07-analysis.md](07-analysis.md) | Analysis module API |
| [08-fundraising.md](08-fundraising.md) | Fundraising module API |
| [09-reporting.md](09-reporting.md) | Reporting module API |
| [10-operations.md](10-operations.md) | Operations module API |
| [11-intelligence.md](11-intelligence.md) | AI Intelligence API |
| [12-uploads.md](12-uploads.md) | File Uploads API |

---

*Last updated: February 2026*
