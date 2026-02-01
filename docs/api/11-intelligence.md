# Intelligence Module - Frontend Integration Guide

## Overview

The Intelligence Module provides AI-powered features for financial analysis, document parsing, report generation, and meeting intelligence. All features are powered by OpenAI's GPT-4o/GPT-4o-mini models.

## Base URL

```
/api/v1/intelligence
```

## Authentication

All endpoints require Bearer token in Authorization header:
```
Authorization: Bearer <access_token>
X-Organization-Id: <organization_id>
```

---

## Status & Configuration

### Get AI Status

Check if AI features are configured and available.

- **Method:** `GET`
- **Path:** `/status`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "isConfigured": true,
    "availableModels": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
    "defaultModel": "gpt-4o-mini",
    "features": {
      "copilot": true,
      "categorization": true,
      "documentParser": true,
      "reportGenerator": true,
      "meetingIntel": true
    }
  }
}
```

### Get AI Usage Stats

Get usage statistics for AI features.

- **Method:** `GET`
- **Path:** `/stats`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalQueries": 150,
    "queriesByFeature": {
      "copilot": 50,
      "categorization": 40,
      "document_parser": 20,
      "report_generator": 25,
      "meeting_intel": 15
    },
    "totalTokensUsed": 125000,
    "avgProcessingTime": 2500,
    "categorizationAccuracy": 0.92
  }
}
```

---

## Financial Copilot

AI-powered financial assistant for natural language queries about your data.

### Query Copilot

- **Method:** `POST`
- **Path:** `/copilot/query`

**Request Body:**
```typescript
interface CopilotQueryRequest {
  query: string;                    // Natural language question (max 2000 chars)
  conversationId?: string;          // For multi-turn conversations
  context?: {
    dateRange?: {
      start: string;                // ISO date
      end: string;                  // ISO date
    };
    includeFundraising?: boolean;   // Include fundraising data (default: true)
    includeMilestones?: boolean;    // Include milestones (default: true)
  };
}
```

**Example Request:**
```json
{
  "query": "What is my current runway and how does it compare to last month?",
  "context": {
    "dateRange": {
      "start": "2026-01-01",
      "end": "2026-01-31"
    }
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "answer": "Your current runway is 18.5 months based on your monthly burn rate of $27,000. This is an improvement from last month when your runway was 16.2 months...",
    "queryType": "financial_metric",
    "confidence": 0.85,
    "sources": [
      {
        "type": "metric",
        "description": "Total Revenue",
        "value": "$45,000"
      },
      {
        "type": "metric",
        "description": "Monthly Burn Rate",
        "value": "$27,000"
      },
      {
        "type": "metric",
        "description": "Runway",
        "value": "18.5 months"
      }
    ],
    "suggestions": [
      "How can we extend our runway?",
      "What are our biggest expense categories?",
      "What is our fundraising status?"
    ]
  }
}
```

**Query Types:**
| Type | Description |
|------|-------------|
| `financial_metric` | Questions about specific numbers or KPIs |
| `comparison` | Comparing time periods or metrics |
| `trend_analysis` | Patterns or changes over time |
| `what_if` | Hypothetical scenarios |
| `explanation` | Explaining concepts or situations |
| `recommendation` | Advice or suggestions |
| `general` | General questions |

### Get Query History

