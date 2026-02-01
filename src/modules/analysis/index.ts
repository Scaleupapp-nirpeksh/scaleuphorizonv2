/**
 * Analysis Module
 *
 * Provides financial analysis capabilities:
 * - Variance: Plan vs Actual comparison (budget, revenue, headcount)
 * - Trends: Historical trend analysis (expense, revenue, burn rate)
 * - Unit Economics: SaaS metrics (CAC, LTV, cohorts, payback)
 * - Health Score: Overall financial health scoring with recommendations
 */

// Constants
export * from './constants';

// Types
export * from './types';

// Variance
export * from './variance/schemas';
export { varianceService } from './variance/services/variance.service';

// Trends
export * from './trends/schemas';
export { trendsService } from './trends/services/trends.service';

// Unit Economics
export * from './unit-economics/schemas';
export * from './unit-economics/models';
export { unitEconomicsService } from './unit-economics/services/unit-economics.service';

// Health Score
export * from './health-score/schemas';
export * from './health-score/models';
export { healthScoreService } from './health-score/services/health-score.service';

// Routes
export { default as analysisRoutes } from './routes';
