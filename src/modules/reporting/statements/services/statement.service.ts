/**
 * Statement Service
 *
 * Business logic for generating financial statements
 * (P&L, Balance Sheet, Cash Flow)
 */

import { Types } from 'mongoose';
import { StatementType, StatementPeriod } from '../../constants';

// ============ Types ============

export interface StatementLineItem {
  accountId?: Types.ObjectId;
  accountCode?: string;
  name: string;
  amount: number;
  previousAmount?: number;
  change?: number;
  changePercent?: number;
  children?: StatementLineItem[];
}

export interface ProfitLossStatement {
  period: {
    type: string;
    startDate: Date;
    endDate: Date;
  };
  revenue: {
    items: StatementLineItem[];
    total: number;
  };
  costOfGoodsSold: {
    items: StatementLineItem[];
    total: number;
  };
  grossProfit: number;
  grossMargin: number;
  operatingExpenses: {
    items: StatementLineItem[];
    total: number;
  };
  operatingIncome: number;
  operatingMargin: number;
  otherIncome: {
    items: StatementLineItem[];
    total: number;
  };
  otherExpenses: {
    items: StatementLineItem[];
    total: number;
  };
  netIncome: number;
  netMargin: number;
  generatedAt: Date;
}

export interface BalanceSheetStatement {
  period: {
    asOfDate: Date;
  };
  assets: {
    current: {
      items: StatementLineItem[];
      total: number;
    };
    nonCurrent: {
      items: StatementLineItem[];
      total: number;
    };
    total: number;
  };
  liabilities: {
    current: {
      items: StatementLineItem[];
      total: number;
    };
    nonCurrent: {
      items: StatementLineItem[];
      total: number;
    };
    total: number;
  };
  equity: {
    items: StatementLineItem[];
    total: number;
  };
  totalLiabilitiesAndEquity: number;
  generatedAt: Date;
}

export interface CashFlowStatement {
  period: {
    type: string;
    startDate: Date;
    endDate: Date;
  };
  operating: {
    items: StatementLineItem[];
    total: number;
  };
  investing: {
    items: StatementLineItem[];
    total: number;
  };
  financing: {
    items: StatementLineItem[];
    total: number;
  };
  netCashFlow: number;
  beginningCash: number;
  endingCash: number;
  generatedAt: Date;
}

export interface StatementQueryOptions {
  periodType: string;
  startDate?: Date;
  endDate?: Date;
  year?: number;
  month?: number;
  quarter?: number;
  compareWithPrevious?: boolean;
}

// ============ Service ============