- **Method:** `GET`
- **Path:** `/copilot/history`
- **Query Params:** `limit` (default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "query": "What is my burn rate?",
      "response": "Your current monthly burn rate is $27,000...",
      "createdAt": "2026-01-15T10:30:00Z"
    }
  ]
}
```

### Submit Feedback

- **Method:** `POST`
- **Path:** `/copilot/feedback`

**Request Body:**
```json
{
  "queryId": "507f1f77bcf86cd799439011",
  "rating": 5,
  "comment": "Very helpful!",
  "wasHelpful": true
}
```

### Clear Conversation

- **Method:** `DELETE`
- **Path:** `/copilot/conversation/:conversationId`

---

## Smart Categorization

AI-powered transaction categorization.

### Categorize Single Transaction

- **Method:** `POST`
- **Path:** `/categorize`

**Request Body:**
```typescript
interface CategorizationItem {
  id: string;                 // Transaction ID
  description: string;        // Transaction description
  amount: number;             // Transaction amount
  vendor?: string;            // Vendor name
  date?: string;              // Transaction date (ISO)
}
```

**Example Request:**
```json
{
  "id": "txn_123",
  "description": "AWS monthly hosting bill",
  "amount": 450.00,
  "vendor": "Amazon Web Services",
  "date": "2026-01-15"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "txn_123",
    "suggestedCategory": "cloud_infrastructure",
    "suggestedSubcategory": "hosting",
    "suggestedAccountId": "507f1f77bcf86cd799439011",
    "confidence": "high",
    "reasoning": "AWS is a cloud infrastructure provider, and the description indicates hosting services.",
    "alternativeCategories": [
      {
        "category": "software",
        "confidence": "medium"
      }
    ]
  }
}
```

**Available Categories:**

| Category | Description |
|----------|-------------|
| `payroll` | Salaries, wages, contractor payments |
| `benefits` | Health insurance, 401k, perks |
| `software` | SaaS subscriptions, software licenses |
| `cloud_infrastructure` | AWS, GCP, Azure, hosting |
| `marketing` | Ads, content, events, PR |
| `sales` | Sales tools, commissions, travel |
| `office` | Rent, utilities, supplies, equipment |
| `legal` | Legal fees, compliance, patents |
| `professional_services` | Accounting, consulting |
| `travel` | Flights, hotels, meals during travel |
| `meals_entertainment` | Team meals, client entertainment |
| `equipment` | Computers, furniture, hardware |
| `recruiting` | Job boards, recruiting fees |
| `other` | Anything that doesn't fit above |

### Bulk Categorization

- **Method:** `POST`
- **Path:** `/categorize/bulk`

**Request Body:**
```json
{
  "source": "bank_import",
  "items": [
    {
      "id": "txn_1",
      "description": "Stripe payment processing",
      "amount": 125.50
    },
    {
      "id": "txn_2",
      "description": "WeWork office rent",
      "amount": 2500.00
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "txn_1",
      "suggestedCategory": "software",
      "confidence": "high",
      "reasoning": "Stripe is a payment processing platform"
    },
    {
      "id": "txn_2",
      "suggestedCategory": "office",
      "suggestedSubcategory": "rent",
      "confidence": "high",
      "reasoning": "WeWork provides office space"
    }
  ]
}
```

### Get Suggestions (Autocomplete)

- **Method:** `GET`
- **Path:** `/categorize/suggestions`
- **Query Params:** `description` (partial description)

### Submit Categorization Feedback

- **Method:** `POST`
- **Path:** `/categorize/feedback`

**Request Body:**
```json
{
  "itemId": "txn_123",
  "suggestedCategory": "software",
  "actualCategory": "cloud_infrastructure",
  "wasCorrect": false
}
```

### Get Categorization Accuracy

- **Method:** `GET`
- **Path:** `/categorize/accuracy`

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 500,
    "correct": 460,
    "accuracy": 0.92,
    "byCategory": [
      {
        "category": "software",
        "total": 100,
        "correct": 95,
        "accuracy": 0.95
      }
    ]
  }
}
```

---

## Document Parser

AI-powered document parsing and data extraction.

### Parse Document

- **Method:** `POST`
- **Path:** `/documents/parse`

**Request Body:**
```typescript
interface DocumentParseRequest {
  documentType: 'bank_statement' | 'invoice' | 'receipt' | 'term_sheet' | 'contract';
  fileName: string;
  mimeType: string;
  fileContent?: string;       // Base64 or text content
  fileUrl?: string;           // URL to fetch document
}
```

**Example Request (Invoice):**
```json
{
  "documentType": "invoice",
  "fileName": "invoice-12345.txt",
  "mimeType": "text/plain",
  "fileContent": "INVOICE #12345\nDate: January 15, 2026\nFrom: Acme Corp\nTo: My Company\n\nItem: Cloud Services\nAmount: $1,250.00\n\nTotal Due: $1,250.00\nDue Date: February 15, 2026"
}
```

**Response (Invoice):**
```json
{
  "success": true,
  "data": {
    "documentType": "invoice",
    "status": "completed",
    "extractedData": {
      "invoiceNumber": "12345",
      "invoiceDate": "2026-01-15",
      "dueDate": "2026-02-15",
      "vendor": {
        "name": "Acme Corp",
        "address": null,
        "email": null,
        "taxId": null
      },
      "lineItems": [
        {
          "description": "Cloud Services",
          "quantity": 1,
          "unitPrice": 1250,
          "amount": 1250
        }
      ],
      "subtotal": 1250,
      "tax": 0,
      "total": 1250
    },
    "confidence": 0.85,
    "rawText": "INVOICE #12345..."
  }
}
```

**Document Type Schemas:**

