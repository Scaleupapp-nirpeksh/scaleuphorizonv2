/**
 * Intelligence Module Types
 *
 * TypeScript interfaces for AI/ML features
 */

import { Types, Document } from 'mongoose';
import {
  QueryTypeValue,
  CategorizationSourceType,
  CategorizationConfidenceType,
  DocumentTypeValue,
  ParseStatusValue,
  ReportTypeValue,
  ReportToneValue,
  MeetingIntelTypeValue,
  AIModelType,
} from '../constants';

// ============ Core AI Types ============

export interface AIRequest {
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  feature: string;
  input: unknown;
  model?: AIModelType;
}

export interface AIResponse<T = unknown> {
  success: boolean;
  data: T;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  processingTime: number;
}

// ============ Copilot Types ============

export interface CopilotQuery {
  query: string;
  context?: CopilotContext;
  conversationId?: string;
}

export interface CopilotContext {
  includeFinancials?: boolean;
  includeRunway?: boolean;
  includeFundraising?: boolean;
  includeMilestones?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  customContext?: string;
}

export interface CopilotResponse {
  answer: string;
  queryType: QueryTypeValue;
  confidence: number;
  sources?: CopilotSource[];
  suggestions?: string[];
  charts?: ChartData[];
}

export interface CopilotSource {
  type: 'transaction' | 'expense' | 'revenue' | 'milestone' | 'meeting' | 'round' | 'metric';
  id?: string;
  description: string;
  value?: string | number;
}

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  data: Array<{ label: string; value: number }>;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

// ============ Categorization Types ============

export interface CategorizationRequest {
  source: CategorizationSourceType;
  items: CategorizationItem[];
}

export interface CategorizationItem {
  id: string;
  description: string;
  amount: number;
  date?: string;
  vendor?: string;
  additionalContext?: string;
}

export interface CategorizationResult {
  id: string;
  suggestedCategory: string;
  suggestedSubcategory?: string;
  suggestedAccountId?: string;
  confidence: CategorizationConfidenceType;
  reasoning: string;
  alternativeCategories?: Array<{
    category: string;
    confidence: CategorizationConfidenceType;
  }>;
}

export interface CategorizationFeedback {
  itemId: string;
  suggestedCategory: string;
  actualCategory: string;
  wasCorrect: boolean;
}

// ============ Document Parser Types ============

export interface DocumentParseRequest {
  documentType?: DocumentTypeValue;
  fileUrl?: string;
  fileContent?: string;
  fileName: string;
  mimeType: string;
}

export interface ParsedDocument {
  documentType: DocumentTypeValue;
  status: ParseStatusValue;
  extractedData: ExtractedData;
  confidence: number;
  rawText?: string;
  warnings?: string[];
}

export interface ExtractedData {
  // Bank Statement
  bankName?: string;
  accountNumber?: string;
  statementPeriod?: { start: string; end: string };
  openingBalance?: number;
  closingBalance?: number;
  transactions?: ExtractedTransaction[];

  // Invoice
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  vendor?: ExtractedVendor;
  lineItems?: ExtractedLineItem[];
  subtotal?: number;
  tax?: number;
  total?: number;

  // Receipt
  merchant?: string;
  purchaseDate?: string;
  items?: ExtractedLineItem[];
  paymentMethod?: string;

  // Term Sheet
  roundType?: string;
  investmentAmount?: number;
  valuation?: number;
  leadInvestor?: string;
  terms?: Record<string, unknown>;

  // Generic
  metadata?: Record<string, unknown>;
}

export interface ExtractedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  balance?: number;
  category?: string;
}

export interface ExtractedVendor {
  name: string;
  address?: string;
  email?: string;
  phone?: string;
  taxId?: string;
}

export interface ExtractedLineItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  amount: number;
  category?: string;
}

// ============ Report Generator Types ============

export interface ReportGenerationRequest {
  reportType: ReportTypeValue;
  period?: {
    start: string;
    end: string;
  };
  tone?: ReportToneValue;
  includeMetrics?: string[];
  customInstructions?: string;
  recipientType?: 'investor' | 'board' | 'team' | 'general';
}

export interface GeneratedReport {
  reportType: ReportTypeValue;
  title: string;
  subject?: string;
  content: ReportContent;
  metadata: ReportMetadata;
}

export interface ReportContent {
  greeting?: string;
  summary: string;
  sections: ReportSection[];
  highlights?: string[];
  challenges?: string[];
  askOrCTA?: string;
  closing?: string;
}

export interface ReportSection {
  title: string;
  content: string;
  metrics?: Array<{
    label: string;
    value: string | number;
    change?: string;
    trend?: 'up' | 'down' | 'neutral';
  }>;
}

export interface ReportMetadata {
  generatedAt: string;
  period: { start: string; end: string };
  dataPoints: number;
  model: string;
}

// ============ Meeting Intelligence Types ============

export interface MeetingIntelRequest {
  type: MeetingIntelTypeValue;
  meetingId?: string;
  investorId?: string;
  meetingNotes?: string;
  additionalContext?: string;
}

export interface MeetingPrepBrief {
  investorOverview: {
    name: string;
    firm?: string;
    role?: string;
    background?: string;
    investmentFocus?: string[];
    notableInvestments?: string[];
  };
  meetingHistory?: Array<{
    date: string;
    outcome: string;
    keyPoints: string[];
  }>;
  suggestedAgenda: string[];
  talkingPoints: string[];
  anticipatedQuestions: Array<{
    question: string;
    suggestedAnswer: string;
  }>;
  warnings?: string[];
}

export interface MeetingSummary {
  title: string;
  date: string;
  duration?: string;
  attendees: string[];
  executiveSummary: string;
  keyDiscussions: Array<{
    topic: string;
    summary: string;
    decisions?: string[];
  }>;
  actionItems: Array<{
    item: string;
    owner?: string;
    dueDate?: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  nextSteps: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface FollowUpEmail {
  subject: string;
  body: string;
  actionItems?: string[];
  attachmentSuggestions?: string[];
}

// ============ Query History Types ============

export interface IAIQueryData {
  organization: Types.ObjectId;
  user: Types.ObjectId;
  feature: string;
  queryType?: string;
  input: string;
  response: string;
  model: string;
  tokensUsed: number;
  processingTimeMs: number;
  feedback?: {
    rating?: number;
    comment?: string;
    wasHelpful?: boolean;
  };
  conversationId?: string;
  createdAt: Date;
}

export type IAIQuery = Document & IAIQueryData;

export interface IAIFeedbackData {
  organization: Types.ObjectId;
  user: Types.ObjectId;
  feature: string;
  referenceId: string;
  referenceType: string;
  suggestedValue: string;
  actualValue: string;
  wasCorrect: boolean;
  createdAt: Date;
}

export type IAIFeedback = Document & IAIFeedbackData;

// ============ Financial Context Types ============

export interface FinancialContext {
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    burnRate: number;
    runway: number;
    cashBalance: number;
  };
  period: {
    start: string;
    end: string;
  };
  trends?: {
    revenueGrowth: number;
    expenseGrowth: number;
    burnRateChange: number;
  };
  topExpenseCategories?: Array<{
    category: string;
    amount: number;
    percentOfTotal: number;
  }>;
  revenueByStream?: Array<{
    stream: string;
    amount: number;
    percentOfTotal: number;
  }>;
  fundraising?: {
    activeRound?: {
      name: string;
      targetAmount: number;
      raisedAmount: number;
      percentRaised: number;
    };
    totalRaised: number;
    investorCount: number;
  };
  milestones?: {
    total: number;
    completed: number;
    inProgress: number;
    atRisk: number;
  };
}
