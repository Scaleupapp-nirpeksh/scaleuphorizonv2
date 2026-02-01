import { Types } from 'mongoose';
import {
  FinancialModel,
  IFinancialModel,
  IIncomeStatementLine,
  IBalanceSheetLine,
  ICashFlowStatementLine,
  IKeyMetrics,
  IMonthlyAmount,
} from '../models';
import {
  CreateFinancialModelInput,
  UpdateFinancialModelInput,
  FinancialModelQueryInput,
} from '../schemas';
import { FinancialModelStatus, ModelPeriod, ModelPeriodType } from '../../constants';
import { NotFoundError, BadRequestError } from '@/core/errors';
import { Transaction } from '@/modules/tracking/transactions/models';
import { Account } from '@/modules/chart-of-accounts/models';

/**
 * Financial Model Service
 *
 * Handles 3-statement financial models with:
 * - Income Statement generation
 * - Balance Sheet generation
 * - Cash Flow Statement generation
 * - Key metrics calculation
 * - Integration with tracking and planning modules
 */
export class FinancialModelService {
  // ============ Financial Model CRUD ============

  /**
   * Create a new financial model
   */
  async createModel(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateFinancialModelInput
  ): Promise<IFinancialModel> {
    // Generate initial statements from historical data
    const { incomeStatement, balanceSheet, cashFlowStatement, totals, keyMetrics } =
      await this.generateStatements(
        organizationId,
        input.fiscalYear,
        input.period as ModelPeriodType
      );

    const model = new FinancialModel({
      organization: organizationId,
      name: input.name,
      description: input.description,
      fiscalYear: input.fiscalYear,
      period: input.period || ModelPeriod.MONTHLY,
      status: FinancialModelStatus.DRAFT,
      incomeStatement,
      balanceSheet,
      cashFlowStatement,
      ...totals,
      keyMetrics,
      linkedBudget: input.linkedBudgetId ? new Types.ObjectId(input.linkedBudgetId) : undefined,
      linkedRevenuePlan: input.linkedRevenuePlanId
        ? new Types.ObjectId(input.linkedRevenuePlanId)
        : undefined,
      linkedHeadcountPlan: input.linkedHeadcountPlanId
        ? new Types.ObjectId(input.linkedHeadcountPlanId)
        : undefined,
      notes: input.notes,
      lastCalculatedAt: new Date(),
      createdBy: userId,
    });

    await model.save();
    return model;
  }

