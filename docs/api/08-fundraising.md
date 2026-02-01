# Module 8: Fundraising - Frontend Integration Guide

## Overview

The Fundraising module handles all fundraising-related operations including:
- **Rounds**: Funding round management (Pre-seed, Seed, Series A, etc.)
- **Investors**: Investor management with investment tranches
- **Cap Table**: Share ownership tracking with waterfall analysis
- **ESOP**: Employee stock option plan management

## Base URL

```
/api/v1/fundraising
```

## Authentication

All endpoints require Bearer token in Authorization header:

```
Authorization: Bearer <access_token>
X-Organization-Id: <organization_id>
```

---

## 1. Rounds Sub-module

Manage funding rounds from planning to closure.

### Endpoints

| Method | Path | Description | Role |
|--------|------|-------------|------|
| GET | `/rounds` | List all rounds | all |
| POST | `/rounds` | Create round | owner, admin |
| GET | `/rounds/:id` | Get round details | all |
| PUT | `/rounds/:id` | Update round | owner, admin |
| DELETE | `/rounds/:id` | Delete planning round | owner, admin |
| POST | `/rounds/:id/open` | Open round | owner, admin |
| POST | `/rounds/:id/close` | Close round | owner |
| POST | `/rounds/:id/cancel` | Cancel round | owner |
| GET | `/rounds/:id/summary` | Get round summary with investors | all |
| POST | `/rounds/:id/documents` | Add document | owner, admin |
| DELETE | `/rounds/:id/documents/:docIndex` | Remove document | owner, admin |

### TypeScript Types

```typescript
interface Round {
  _id: string;
  organization: string;
  name: string;
  type: RoundType;
  status: RoundStatus;
  targetAmount: number;
  raisedAmount: number;
  percentRaised?: number;
  minimumInvestment?: number;
  pricePerShare?: number;
  preMoneyValuation?: number;
  postMoneyValuation?: number;
  shareClass?: ShareClass;
  newSharesIssued?: number;
  openDate?: string;
  closeDate?: string;
  targetCloseDate?: string;
  leadInvestor?: string;
  terms?: RoundTerms;
  documents?: RoundDocument[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

type RoundType =
  | 'pre_seed' | 'seed' | 'series_a' | 'series_b'
  | 'series_c' | 'series_d' | 'bridge'
  | 'convertible_note' | 'safe' | 'other';

type RoundStatus = 'planning' | 'active' | 'closed' | 'cancelled';

interface RoundTerms {
  liquidationPreference?: number;
  participatingPreferred?: boolean;
  antiDilution?: 'full_ratchet' | 'weighted_average' | 'none';
  boardSeats?: number;
  proRataRights?: boolean;
  informationRights?: boolean;
  votingRights?: string;
  dividends?: string;
  otherTerms?: string;
}

interface RoundDocument {
  name: string;
  type: 'term_sheet' | 'sha' | 'ssa' | 'side_letter' | 'other';
  url: string;
  uploadedAt: string;
}
```

### Create Round

**POST** `/fundraising/rounds`

```typescript
// Request
interface CreateRoundRequest {
  name: string;                    // Required: e.g., "Series A"
  type: RoundType;                 // Required
  targetAmount: number;            // Required
  minimumInvestment?: number;
  pricePerShare?: number;
  preMoneyValuation?: number;
  shareClass?: ShareClass;
  targetCloseDate?: string;        // ISO datetime
  terms?: RoundTerms;
  notes?: string;
}

// Response (201)
{
  success: true,
  data: Round,
  message: "Funding round created successfully"
}
```

### Round Workflow

```
Planning → Active → Closed
    ↓         ↓
    └→ Cancelled ←┘
```

**Open Round** - POST `/rounds/:id/open`
```typescript
{ openDate?: string }  // Defaults to now
```

**Close Round** - POST `/rounds/:id/close` (owner only)
```typescript
{
  closeDate?: string,          // Defaults to now
  finalRaisedAmount?: number   // Final amount raised
}
```

