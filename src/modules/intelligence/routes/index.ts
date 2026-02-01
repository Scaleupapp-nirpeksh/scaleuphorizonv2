/**
 * Intelligence Module Routes
 *
 * Express routes for AI/ML features
 */

import { Router } from 'express';
import { protect, requireOrganization } from '@/core/middleware/auth.middleware';
import { validateBody } from '@/core/middleware/validate.middleware';
import { registry } from '@/config/swagger.config';
import {
  // Copilot
  queryCopilot,
  getCopilotHistory,
  submitCopilotFeedback,
  clearCopilotConversation,
  // Categorization
  categorizeTransaction,
  categorizeBulk,
  getCategorizationSuggestions,
  submitCategorizationFeedback,
  getCategorizationAccuracy,
  // Document Parser
  parseDocument,
  detectDocumentType,
  getSupportedDocumentTypes,
  // Report Generator
  generateReport,
  getReportTypes,
  // Meeting Intelligence
  generateMeetingPrepBrief,
  generateMeetingSummary,
  extractActionItems,
  generateFollowUpEmail,
  researchInvestor,
  // Stats
  getAIStats,
  getAIStatus,
} from '../controllers';
import {
  copilotQuerySchema,
  copilotFeedbackSchema,
  copilotResponseSchema,
  categorizationItemSchema,
  categorizationRequestSchema,
  categorizationFeedbackSchema,
  documentParseRequestSchema,
  reportGenerationRequestSchema,
  meetingSummaryRequestSchema,
  followUpEmailRequestSchema,
  actionItemsRequestSchema,
} from '../schemas';

const router = Router();

// Apply middleware to all routes
router.use(protect);
router.use(requireOrganization);

// ============ OpenAPI Documentation ============

// Copilot
registry.registerPath({
  method: 'post',
  path: '/api/v1/intelligence/copilot/query',
  tags: ['Intelligence - Copilot'],
  summary: 'Ask the AI copilot a question',
  description: 'Natural language query about your financial data',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: copilotQuerySchema } } },
  },
  responses: {
    200: {
      description: 'Query response',
      content: { 'application/json': { schema: copilotResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/intelligence/copilot/history',
  tags: ['Intelligence - Copilot'],
  summary: 'Get query history',
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'Query history' },
  },
});

// Categorization
registry.registerPath({
  method: 'post',
  path: '/api/v1/intelligence/categorize',
  tags: ['Intelligence - Categorization'],
  summary: 'Categorize a single transaction',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: categorizationItemSchema } } },
  },
  responses: {
    200: { description: 'Categorization result' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/intelligence/categorize/bulk',
  tags: ['Intelligence - Categorization'],
  summary: 'Categorize multiple transactions',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: categorizationRequestSchema } } },
  },
  responses: {
    200: { description: 'Categorization results' },
  },
});

// Document Parser
registry.registerPath({
  method: 'post',
  path: '/api/v1/intelligence/documents/parse',
  tags: ['Intelligence - Document Parser'],
  summary: 'Parse a document and extract data',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: documentParseRequestSchema } } },
  },
  responses: {
    200: { description: 'Parsed document data' },
  },
});

// Report Generator
registry.registerPath({
  method: 'post',
  path: '/api/v1/intelligence/reports/generate',
  tags: ['Intelligence - Reports'],
  summary: 'Generate a report',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: reportGenerationRequestSchema } } },
  },
  responses: {
    200: { description: 'Generated report' },
  },
});

// Meeting Intelligence
registry.registerPath({
  method: 'get',
  path: '/api/v1/intelligence/meetings/{meetingId}/prep',
  tags: ['Intelligence - Meetings'],
  summary: 'Generate meeting preparation brief',
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'Meeting prep brief' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/intelligence/meetings/summary',
  tags: ['Intelligence - Meetings'],
  summary: 'Generate meeting summary from notes',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: meetingSummaryRequestSchema } } },
  },
  responses: {
    200: { description: 'Meeting summary' },
  },
});

// ============ Route Definitions ============

// Status & Stats
router.get('/status', getAIStatus);
router.get('/stats', getAIStats);

// Copilot Routes
router.post('/copilot/query', validateBody(copilotQuerySchema), queryCopilot);
router.get('/copilot/history', getCopilotHistory);
router.post('/copilot/feedback', validateBody(copilotFeedbackSchema), submitCopilotFeedback);
router.delete('/copilot/conversation/:conversationId', clearCopilotConversation);

// Categorization Routes
router.post('/categorize', validateBody(categorizationItemSchema), categorizeTransaction);
router.post('/categorize/bulk', validateBody(categorizationRequestSchema), categorizeBulk);
router.get('/categorize/suggestions', getCategorizationSuggestions);
router.post('/categorize/feedback', validateBody(categorizationFeedbackSchema), submitCategorizationFeedback);
router.get('/categorize/accuracy', getCategorizationAccuracy);

// Document Parser Routes
router.post('/documents/parse', validateBody(documentParseRequestSchema), parseDocument);
router.post('/documents/detect-type', detectDocumentType);
router.get('/documents/types', getSupportedDocumentTypes);

// Report Generator Routes
router.post('/reports/generate', validateBody(reportGenerationRequestSchema), generateReport);
router.get('/reports/types', getReportTypes);

// Meeting Intelligence Routes
router.get('/meetings/:meetingId/prep', generateMeetingPrepBrief);
router.post('/meetings/summary', validateBody(meetingSummaryRequestSchema), generateMeetingSummary);
router.post('/meetings/action-items', validateBody(actionItemsRequestSchema), extractActionItems);
router.post('/meetings/follow-up-email', validateBody(followUpEmailRequestSchema), generateFollowUpEmail);
router.get('/investors/:investorId/research', researchInvestor);

export default router;
