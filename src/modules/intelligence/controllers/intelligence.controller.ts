/**
 * Intelligence Controller
 *
 * HTTP handlers for AI/ML features
 */

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import {
  copilotService,
  categorizationService,
  documentParserService,
  reportGeneratorService,
  meetingIntelService,
  openaiService,
} from '../services';
import { AIQuery } from '../models';
import { HttpStatus } from '@/core/constants';
import { asyncHandler } from '@/core/utils';

// ============ Copilot Controllers ============

export const queryCopilot = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = new Types.ObjectId(req.organizationContext!.organizationId);
  const userId = new Types.ObjectId(req.user!.id);

  const response = await copilotService.query(organizationId, userId, req.body);

  res.status(HttpStatus.OK).json({
    success: true,
    data: {
      ...response,
      conversationId: req.body.conversationId,
    },
    message: 'Query processed successfully',
  });
});

export const getCopilotHistory = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = new Types.ObjectId(req.organizationContext!.organizationId);
  const userId = new Types.ObjectId(req.user!.id);
  const limit = parseInt(req.query.limit as string) || 20;

  const history = await copilotService.getQueryHistory(organizationId, userId, limit);

  res.status(HttpStatus.OK).json({
    success: true,
    data: history,
  });
});

export const submitCopilotFeedback = asyncHandler(async (req: Request, res: Response) => {
  const { queryId, rating, comment, wasHelpful } = req.body;

  await copilotService.submitFeedback(queryId, { rating, comment, wasHelpful });

  res.status(HttpStatus.OK).json({
    success: true,
    message: 'Feedback submitted successfully',
  });
});

export const clearCopilotConversation = asyncHandler(async (req: Request, res: Response) => {
  const { conversationId } = req.params;

  copilotService.clearConversation(conversationId);

  res.status(HttpStatus.OK).json({
    success: true,
    message: 'Conversation cleared',
  });
});

// ============ Categorization Controllers ============

export const categorizeTransaction = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = new Types.ObjectId(req.organizationContext!.organizationId);
  const userId = new Types.ObjectId(req.user!.id);

  const result = await categorizationService.categorize(
    organizationId,
    userId,
    req.body
  );

  res.status(HttpStatus.OK).json({
    success: true,
    data: result,
  });
});

export const categorizeBulk = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = new Types.ObjectId(req.organizationContext!.organizationId);
  const userId = new Types.ObjectId(req.user!.id);

  const results = await categorizationService.categorizeBulk(
    organizationId,
    userId,
    req.body
  );

  res.status(HttpStatus.OK).json({
    success: true,
    data: results,
  });
});

export const getCategorizationSuggestions = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = new Types.ObjectId(req.organizationContext!.organizationId);
  const { description } = req.query;

  const suggestions = await categorizationService.getSuggestions(
    organizationId,
    description as string
  );

  res.status(HttpStatus.OK).json({
    success: true,
    data: suggestions,
  });
});

export const submitCategorizationFeedback = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = new Types.ObjectId(req.organizationContext!.organizationId);
  const userId = new Types.ObjectId(req.user!.id);

  await categorizationService.submitFeedback(organizationId, userId, req.body);

  res.status(HttpStatus.OK).json({
    success: true,
    message: 'Feedback submitted successfully',
  });
});

export const getCategorizationAccuracy = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = new Types.ObjectId(req.organizationContext!.organizationId);

  const stats = await categorizationService.getAccuracyStats(organizationId);

  res.status(HttpStatus.OK).json({
    success: true,
    data: stats,
  });
});

// ============ Document Parser Controllers ============

export const parseDocument = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = new Types.ObjectId(req.organizationContext!.organizationId);
  const userId = new Types.ObjectId(req.user!.id);

  const result = await documentParserService.parseDocument(
    organizationId,
    userId,
    req.body
  );

  res.status(HttpStatus.OK).json({
    success: true,
    data: result,
  });
});

export const detectDocumentType = asyncHandler(async (req: Request, res: Response) => {
  const { text } = req.body;

  const result = await documentParserService.detectDocumentType(text);

  res.status(HttpStatus.OK).json({
    success: true,
    data: result,
  });
});

export const getSupportedDocumentTypes = asyncHandler(async (_req: Request, res: Response) => {
  const types = documentParserService.getSupportedTypes();

  res.status(HttpStatus.OK).json({
    success: true,
    data: types,
  });
});

// ============ Report Generator Controllers ============

