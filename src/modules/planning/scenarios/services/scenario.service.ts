import { Types } from 'mongoose';
import { Scenario, IScenario, ScenarioAdjustment, IScenarioAdjustment } from '../models';
import { Budget } from '../../budget/models';
import { RevenuePlan } from '../../revenue-plan/models';
import {
  CreateScenarioInput,
  UpdateScenarioInput,
  CreateAdjustmentInput,
  UpdateAdjustmentInput,
  ScenarioQueryInput,
  CompareScenarioInput,
} from '../schemas';
import { ScenarioStatus, ImpactCategory } from '../../constants';
import { NotFoundError, BadRequestError } from '@/core/errors';

/**
 * Scenario Service
 * Handles scenario planning and what-if analysis business logic
 */
export class ScenarioService {
  // ============ Scenario CRUD ============

  /**
   * Create a new scenario
   */
  async createScenario(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateScenarioInput
  ): Promise<IScenario> {
    const { name, fiscalYear, linkedBudgetId, linkedHeadcountPlanId, linkedRevenuePlanId, ...rest } = input;

    // Check for duplicate name in same fiscal year
    const existing = await Scenario.findOne({
      organization: organizationId,
      name,
      fiscalYear,
      isArchived: false,
    });

    if (existing) {
      throw new BadRequestError(
        `Scenario "${name}" already exists for fiscal year ${fiscalYear}`
      );
    }

    // Initialize projections from linked plans
    let projectedRevenue = 0;
    let projectedExpenses = 0;

    if (linkedRevenuePlanId) {
      const revenuePlan = await RevenuePlan.findOne({
        _id: new Types.ObjectId(linkedRevenuePlanId),
        organization: organizationId,
      });
      if (revenuePlan) {
        projectedRevenue = revenuePlan.totalProjectedRevenue;
      }
    }

    if (linkedBudgetId) {
      const budget = await Budget.findOne({
        _id: new Types.ObjectId(linkedBudgetId),
        organization: organizationId,
      });
      if (budget) {
        projectedExpenses = budget.totalAmount;
      }
    }

    const scenario = new Scenario({
      organization: organizationId,
      name,
      fiscalYear,
      linkedBudget: linkedBudgetId ? new Types.ObjectId(linkedBudgetId) : undefined,
      linkedHeadcountPlan: linkedHeadcountPlanId ? new Types.ObjectId(linkedHeadcountPlanId) : undefined,
      linkedRevenuePlan: linkedRevenuePlanId ? new Types.ObjectId(linkedRevenuePlanId) : undefined,
      status: ScenarioStatus.DRAFT,
      projectedRevenue,
      projectedExpenses,
      projectedNetIncome: projectedRevenue - projectedExpenses,
      ...rest,
      createdBy: userId,
    });

    await scenario.save();
    return scenario;
  }