### Round Summary

**GET** `/fundraising/rounds/:id/summary`

```typescript
// Response
{
  success: true,
  data: {
    round: Round,
    investorCount: number,
    totalCommitted: number,
    totalReceived: number,
    percentRaised: number,
    investors: [{
      investor: string,
      name: string,
      type: InvestorType,
      commitmentAmount: number,
      receivedAmount: number,
      isLead: boolean
    }]
  }
}
```

---

## 2. Investors Sub-module

Manage investors and their investment tranches.

### Endpoints

| Method | Path | Description | Role |
|--------|------|-------------|------|
| GET | `/investors` | List investors | all |
| POST | `/investors` | Create investor | owner, admin |
| GET | `/investors/top` | Get top investors | all |
| GET | `/investors/:id` | Get investor | all |
| PUT | `/investors/:id` | Update investor | owner, admin |
| DELETE | `/investors/:id` | Delete investor | owner, admin |
| POST | `/investors/:id/tranches` | Add tranche | owner, admin |
| PUT | `/investors/:id/tranches/:tid` | Update tranche | owner, admin |
| POST | `/investors/:id/tranches/:tid/receive` | Receive tranche | owner, admin |
| POST | `/investors/:id/tranches/:tid/cancel` | Cancel tranche | owner, admin |
| DELETE | `/investors/:id/tranches/:tid` | Delete tranche | owner, admin |

### TypeScript Types

```typescript
interface Investor {
  _id: string;
  organization: string;
  name: string;
  type: InvestorType;
  status: InvestorStatus;
  email?: string;
  phone?: string;
  company?: string;
  website?: string;
  address?: Address;
  contactPerson?: ContactPerson;
  linkedRound?: string;
  totalCommitted: number;
  totalInvested: number;
  pendingAmount?: number;
  sharesOwned: number;
  ownershipPercent: number;
  tranches: Tranche[];
  notes?: string;
  tags?: string[];
  documents?: InvestorDocument[];
  createdAt: string;
  updatedAt: string;
}

type InvestorType =
  | 'angel' | 'vc' | 'corporate' | 'family_office'
  | 'accelerator' | 'crowdfunding' | 'founder'
  | 'employee' | 'other';

type InvestorStatus =
  | 'prospect' | 'in_discussion' | 'committed'
  | 'invested' | 'passed';

interface Tranche {
  _id: string;
  round?: string;
  amount: number;
  scheduledDate: string;
  receivedDate?: string;
  status: 'scheduled' | 'received' | 'cancelled';
  shareClass?: ShareClass;
  sharesIssued?: number;
  pricePerShare?: number;
  notes?: string;
  createdAt: string;
}
```

### Create Investor

**POST** `/fundraising/investors`

```typescript
// Request
interface CreateInvestorRequest {
  name: string;                    // Required
  type: InvestorType;              // Required
  status?: InvestorStatus;         // Default: 'prospect'
  email?: string;
  phone?: string;
  company?: string;
  website?: string;
  address?: Address;
  contactPerson?: ContactPerson;
  linkedRound?: string;            // Round ID
  notes?: string;
  tags?: string[];
}
```

### Tranche Management

**Add Tranche** - POST `/investors/:id/tranches`

```typescript
{
  round?: string,           // Round ID
  amount: number,           // Required
  scheduledDate: string,    // Required: ISO datetime
  shareClass?: ShareClass,
  sharesIssued?: number,
  pricePerShare?: number,
  notes?: string
}
```

**Receive Tranche** - POST `/investors/:id/tranches/:tid/receive`

```typescript
{
  receivedDate?: string,    // Defaults to now
  sharesIssued?: number,
  pricePerShare?: number
}
```

### Query Parameters