export const generateReport = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = new Types.ObjectId(req.organizationContext!.organizationId);
  const userId = new Types.ObjectId(req.user!.id);

  const report = await reportGeneratorService.generateReport(
    organizationId,
    userId,
    req.body
  );

  res.status(HttpStatus.OK).json({
    success: true,
    data: report,
  });
});

export const getReportTypes = asyncHandler(async (_req: Request, res: Response) => {
  const types = reportGeneratorService.getReportTypes();
  const tones = reportGeneratorService.getTones();

  res.status(HttpStatus.OK).json({
    success: true,
    data: { types, tones },
  });
});

// ============ Meeting Intelligence Controllers ============

export const generateMeetingPrepBrief = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = new Types.ObjectId(req.organizationContext!.organizationId);
  const userId = new Types.ObjectId(req.user!.id);
  const { meetingId } = req.params;

  const brief = await meetingIntelService.generatePrepBrief(
    organizationId,
    userId,
    meetingId
  );

  res.status(HttpStatus.OK).json({
    success: true,
    data: brief,
  });
});

export const generateMeetingSummary = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = new Types.ObjectId(req.organizationContext!.organizationId);
  const userId = new Types.ObjectId(req.user!.id);

  const summary = await meetingIntelService.generateSummary(
    organizationId,
    userId,
    req.body
  );

  res.status(HttpStatus.OK).json({
    success: true,
    data: summary,
  });
});

export const extractActionItems = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = new Types.ObjectId(req.organizationContext!.organizationId);
  const userId = new Types.ObjectId(req.user!.id);
  const { notes } = req.body;

  const actionItems = await meetingIntelService.extractActionItems(
    organizationId,
    userId,
    notes
  );

  res.status(HttpStatus.OK).json({
    success: true,
    data: actionItems,
  });
});

export const generateFollowUpEmail = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = new Types.ObjectId(req.organizationContext!.organizationId);
  const userId = new Types.ObjectId(req.user!.id);

  const email = await meetingIntelService.generateFollowUpEmail(
    organizationId,
    userId,
    req.body
  );

  res.status(HttpStatus.OK).json({
    success: true,
    data: email,
  });
});

export const researchInvestor = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = new Types.ObjectId(req.organizationContext!.organizationId);
  const userId = new Types.ObjectId(req.user!.id);
  const { investorId } = req.params;

  const research = await meetingIntelService.researchInvestor(
    organizationId,
    userId,
    investorId
  );

  res.status(HttpStatus.OK).json({
    success: true,
    data: research,
  });
});

// ============ Stats & Status Controllers ============

export const getAIStats = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = new Types.ObjectId(req.organizationContext!.organizationId);

  const [queryStats, categorizationStats] = await Promise.all([
    AIQuery.aggregate([
      { $match: { organization: organizationId } },
      {
        $group: {
          _id: '$feature',
          count: { $sum: 1 },
          totalTokens: { $sum: '$tokensUsed' },
          avgProcessingTime: { $avg: '$processingTimeMs' },
        },
      },
    ]),
    categorizationService.getAccuracyStats(organizationId),
  ]);

  const totalQueries = queryStats.reduce((sum, s) => sum + s.count, 0);
  const totalTokens = queryStats.reduce((sum, s) => sum + s.totalTokens, 0);
  const avgTime =
    queryStats.reduce((sum, s) => sum + s.avgProcessingTime * s.count, 0) /
    (totalQueries || 1);

  res.status(HttpStatus.OK).json({
    success: true,
    data: {
      totalQueries,
      queriesByFeature: queryStats.reduce(
        (acc, s) => ({ ...acc, [s._id]: s.count }),
        {}
      ),
      totalTokensUsed: totalTokens,
      avgProcessingTime: Math.round(avgTime),
      categorizationAccuracy: categorizationStats.accuracy,
    },
  });
});

export const getAIStatus = asyncHandler(async (_req: Request, res: Response) => {
  const isConfigured = openaiService.isConfigured();
  const availableModels = openaiService.getAvailableModels();
  const defaultModel = openaiService.getDefaultModel();

  res.status(HttpStatus.OK).json({
    success: true,
    data: {
      isConfigured,
      availableModels,
      defaultModel,
      features: {
        copilot: isConfigured,
        categorization: isConfigured,
        documentParser: isConfigured,
        reportGenerator: isConfigured,
        meetingIntel: isConfigured,
      },
    },
  });
});