export class StatementService {
  /**
   * Generate Profit & Loss Statement
   */
  async generateProfitLoss(
    organizationId: Types.ObjectId,
    options: StatementQueryOptions
  ): Promise<ProfitLossStatement> {
    const { startDate, endDate } = this.resolveDateRange(options);

    // In a real implementation, this would query transactions
    // grouped by account categories
    // For now, we return a structure that the frontend can use

    const revenue = await this.getRevenueData(organizationId, startDate, endDate);
    const cogs = await this.getCOGSData(organizationId, startDate, endDate);
    const operatingExpenses = await this.getOperatingExpenses(organizationId, startDate, endDate);
    const otherIncome = await this.getOtherIncome(organizationId, startDate, endDate);
    const otherExpenses = await this.getOtherExpenses(organizationId, startDate, endDate);

    const grossProfit = revenue.total - cogs.total;
    const operatingIncome = grossProfit - operatingExpenses.total;
    const netIncome =
      operatingIncome + otherIncome.total - otherExpenses.total;

    const grossMargin = revenue.total > 0 ? (grossProfit / revenue.total) * 100 : 0;
    const operatingMargin = revenue.total > 0 ? (operatingIncome / revenue.total) * 100 : 0;
    const netMargin = revenue.total > 0 ? (netIncome / revenue.total) * 100 : 0;

    return {
      period: {
        type: options.periodType,
        startDate,
        endDate,
      },
      revenue,
      costOfGoodsSold: cogs,
      grossProfit,
      grossMargin,
      operatingExpenses,
      operatingIncome,
      operatingMargin,
      otherIncome,
      otherExpenses,
      netIncome,
      netMargin,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate Balance Sheet
   */
  async generateBalanceSheet(
    organizationId: Types.ObjectId,
    asOfDate: Date = new Date()
  ): Promise<BalanceSheetStatement> {
    // In a real implementation, this would aggregate all transactions
    // up to the specified date, grouped by asset/liability/equity accounts

    const currentAssets = await this.getCurrentAssets(organizationId, asOfDate);
    const nonCurrentAssets = await this.getNonCurrentAssets(organizationId, asOfDate);
    const currentLiabilities = await this.getCurrentLiabilities(organizationId, asOfDate);
    const nonCurrentLiabilities = await this.getNonCurrentLiabilities(organizationId, asOfDate);
    const equity = await this.getEquity(organizationId, asOfDate);

    const totalAssets = currentAssets.total + nonCurrentAssets.total;
    const totalLiabilities = currentLiabilities.total + nonCurrentLiabilities.total;
    const totalLiabilitiesAndEquity = totalLiabilities + equity.total;

    return {
      period: {
        asOfDate,
      },
      assets: {
        current: currentAssets,
        nonCurrent: nonCurrentAssets,
        total: totalAssets,
      },
      liabilities: {
        current: currentLiabilities,
        nonCurrent: nonCurrentLiabilities,
        total: totalLiabilities,
      },
      equity,
      totalLiabilitiesAndEquity,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate Cash Flow Statement
   */
  async generateCashFlow(
    organizationId: Types.ObjectId,
    options: StatementQueryOptions
  ): Promise<CashFlowStatement> {
    const { startDate, endDate } = this.resolveDateRange(options);

    // Calculate beginning cash (as of start date)
    const beginningCash = await this.getCashBalance(organizationId, startDate);

    // Get cash flow activities
    const operating = await this.getOperatingCashFlow(organizationId, startDate, endDate);
    const investing = await this.getInvestingCashFlow(organizationId, startDate, endDate);
    const financing = await this.getFinancingCashFlow(organizationId, startDate, endDate);

    const netCashFlow = operating.total + investing.total + financing.total;
    const endingCash = beginningCash + netCashFlow;

    return {
      period: {
        type: options.periodType,
        startDate,
        endDate,
      },
      operating,
      investing,
      financing,
      netCashFlow,
      beginningCash,
      endingCash,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate comparison between two periods
   */
  async generateComparison(
    organizationId: Types.ObjectId,
    statementType: string,
    currentOptions: StatementQueryOptions,
    previousOptions: StatementQueryOptions
  ): Promise<{
    current: ProfitLossStatement | BalanceSheetStatement | CashFlowStatement;
    previous: ProfitLossStatement | BalanceSheetStatement | CashFlowStatement;
    variances: Record<string, { amount: number; percent: number }>;
  }> {
    let current: ProfitLossStatement | BalanceSheetStatement | CashFlowStatement;
    let previous: ProfitLossStatement | BalanceSheetStatement | CashFlowStatement;

    switch (statementType) {
      case StatementType.PROFIT_LOSS:
        current = await this.generateProfitLoss(organizationId, currentOptions);
        previous = await this.generateProfitLoss(organizationId, previousOptions);
        break;
      case StatementType.BALANCE_SHEET:
        current = await this.generateBalanceSheet(
          organizationId,
          this.resolveDateRange(currentOptions).endDate
        );
        previous = await this.generateBalanceSheet(
          organizationId,
          this.resolveDateRange(previousOptions).endDate
        );
        break;
      case StatementType.CASH_FLOW:
        current = await this.generateCashFlow(organizationId, currentOptions);
        previous = await this.generateCashFlow(organizationId, previousOptions);
        break;
      default:
        throw new Error(`Unknown statement type: ${statementType}`);
    }

    const variances = this.calculateVariances(
      current as unknown as Record<string, unknown>,
      previous as unknown as Record<string, unknown>
    );

    return { current, previous, variances };
  }

  // ============ Helper Methods ============

  /**
   * Resolve date range from query options
   */
  private resolveDateRange(options: StatementQueryOptions): { startDate: Date; endDate: Date } {
    if (options.startDate && options.endDate) {
      return { startDate: options.startDate, endDate: options.endDate };
    }

    const now = new Date();
    const year = options.year || now.getFullYear();

    switch (options.periodType) {
      case StatementPeriod.MONTHLY: {
        const month = options.month || now.getMonth() + 1;
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        return { startDate, endDate };
      }
      case StatementPeriod.QUARTERLY: {
        const quarter = options.quarter || Math.ceil((now.getMonth() + 1) / 3);
        const startMonth = (quarter - 1) * 3;
        const startDate = new Date(year, startMonth, 1);
        const endDate = new Date(year, startMonth + 3, 0, 23, 59, 59);
        return { startDate, endDate };
      }
      case StatementPeriod.ANNUAL: {
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59);
        return { startDate, endDate };
      }
      case StatementPeriod.YTD: {
        const startDate = new Date(year, 0, 1);
        const endDate = now;
        return { startDate, endDate };
      }
      default:
        throw new Error(`Unknown period type: ${options.periodType}`);
    }
  }

  /**
   * Calculate variances between two statements
   */
  private calculateVariances(
    current: Record<string, unknown>,
    previous: Record<string, unknown>
  ): Record<string, { amount: number; percent: number }> {
    const variances: Record<string, { amount: number; percent: number }> = {};

    // Compare numeric properties
    const numericKeys = [
      'grossProfit',
      'operatingIncome',
      'netIncome',
      'netCashFlow',
      'totalAssets',
      'totalLiabilities',
    ];

    for (const key of numericKeys) {
      if (typeof current[key] === 'number' && typeof previous[key] === 'number') {
        const currentVal = current[key] as number;
        const previousVal = previous[key] as number;
        const amount = currentVal - previousVal;
        const percent = previousVal !== 0 ? (amount / Math.abs(previousVal)) * 100 : 0;
        variances[key] = { amount, percent };
      }
    }

    return variances;
  }

  // ============ Data Retrieval Stubs ============
  // In a real implementation, these would query the database

  private async getRevenueData(
    _organizationId: Types.ObjectId,
    _startDate: Date,
    _endDate: Date
  ): Promise<{ items: StatementLineItem[]; total: number }> {
    // TODO: Implement actual data retrieval from transactions
    return { items: [], total: 0 };
  }

  private async getCOGSData(
    _organizationId: Types.ObjectId,
    _startDate: Date,
    _endDate: Date
  ): Promise<{ items: StatementLineItem[]; total: number }> {
    return { items: [], total: 0 };
  }

  private async getOperatingExpenses(
    _organizationId: Types.ObjectId,
    _startDate: Date,
    _endDate: Date
  ): Promise<{ items: StatementLineItem[]; total: number }> {
    return { items: [], total: 0 };
  }

  private async getOtherIncome(
    _organizationId: Types.ObjectId,
    _startDate: Date,
    _endDate: Date
  ): Promise<{ items: StatementLineItem[]; total: number }> {
    return { items: [], total: 0 };
  }

  private async getOtherExpenses(
    _organizationId: Types.ObjectId,
    _startDate: Date,
    _endDate: Date
  ): Promise<{ items: StatementLineItem[]; total: number }> {
    return { items: [], total: 0 };
  }

  private async getCurrentAssets(
    _organizationId: Types.ObjectId,
    _asOfDate: Date
  ): Promise<{ items: StatementLineItem[]; total: number }> {
    return { items: [], total: 0 };
  }

  private async getNonCurrentAssets(
    _organizationId: Types.ObjectId,
    _asOfDate: Date
  ): Promise<{ items: StatementLineItem[]; total: number }> {
    return { items: [], total: 0 };
  }

  private async getCurrentLiabilities(
    _organizationId: Types.ObjectId,
    _asOfDate: Date
  ): Promise<{ items: StatementLineItem[]; total: number }> {
    return { items: [], total: 0 };
  }

  private async getNonCurrentLiabilities(
    _organizationId: Types.ObjectId,
    _asOfDate: Date
  ): Promise<{ items: StatementLineItem[]; total: number }> {
    return { items: [], total: 0 };
  }

  private async getEquity(
    _organizationId: Types.ObjectId,
    _asOfDate: Date
  ): Promise<{ items: StatementLineItem[]; total: number }> {
    return { items: [], total: 0 };
  }

  private async getCashBalance(_organizationId: Types.ObjectId, _asOfDate: Date): Promise<number> {
    return 0;
  }

  private async getOperatingCashFlow(
    _organizationId: Types.ObjectId,
    _startDate: Date,
    _endDate: Date
  ): Promise<{ items: StatementLineItem[]; total: number }> {
    return { items: [], total: 0 };
  }

  private async getInvestingCashFlow(
    _organizationId: Types.ObjectId,
    _startDate: Date,
    _endDate: Date
  ): Promise<{ items: StatementLineItem[]; total: number }> {
    return { items: [], total: 0 };
  }

  private async getFinancingCashFlow(
    _organizationId: Types.ObjectId,
    _startDate: Date,
    _endDate: Date
  ): Promise<{ items: StatementLineItem[]; total: number }> {
    return { items: [], total: 0 };
  }
}

export const statementService = new StatementService();