```typescript
interface InvestorQuery {
  status?: InvestorStatus;
  type?: InvestorType;
  roundId?: string;
  search?: string;
  page?: number;        // Default: 1
  limit?: number;       // Default: 20, max: 100
  sortBy?: 'createdAt' | 'name' | 'totalInvested' | 'totalCommitted';
  sortOrder?: 'asc' | 'desc';
}
```

---

## 3. Cap Table Sub-module

Manage share ownership, perform waterfall analysis, and simulate new rounds.

### Endpoints

| Method | Path | Description | Role |
|--------|------|-------------|------|
| GET | `/cap-table` | Get cap table summary | all |
| POST | `/cap-table/waterfall` | Waterfall analysis | all |
| POST | `/cap-table/simulate` | Simulate new round | all |
| GET | `/cap-table/share-classes` | List share classes | all |
| POST | `/cap-table/share-classes` | Create share class | owner, admin |
| GET | `/cap-table/share-classes/:id` | Get share class | all |
| PUT | `/cap-table/share-classes/:id` | Update share class | owner, admin |
| GET | `/cap-table/entries` | List cap table entries | all |
| POST | `/cap-table/entries` | Create entry | owner, admin |
| GET | `/cap-table/entries/:id` | Get entry | all |
| PUT | `/cap-table/entries/:id` | Update entry | owner, admin |
| DELETE | `/cap-table/entries/:id` | Delete entry | owner, admin |

### TypeScript Types

```typescript
type ShareClass =
  | 'common' | 'preferred' | 'series_seed'
  | 'series_a' | 'series_b' | 'series_c' | 'series_d'
  | 'options' | 'warrants' | 'convertible';

type ShareholderType =
  | 'founder' | 'investor' | 'employee'
  | 'advisor' | 'company' | 'other';

type CapTableEntryType =
  | 'issuance' | 'transfer' | 'exercise'
  | 'conversion' | 'buyback' | 'cancellation';

interface ShareClassConfig {
  _id: string;
  name: string;
  class: ShareClass;
  authorizedShares: number;
  issuedShares: number;
  outstandingShares: number;
  availableShares?: number;
  parValue?: number;
  votingRights: number;
  liquidationPreference?: number;
  participatingPreferred?: boolean;
  conversionRatio?: number;
  dividendRate?: number;
  seniority: number;
}

interface CapTableEntry {
  _id: string;
  shareholder: string;
  shareholderType: ShareholderType;
  shareholderName: string;
  shareClass: ShareClass;
  entryType: CapTableEntryType;
  shares: number;
  pricePerShare?: number;
  totalValue?: number;
  percentOwnership: number;
  round?: string;
  grantId?: string;
  effectiveDate: string;
  certificateNumber?: string;
  notes?: string;
}
```

### Cap Table Summary

**GET** `/fundraising/cap-table`

```typescript
// Query
{ asOfDate?: string }  // ISO datetime, defaults to now

// Response
{
  success: true,
  data: {
    asOfDate: string,
    totalAuthorizedShares: number,
    totalIssuedShares: number,
    totalOutstandingShares: number,
    byShareClass: [{
      shareClass: ShareClass,
      authorizedShares: number,
      issuedShares: number,
      outstandingShares: number,
      percentOfTotal: number
    }],
    byShareholder: [{
      shareholderId: string,
      name: string,
      type: ShareholderType,
      totalShares: number,
      percentOwnership: number,
      byShareClass: [{ shareClass: ShareClass, shares: number }]
    }],
    byShareholderType: [{
      type: ShareholderType,
      holderCount: number,
      totalShares: number,
      percentOwnership: number
    }]
  }
}
```

### Waterfall Analysis

**POST** `/fundraising/cap-table/waterfall`

```typescript
// Request
{ exitValuation: number }  // e.g., 100000000

// Response
{
  success: true,
  data: {
    exitValuation: number,
    distribution: [{
      shareholderId: string,
      shareholderName: string,
      shareholderType: ShareholderType,
      shares: number,
      percentOwnership: number,
      proceeds: number,
      multiple?: number  // Return multiple for investors
    }],
    totalDistributed: number
  }
}
```