  /**
   * Get financial models with filtering
   */
  async getModels(
    organizationId: Types.ObjectId,
    query: FinancialModelQueryInput
  ): Promise<{
    data: IFinancialModel[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const { fiscalYear, status, period, page = 1, limit = 20, sortBy, sortOrder } = query;

    const filter: Record<string, unknown> = {
      organization: organizationId,
      isArchived: false,
    };

    if (fiscalYear) filter.fiscalYear = fiscalYear;
    if (status) filter.status = status;
    if (period) filter.period = period;

    const total = await FinancialModel.countDocuments(filter);
    const pages = Math.ceil(total / limit);

    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const models = await FinancialModel.find(filter)
      .sort({ [sortBy || 'fiscalYear']: sortDirection })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return {
      data: models as unknown as IFinancialModel[],
      pagination: { page, limit, total, pages },
    };
  }

  /**
   * Get financial model by ID
   */
  async getModelById(organizationId: Types.ObjectId, modelId: string): Promise<IFinancialModel> {
    const model = await FinancialModel.findOne({
      _id: new Types.ObjectId(modelId),
      organization: organizationId,
      isArchived: false,
    });

    if (!model) {
      throw new NotFoundError('Financial model not found');
    }

    return model;
  }

  /**
   * Update financial model
   */
  async updateModel(
    organizationId: Types.ObjectId,
    modelId: string,
    userId: Types.ObjectId,
    input: UpdateFinancialModelInput
  ): Promise<IFinancialModel> {
    const model = await this.getModelById(organizationId, modelId);

    if (model.status === FinancialModelStatus.ARCHIVED) {
      throw new BadRequestError('Cannot update archived model');
    }

    if (input.name) model.name = input.name;
    if (input.description !== undefined) model.description = input.description;
    if (input.notes !== undefined) model.notes = input.notes;

    if (input.linkedBudgetId !== undefined) {
      model.linkedBudget = input.linkedBudgetId
        ? new Types.ObjectId(input.linkedBudgetId)
        : undefined;
    }

    if (input.linkedRevenuePlanId !== undefined) {
      model.linkedRevenuePlan = input.linkedRevenuePlanId
        ? new Types.ObjectId(input.linkedRevenuePlanId)
        : undefined;
    }

    if (input.linkedHeadcountPlanId !== undefined) {
      model.linkedHeadcountPlan = input.linkedHeadcountPlanId
        ? new Types.ObjectId(input.linkedHeadcountPlanId)
        : undefined;
    }

    model.updatedBy = userId;
    await model.save();

    return model;
  }

  /**
   * Archive financial model
   */
  async archiveModel(
    organizationId: Types.ObjectId,
    modelId: string,
    userId: Types.ObjectId
  ): Promise<void> {
    const model = await this.getModelById(organizationId, modelId);

    model.isArchived = true;
    model.status = FinancialModelStatus.ARCHIVED;
    model.updatedBy = userId;

    await model.save();
  }

  // ============ Status Management ============

  /**
   * Activate a financial model
   */
  async activateModel(
    organizationId: Types.ObjectId,
    modelId: string,
    userId: Types.ObjectId
  ): Promise<IFinancialModel> {
    const model = await this.getModelById(organizationId, modelId);

    if (model.status !== FinancialModelStatus.DRAFT) {
      throw new BadRequestError('Only draft models can be activated');
    }

    // Deactivate other active models for the same fiscal year
    await FinancialModel.updateMany(
      {
        organization: organizationId,
        fiscalYear: model.fiscalYear,
        status: FinancialModelStatus.ACTIVE,
        _id: { $ne: model._id },
      },
      { status: FinancialModelStatus.DRAFT }
    );

    model.status = FinancialModelStatus.ACTIVE;
    model.updatedBy = userId;
    await model.save();

    return model;
  }

  // ============ Recalculation ============

  /**
   * Recalculate model with latest data
   */
  async recalculateModel(
    organizationId: Types.ObjectId,
    modelId: string,
    userId: Types.ObjectId
  ): Promise<IFinancialModel> {
    const model = await this.getModelById(organizationId, modelId);

    const { incomeStatement, balanceSheet, cashFlowStatement, totals, keyMetrics } =
      await this.generateStatements(
        organizationId,
        model.fiscalYear,
        model.period as ModelPeriodType
      );

    model.incomeStatement = incomeStatement;
    model.balanceSheet = balanceSheet;
    model.cashFlowStatement = cashFlowStatement;
    model.totalRevenue = totals.totalRevenue;
    model.totalExpenses = totals.totalExpenses;
    model.grossProfit = totals.grossProfit;
    model.operatingIncome = totals.operatingIncome;
    model.netIncome = totals.netIncome;
    model.totalAssets = totals.totalAssets;
    model.totalLiabilities = totals.totalLiabilities;
    model.totalEquity = totals.totalEquity;
    model.netCashFlow = totals.netCashFlow;
    model.keyMetrics = keyMetrics;
    model.lastCalculatedAt = new Date();
    model.updatedBy = userId;

    await model.save();

    return model;
  }

  // ============ Statement Access ============

  /**
   * Get income statement
   */
  async getIncomeStatement(
    organizationId: Types.ObjectId,
    modelId: string
  ): Promise<{
    revenue: IIncomeStatementLine[];
    totalRevenue: number;
    cogs: IIncomeStatementLine[];
    totalCogs: number;
    grossProfit: number;
    grossMargin: number;
    operatingExpenses: IIncomeStatementLine[];
    totalOperatingExpenses: number;
    operatingIncome: number;
    operatingMargin: number;
    otherIncome: IIncomeStatementLine[];
    otherExpenses: IIncomeStatementLine[];
    netIncome: number;
    netMargin: number;
  }> {
    const model = await this.getModelById(organizationId, modelId);

    const revenue = model.incomeStatement.filter((l) => l.category === 'revenue');
    const cogs = model.incomeStatement.filter((l) => l.category === 'cogs');
    const operatingExpenses = model.incomeStatement.filter((l) => l.category === 'operating_expense');
    const otherIncome = model.incomeStatement.filter((l) => l.category === 'other_income');
    const otherExpenses = model.incomeStatement.filter((l) => l.category === 'other_expense');

    const totalRevenue = revenue.reduce((sum, l) => sum + l.total, 0);
    const totalCogs = cogs.reduce((sum, l) => sum + l.total, 0);
    const grossProfit = totalRevenue - totalCogs;
    const totalOperatingExpenses = operatingExpenses.reduce((sum, l) => sum + l.total, 0);
    const operatingIncome = grossProfit - totalOperatingExpenses;
    const totalOtherIncome = otherIncome.reduce((sum, l) => sum + l.total, 0);
    const totalOtherExpenses = otherExpenses.reduce((sum, l) => sum + l.total, 0);
    const netIncome = operatingIncome + totalOtherIncome - totalOtherExpenses;

    return {
      revenue,
      totalRevenue,
      cogs,
      totalCogs,
      grossProfit,
      grossMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
      operatingExpenses,
      totalOperatingExpenses,
      operatingIncome,
      operatingMargin: totalRevenue > 0 ? (operatingIncome / totalRevenue) * 100 : 0,
      otherIncome,
      otherExpenses,
      netIncome,
      netMargin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0,
    };
  }

  /**
   * Get balance sheet
   */
  async getBalanceSheet(
    organizationId: Types.ObjectId,
    modelId: string
  ): Promise<{
    assets: {
      current: IBalanceSheetLine[];
      totalCurrent: number;
      fixed: IBalanceSheetLine[];
      totalFixed: number;
      total: number;
    };
    liabilities: {
      current: IBalanceSheetLine[];
      totalCurrent: number;
      longTerm: IBalanceSheetLine[];
      totalLongTerm: number;
      total: number;
    };
    equity: {
      items: IBalanceSheetLine[];
      total: number;
    };
    totalLiabilitiesAndEquity: number;
    isBalanced: boolean;
  }> {
    const model = await this.getModelById(organizationId, modelId);

    const currentAssets = model.balanceSheet.filter(
      (l) => l.category === 'asset' && l.subcategory === 'current_asset'
    );
    const fixedAssets = model.balanceSheet.filter(
      (l) => l.category === 'asset' && l.subcategory === 'fixed_asset'
    );
    const currentLiabilities = model.balanceSheet.filter(
      (l) => l.category === 'liability' && l.subcategory === 'current_liability'
    );
    const longTermLiabilities = model.balanceSheet.filter(
      (l) => l.category === 'liability' && l.subcategory === 'long_term_liability'
    );
    const equityItems = model.balanceSheet.filter((l) => l.category === 'equity');

    const totalCurrentAssets = currentAssets.reduce((sum, l) => sum + l.total, 0);
    const totalFixedAssets = fixedAssets.reduce((sum, l) => sum + l.total, 0);
    const totalAssets = totalCurrentAssets + totalFixedAssets;

    const totalCurrentLiabilities = currentLiabilities.reduce((sum, l) => sum + l.total, 0);
    const totalLongTermLiabilities = longTermLiabilities.reduce((sum, l) => sum + l.total, 0);
    const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;

    const totalEquity = equityItems.reduce((sum, l) => sum + l.total, 0);
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

    return {
      assets: {
        current: currentAssets,
        totalCurrent: totalCurrentAssets,
        fixed: fixedAssets,
        totalFixed: totalFixedAssets,
        total: totalAssets,
      },
      liabilities: {
        current: currentLiabilities,
        totalCurrent: totalCurrentLiabilities,
        longTerm: longTermLiabilities,
        totalLongTerm: totalLongTermLiabilities,
        total: totalLiabilities,
      },
      equity: {
        items: equityItems,
        total: totalEquity,
      },
      totalLiabilitiesAndEquity,
      isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01,
    };
  }

  /**
   * Get cash flow statement
   */
  async getCashFlowStatement(
    organizationId: Types.ObjectId,
    modelId: string
  ): Promise<{
    operating: { items: ICashFlowStatementLine[]; total: number };
    investing: { items: ICashFlowStatementLine[]; total: number };
    financing: { items: ICashFlowStatementLine[]; total: number };
    netChange: number;
    beginningCash: number;
    endingCash: number;
  }> {
    const model = await this.getModelById(organizationId, modelId);

    const operating = model.cashFlowStatement.filter((l) => l.category === 'operating');
    const investing = model.cashFlowStatement.filter((l) => l.category === 'investing');
    const financing = model.cashFlowStatement.filter((l) => l.category === 'financing');

    const operatingTotal = operating.reduce((sum, l) => sum + l.total, 0);
    const investingTotal = investing.reduce((sum, l) => sum + l.total, 0);
    const financingTotal = financing.reduce((sum, l) => sum + l.total, 0);
    const netChange = operatingTotal + investingTotal + financingTotal;

    // Get beginning cash from balance sheet
    const cashAccounts = model.balanceSheet.filter(
      (l) =>
        l.category === 'asset' &&
        l.subcategory === 'current_asset' &&
        l.name.toLowerCase().includes('cash')
    );
    const beginningCash = cashAccounts.reduce((sum, l) => {
      const firstAmount = l.amounts[0]?.amount || 0;
      return sum + firstAmount;
    }, 0);

    return {
      operating: { items: operating, total: operatingTotal },
      investing: { items: investing, total: investingTotal },
      financing: { items: financing, total: financingTotal },
      netChange,
      beginningCash,
      endingCash: beginningCash + netChange,
    };
  }

  /**
   * Get key metrics
   */
  async getKeyMetrics(organizationId: Types.ObjectId, modelId: string): Promise<IKeyMetrics> {
    const model = await this.getModelById(organizationId, modelId);
    return model.keyMetrics;
  }

  // ============ Helper Methods ============

  /**
   * Generate statements from transaction data
   */
  private async generateStatements(
    organizationId: Types.ObjectId,
    fiscalYear: number,
    _period: ModelPeriodType
  ): Promise<{
    incomeStatement: IIncomeStatementLine[];
    balanceSheet: IBalanceSheetLine[];
    cashFlowStatement: ICashFlowStatementLine[];
    totals: {
      totalRevenue: number;
      totalExpenses: number;
      grossProfit: number;
      operatingIncome: number;
      netIncome: number;
      totalAssets: number;
      totalLiabilities: number;
      totalEquity: number;
      netCashFlow: number;
    };
    keyMetrics: IKeyMetrics;
  }> {
    const startDate = new Date(fiscalYear, 0, 1);
    const endDate = new Date(fiscalYear, 11, 31);

    // Get transactions for the fiscal year
    const transactions = await Transaction.find({
      organization: organizationId,
      date: { $gte: startDate, $lte: endDate },
      isArchived: false,
    }).populate('account');

    // Get accounts for categorization
    const accounts = await Account.find({
      organization: organizationId,
      isActive: true,
    });

    // Initialize statements
    const incomeStatement: IIncomeStatementLine[] = [];
    const balanceSheet: IBalanceSheetLine[] = [];
    const cashFlowStatement: ICashFlowStatementLine[] = [];

    // Group transactions by account and month
    const accountTotals = new Map<string, { type: string; amounts: Map<number, number> }>();

    for (const txn of transactions) {
      const accountId = txn.account?.toString() || 'uncategorized';
      const month = txn.date.getMonth();

      if (!accountTotals.has(accountId)) {
        accountTotals.set(accountId, { type: txn.type, amounts: new Map() });
      }

      const existing = accountTotals.get(accountId)!;
      const currentAmount = existing.amounts.get(month) || 0;
      existing.amounts.set(month, currentAmount + txn.amount);
    }

    // Build income statement from transactions
    let totalRevenue = 0;
    let totalExpenses = 0;

    for (const [accountId, data] of accountTotals) {
      const account = accounts.find((a) => a._id.toString() === accountId);
      const name = account?.name || 'Uncategorized';

      const amounts: IMonthlyAmount[] = [];
      let total = 0;

      for (let month = 0; month < 12; month++) {
        const amount = data.amounts.get(month) || 0;
        amounts.push({
          month: new Date(fiscalYear, month, 1),
          amount,
          isActual: true,
        });
        total += amount;
      }

      if (data.type === 'income') {
        incomeStatement.push({
          category: 'revenue',
          name,
          account: account?._id,
          amounts,
          total,
        });
        totalRevenue += total;
      } else {
        incomeStatement.push({
          category: 'operating_expense',
          name,
          account: account?._id,
          amounts,
          total,
        });
        totalExpenses += total;
      }
    }

    // Calculate financial metrics
    const grossProfit = totalRevenue; // Simplified: no COGS tracking yet
    const operatingIncome = grossProfit - totalExpenses;
    const netIncome = operatingIncome;

    // Build simplified balance sheet
    balanceSheet.push({
      category: 'asset',
      subcategory: 'current_asset',
      name: 'Cash and Cash Equivalents',
      amounts: [],
      total: netIncome > 0 ? netIncome : 0,
    });

    balanceSheet.push({
      category: 'equity',
      subcategory: 'equity',
      name: 'Retained Earnings',
      amounts: [],
      total: netIncome,
    });

    // Build cash flow statement
    cashFlowStatement.push({
      category: 'operating',
      name: 'Net Income',
      amounts: [],
      total: netIncome,
    });

    const netCashFlow = netIncome;
    const totalAssets = netIncome > 0 ? netIncome : 0;
    const totalLiabilities = 0;
    const totalEquity = netIncome;

    // Calculate key metrics
    const keyMetrics: IKeyMetrics = {
      grossMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
      operatingMargin: totalRevenue > 0 ? (operatingIncome / totalRevenue) * 100 : 0,
      netMargin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0,
      ebitdaMargin: totalRevenue > 0 ? (operatingIncome / totalRevenue) * 100 : 0,
      currentRatio: 0,
      quickRatio: 0,
      debtToEquity: 0,
      revenueGrowth: 0,
      expenseGrowth: 0,
      burnRate: totalExpenses > totalRevenue ? (totalExpenses - totalRevenue) / 12 : 0,
      runway:
        totalExpenses > totalRevenue && netIncome < 0
          ? Math.abs(totalAssets / ((totalExpenses - totalRevenue) / 12))
          : 999,
    };

    return {
      incomeStatement,
      balanceSheet,
      cashFlowStatement,
      totals: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        operatingIncome: Math.round(operatingIncome * 100) / 100,
        netIncome: Math.round(netIncome * 100) / 100,
        totalAssets: Math.round(totalAssets * 100) / 100,
        totalLiabilities: Math.round(totalLiabilities * 100) / 100,
        totalEquity: Math.round(totalEquity * 100) / 100,
        netCashFlow: Math.round(netCashFlow * 100) / 100,
      },
      keyMetrics: {
        ...keyMetrics,
        grossMargin: Math.round(keyMetrics.grossMargin * 100) / 100,
        operatingMargin: Math.round(keyMetrics.operatingMargin * 100) / 100,
        netMargin: Math.round(keyMetrics.netMargin * 100) / 100,
        ebitdaMargin: Math.round(keyMetrics.ebitdaMargin * 100) / 100,
        burnRate: Math.round((keyMetrics.burnRate || 0) * 100) / 100,
        runway: Math.round((keyMetrics.runway || 0) * 10) / 10,
      },
    };
  }
}

export const financialModelService = new FinancialModelService();
