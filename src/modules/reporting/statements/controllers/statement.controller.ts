/**
 * Statement Controller
 *
 * HTTP request handlers for financial statement endpoints
 */

import { Request, Response } from 'express';
import { statementService, StatementQueryOptions } from '../services';
import { asyncHandler } from '@/core/utils';
import { ForbiddenError } from '@/core/errors';
import { HttpStatus } from '@/core/constants';
import { StatementPeriod, StatementType, ExportFormat } from '../../constants';

export class StatementController {
  /**
   * Normalize statement type from query parameter
   * Accepts aliases like 'pnl', 'balance', 'cashflow' and maps to proper enum values
   */
  private normalizeStatementType(type: string | undefined): string {
    if (!type) return StatementType.PROFIT_LOSS;

    const normalized = type.toLowerCase().trim();

    // Map common aliases to proper enum values
    const typeMap: Record<string, string> = {
      // Profit & Loss aliases
      pnl: StatementType.PROFIT_LOSS,
      'p&l': StatementType.PROFIT_LOSS,
      pl: StatementType.PROFIT_LOSS,
      profit_loss: StatementType.PROFIT_LOSS,
      profitloss: StatementType.PROFIT_LOSS,
      income: StatementType.PROFIT_LOSS,
      income_statement: StatementType.PROFIT_LOSS,

      // Balance Sheet aliases
      balance: StatementType.BALANCE_SHEET,
      balance_sheet: StatementType.BALANCE_SHEET,
      balancesheet: StatementType.BALANCE_SHEET,
      bs: StatementType.BALANCE_SHEET,

      // Cash Flow aliases
      cashflow: StatementType.CASH_FLOW,
      cash_flow: StatementType.CASH_FLOW,
      cash: StatementType.CASH_FLOW,
      cf: StatementType.CASH_FLOW,
    };

    return typeMap[normalized] || normalized;
  }

  /**
   * Get Profit & Loss Statement
   * GET /api/v1/reporting/statements/pnl
   */
  getProfitLoss = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const options = this.parseQueryOptions(req.query);
    const statement = await statementService.generateProfitLoss(organizationId, options);

    res.status(HttpStatus.OK).json({
      success: true,
      data: statement,
    });
  });

  /**
   * Get Balance Sheet
   * GET /api/v1/reporting/statements/balance
   */
  getBalanceSheet = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const { asOfDate } = req.query;
    const date = asOfDate ? new Date(asOfDate as string) : new Date();
    const statement = await statementService.generateBalanceSheet(organizationId, date);

    res.status(HttpStatus.OK).json({
      success: true,
      data: statement,
    });
  });

  /**
   * Get Cash Flow Statement
   * GET /api/v1/reporting/statements/cashflow
   */
  getCashFlow = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const options = this.parseQueryOptions(req.query);
    const statement = await statementService.generateCashFlow(organizationId, options);

    res.status(HttpStatus.OK).json({
      success: true,
      data: statement,
    });
  });

  /**
   * Get comparison between periods
   * GET /api/v1/reporting/statements/compare
   */
  getComparison = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const { type, currentPeriod, previousPeriod } = req.query;

    const statementType = this.normalizeStatementType(type as string);
    const currentOptions = this.parseQueryOptions(currentPeriod as Record<string, unknown> || {});
    const previousOptions = this.parsePreviousPeriodOptions(currentOptions);

    if (previousPeriod) {
      Object.assign(previousOptions, this.parseQueryOptions(previousPeriod as Record<string, unknown>));
    }

    const comparison = await statementService.generateComparison(
      organizationId,
      statementType,
      currentOptions,
      previousOptions
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: comparison,
    });
  });

  /**
   * Export statement
   * GET /api/v1/reporting/statements/export
   */
  exportStatement = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const { type, format = ExportFormat.PDF } = req.query;
    const options = this.parseQueryOptions(req.query);
    const statementType = this.normalizeStatementType(type as string);

    let statement;
    switch (statementType) {
      case StatementType.PROFIT_LOSS:
        statement = await statementService.generateProfitLoss(organizationId, options);
        break;
      case StatementType.BALANCE_SHEET:
        statement = await statementService.generateBalanceSheet(
          organizationId,
          options.endDate || new Date()
        );
        break;
      case StatementType.CASH_FLOW:
        statement = await statementService.generateCashFlow(organizationId, options);
        break;
      default:
        res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Invalid statement type',
        });
        return;
    }

    // For now, return JSON. In production, would generate PDF/Excel
    switch (format) {
      case ExportFormat.JSON:
        res.status(HttpStatus.OK).json({
          success: true,
          data: statement,
        });
        break;
      case ExportFormat.CSV:
        // TODO: Implement CSV export
        res.status(HttpStatus.OK).json({
          success: true,
          message: 'CSV export not yet implemented',
          data: statement,
        });
        break;
      case ExportFormat.PDF:
      case ExportFormat.EXCEL:
      default:
        // TODO: Implement PDF/Excel export
        res.status(HttpStatus.OK).json({
          success: true,
          message: `${format} export not yet implemented`,
          data: statement,
        });
        break;
    }
  });

  // ============ Helper Methods ============

  /**
   * Parse query options from request
   */
  private parseQueryOptions(query: Record<string, unknown>): StatementQueryOptions {
    const {
      periodType = StatementPeriod.MONTHLY,
      startDate,
      endDate,
      year,
      month,
      quarter,
      compareWithPrevious,
    } = query;

    return {
      periodType: periodType as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      year: year ? parseInt(year as string, 10) : undefined,
      month: month ? parseInt(month as string, 10) : undefined,
      quarter: quarter ? parseInt(quarter as string, 10) : undefined,
      compareWithPrevious: compareWithPrevious === 'true',
    };
  }

  /**
   * Calculate previous period options based on current period
   */
  private parsePreviousPeriodOptions(currentOptions: StatementQueryOptions): StatementQueryOptions {
    const previous = { ...currentOptions };

    switch (currentOptions.periodType) {
      case StatementPeriod.MONTHLY:
        if (currentOptions.month) {
          if (currentOptions.month === 1) {
            previous.month = 12;
            previous.year = (currentOptions.year || new Date().getFullYear()) - 1;
          } else {
            previous.month = currentOptions.month - 1;
          }
        }
        break;
      case StatementPeriod.QUARTERLY:
        if (currentOptions.quarter) {
          if (currentOptions.quarter === 1) {
            previous.quarter = 4;
            previous.year = (currentOptions.year || new Date().getFullYear()) - 1;
          } else {
            previous.quarter = currentOptions.quarter - 1;
          }
        }
        break;
      case StatementPeriod.ANNUAL:
        previous.year = (currentOptions.year || new Date().getFullYear()) - 1;
        break;
    }

    return previous;
  }
}

export const statementController = new StatementController();
