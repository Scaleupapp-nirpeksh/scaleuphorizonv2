/**
 * Planning Module
 *
 * This module handles all financial planning functionality including:
 * - Budget planning with line items linked to Chart of Accounts
 * - Headcount planning with roles, salaries, and cost projections
 * - Revenue planning with streams and subscription metrics
 * - Scenario planning for what-if analysis and comparisons
 */

// Routes
export { default as planningRoutes } from './routes';

// Constants
export * from './constants';

// Types
export * from './types';

// Utils
export * from './utils';

// Budget sub-module
export { Budget, BudgetItem } from './budget/models';
export type { IBudget, IBudgetItem } from './budget/models';
export { budgetService } from './budget/services';
export { budgetController } from './budget/controllers';

// Headcount sub-module
export { HeadcountPlan, PlannedRole } from './headcount/models';
export type { IHeadcountPlan, IPlannedRole } from './headcount/models';
export { headcountService } from './headcount/services';
export { headcountController } from './headcount/controllers';

// Revenue Plan sub-module
export { RevenuePlan, RevenueStream } from './revenue-plan/models';
export type { IRevenuePlan, IRevenueStream } from './revenue-plan/models';
export { revenuePlanService } from './revenue-plan/services';
export { revenuePlanController } from './revenue-plan/controllers';

// Scenarios sub-module
export { Scenario, ScenarioAdjustment } from './scenarios/models';
export type { IScenario, IScenarioAdjustment } from './scenarios/models';
export { scenarioService } from './scenarios/services';
export { scenarioController } from './scenarios/controllers';