  /**
   * Get all scenarios for an organization
   */
  async getScenarios(
    organizationId: Types.ObjectId,
    filters?: ScenarioQueryInput
  ): Promise<IScenario[]> {
    const query: Record<string, unknown> = {
      organization: organizationId,
      isArchived: false,
    };

    if (filters) {
      if (filters.fiscalYear) query.fiscalYear = filters.fiscalYear;
      if (filters.type) query.type = filters.type;
      if (filters.status) query.status = filters.status;
      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } },
        ];
      }
    }

    return Scenario.find(query).sort({ fiscalYear: -1, type: 1, createdAt: -1 });
  }

  /**
   * Get scenario by ID
   */
  async getScenarioById(
    organizationId: Types.ObjectId,
    scenarioId: string
  ): Promise<IScenario> {
    const scenario = await Scenario.findOne({
      _id: new Types.ObjectId(scenarioId),
      organization: organizationId,
    });

    if (!scenario) {
      throw new NotFoundError('Scenario not found');
    }

    return scenario;
  }

  /**
   * Update a scenario
   */
  async updateScenario(
    organizationId: Types.ObjectId,
    scenarioId: string,
    userId: Types.ObjectId,
    input: UpdateScenarioInput
  ): Promise<IScenario> {
    const scenario = await this.getScenarioById(organizationId, scenarioId);

    // Update fields
    if (input.name !== undefined) scenario.name = input.name;
    if (input.description !== undefined) scenario.description = input.description || undefined;
    if (input.type !== undefined) scenario.type = input.type;
    if (input.probability !== undefined) scenario.probability = input.probability;
    if (input.assumptions !== undefined) scenario.assumptions = input.assumptions || undefined;
    if (input.notes !== undefined) scenario.notes = input.notes || undefined;
    if (input.tags !== undefined) scenario.tags = input.tags;

    scenario.updatedBy = userId;
    await scenario.save();

    return scenario;
  }

  /**
   * Archive a scenario
   */
  async archiveScenario(
    organizationId: Types.ObjectId,
    scenarioId: string,
    userId: Types.ObjectId
  ): Promise<void> {
    const scenario = await this.getScenarioById(organizationId, scenarioId);

    scenario.isArchived = true;
    scenario.updatedBy = userId;
    await scenario.save();

    // Archive all adjustments
    await ScenarioAdjustment.updateMany(
      { scenario: scenario._id },
      { isArchived: true, updatedBy: userId }
    );
  }

  /**
   * Activate a scenario
   */
  async activateScenario(
    organizationId: Types.ObjectId,
    scenarioId: string,
    userId: Types.ObjectId
  ): Promise<IScenario> {
    const scenario = await this.getScenarioById(organizationId, scenarioId);

    if (scenario.status === ScenarioStatus.ACTIVE) {
      throw new BadRequestError('Scenario is already active');
    }

    scenario.status = ScenarioStatus.ACTIVE;
    scenario.updatedBy = userId;
    await scenario.save();

    return scenario;
  }

  /**
   * Clone a scenario
   */
  async cloneScenario(
    organizationId: Types.ObjectId,
    scenarioId: string,
    userId: Types.ObjectId,
    newName: string
  ): Promise<IScenario> {
    const source = await this.getScenarioById(organizationId, scenarioId);
    const adjustments = await ScenarioAdjustment.findByScenario(source._id);

    // Check for duplicate name
    const existing = await Scenario.findOne({
      organization: organizationId,
      name: newName,
      fiscalYear: source.fiscalYear,
      isArchived: false,
    });

    if (existing) {
      throw new BadRequestError(
        `Scenario "${newName}" already exists for fiscal year ${source.fiscalYear}`
      );
    }

    // Create new scenario
    const newScenario = new Scenario({
      organization: organizationId,
      name: newName,
      description: source.description,
      type: source.type,
      fiscalYear: source.fiscalYear,
      linkedBudget: source.linkedBudget,
      linkedHeadcountPlan: source.linkedHeadcountPlan,
      linkedRevenuePlan: source.linkedRevenuePlan,
      status: ScenarioStatus.DRAFT,
      projectedRevenue: source.projectedRevenue,
      projectedExpenses: source.projectedExpenses,
      projectedNetIncome: source.projectedNetIncome,
      projectedRunway: source.projectedRunway,
      probability: source.probability,
      assumptions: source.assumptions,
      currency: source.currency,
      tags: source.tags,
      createdBy: userId,
    });

    await newScenario.save();

    // Clone adjustments
    for (const adj of adjustments) {
      const newAdj = new ScenarioAdjustment({
        organization: organizationId,
        scenario: newScenario._id,
        adjustmentType: adj.adjustmentType,
        referenceId: adj.referenceId,
        referenceName: adj.referenceName,
        referenceCategory: adj.referenceCategory,
        adjustmentMethod: adj.adjustmentMethod,
        adjustmentPercentage: adj.adjustmentPercentage,
        adjustmentAmount: adj.adjustmentAmount,
        originalAnnualAmount: adj.originalAnnualAmount,
        adjustedAnnualAmount: adj.adjustedAnnualAmount,
        impactType: adj.impactType,
        impactCategory: adj.impactCategory,
        monthlyImpact: adj.monthlyImpact,
        description: adj.description,
        assumptions: adj.assumptions,
        createdBy: userId,
      });

      await newAdj.save();
    }

    return newScenario;
  }

  // ============ Adjustments ============

  /**
   * Add adjustment to scenario
   */
  async addAdjustment(
    organizationId: Types.ObjectId,
    scenarioId: string,
    userId: Types.ObjectId,
    input: CreateAdjustmentInput
  ): Promise<IScenarioAdjustment> {
    const scenario = await this.getScenarioById(organizationId, scenarioId);

    const adjustment = new ScenarioAdjustment({
      organization: organizationId,
      scenario: scenario._id,
      ...input,
      referenceId: input.referenceId ? new Types.ObjectId(input.referenceId) : undefined,
      createdBy: userId,
    });

    await adjustment.save();
    await this.recalculateScenarioTotals(scenario._id);

    return adjustment;
  }

  /**
   * Update adjustment
   */
  async updateAdjustment(
    organizationId: Types.ObjectId,
    scenarioId: string,
    adjustmentId: string,
    userId: Types.ObjectId,
    input: UpdateAdjustmentInput
  ): Promise<IScenarioAdjustment> {
    const scenario = await this.getScenarioById(organizationId, scenarioId);

    const adjustment = await ScenarioAdjustment.findOne({
      _id: new Types.ObjectId(adjustmentId),
      scenario: scenario._id,
      isArchived: false,
    });

    if (!adjustment) {
      throw new NotFoundError('Adjustment not found');
    }

    // Update fields
    if (input.adjustmentMethod !== undefined) adjustment.adjustmentMethod = input.adjustmentMethod;
    if (input.adjustmentPercentage !== undefined) adjustment.adjustmentPercentage = input.adjustmentPercentage;
    if (input.adjustmentAmount !== undefined) adjustment.adjustmentAmount = input.adjustmentAmount;
    if (input.description !== undefined) adjustment.description = input.description || undefined;
    if (input.assumptions !== undefined) adjustment.assumptions = input.assumptions || undefined;

    adjustment.updatedBy = userId;
    await adjustment.save();
    await this.recalculateScenarioTotals(scenario._id);

    return adjustment;
  }

  /**
   * Delete adjustment
   */
  async deleteAdjustment(
    organizationId: Types.ObjectId,
    scenarioId: string,
    adjustmentId: string,
    userId: Types.ObjectId
  ): Promise<void> {
    const scenario = await this.getScenarioById(organizationId, scenarioId);

    const adjustment = await ScenarioAdjustment.findOne({
      _id: new Types.ObjectId(adjustmentId),
      scenario: scenario._id,
      isArchived: false,
    });

    if (!adjustment) {
      throw new NotFoundError('Adjustment not found');
    }

    adjustment.isArchived = true;
    adjustment.updatedBy = userId;
    await adjustment.save();
    await this.recalculateScenarioTotals(scenario._id);
  }

  /**
   * Get adjustments for a scenario
   */
  async getAdjustments(
    organizationId: Types.ObjectId,
    scenarioId: string
  ): Promise<IScenarioAdjustment[]> {
    const scenario = await this.getScenarioById(organizationId, scenarioId);
    return ScenarioAdjustment.findByScenario(scenario._id);
  }

  // ============ Analytics ============

  /**
   * Compare multiple scenarios
   */
  async compareScenarios(
    organizationId: Types.ObjectId,
    input: CompareScenarioInput
  ): Promise<{
    scenarios: Array<{
      id: string;
      name: string;
      type: string;
      projectedRevenue: number;
      projectedExpenses: number;
      projectedNetIncome: number;
      projectedRunway?: number;
      probability?: number;
    }>;
    summary: {
      minRevenue: { scenarioId: string; value: number };
      maxRevenue: { scenarioId: string; value: number };
      minExpenses: { scenarioId: string; value: number };
      maxExpenses: { scenarioId: string; value: number };
      minNetIncome: { scenarioId: string; value: number };
      maxNetIncome: { scenarioId: string; value: number };
      avgRevenue: number;
      avgExpenses: number;
      avgNetIncome: number;
    };
  }> {
    const scenarios = await Scenario.find({
      _id: { $in: input.scenarioIds.map(id => new Types.ObjectId(id)) },
      organization: organizationId,
      isArchived: false,
    });

    if (scenarios.length < 2) {
      throw new BadRequestError('At least 2 valid scenarios are required for comparison');
    }

    const data = scenarios.map(s => ({
      id: s._id.toString(),
      name: s.name,
      type: s.type,
      projectedRevenue: s.projectedRevenue,
      projectedExpenses: s.projectedExpenses,
      projectedNetIncome: s.projectedNetIncome,
      projectedRunway: s.projectedRunway,
      probability: s.probability,
    }));

    // Calculate summary statistics
    const minRevenue = data.reduce((min, s) => s.projectedRevenue < min.value ? { scenarioId: s.id, value: s.projectedRevenue } : min, { scenarioId: data[0].id, value: data[0].projectedRevenue });
    const maxRevenue = data.reduce((max, s) => s.projectedRevenue > max.value ? { scenarioId: s.id, value: s.projectedRevenue } : max, { scenarioId: data[0].id, value: data[0].projectedRevenue });
    const minExpenses = data.reduce((min, s) => s.projectedExpenses < min.value ? { scenarioId: s.id, value: s.projectedExpenses } : min, { scenarioId: data[0].id, value: data[0].projectedExpenses });
    const maxExpenses = data.reduce((max, s) => s.projectedExpenses > max.value ? { scenarioId: s.id, value: s.projectedExpenses } : max, { scenarioId: data[0].id, value: data[0].projectedExpenses });
    const minNetIncome = data.reduce((min, s) => s.projectedNetIncome < min.value ? { scenarioId: s.id, value: s.projectedNetIncome } : min, { scenarioId: data[0].id, value: data[0].projectedNetIncome });
    const maxNetIncome = data.reduce((max, s) => s.projectedNetIncome > max.value ? { scenarioId: s.id, value: s.projectedNetIncome } : max, { scenarioId: data[0].id, value: data[0].projectedNetIncome });

    const avgRevenue = data.reduce((sum, s) => sum + s.projectedRevenue, 0) / data.length;
    const avgExpenses = data.reduce((sum, s) => sum + s.projectedExpenses, 0) / data.length;
    const avgNetIncome = data.reduce((sum, s) => sum + s.projectedNetIncome, 0) / data.length;

    return {
      scenarios: data,
      summary: {
        minRevenue,
        maxRevenue,
        minExpenses,
        maxExpenses,
        minNetIncome,
        maxNetIncome,
        avgRevenue: Math.round(avgRevenue * 100) / 100,
        avgExpenses: Math.round(avgExpenses * 100) / 100,
        avgNetIncome: Math.round(avgNetIncome * 100) / 100,
      },
    };
  }

  /**
   * Calculate scenario impact
   */
  async getScenarioImpact(
    organizationId: Types.ObjectId,
    scenarioId: string
  ): Promise<{
    scenarioId: string;
    scenarioName: string;
    baselineRevenue: number;
    baselineExpenses: number;
    baselineNetIncome: number;
    adjustedRevenue: number;
    adjustedExpenses: number;
    adjustedNetIncome: number;
    revenueImpact: number;
    expenseImpact: number;
    netIncomeImpact: number;
    adjustmentCount: number;
    byCategory: Record<string, { original: number; adjusted: number; impact: number }>;
  }> {
    const scenario = await this.getScenarioById(organizationId, scenarioId);
    const adjustments = await ScenarioAdjustment.findByScenario(scenario._id);

    // Get baseline values from linked plans
    let baselineRevenue = 0;
    let baselineExpenses = 0;

    if (scenario.linkedRevenuePlan) {
      const plan = await RevenuePlan.findById(scenario.linkedRevenuePlan);
      if (plan) baselineRevenue = plan.totalProjectedRevenue;
    }

    if (scenario.linkedBudget) {
      const budget = await Budget.findById(scenario.linkedBudget);
      if (budget) baselineExpenses = budget.totalAmount;
    }

    // Calculate adjustments by category
    const byCategory: Record<string, { original: number; adjusted: number; impact: number }> = {};
    let revenueAdjustment = 0;
    let expenseAdjustment = 0;

    for (const adj of adjustments) {
      const impact = adj.adjustedAnnualAmount - adj.originalAnnualAmount;

      if (!byCategory[adj.impactCategory]) {
        byCategory[adj.impactCategory] = { original: 0, adjusted: 0, impact: 0 };
      }

      byCategory[adj.impactCategory].original += adj.originalAnnualAmount;
      byCategory[adj.impactCategory].adjusted += adj.adjustedAnnualAmount;
      byCategory[adj.impactCategory].impact += impact;

      if (adj.impactCategory === ImpactCategory.REVENUE) {
        revenueAdjustment += impact;
      } else if (adj.impactCategory === ImpactCategory.EXPENSE || adj.impactCategory === ImpactCategory.HEADCOUNT) {
        expenseAdjustment += impact;
      }
    }

    const adjustedRevenue = baselineRevenue + revenueAdjustment;
    const adjustedExpenses = baselineExpenses + expenseAdjustment;

    return {
      scenarioId: scenario._id.toString(),
      scenarioName: scenario.name,
      baselineRevenue,
      baselineExpenses,
      baselineNetIncome: baselineRevenue - baselineExpenses,
      adjustedRevenue,
      adjustedExpenses,
      adjustedNetIncome: adjustedRevenue - adjustedExpenses,
      revenueImpact: revenueAdjustment,
      expenseImpact: expenseAdjustment,
      netIncomeImpact: revenueAdjustment - expenseAdjustment,
      adjustmentCount: adjustments.length,
      byCategory,
    };
  }

  // ============ Helpers ============

  /**
   * Recalculate scenario totals from adjustments
   */
  private async recalculateScenarioTotals(scenarioId: Types.ObjectId): Promise<void> {
    const scenario = await Scenario.findById(scenarioId);
    if (!scenario) return;

    // Get baseline values
    let baselineRevenue = 0;
    let baselineExpenses = 0;

    if (scenario.linkedRevenuePlan) {
      const plan = await RevenuePlan.findById(scenario.linkedRevenuePlan);
      if (plan) baselineRevenue = plan.totalProjectedRevenue;
    }

    if (scenario.linkedBudget) {
      const budget = await Budget.findById(scenario.linkedBudget);
      if (budget) baselineExpenses = budget.totalAmount;
    }

    // Calculate adjustments
    const adjustments = await ScenarioAdjustment.find({
      scenario: scenarioId,
      isArchived: false,
    });

    let revenueAdjustment = 0;
    let expenseAdjustment = 0;

    for (const adj of adjustments) {
      const impact = adj.adjustedAnnualAmount - adj.originalAnnualAmount;

      if (adj.impactCategory === ImpactCategory.REVENUE) {
        revenueAdjustment += impact;
      } else if (adj.impactCategory === ImpactCategory.EXPENSE || adj.impactCategory === ImpactCategory.HEADCOUNT) {
        expenseAdjustment += impact;
      }
    }

    scenario.projectedRevenue = Math.round((baselineRevenue + revenueAdjustment) * 100) / 100;
    scenario.projectedExpenses = Math.round((baselineExpenses + expenseAdjustment) * 100) / 100;
    scenario.projectedNetIncome = Math.round((scenario.projectedRevenue - scenario.projectedExpenses) * 100) / 100;

    await scenario.save();
  }
}

// Export singleton instance
export const scenarioService = new ScenarioService();
