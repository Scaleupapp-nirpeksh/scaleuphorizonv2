/**
 * Fundraising Module Types
 *
 * Shared TypeScript interfaces for all fundraising sub-modules
 */

import { Types } from 'mongoose';
import {
  RoundTypeType,
  RoundStatusType,
  InvestorTypeType,
  InvestorStatusType,
  TrancheStatusType,
  ShareClassType,
  ShareholderTypeType,
  CapTableEntryTypeType,
  GrantStatusType,
  VestingScheduleTypeType,
  GrantTypeType,
} from '../constants';

// ============ Round Types ============

export interface Round {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  name: string;
  type: RoundTypeType;
  status: RoundStatusType;
  targetAmount: number;
  raisedAmount: number;
  minimumInvestment?: number;
  pricePerShare?: number;
  preMoneyValuation?: number;
  postMoneyValuation?: number;
  shareClass?: ShareClassType;
  newSharesIssued?: number;
  openDate?: Date;
  closeDate?: Date;
  targetCloseDate?: Date;
  leadInvestor?: Types.ObjectId;
  terms?: RoundTerms;
  documents?: RoundDocument[];
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoundTerms {
  liquidationPreference?: number; // 1x, 2x, etc.
  participatingPreferred?: boolean;
  antiDilution?: 'full_ratchet' | 'weighted_average' | 'none';
  boardSeats?: number;
  proRataRights?: boolean;
  informationRights?: boolean;
  votingRights?: string;
  dividends?: string;
  otherTerms?: string;
}

export interface RoundDocument {
  name: string;
  type: 'term_sheet' | 'sha' | 'ssa' | 'side_letter' | 'other';
  url: string;
  uploadedAt: Date;
}

export interface RoundSummary {
  round: Round;
  investorCount: number;
  totalCommitted: number;
  totalReceived: number;
  percentRaised: number;
  investors: InvestorSummaryForRound[];
}

export interface InvestorSummaryForRound {
  investor: Types.ObjectId;
  name: string;
  type: InvestorTypeType;
  commitmentAmount: number;
  receivedAmount: number;
  isLead: boolean;
}

// ============ Investor Types ============

export interface Investor {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  name: string;
  type: InvestorTypeType;
  status: InvestorStatusType;
  email?: string;
  phone?: string;
  company?: string;
  website?: string;
  address?: Address;
  contactPerson?: ContactPerson;
  linkedRound?: Types.ObjectId;
  totalCommitted: number;
  totalInvested: number;
  sharesOwned: number;
  ownershipPercent: number;
  tranches: Tranche[];
  notes?: string;
  tags?: string[];
  documents?: InvestorDocument[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface ContactPerson {
  name: string;
  title?: string;
  email?: string;
  phone?: string;
}

export interface Tranche {
  _id: Types.ObjectId;
  round?: Types.ObjectId;
  amount: number;
  scheduledDate: Date;
  receivedDate?: Date;
  status: TrancheStatusType;
  shareClass?: ShareClassType;
  sharesIssued?: number;
  pricePerShare?: number;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

export interface InvestorDocument {
  name: string;
  type: 'kyc' | 'agreement' | 'consent' | 'other';
  url: string;
  uploadedAt: Date;
}

export interface InvestorPortfolio {
  investor: Investor;
  investments: InvestmentSummary[];
  totalInvested: number;
  currentValue: number;
  unrealizedGain: number;
  returnMultiple: number;
}

export interface InvestmentSummary {
  round: Types.ObjectId;
  roundName: string;
  roundType: RoundTypeType;
  investmentDate: Date;
  investmentAmount: number;
  sharesAcquired: number;
  pricePerShare: number;
  currentShareValue?: number;
  currentValue?: number;
}

// ============ Cap Table Types ============

export interface CapTableEntry {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  shareholder: Types.ObjectId;
  shareholderType: ShareholderTypeType;
  shareholderName: string;
  shareClass: ShareClassType;
  entryType: CapTableEntryTypeType;
  shares: number;
  pricePerShare?: number;
  totalValue?: number;
  percentOwnership: number;
  round?: Types.ObjectId;
  grantId?: Types.ObjectId; // For ESOP exercises
  effectiveDate: Date;
  certificateNumber?: string;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShareClassConfig {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  name: string;
  class: ShareClassType;
  authorizedShares: number;
  issuedShares: number;
  parValue?: number;
  votingRights: number; // votes per share
  liquidationPreference?: number;
  participatingPreferred?: boolean;
  conversionRatio?: number;
  dividendRate?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CapTableSummary {
  organization: Types.ObjectId;
  asOfDate: Date;
  totalAuthorizedShares: number;
  totalIssuedShares: number;
  totalOutstandingShares: number;
  byShareClass: ShareClassSummary[];
  byShareholder: ShareholderSummary[];
  byShareholderType: ShareholderTypeSummary[];
}

export interface ShareClassSummary {
  shareClass: ShareClassType;
  authorizedShares: number;
  issuedShares: number;
  outstandingShares: number;
  percentOfTotal: number;
}

export interface ShareholderSummary {
  shareholderId: Types.ObjectId;
  name: string;
  type: ShareholderTypeType;
  totalShares: number;
  percentOwnership: number;
  byShareClass: { shareClass: ShareClassType; shares: number }[];
}

export interface ShareholderTypeSummary {
  type: ShareholderTypeType;
  holderCount: number;
  totalShares: number;
  percentOwnership: number;
}

export interface WaterfallScenario {
  exitValuation: number;
  distribution: WaterfallDistribution[];
  totalDistributed: number;
}

export interface WaterfallDistribution {
  shareholderId: Types.ObjectId;
  shareholderName: string;
  shareholderType: ShareholderTypeType;
  shares: number;
  percentOwnership: number;
  proceeds: number;
  multiple?: number; // Return multiple for investors
}

export interface RoundSimulation {
  roundName: string;
  investmentAmount: number;
  pricePerShare: number;
  newShares: number;
  preMoneyValuation: number;
  postMoneyValuation: number;
  dilution: DilutionImpact[];
  newCapTable: ShareholderSummary[];
}

export interface DilutionImpact {
  shareholderId: Types.ObjectId;
  shareholderName: string;
  sharesBefore: number;
  sharesAfter: number;
  percentBefore: number;
  percentAfter: number;
  dilutionPercent: number;
}

// ============ ESOP Types ============

export interface ESOPPool {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  name: string;
  totalShares: number;
  allocatedShares: number;
  availableShares: number;
  shareClass: ShareClassType;
  percentOfCompany: number;
  createdFromRound?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ESOPGrant {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  pool: Types.ObjectId;
  grantee: Types.ObjectId; // User or external person
  granteeName: string;
  granteeEmail?: string;
  employeeId?: string;
  department?: string;
  grantType: GrantTypeType;
  status: GrantStatusType;
  totalShares: number;
  vestedShares: number;
  unvestedShares: number;
  exercisedShares: number;
  exercisePrice: number;
  fairMarketValue?: number;
  grantDate: Date;
  vestingSchedule: VestingScheduleTypeType;
  vestingStartDate: Date;
  vestingMonths: number;
  cliffMonths: number;
  vestingEvents: VestingEvent[];
  exerciseEvents: ExerciseEvent[];
  expirationDate?: Date;
  accelerationClause?: AccelerationClause;
  boardApprovalDate?: Date;
  grantAgreementUrl?: string;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface VestingEvent {
  date: Date;
  sharesVested: number;
  cumulativeVested: number;
  percentVested: number;
  isMilestone?: boolean;
  milestoneDescription?: string;
}

export interface ExerciseEvent {
  _id: Types.ObjectId;
  date: Date;
  sharesExercised: number;
  pricePerShare: number;
  totalCost: number;
  paymentMethod?: string;
  capTableEntryId?: Types.ObjectId;
  notes?: string;
}

export interface AccelerationClause {
  singleTrigger?: boolean; // Accelerate on acquisition
  doubleTrigger?: boolean; // Accelerate on acquisition + termination
  accelerationPercent: number; // Percent of unvested that accelerates
}

export interface VestingScheduleDetail {
  grant: ESOPGrant;
  projectedVesting: VestingProjection[];
  totalVested: number;
  totalUnvested: number;
  totalExercised: number;
  totalExercisable: number;
  nextVestingDate?: Date;
  nextVestingAmount?: number;
}

export interface VestingProjection {
  date: Date;
  sharesVesting: number;
  cumulativeVested: number;
  percentVested: number;
}

export interface ESOPSummary {
  pool: ESOPPool;
  totalGrants: number;
  activeGrants: number;
  totalAllocated: number;
  totalVested: number;
  totalExercised: number;
  totalAvailable: number;
  utilizationPercent: number;
  byDepartment: DepartmentESOPSummary[];
  recentGrants: ESOPGrant[];
}

export interface DepartmentESOPSummary {
  department: string;
  grantCount: number;
  totalShares: number;
  vestedShares: number;
  exercisedShares: number;
}

// ============ Common Query Types ============

export interface FundraisingQueryParams {
  status?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
