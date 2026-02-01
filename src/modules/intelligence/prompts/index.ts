/**
 * AI Prompts
 *
 * System prompts and templates for different AI features
 */

// ============ Financial Copilot Prompts ============

export const COPILOT_SYSTEM_PROMPT = `You are a helpful financial assistant for ScaleUp Horizon, a startup financial management platform.
Your role is to help founders and finance teams understand their financial data, make informed decisions, and prepare for investor communications.

Guidelines:
- Be concise and actionable in your responses
- Use proper formatting for numbers and currencies (e.g., $1,234.56)
- When discussing percentages, always clarify what they're relative to
- If calculations are involved, show your work briefly
- If you don't have enough data to answer accurately, clearly state what's missing
- Provide context when discussing metrics (e.g., "Your burn rate of $50K/month is typical for a seed-stage startup")
- Suggest follow-up actions when appropriate

You have access to the following data about the organization:
{{context}}

Today's date is: {{date}}`;

export const COPILOT_QUERY_CLASSIFIER_PROMPT = `Classify the following user query into one of these categories:
- financial_metric: Asking about specific financial numbers or KPIs
- comparison: Comparing two or more time periods, categories, or metrics
- trend_analysis: Asking about patterns or changes over time
- what_if: Hypothetical scenarios or projections
- explanation: Asking to explain a concept, metric, or situation
- recommendation: Asking for advice or suggestions
- general: General questions or conversation

Query: "{{query}}"

Respond with ONLY the category name, nothing else.`;

// ============ Categorization Prompts ============

export const CATEGORIZATION_SYSTEM_PROMPT = `You are a financial transaction categorization expert. Your job is to categorize transactions based on their descriptions.

Available expense categories:
- payroll: Salaries, wages, contractor payments
- benefits: Health insurance, 401k, perks
- software: SaaS subscriptions, software licenses
- cloud_infrastructure: AWS, GCP, Azure, hosting
- marketing: Ads, content, events, PR
- sales: Sales tools, commissions, travel
- office: Rent, utilities, supplies, equipment
- legal: Legal fees, compliance, patents
- professional_services: Accounting, consulting, HR services
- travel: Flights, hotels, meals during travel
- meals_entertainment: Team meals, client entertainment
- equipment: Computers, furniture, hardware
- recruiting: Job boards, recruiting fees, background checks
- other: Anything that doesn't fit above

Available revenue categories:
- subscription: Recurring subscription revenue
- one_time: One-time purchases or fees
- services: Professional services, consulting
- other: Other revenue types

Guidelines:
- Consider the vendor name, transaction description, and amount
- If the category is unclear, choose the most likely option and note low confidence
- For ambiguous cases, provide alternative categories`;

export const CATEGORIZATION_PROMPT = `Categorize the following transaction:

Description: {{description}}
Amount: {{amount}}
{{#if vendor}}Vendor: {{vendor}}{{/if}}
{{#if date}}Date: {{date}}{{/if}}

Respond with JSON in this exact format:
{
  "category": "category_name",
  "subcategory": "optional_subcategory",
  "confidence": "high|medium|low",
  "reasoning": "Brief explanation of why this category was chosen",
  "alternatives": [{"category": "alt_category", "confidence": "medium|low"}]
}`;

export const BULK_CATEGORIZATION_PROMPT = `Categorize the following transactions. For each transaction, determine the most appropriate category.

Transactions:
{{#each transactions}}
{{@index}}. Description: {{this.description}} | Amount: {{this.amount}}{{#if this.vendor}} | Vendor: {{this.vendor}}{{/if}}
{{/each}}

Respond with a JSON array containing one object per transaction:
[
  {
    "index": 0,
    "category": "category_name",
    "subcategory": "optional",
    "confidence": "high|medium|low",
    "reasoning": "brief reason"
  }
]`;

// ============ Document Parser Prompts ============

export const DOCUMENT_TYPE_DETECTION_PROMPT = `Analyze the following document text and determine what type of document it is.

Document types:
- bank_statement: Bank account statements showing transactions
- invoice: Bills or invoices from vendors
- receipt: Purchase receipts
- term_sheet: Investment term sheets
- contract: Legal contracts or agreements
- unknown: Cannot determine

Document text (first 2000 characters):
{{text}}

Respond with JSON:
{
  "documentType": "type_name",
  "confidence": 0.0-1.0,
  "reasoning": "why you think this is the document type"
}`;

