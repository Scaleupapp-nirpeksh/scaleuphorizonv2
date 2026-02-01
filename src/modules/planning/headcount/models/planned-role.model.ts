import mongoose, { Schema, Document, Types, Model } from 'mongoose';
import {
  EmploymentType,
  JobLevel,
  RoleStatus,
  RemoteStatus,
  EmploymentTypeValue,
  JobLevelType,
  RoleStatusType,
  RemoteStatusType,
  PLANNING_CONSTANTS,
} from '../../constants';

export interface IMonthlyCost {
  month: number;
  salary: number;
  benefits: number;
  total: number;
}

export interface IPlannedRole extends Document {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  headcountPlan: Types.ObjectId;
  title: string;
  department: string;
  level: JobLevelType;
  employmentType: EmploymentTypeValue;
  location?: string;
  remoteStatus?: RemoteStatusType;
  plannedStartDate: Date;
  plannedEndDate?: Date;
  baseSalary: number;
  currency: string;
  salaryFrequency: 'annual' | 'monthly' | 'hourly';
  benefitsPercentage: number;
  benefitsAmount?: number;
  bonusTarget?: number;
  equipmentCost?: number;
  recruitingCost?: number;
  trainingCost?: number;
  monthlyCosts: IMonthlyCost[];
  totalAnnualCost: number;
  reportsTo?: Types.ObjectId;
  requisitionId?: string;
  hiringManager?: Types.ObjectId;
  justification?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: RoleStatusType;
  filledBy?: Types.ObjectId;
  filledDate?: Date;
  tags?: string[];
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPlannedRoleModel extends Model<IPlannedRole> {
  findByPlan(planId: Types.ObjectId): Promise<IPlannedRole[]>;
  findByDepartment(
    organizationId: Types.ObjectId,
    department: string
  ): Promise<IPlannedRole[]>;
  getCostProjection(
    planId: Types.ObjectId
  ): Promise<{ month: number; total: number }[]>;
}

const monthlyCostSchema = new Schema<IMonthlyCost>(
  {
    month: { type: Number, required: true, min: 1, max: 12 },
    salary: { type: Number, required: true, min: 0 },
    benefits: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const plannedRoleSchema = new Schema<IPlannedRole>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    headcountPlan: {
      type: Schema.Types.ObjectId,
      ref: 'HeadcountPlan',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [PLANNING_CONSTANTS.NAME_MAX_LENGTH, 'Title too long'],
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    level: {
      type: String,
      required: true,
      enum: Object.values(JobLevel),
    },
    employmentType: {
      type: String,
      default: EmploymentType.FULL_TIME,
      enum: Object.values(EmploymentType),
    },
    location: String,
    remoteStatus: {
      type: String,
      enum: Object.values(RemoteStatus),
    },
    plannedStartDate: {
      type: Date,
      required: [true, 'Planned start date is required'],
    },
    plannedEndDate: Date,
    baseSalary: {
      type: Number,
      required: [true, 'Base salary is required'],
      min: 0,
    },
    currency: {
      type: String,
      default: PLANNING_CONSTANTS.DEFAULT_CURRENCY,
      uppercase: true,
    },
    salaryFrequency: {
      type: String,
      default: 'annual',
      enum: ['annual', 'monthly', 'hourly'],
    },
    benefitsPercentage: {
      type: Number,
      default: PLANNING_CONSTANTS.DEFAULT_BENEFITS_PERCENTAGE,
      min: 0,
      max: 100,
    },
    benefitsAmount: { type: Number, min: 0 },
    bonusTarget: { type: Number, min: 0 },
    equipmentCost: { type: Number, min: 0 },
    recruitingCost: { type: Number, min: 0 },
    trainingCost: { type: Number, min: 0 },
    monthlyCosts: [monthlyCostSchema],
    totalAnnualCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    reportsTo: {
      type: Schema.Types.ObjectId,
      ref: 'PlannedRole',
    },
    requisitionId: String,
    hiringManager: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    justification: {
      type: String,
      maxlength: [PLANNING_CONSTANTS.DESCRIPTION_MAX_LENGTH, 'Justification too long'],
    },
    priority: {
      type: String,
      default: 'medium',
      enum: ['critical', 'high', 'medium', 'low'],
    },
    status: {
      type: String,
      default: RoleStatus.PLANNED,
      enum: Object.values(RoleStatus),
    },
    filledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    filledDate: Date,
    tags: [String],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as Types.ObjectId).toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

plannedRoleSchema.index({ organization: 1, headcountPlan: 1 });
plannedRoleSchema.index({ headcountPlan: 1, department: 1 });
plannedRoleSchema.index({ headcountPlan: 1, status: 1 });

// Calculate monthly costs before save
plannedRoleSchema.pre('save', function (next) {
  if (this.isModified('baseSalary') || this.isModified('benefitsPercentage') || this.isModified('plannedStartDate')) {
    const startMonth = this.plannedStartDate.getMonth() + 1;
    const annualSalary = this.salaryFrequency === 'annual' ? this.baseSalary :
      this.salaryFrequency === 'monthly' ? this.baseSalary * 12 :
        this.baseSalary * 2080; // hourly * 40hrs * 52weeks

    const monthlySalary = annualSalary / 12;
    const monthlyBenefits = (monthlySalary * this.benefitsPercentage) / 100;

    this.monthlyCosts = [];
    let totalCost = 0;

    for (let month = 1; month <= 12; month++) {
      if (month >= startMonth) {
        const cost = {
          month,
          salary: Math.round(monthlySalary * 100) / 100,
          benefits: Math.round(monthlyBenefits * 100) / 100,
          total: Math.round((monthlySalary + monthlyBenefits) * 100) / 100,
        };
        this.monthlyCosts.push(cost);
        totalCost += cost.total;
      } else {
        this.monthlyCosts.push({ month, salary: 0, benefits: 0, total: 0 });
      }
    }

    // Add one-time costs
    totalCost += (this.equipmentCost || 0) + (this.recruitingCost || 0) + (this.trainingCost || 0);
    this.totalAnnualCost = Math.round(totalCost * 100) / 100;
  }
  next();
});

plannedRoleSchema.statics.findByPlan = function (
  planId: Types.ObjectId
): Promise<IPlannedRole[]> {
  return this.find({
    headcountPlan: planId,
    isArchived: false,
  }).sort({ department: 1, plannedStartDate: 1 });
};

plannedRoleSchema.statics.findByDepartment = function (
  organizationId: Types.ObjectId,
  department: string
): Promise<IPlannedRole[]> {
  return this.find({
    organization: organizationId,
    department,
    isArchived: false,
  });
};

plannedRoleSchema.statics.getCostProjection = async function (
  planId: Types.ObjectId
): Promise<{ month: number; total: number }[]> {
  const roles = await this.find({
    headcountPlan: planId,
    isArchived: false,
  });

  const monthlyTotals: Record<number, number> = {};
  for (let month = 1; month <= 12; month++) {
    monthlyTotals[month] = 0;
  }

  for (const role of roles) {
    for (const mc of role.monthlyCosts) {
      monthlyTotals[mc.month] += mc.total;
    }
  }

  return Object.entries(monthlyTotals).map(([month, total]) => ({
    month: parseInt(month),
    total: Math.round(total * 100) / 100,
  }));
};

export const PlannedRole = mongoose.model<IPlannedRole, IPlannedRoleModel>(
  'PlannedRole',
  plannedRoleSchema
);

export default PlannedRole;
