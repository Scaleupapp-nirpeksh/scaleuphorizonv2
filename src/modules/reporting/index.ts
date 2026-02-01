/**
 * Reporting Module
 *
 * Provides dashboard management, investor reports, and financial statements
 */

// Routes
import reportingRoutes from './routes';
export { reportingRoutes };

// Constants
export * from './constants';

// Types
export * from './types';

// Dashboard exports
export { Dashboard, IDashboard, IWidget } from './dashboards/models';
export { dashboardService, DashboardService } from './dashboards/services';

// Investor Report exports
export {
  InvestorReport,
  IInvestorReport,
  ReportTemplate,
  IReportTemplate,
} from './investor-reports/models';
export { investorReportService, InvestorReportService } from './investor-reports/services';

// Statement exports
export {
  statementService,
  StatementService,
  ProfitLossStatement,
  BalanceSheetStatement,
  CashFlowStatement,
} from './statements/services';

export default reportingRoutes;