export const BANK_STATEMENT_PARSER_PROMPT = `Extract structured data from this bank statement.

Bank Statement Text:
{{text}}

Extract and return JSON with this structure:
{
  "bankName": "name of bank",
  "accountNumber": "last 4 digits only, e.g., ****1234",
  "statementPeriod": {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"},
  "openingBalance": number,
  "closingBalance": number,
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "transaction description",
      "amount": number (positive for deposits, negative for withdrawals),
      "type": "credit|debit",
      "balance": number (running balance if available)
    }
  ]
}

If any field cannot be determined, use null.`;

export const INVOICE_PARSER_PROMPT = `Extract structured data from this invoice.

Invoice Text:
{{text}}

Extract and return JSON with this structure:
{
  "invoiceNumber": "invoice number",
  "invoiceDate": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD",
  "vendor": {
    "name": "vendor name",
    "address": "full address",
    "email": "email if present",
    "taxId": "tax ID if present"
  },
  "lineItems": [
    {
      "description": "item description",
      "quantity": number,
      "unitPrice": number,
      "amount": number
    }
  ],
  "subtotal": number,
  "tax": number,
  "total": number,
  "currency": "USD",
  "paymentTerms": "Net 30, etc."
}

If any field cannot be determined, use null.`;

export const TERM_SHEET_PARSER_PROMPT = `Extract key terms from this investment term sheet.

Term Sheet Text:
{{text}}

Extract and return JSON with this structure:
{
  "roundType": "Seed|Series A|Series B|etc.",
  "investmentAmount": number,
  "preMoneyValuation": number,
  "postMoneyValuation": number,
  "pricePerShare": number,
  "leadInvestor": "investor name",
  "terms": {
    "liquidationPreference": "1x, 2x, etc.",
    "participatingPreferred": true|false,
    "antiDilution": "full ratchet|weighted average|none",
    "boardSeats": number,
    "proRataRights": true|false,
    "vestingSchedule": "4 years, 1 year cliff, etc.",
    "optionPool": "percentage"
  },
  "otherTerms": ["list of other notable terms"]
}

If any field cannot be determined, use null.`;

// ============ Report Generator Prompts ============

export const INVESTOR_UPDATE_PROMPT = `Generate a professional investor update email based on the following data.

Company: {{companyName}}
Period: {{period}}
Tone: {{tone}}

Financial Highlights:
{{financialData}}

Milestones:
{{milestones}}

Key Metrics:
{{metrics}}

Additional Context:
{{customInstructions}}

Generate the update in this structure:
{
  "subject": "email subject line",
  "greeting": "opening greeting",
  "summary": "2-3 sentence executive summary",
  "sections": [
    {
      "title": "section title",
      "content": "section content (2-4 sentences)",
      "metrics": [{"label": "metric name", "value": "value", "change": "+X%", "trend": "up|down|neutral"}]
    }
  ],
  "highlights": ["key wins or achievements"],
  "challenges": ["current challenges or blockers"],
  "askOrCTA": "specific ask or call to action if any",
  "closing": "closing paragraph"
}`;

export const MONTHLY_SUMMARY_PROMPT = `Generate a monthly financial summary for internal review.

Company: {{companyName}}
Month: {{month}}

Financial Data:
{{financialData}}

Generate a summary covering:
1. Revenue performance vs. plan
2. Expense breakdown and notable changes
3. Cash position and runway
4. Key metrics (burn rate, growth rate, etc.)
5. Recommendations or areas of concern

Return the response as a valid JSON object with this structure:
{
  "sections": [
    {
      "title": "section title",
      "content": "section content",
      "metrics": [{"label": "metric name", "value": "value", "change": "+X%", "trend": "up|down|neutral"}]
    }
  ]
}`;

// ============ Meeting Intelligence Prompts ============