#### Bank Statement
```typescript
{
  bankName: string;
  accountNumber: string;          // Last 4 digits
  statementPeriod: {
    start: string;
    end: string;
  };
  openingBalance: number;
  closingBalance: number;
  transactions: Array<{
    date: string;
    description: string;
    amount: number;               // Positive = credit, Negative = debit
    type: 'credit' | 'debit';
    balance?: number;
  }>;
}
```

#### Term Sheet
```typescript
{
  roundType: string;              // "Seed", "Series A", etc.
  investmentAmount: number;
  preMoneyValuation: number;
  postMoneyValuation: number;
  pricePerShare: number;
  leadInvestor: string;
  terms: {
    liquidationPreference: string;
    participatingPreferred: boolean;
    antiDilution: string;
    boardSeats: number;
    proRataRights: boolean;
    vestingSchedule: string;
    optionPool: string;
  };
  otherTerms: string[];
}
```

### Detect Document Type

- **Method:** `POST`
- **Path:** `/documents/detect-type`

**Request Body:**
```json
{
  "content": "First 2000 characters of document..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "documentType": "invoice",
    "confidence": 0.92,
    "reasoning": "Document contains invoice number, line items, and total amount"
  }
}
```

### Get Supported Document Types

- **Method:** `GET`
- **Path:** `/documents/types`

**Response:**
```json
{
  "success": true,
  "data": ["bank_statement", "invoice", "receipt", "term_sheet", "contract", "unknown"]
}
```

---

## Report Generator

AI-powered financial report generation.

### Generate Report

- **Method:** `POST`
- **Path:** `/reports/generate`

**Request Body:**
```typescript
interface ReportGenerationRequest {
  reportType: 'investor_update' | 'monthly_summary' | 'quarterly_summary' |
              'financial_highlights' | 'milestone_update' | 'fundraising_status' | 'custom';
  period: {
    start: string;              // ISO date
    end: string;                // ISO date
  };
  format?: 'markdown' | 'html' | 'json';
  tone?: 'professional' | 'casual' | 'formal' | 'optimistic' | 'conservative';
  customInstructions?: string;
  includeMetrics?: string[];
}
```

**Example Request:**
```json
{
  "reportType": "investor_update",
  "period": {
    "start": "2026-01-01",
    "end": "2026-01-31"
  },
  "tone": "professional",
  "format": "markdown"
}
```

**Response (Investor Update):**
```json
{
  "success": true,
  "data": {
    "reportType": "investor_update",
    "title": "January 2026 Investor Update",
    "content": {
      "subject": "January 2026 Update - Strong Growth Continues",
      "greeting": "Dear Investors,",
      "summary": "January was a strong month for the company with 25% MoM revenue growth...",
      "sections": [
        {
          "title": "Financial Performance",
          "content": "Revenue reached $150K, up 25% from December...",
          "metrics": [
            {
              "label": "MRR",
              "value": "$150,000",
              "change": "+25%",
              "trend": "up"
            },
            {
              "label": "Burn Rate",
              "value": "$45,000",
              "change": "-5%",
              "trend": "down"
            }
          ]
        }
      ],
      "highlights": [
        "Closed 3 enterprise deals",
        "Launched new product feature"
      ],
      "challenges": [
        "Hiring for senior engineering roles"
      ],
      "askOrCTA": "Please share any introductions to potential enterprise customers.",
      "closing": "Thank you for your continued support."
    },
    "metadata": {
      "generatedAt": "2026-02-01T10:00:00Z",
      "period": {
        "start": "2026-01-01T00:00:00Z",
        "end": "2026-01-31T00:00:00Z"
      },
      "dataPoints": 150,
      "model": "gpt-4o-mini"
    }
  }
}
```

### Get Report Types

- **Method:** `GET`
- **Path:** `/reports/types`

**Response:**
```json
{
  "success": true,
  "data": {
    "types": [
      "investor_update",
      "monthly_summary",
      "quarterly_summary",
      "financial_highlights",
      "milestone_update",
      "fundraising_status",
      "custom"
    ],
    "tones": [
      "professional",
      "casual",
      "formal",
      "optimistic",
      "conservative"
    ]
  }
}
```

---

## Meeting Intelligence

AI-powered meeting preparation and summarization.

### Generate Meeting Prep Brief

- **Method:** `GET`
- **Path:** `/meetings/:meetingId/prep`