### Round Simulation

**POST** `/fundraising/cap-table/simulate`

```typescript
// Request
{
  roundName: string,           // e.g., "Series B"
  investmentAmount: number,    // e.g., 10000000
  preMoneyValuation: number,   // e.g., 40000000
  shareClass?: ShareClass,     // Default: 'preferred'
  optionPoolIncrease?: number  // % to add to option pool
}

// Response
{
  success: true,
  data: {
    roundName: string,
    investmentAmount: number,
    pricePerShare: number,
    newShares: number,
    preMoneyValuation: number,
    postMoneyValuation: number,
    dilution: [{
      shareholderId: string,
      shareholderName: string,
      sharesBefore: number,
      sharesAfter: number,
      percentBefore: number,
      percentAfter: number,
      dilutionPercent: number
    }],
    newCapTable: [{
      shareholderId: string,
      name: string,
      type: ShareholderType,
      totalShares: number,
      percentOwnership: number
    }]
  }
}
```

### Create Share Class

**POST** `/fundraising/cap-table/share-classes`

```typescript
{
  name: string,                   // e.g., "Series A Preferred"
  class: ShareClass,              // Required
  authorizedShares: number,       // Required
  parValue?: number,
  votingRights?: number,          // Default: 1
  liquidationPreference?: number, // e.g., 1 for 1x
  participatingPreferred?: boolean,
  conversionRatio?: number,
  dividendRate?: number,
  seniority?: number              // Higher = paid first in liquidation
}
```

---

## 4. ESOP Sub-module

Manage employee stock option pools and grants.

### Endpoints

| Method | Path | Description | Role |
|--------|------|-------------|------|
| GET | `/esop/summary` | Get ESOP summary | all |
| GET | `/esop/pool` | Get ESOP pool | all |
| POST | `/esop/pool` | Create pool | owner |
| PUT | `/esop/pool` | Update pool | owner |
| GET | `/esop/grants` | List grants | all |
| POST | `/esop/grants` | Create grant | owner, admin |
| GET | `/esop/grants/:id` | Get grant | all |
| PUT | `/esop/grants/:id` | Update grant | owner, admin |
| DELETE | `/esop/grants/:id` | Delete draft grant | owner, admin |
| POST | `/esop/grants/:id/approve` | Approve grant | owner |
| POST | `/esop/grants/:id/activate` | Activate grant | owner, admin |
| POST | `/esop/grants/:id/exercise` | Exercise shares | owner, admin |
| POST | `/esop/grants/:id/cancel` | Cancel grant | owner, admin |
| GET | `/esop/grants/:id/vesting` | Get vesting schedule | all |

### TypeScript Types

```typescript
interface ESOPPool {
  _id: string;
  name: string;
  totalShares: number;
  allocatedShares: number;
  availableShares: number;
  utilizationPercent?: number;
  shareClass: ShareClass;
  percentOfCompany: number;
  createdFromRound?: string;
  isActive: boolean;
}

interface ESOPGrant {
  _id: string;
  pool: string;
  grantee: string;
  granteeName: string;
  granteeEmail?: string;
  employeeId?: string;
  department?: string;
  grantType: GrantType;
  status: GrantStatus;
  totalShares: number;
  vestedShares: number;
  unvestedShares: number;
  exercisedShares: number;
  exercisableShares?: number;
  vestingProgress?: number;
  exercisePrice: number;
  fairMarketValue?: number;
  grantDate: string;
  vestingSchedule: VestingScheduleType;
  vestingStartDate: string;
  vestingMonths: number;
  cliffMonths: number;
  vestingEvents?: VestingEvent[];
  exerciseEvents?: ExerciseEvent[];
  expirationDate?: string;
  accelerationClause?: AccelerationClause;
  boardApprovalDate?: string;
  grantAgreementUrl?: string;
  notes?: string;
}

type GrantType = 'iso' | 'nso' | 'rsu' | 'rsa' | 'sar' | 'phantom';

type GrantStatus =
  | 'draft' | 'approved' | 'active'
  | 'partially_vested' | 'fully_vested'
  | 'exercised' | 'expired' | 'cancelled' | 'forfeited';

type VestingScheduleType =
  | 'standard_4y_1y_cliff' | 'standard_4y_no_cliff'
  | 'immediate' | 'monthly' | 'quarterly'
  | 'annual' | 'milestone_based' | 'custom';

interface VestingEvent {
  date: string;
  sharesVested: number;
  cumulativeVested: number;
  percentVested: number;
  isMilestone?: boolean;
  milestoneDescription?: string;
}

interface ExerciseEvent {
  _id: string;
  date: string;
  sharesExercised: number;
  pricePerShare: number;
  totalCost: number;
  paymentMethod?: string;
  capTableEntryId?: string;
  notes?: string;
}

interface AccelerationClause {
  singleTrigger?: boolean;    // Accelerate on acquisition
  doubleTrigger?: boolean;    // Accelerate on acquisition + termination
  accelerationPercent: number; // % of unvested that accelerates
}
```