export const MEETING_PREP_PROMPT = `Prepare a briefing document for an upcoming investor meeting.

Meeting Details:
- Investor: {{investorName}}
- Firm: {{firmName}}
- Meeting Type: {{meetingType}}
- Date: {{meetingDate}}

Investor Information:
{{investorInfo}}

Previous Interactions:
{{previousMeetings}}

Company Current Status:
{{companyStatus}}

Generate a prep brief and return as a valid JSON object with this structure:
{
  "investorOverview": {
    "name": "investor name",
    "firm": "firm name",
    "role": "their role",
    "background": "relevant background",
    "investmentFocus": ["focus areas"],
    "notableInvestments": ["portfolio companies"]
  },
  "meetingHistory": [{"date": "YYYY-MM-DD", "outcome": "brief outcome", "keyPoints": ["points"]}],
  "suggestedAgenda": ["agenda items"],
  "talkingPoints": ["key points to emphasize"],
  "anticipatedQuestions": [{"question": "likely question", "suggestedAnswer": "suggested response"}],
  "warnings": ["things to be careful about or avoid"]
}`;

export const MEETING_SUMMARY_PROMPT = `Summarize the following meeting notes into a structured format.

Meeting: {{meetingTitle}}
Date: {{meetingDate}}
Attendees: {{attendees}}

Notes:
{{meetingNotes}}

Generate a structured summary and return as a valid JSON object with this structure:
{
  "title": "meeting title",
  "date": "YYYY-MM-DD",
  "duration": "X hours",
  "attendees": ["list of attendees"],
  "executiveSummary": "2-3 sentence summary",
  "keyDiscussions": [
    {
      "topic": "topic discussed",
      "summary": "what was discussed",
      "decisions": ["decisions made if any"]
    }
  ],
  "actionItems": [
    {
      "item": "action item",
      "owner": "person responsible",
      "dueDate": "YYYY-MM-DD or null",
      "priority": "high|medium|low"
    }
  ],
  "nextSteps": ["next steps"],
  "sentiment": "positive|neutral|negative"
}`;

export const FOLLOW_UP_EMAIL_PROMPT = `Generate a follow-up email after an investor meeting.

Meeting Details:
{{meetingDetails}}

Meeting Summary:
{{meetingSummary}}

Action Items:
{{actionItems}}

Tone: {{tone}}

Generate an email and return as a valid JSON object with this structure:
{
  "subject": "email subject",
  "body": "full email body with proper formatting",
  "actionItems": ["action items to highlight"],
  "attachmentSuggestions": ["documents to attach"]
}`;

export const ACTION_ITEMS_EXTRACTION_PROMPT = `Extract action items from the following meeting notes.

Meeting Notes:
{{notes}}

Extract all action items and return as a valid JSON object with this structure:
{
  "actionItems": [
    {
      "item": "specific action to take",
      "owner": "person responsible (or 'unassigned')",
      "dueDate": "date if mentioned, else null",
      "priority": "high|medium|low based on context",
      "context": "brief context from the meeting"
    }
  ]
}`;

// ============ Helper function to replace placeholders ============

export function buildPrompt(
  template: string,
  variables: Record<string, unknown>
): string {
  let result = template;

  // Replace simple variables
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(placeholder, String(value ?? ''));
  }

  // Handle conditional blocks {{#if variable}}...{{/if}}
  const conditionalRegex = /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  result = result.replace(conditionalRegex, (_, varName, content) => {
    return variables[varName] ? content : '';
  });

  // Handle each blocks {{#each array}}...{{/each}}
  const eachRegex = /\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
  result = result.replace(eachRegex, (_, arrayName, template) => {
    const array = variables[arrayName];
    if (!Array.isArray(array)) return '';

    return array
      .map((item, index) => {
        let itemResult = template;
        itemResult = itemResult.replace(/\{\{@index\}\}/g, String(index));
        if (typeof item === 'object' && item !== null) {
          for (const [key, value] of Object.entries(item)) {
            itemResult = itemResult.replace(
              new RegExp(`\\{\\{this\\.${key}\\}\\}`, 'g'),
              String(value ?? '')
            );
          }
        } else {
          itemResult = itemResult.replace(/\{\{this\}\}/g, String(item));
        }
        return itemResult;
      })
      .join('\n');
  });

  return result;
}
