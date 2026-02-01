import { Types } from 'mongoose';
import { HeadcountPlan, IHeadcountPlan, PlannedRole, IPlannedRole } from '../models';
import {
  CreateHeadcountPlanInput,
  UpdateHeadcountPlanInput,
  CreatePlannedRoleInput,
  UpdatePlannedRoleInput,
  FillRoleInput,
  HeadcountQueryInput,
} from '../schemas';
import { HeadcountPlanStatus, RoleStatus } from '../../constants';
import { NotFoundError, BadRequestError } from '@/core/errors';
import { HeadcountSummary, TimelineEntry, MonthlyCostProjection } from '../../types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export class HeadcountService {
  // ============ Plan CRUD ============

  async createPlan(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateHeadcountPlanInput
  ): Promise<IHeadcountPlan> {
    const plan = new HeadcountPlan({
      organization: organizationId,
      name: input.name,
      description: input.description,
      fiscalYear: input.fiscalYear,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      currentHeadcount: input.currentHeadcount || 0,
      targetHeadcount: input.targetHeadcount || 0,
      linkedBudget: input.linkedBudgetId ? new Types.ObjectId(input.linkedBudgetId) : undefined,
      currency: input.currency,
      createdBy: userId,
    });

    await plan.save();
    return plan;
  }

  async getPlans(
    organizationId: Types.ObjectId,
    filters?: HeadcountQueryInput
  ): Promise<IHeadcountPlan[]> {
    const query: Record<string, unknown> = {
      organization: organizationId,
      isArchived: false,
    };

    if (filters?.fiscalYear) query.fiscalYear = filters.fiscalYear;
    if (filters?.status) query.status = filters.status;
    if (filters?.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }

    return HeadcountPlan.find(query).sort({ fiscalYear: -1, createdAt: -1 });
  }

  async getPlanById(
    organizationId: Types.ObjectId,
    planId: string
  ): Promise<IHeadcountPlan> {
    const plan = await HeadcountPlan.findOne({
      _id: new Types.ObjectId(planId),
      organization: organizationId,
    });

    if (!plan) throw new NotFoundError('Headcount plan not found');
    return plan;
  }

  async updatePlan(
    organizationId: Types.ObjectId,
    planId: string,
    userId: Types.ObjectId,
    input: UpdateHeadcountPlanInput
  ): Promise<IHeadcountPlan> {
    const plan = await this.getPlanById(organizationId, planId);

    if (plan.status === HeadcountPlanStatus.APPROVED || plan.status === HeadcountPlanStatus.ACTIVE) {
      throw new BadRequestError('Cannot update approved or active plans');
    }

    if (input.name !== undefined) plan.name = input.name;
    if (input.description !== undefined) plan.description = input.description || undefined;
    if (input.currentHeadcount !== undefined) plan.currentHeadcount = input.currentHeadcount;
    if (input.targetHeadcount !== undefined) plan.targetHeadcount = input.targetHeadcount;
    if (input.notes !== undefined) plan.notes = input.notes || undefined;

    plan.updatedBy = userId;
    await plan.save();
    return plan;
  }

  async archivePlan(
    organizationId: Types.ObjectId,
    planId: string,
    userId: Types.ObjectId
  ): Promise<void> {
    const plan = await this.getPlanById(organizationId, planId);

    plan.isArchived = true;
    plan.archivedAt = new Date();
    plan.archivedBy = userId;
    await plan.save();

    await PlannedRole.updateMany(
      { headcountPlan: plan._id },
      { isArchived: true, updatedBy: userId }
    );
  }

  async approvePlan(
    organizationId: Types.ObjectId,
    planId: string,
    userId: Types.ObjectId
  ): Promise<IHeadcountPlan> {
    const plan = await this.getPlanById(organizationId, planId);

    if (plan.status !== HeadcountPlanStatus.PENDING) {
      throw new BadRequestError('Only pending plans can be approved');
    }

    plan.status = HeadcountPlanStatus.APPROVED;
    plan.approvedBy = userId;
    plan.approvedAt = new Date();
    plan.updatedBy = userId;
    await plan.save();

    return plan;
  }

  // ============ Planned Roles ============

  async addRole(
    organizationId: Types.ObjectId,
    planId: string,
    userId: Types.ObjectId,
    input: CreatePlannedRoleInput
  ): Promise<IPlannedRole> {
    const plan = await this.getPlanById(organizationId, planId);

    if (plan.status === HeadcountPlanStatus.APPROVED || plan.status === HeadcountPlanStatus.ACTIVE) {
      throw new BadRequestError('Cannot add roles to approved or active plans');
    }

    const role = new PlannedRole({
      organization: organizationId,
      headcountPlan: plan._id,
      title: input.title,
      department: input.department,
      level: input.level,
      employmentType: input.employmentType,
      location: input.location,
      remoteStatus: input.remoteStatus,
      plannedStartDate: new Date(input.plannedStartDate),
      plannedEndDate: input.plannedEndDate ? new Date(input.plannedEndDate) : undefined,
      baseSalary: input.baseSalary,
      currency: input.currency,
      salaryFrequency: input.salaryFrequency,
      benefitsPercentage: input.benefitsPercentage,
      bonusTarget: input.bonusTarget,
      equipmentCost: input.equipmentCost,
      recruitingCost: input.recruitingCost,
      trainingCost: input.trainingCost,
      justification: input.justification,
      priority: input.priority,
      tags: input.tags,
      createdBy: userId,
    });

    await role.save();
    await this.recalculatePlanTotals(plan._id);

    return role;
  }

  async updateRole(
    organizationId: Types.ObjectId,
    planId: string,
    roleId: string,
    userId: Types.ObjectId,
    input: UpdatePlannedRoleInput
  ): Promise<IPlannedRole> {
    const plan = await this.getPlanById(organizationId, planId);

    const role = await PlannedRole.findOne({
      _id: new Types.ObjectId(roleId),
      headcountPlan: plan._id,
      isArchived: false,
    });

    if (!role) throw new NotFoundError('Planned role not found');

    if (input.title !== undefined) role.title = input.title;
    if (input.department !== undefined) role.department = input.department;
    if (input.level !== undefined) role.level = input.level as typeof role.level;
    if (input.employmentType !== undefined) role.employmentType = input.employmentType as typeof role.employmentType;
    if (input.location !== undefined) role.location = input.location || undefined;
    if (input.remoteStatus !== undefined) role.remoteStatus = (input.remoteStatus || undefined) as typeof role.remoteStatus;
    if (input.plannedStartDate !== undefined) role.plannedStartDate = new Date(input.plannedStartDate);
    if (input.baseSalary !== undefined) role.baseSalary = input.baseSalary;
    if (input.benefitsPercentage !== undefined) role.benefitsPercentage = input.benefitsPercentage;
    if (input.priority !== undefined) role.priority = input.priority as typeof role.priority;
    if (input.status !== undefined) role.status = input.status as typeof role.status;

    role.updatedBy = userId;
    await role.save();
    await this.recalculatePlanTotals(plan._id);

    return role;
  }

  async deleteRole(
    organizationId: Types.ObjectId,
    planId: string,
    roleId: string,
    userId: Types.ObjectId
  ): Promise<void> {
    const plan = await this.getPlanById(organizationId, planId);

    const role = await PlannedRole.findOne({
      _id: new Types.ObjectId(roleId),
      headcountPlan: plan._id,
      isArchived: false,
    });

    if (!role) throw new NotFoundError('Planned role not found');

    role.isArchived = true;
    role.updatedBy = userId;
    await role.save();
    await this.recalculatePlanTotals(plan._id);
  }

  async getRoles(
    organizationId: Types.ObjectId,
    planId: string
  ): Promise<IPlannedRole[]> {
    const plan = await this.getPlanById(organizationId, planId);
    return PlannedRole.findByPlan(plan._id);
  }

  async fillRole(
    organizationId: Types.ObjectId,
    planId: string,
    roleId: string,
    userId: Types.ObjectId,
    input: FillRoleInput
  ): Promise<IPlannedRole> {
    const plan = await this.getPlanById(organizationId, planId);

    const role = await PlannedRole.findOne({
      _id: new Types.ObjectId(roleId),
      headcountPlan: plan._id,
      isArchived: false,
    });

    if (!role) throw new NotFoundError('Planned role not found');

    role.status = RoleStatus.FILLED;
    role.filledBy = new Types.ObjectId(input.filledById);
    role.filledDate = new Date(input.filledDate);
    role.updatedBy = userId;
    await role.save();

    return role;
  }

  // ============ Analytics ============

  async getPlanSummary(
    organizationId: Types.ObjectId,
    planId: string
  ): Promise<HeadcountSummary> {
    const plan = await this.getPlanById(organizationId, planId);
    const roles = await PlannedRole.findByPlan(plan._id);

    const byDepartment: Record<string, number> = {};
    const byLevel: Record<string, number> = {};

    for (const role of roles) {
      byDepartment[role.department] = (byDepartment[role.department] || 0) + 1;
      byLevel[role.level] = (byLevel[role.level] || 0) + 1;
    }

    return {
      id: plan._id.toString(),
      name: plan.name,
      fiscalYear: plan.fiscalYear,
      status: plan.status,
      currentHeadcount: plan.currentHeadcount,
      targetHeadcount: plan.targetHeadcount,
      plannedHires: roles.length,
      totalSalaryCost: plan.totalSalaryCost,
      totalBenefitsCost: plan.totalBenefitsCost,
      totalCost: plan.totalCost,
      byDepartment,
      byLevel,
      createdAt: plan.createdAt.toISOString(),
    };
  }

  async getTimeline(
    organizationId: Types.ObjectId,
    planId: string
  ): Promise<TimelineEntry[]> {
    const plan = await this.getPlanById(organizationId, planId);
    const roles = await PlannedRole.findByPlan(plan._id);

    return roles.map(role => ({
      roleId: role._id.toString(),
      title: role.title,
      department: role.department,
      level: role.level,
      plannedStartDate: role.plannedStartDate,
      plannedStartMonth: role.plannedStartDate.getMonth() + 1,
      baseSalary: role.baseSalary,
      totalCost: role.totalAnnualCost,
      status: role.status,
    })).sort((a, b) => a.plannedStartDate.getTime() - b.plannedStartDate.getTime());
  }

  async getCostProjection(
    organizationId: Types.ObjectId,
    planId: string
  ): Promise<MonthlyCostProjection[]> {
    const plan = await this.getPlanById(organizationId, planId);
    const roles = await PlannedRole.findByPlan(plan._id);

    const projections: MonthlyCostProjection[] = [];
    let cumulativeHeadcount = plan.currentHeadcount;

    for (let month = 1; month <= 12; month++) {
      let salaryTotal = 0;
      let benefitsTotal = 0;
      let newHires = 0;

      for (const role of roles) {
        const startMonth = role.plannedStartDate.getMonth() + 1;
        if (startMonth === month) {
          newHires++;
          cumulativeHeadcount++;
        }

        const monthCost = role.monthlyCosts.find(mc => mc.month === month);
        if (monthCost) {
          salaryTotal += monthCost.salary;
          benefitsTotal += monthCost.benefits;
        }
      }

      projections.push({
        month,
        monthName: MONTH_NAMES[month - 1],
        salaryTotal: Math.round(salaryTotal * 100) / 100,
        benefitsTotal: Math.round(benefitsTotal * 100) / 100,
        total: Math.round((salaryTotal + benefitsTotal) * 100) / 100,
        newHires,
        cumulativeHeadcount,
      });
    }

    return projections;
  }

  // ============ Helpers ============

  private async recalculatePlanTotals(planId: Types.ObjectId): Promise<void> {
    const roles = await PlannedRole.find({
      headcountPlan: planId,
      isArchived: false,
    });

    let totalSalary = 0;
    let totalBenefits = 0;

    for (const role of roles) {
      for (const mc of role.monthlyCosts) {
        totalSalary += mc.salary;
        totalBenefits += mc.benefits;
      }
    }

    await HeadcountPlan.findByIdAndUpdate(planId, {
      totalSalaryCost: Math.round(totalSalary * 100) / 100,
      totalBenefitsCost: Math.round(totalBenefits * 100) / 100,
      totalCost: Math.round((totalSalary + totalBenefits) * 100) / 100,
      targetHeadcount: roles.length,
    });
  }
}

export const headcountService = new HeadcountService();