### Create ESOP Pool

**POST** `/fundraising/esop/pool` (owner only)

```typescript
{
  name?: string,              // Default: "ESOP Pool"
  totalShares: number,        // Required
  shareClass?: ShareClass,    // Default: 'options'
  percentOfCompany?: number,
  createdFromRound?: string   // If created as part of a round
}
```

### Create Grant

**POST** `/fundraising/esop/grants`

```typescript
{
  pool: string,                    // Required: Pool ID
  grantee: string,                 // Required: User ID
  granteeName: string,             // Required
  granteeEmail?: string,
  employeeId?: string,
  department?: string,
  grantType: GrantType,            // Required
  totalShares: number,             // Required
  exercisePrice: number,           // Required
  fairMarketValue?: number,
  grantDate: string,               // Required: ISO datetime
  vestingSchedule?: VestingScheduleType,  // Default: 'standard_4y_1y_cliff'
  vestingStartDate: string,        // Required
  vestingMonths?: number,          // Default: 48
  cliffMonths?: number,            // Default: 12
  expirationDate?: string,
  accelerationClause?: AccelerationClause,
  boardApprovalDate?: string,
  grantAgreementUrl?: string,
  notes?: string
}
```

### Grant Workflow

```
Draft → Approved → Active → Partially Vested → Fully Vested → Exercised
  ↓                  ↓           ↓                ↓
  └─────────────── Cancelled ────┴────────────────┘
```

### Exercise Shares

**POST** `/fundraising/esop/grants/:id/exercise`

```typescript
{
  sharesExercised: number,    // Required
  exerciseDate?: string,      // Defaults to now
  paymentMethod?: string,
  notes?: string
}
```

### Vesting Schedule

**GET** `/fundraising/esop/grants/:id/vesting`

```typescript
// Response
{
  success: true,
  data: {
    grant: ESOPGrant,
    projectedVesting: [{
      date: string,
      sharesVesting: number,
      cumulativeVested: number,
      percentVested: number
    }],
    totalVested: number,
    totalUnvested: number,
    totalExercised: number,
    totalExercisable: number,
    nextVestingDate?: string,
    nextVestingAmount?: number
  }
}
```

### ESOP Summary

**GET** `/fundraising/esop/summary`

```typescript
// Response
{
  success: true,
  data: {
    pool: ESOPPool | null,
    totalGrants: number,
    activeGrants: number,
    totalAllocated: number,
    totalVested: number,
    totalExercised: number,
    totalAvailable: number,
    utilizationPercent: number,
    byDepartment: [{
      department: string,
      grantCount: number,
      totalShares: number,
      vestedShares: number,
      exercisedShares: number
    }],
    recentGrants: ESOPGrant[]
  }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Validation error or business rule violation |
| 401 | Unauthorized - invalid or missing token |
| 403 | Forbidden - insufficient permissions |
| 404 | Resource not found |
| 409 | Conflict - e.g., duplicate active round |

### Common Errors

```typescript
// Round errors
"An active or planning {type} round already exists"
"Only planning rounds can be opened"
"Only active rounds can be closed"
"Cannot update a closed round"
"Cannot delete a round with recorded investments"