**Response:**
```json
{
  "success": true,
  "data": {
    "investorOverview": {
      "name": "John Smith",
      "firm": "Sequoia Capital",
      "role": "Partner",
      "background": "Former founder, 15 years in venture capital",
      "investmentFocus": ["SaaS", "Fintech", "AI"],
      "notableInvestments": ["Stripe", "Airbnb", "DoorDash"]
    },
    "meetingHistory": [
      {
        "date": "2025-12-15",
        "outcome": "Initial intro - positive",
        "keyPoints": ["Interested in our growth metrics", "Asked about competition"]
      }
    ],
    "suggestedAgenda": [
      "Company update since last meeting",
      "Q4 financial performance",
      "Product roadmap for 2026",
      "Fundraising timeline"
    ],
    "talkingPoints": [
      "Highlight 150% YoY revenue growth",
      "Emphasize strong unit economics",
      "Discuss expansion into new markets"
    ],
    "anticipatedQuestions": [
      {
        "question": "What's your path to profitability?",
        "suggestedAnswer": "We expect to reach cash flow positive by Q3 2027..."
      }
    ],
    "warnings": [
      "Avoid discussing valuation expectations too early"
    ]
  }
}
```

### Generate Meeting Summary

- **Method:** `POST`
- **Path:** `/meetings/summary`

**Request Body:**
```typescript
interface MeetingSummaryRequest {
  meetingNotes: string;         // Raw meeting notes or transcript
  meetingTitle?: string;
  meetingDate?: string;
  attendees?: string[];
}
```

**Example Request:**
```json
{
  "meetingNotes": "John: Welcome everyone. Today we'll discuss Q1 planning...\nSarah: We've had positive conversations with Sequoia...",
  "meetingTitle": "Q1 Planning Meeting",
  "attendees": ["John", "Sarah", "Mike"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "title": "Q1 Planning Meeting",
    "date": "2026-02-01",
    "duration": "1 hour",
    "attendees": ["John", "Sarah", "Mike"],
    "executiveSummary": "The team discussed fundraising progress and next steps for Q1. Positive momentum with VCs.",
    "keyDiscussions": [
      {
        "topic": "Fundraising Progress",
        "summary": "Sarah reported positive conversations with Sequoia, a16z, and Tiger Global.",
        "decisions": []
      }
    ],
    "actionItems": [
      {
        "item": "Prepare data room",
        "owner": "Sarah",
        "dueDate": "2026-02-28",
        "priority": "high"
      },
      {
        "item": "Create financial projections",
        "owner": "Mike",
        "dueDate": "2026-02-15",
        "priority": "high"
      }
    ],
    "nextSteps": [
      "Schedule partner meetings",
      "Complete data room by end of February"
    ],
    "sentiment": "positive"
  }
}
```

### Extract Action Items

- **Method:** `POST`
- **Path:** `/meetings/action-items`

**Request Body:**
```json
{
  "notes": "Meeting notes with action items..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "actionItems": [
      {
        "item": "Send financial projections to investor",
        "owner": "Mike",
        "dueDate": "2026-02-10",
        "priority": "high",
        "context": "Discussed during fundraising update section"
      }
    ]
  }
}
```

### Generate Follow-Up Email

- **Method:** `POST`
- **Path:** `/meetings/follow-up-email`

**Request Body:**
```typescript
interface FollowUpEmailRequest {
  meetingDetails: string;       // Brief meeting context
  meetingSummary: string;       // Meeting summary
  actionItems: string[];        // Action items to include
  tone?: string;                // Email tone
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "subject": "Follow-up: Q1 Planning Meeting - Action Items",
    "body": "Dear Team,\n\nThank you for the productive meeting today...",
    "actionItems": [
      "Sarah to prepare data room by Feb 28",
      "Mike to complete financial projections by Feb 15"
    ],
    "attachmentSuggestions": [
      "Meeting notes PDF",
      "Financial projections spreadsheet"
    ]
  }
}
```

### Research Investor

- **Method:** `GET`
- **Path:** `/investors/:investorId/research`

**Response:**
```json
{
  "success": true,
  "data": {
    "investor": {
      "name": "John Smith",
      "firm": "Sequoia Capital"
    },
    "research": {
      "background": "Partner at Sequoia since 2015...",
      "investmentThesis": "Focus on enterprise SaaS...",
      "recentInvestments": ["Company A", "Company B"],
      "mediaAppearances": ["TechCrunch interview about AI"],
      "socialPresence": {
        "twitter": "@johnsmith",
        "linkedin": "linkedin.com/in/johnsmith"
      }
    },
    "recommendations": [
      "Emphasize enterprise sales motion",
      "Prepare AI/ML roadmap discussion"
    ]
  }
}
```

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | User lacks permission |
| `BAD_REQUEST` | 400 | Invalid request parameters |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `NOT_FOUND` | 404 | Resource not found |
| `AI_NOT_CONFIGURED` | 503 | OpenAI API key not set |
| `RATE_LIMIT` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limits

