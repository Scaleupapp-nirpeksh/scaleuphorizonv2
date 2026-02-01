/**
 * Projection Module
 *
 * Financial projections and forecasting:
 * - Cash Flow forecasting
 * - Runway calculations
 * - Revenue/Expense forecasting
 * - 3-Statement Financial Models
 */

// Routes
export { default as projectionRoutes } from './routes';

// Constants
export * from './constants';

// Types
export * from './types';

// Cash Flow
export { CashFlowForecast } from './cash-flow/models';
export type {
  ICashFlowForecast,
  ICashFlowItem,
  ICashFlowPeriodProjection,
} from './cash-flow/models';
export { cashFlowService } from './cash-flow/services';

// Runway
export { RunwaySnapshot } from './runway/models';
export type { IRunwaySnapshot, IRunwayProjection, IRunwayAssumptions } from './runway/models';
export { runwayService } from './runway/services';

// Forecasting
export { Forecast } from './forecasting/models';
export type { IForecast, IForecastDataPoint } from './forecasting/models';
export { forecastService } from './forecasting/services';

// Financial Model
export { FinancialModel } from './financial-model/models';
export type {
  IFinancialModel,
  IIncomeStatementLine,
  IBalanceSheetLine,
  ICashFlowStatementLine,
  IKeyMetrics,
} from './financial-model/models';
export { financialModelService } from './financial-model/services';