// Investor errors
"Cannot delete investor with received investments"
"Cannot update a received tranche"
"Cannot cancel a received tranche"

// Cap Table errors
"Share class {class} already exists"
"Not enough authorized shares"

// ESOP errors
"ESOP pool already exists"
"Not enough shares available"
"Only draft grants can be approved"
"Cannot exercise more than exercisable shares"
"Only draft grants can be deleted"
```

---

## UI Components Needed

### Rounds
1. **RoundList** - Table with status badges and progress bars
2. **RoundForm** - Create/edit round with terms
3. **RoundDetail** - Round info with investor breakdown
4. **RoundTimeline** - Visual timeline of round workflow

### Investors
1. **InvestorList** - Searchable table with filters
2. **InvestorForm** - Create/edit with contact info
3. **InvestorDetail** - Profile with tranche history
4. **TrancheTimeline** - Visual tranche schedule

### Cap Table
1. **CapTableSummary** - Ownership pie chart
2. **ShareholderTable** - Sortable ownership table
3. **WaterfallChart** - Exit distribution visualization
4. **RoundSimulator** - Interactive dilution calculator

### ESOP
1. **PoolOverview** - Pool utilization gauge
2. **GrantList** - Filterable grant table
3. **GrantForm** - Create grant with vesting preview
4. **VestingCalendar** - Visual vesting schedule
5. **ExerciseModal** - Exercise shares wizard

---

## User Flows

### Creating a Funding Round

1. Navigate to Fundraising > Rounds
2. Click "Create Round"
3. Select round type and enter target amount
4. Optionally set terms and valuation
5. Save as planning round
6. Add investors and tranches
7. Open round when ready
8. Track progress until target reached
9. Close round

### Managing Investor Investment

1. Create or select investor
2. Add tranche with scheduled date and amount
3. Link to specific round
4. When payment received, mark tranche as received
5. System auto-updates round raised amount

### Simulating New Round

1. Navigate to Cap Table
2. Click "Simulate Round"
3. Enter investment amount and pre-money valuation
4. Optionally add option pool increase
5. Review dilution impact on all shareholders
6. Export simulation for board review

### Creating ESOP Grant

1. Navigate to ESOP > Grants
2. Click "Create Grant"
3. Select grantee and grant type
4. Set share count and exercise price
5. Configure vesting schedule
6. Save as draft
7. Get board approval
8. Approve and activate grant
9. Track vesting over time

---

## State Management

```typescript
// Redux slices
interface FundraisingState {
  rounds: {
    list: Round[];
    current: Round | null;
    isLoading: boolean;
  };
  investors: {
    list: Investor[];
    current: Investor | null;
    isLoading: boolean;
  };
  capTable: {
    summary: CapTableSummary | null;
    shareClasses: ShareClassConfig[];
    isLoading: boolean;
  };
  esop: {
    pool: ESOPPool | null;
    grants: ESOPGrant[];
    summary: ESOPSummary | null;
    isLoading: boolean;
  };
}

// React Query hooks
const useRounds = () => useQuery(['rounds'], fetchRounds);
const useRound = (id: string) => useQuery(['round', id], () => fetchRound(id));
const useCapTableSummary = () => useQuery(['cap-table'], fetchCapTableSummary);
const useESOPSummary = () => useQuery(['esop-summary'], fetchESOPSummary);
```

---

## Integration with Other Modules

- **Auth**: User context for grantees
- **Organization**: Multi-tenancy for all data
- **Planning**: Revenue plans may include funding milestones
- **Reporting**: Cap table and investor reports
- **Operations**: Investor meeting tracking