| Feature | Requests/Min | Tokens/Day |
|---------|-------------|------------|
| Copilot | 30 | 100,000 |
| Categorization | 60 | 50,000 |
| Document Parser | 10 | 200,000 |
| Report Generator | 10 | 100,000 |
| Meeting Intel | 20 | 75,000 |

---

## TypeScript Types

```typescript
// Copilot
interface CopilotQuery {
  query: string;
  conversationId?: string;
  context?: CopilotContext;
}

interface CopilotResponse {
  answer: string;
  queryType: QueryType;
  confidence: number;
  sources: CopilotSource[];
  suggestions: string[];
}

type QueryType =
  | 'financial_metric'
  | 'comparison'
  | 'trend_analysis'
  | 'what_if'
  | 'explanation'
  | 'recommendation'
  | 'general';

// Categorization
interface CategorizationResult {
  id: string;
  suggestedCategory: string;
  suggestedSubcategory?: string;
  suggestedAccountId?: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  alternativeCategories?: Array<{
    category: string;
    confidence: 'high' | 'medium' | 'low';
  }>;
}

// Document Parser
interface DocumentParseResult {
  documentType: DocumentType;
  status: 'completed' | 'partial' | 'failed';
  extractedData: Record<string, unknown>;
  confidence: number;
  rawText: string;
}

type DocumentType =
  | 'bank_statement'
  | 'invoice'
  | 'receipt'
  | 'term_sheet'
  | 'contract'
  | 'unknown';

// Reports
interface GeneratedReport {
  reportType: ReportType;
  title: string;
  content: ReportContent;
  metadata: {
    generatedAt: string;
    period: { start: string; end: string };
    dataPoints: number;
    model: string;
  };
}

type ReportType =
  | 'investor_update'
  | 'monthly_summary'
  | 'quarterly_summary'
  | 'financial_highlights'
  | 'milestone_update'
  | 'fundraising_status'
  | 'custom';

// Meeting Intelligence
interface MeetingSummary {
  title: string;
  date: string;
  duration: string;
  attendees: string[];
  executiveSummary: string;
  keyDiscussions: Array<{
    topic: string;
    summary: string;
    decisions: string[];
  }>;
  actionItems: ActionItem[];
  nextSteps: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

interface ActionItem {
  item: string;
  owner: string;
  dueDate: string | null;
  priority: 'high' | 'medium' | 'low';
  context?: string;
}
```

---

## UI Components Needed

1. **CopilotChat** - Chat interface for natural language queries
2. **CopilotSuggestions** - Quick suggestion chips
3. **CategorizationReview** - Review and approve AI categorizations
4. **DocumentUploader** - Upload and parse documents
5. **ReportGenerator** - Report type selection and generation
6. **ReportPreview** - Preview generated reports
7. **MeetingPrepCard** - Display meeting prep briefs
8. **MeetingSummaryView** - Display meeting summaries
9. **ActionItemsList** - Display extracted action items
10. **AIStatusBadge** - Show AI configuration status

---

## State Management Suggestions

```typescript
// Redux slice example
interface IntelligenceState {
  // Copilot
  copilotMessages: CopilotMessage[];
  currentConversationId: string | null;
  isQuerying: boolean;

  // Categorization
  pendingCategorizations: CategorizationResult[];
  categorizationAccuracy: number;

  // Documents
  parsedDocuments: DocumentParseResult[];
  isParsingDocument: boolean;

  // Reports
  generatedReports: GeneratedReport[];
  isGeneratingReport: boolean;

  // Meetings
  meetingPreps: MeetingPrepBrief[];
  meetingSummaries: MeetingSummary[];

  // Status
  aiStatus: AIStatus | null;
  error: string | null;
}

// React Query example
const useCopilotQuery = () => useMutation(queryCopilot);
const useCategorizeBulk = () => useMutation(categorizeBulk);
const useParseDocument = () => useMutation(parseDocument);
const useGenerateReport = () => useMutation(generateReport);
const useMeetingSummary = () => useMutation(generateMeetingSummary);
```

---

## Integration with Other Modules

| Module | Integration |
|--------|-------------|
| **Chart of Accounts** | Categorization maps to CoA accounts |
| **Tracking** | Expenses/Revenue provide data for context |
| **Fundraising** | Investor data for meeting prep |
| **Operations** | Milestones for reports |
| **Reporting** | AI-generated content for reports |
