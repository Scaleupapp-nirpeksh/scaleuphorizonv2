/**
 * Cap Table Service
 *
 * Business logic for cap table management, including ownership tracking,
 * waterfall analysis, and round simulations
 */

import { Types } from 'mongoose';
import { CapTableEntry, ICapTableEntry } from '../models/cap-table-entry.model';
import { ShareClassModel, IShareClass } from '../models/share-class.model';
import { ShareholderType, CapTableEntryType } from '../../constants';
import {
  CreateShareClassInput,
  UpdateShareClassInput,
  CreateCapTableEntryInput,
  UpdateCapTableEntryInput,
  CapTableQueryInput,
  SimulateRoundInput,
  WaterfallInput,
} from '../schemas';
import { NotFoundError, BadRequestError } from '@/core/errors';

export class CapTableService {
  // ============ Share Class Management ============

  /**
   * Create a new share class
   */
  async createShareClass(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateShareClassInput
  ): Promise<IShareClass> {
    // Check for duplicate share class
    const existing = await ShareClassModel.findOne({
      organization: organizationId,
      class: input.class,
    });

    if (existing) {
      throw new BadRequestError(`Share class ${input.class} already exists`);
    }

    const shareClass = new ShareClassModel({
      organization: organizationId,
      ...input,
      createdBy: userId,
    });

    await shareClass.save();
    return shareClass;
  }

  /**
   * Get all share classes
   */
  async getShareClasses(
    organizationId: Types.ObjectId
  ): Promise<IShareClass[]> {
    return ShareClassModel.find({
      organization: organizationId,
      isActive: true,
    }).sort({ seniority: 1, name: 1 });
  }

  /**
   * Get share class by ID
   */
  async getShareClassById(
    organizationId: Types.ObjectId,
    shareClassId: string
  ): Promise<IShareClass> {
    const shareClass = await ShareClassModel.findOne({
      _id: new Types.ObjectId(shareClassId),
      organization: organizationId,
    });

    if (!shareClass) {
      throw new NotFoundError('Share class not found');
    }

    return shareClass;
  }

  /**
   * Update share class
   */
  async updateShareClass(
    organizationId: Types.ObjectId,
    shareClassId: string,
    input: UpdateShareClassInput
  ): Promise<IShareClass> {
    const shareClass = await this.getShareClassById(organizationId, shareClassId);

    // Validate authorized shares not less than issued
    if (input.authorizedShares !== undefined && input.authorizedShares < shareClass.issuedShares) {
      throw new BadRequestError(
        `Authorized shares cannot be less than issued shares (${shareClass.issuedShares})`
      );
    }

    Object.assign(shareClass, input);
    await shareClass.save();
    return shareClass;
  }

  // ============ Cap Table Entry Management ============

  /**
   * Create a cap table entry
   */
  async createEntry(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateCapTableEntryInput
  ): Promise<ICapTableEntry> {
    // Validate share class exists
    const shareClass = await ShareClassModel.findOne({
      organization: organizationId,
      class: input.shareClass,
    });

    if (!shareClass) {
      throw new NotFoundError(`Share class ${input.shareClass} not found. Create it first.`);
    }

    // For issuance, check if enough authorized shares
    if (input.entryType === CapTableEntryType.ISSUANCE && input.shares > 0) {
      const availableShares = shareClass.authorizedShares - shareClass.issuedShares;
      if (input.shares > availableShares) {
        throw new BadRequestError(
          `Not enough authorized shares. Available: ${availableShares}, Requested: ${input.shares}`
        );
      }
    }

    const entry = new CapTableEntry({
      organization: organizationId,
      shareholder: new Types.ObjectId(input.shareholder),
      shareholderType: input.shareholderType,
      shareholderName: input.shareholderName,
      shareClass: input.shareClass,
      entryType: input.entryType,
      shares: input.shares,
      pricePerShare: input.pricePerShare,
      round: input.round ? new Types.ObjectId(input.round) : undefined,
      effectiveDate: new Date(input.effectiveDate),
      certificateNumber: input.certificateNumber,
      notes: input.notes,
      createdBy: userId,
    });

    await entry.save();

    // Update share class issued count
    await this.updateShareClassCounts(organizationId);

    // Recalculate ownership percentages
    await this.recalculateOwnership(organizationId);

    return entry;
  }

  /**
   * Get all cap table entries
   */
  async getEntries(
    organizationId: Types.ObjectId,
    query: CapTableQueryInput
  ): Promise<ICapTableEntry[]> {
    const filter: Record<string, unknown> = { organization: organizationId };

    if (query.shareholderType) filter.shareholderType = query.shareholderType;
    if (query.shareClass) filter.shareClass = query.shareClass;
    if (query.asOfDate) {
      filter.effectiveDate = { $lte: new Date(query.asOfDate) };
    }

    return CapTableEntry.find(filter)
      .sort({ effectiveDate: -1 })
      .populate('round', 'name type');
  }

  /**
   * Get entry by ID
   */
  async getEntryById(
    organizationId: Types.ObjectId,
    entryId: string
  ): Promise<ICapTableEntry> {
    const entry = await CapTableEntry.findOne({
      _id: new Types.ObjectId(entryId),
      organization: organizationId,
    });

    if (!entry) {
      throw new NotFoundError('Cap table entry not found');
    }

    return entry;
  }

  /**
   * Update entry
   */
  async updateEntry(
    organizationId: Types.ObjectId,
    entryId: string,
    input: UpdateCapTableEntryInput
  ): Promise<ICapTableEntry> {
    const entry = await this.getEntryById(organizationId, entryId);

    Object.assign(entry, {
      ...input,
      effectiveDate: input.effectiveDate ? new Date(input.effectiveDate) : entry.effectiveDate,
    });

    await entry.save();
    return entry;
  }

  /**
   * Delete entry
   */
  async deleteEntry(
    organizationId: Types.ObjectId,
    entryId: string
  ): Promise<void> {
    const entry = await this.getEntryById(organizationId, entryId);
    await CapTableEntry.deleteOne({ _id: entry._id });

    // Update counts and ownership
    await this.updateShareClassCounts(organizationId);
    await this.recalculateOwnership(organizationId);
  }

  // ============ Summary and Analytics ============

  /**
   * Get cap table summary
   */
  async getSummary(
    organizationId: Types.ObjectId,
    asOfDate?: Date
  ): Promise<{
    asOfDate: Date;
    totalAuthorizedShares: number;
    totalIssuedShares: number;
    totalOutstandingShares: number;
    byShareClass: Array<{
      shareClass: string;
      authorizedShares: number;
      issuedShares: number;
      outstandingShares: number;
      percentOfTotal: number;
    }>;
    byShareholder: Array<{
      shareholderId: Types.ObjectId;
      name: string;
      type: string;
      totalShares: number;
      percentOwnership: number;
      byShareClass: Array<{ shareClass: string; shares: number }>;
    }>;
    byShareholderType: Array<{
      type: string;
      holderCount: number;
      totalShares: number;
      percentOwnership: number;
    }>;
  }> {
    const effectiveDate = asOfDate || new Date();

    // Get all entries up to the effective date
    const entries = await CapTableEntry.find({
      organization: organizationId,
      effectiveDate: { $lte: effectiveDate },
    });

    // Get share classes
    const shareClasses = await ShareClassModel.find({
      organization: organizationId,
      isActive: true,
    });

    // Calculate totals by shareholder
    const shareholderMap = new Map<string, {
      shareholderId: Types.ObjectId;
      name: string;
      type: string;
      byShareClass: Map<string, number>;
    }>();

    for (const entry of entries) {
      const key = entry.shareholder.toString();
      if (!shareholderMap.has(key)) {
        shareholderMap.set(key, {
          shareholderId: entry.shareholder,
          name: entry.shareholderName,
          type: entry.shareholderType,
          byShareClass: new Map(),
        });
      }

      const holder = shareholderMap.get(key)!;
      const currentShares = holder.byShareClass.get(entry.shareClass) || 0;
      holder.byShareClass.set(entry.shareClass, currentShares + entry.shares);
    }

    // Calculate totals
    let totalIssuedShares = 0;
    const shareClassTotals = new Map<string, number>();

    for (const holder of shareholderMap.values()) {
      for (const [shareClass, shares] of holder.byShareClass) {
        totalIssuedShares += shares;
        const current = shareClassTotals.get(shareClass) || 0;
        shareClassTotals.set(shareClass, current + shares);
      }
    }

    // Build results
    const totalAuthorizedShares = shareClasses.reduce((sum, sc) => sum + sc.authorizedShares, 0);

    const byShareClass = shareClasses.map(sc => ({
      shareClass: sc.class,
      authorizedShares: sc.authorizedShares,
      issuedShares: shareClassTotals.get(sc.class) || 0,
      outstandingShares: shareClassTotals.get(sc.class) || 0,
      percentOfTotal: totalIssuedShares > 0
        ? ((shareClassTotals.get(sc.class) || 0) / totalIssuedShares) * 100
        : 0,
    }));

    const byShareholder = Array.from(shareholderMap.values()).map(holder => {
      const totalShares = Array.from(holder.byShareClass.values()).reduce((sum, s) => sum + s, 0);
      return {
        shareholderId: holder.shareholderId,
        name: holder.name,
        type: holder.type,
        totalShares,
        percentOwnership: totalIssuedShares > 0 ? (totalShares / totalIssuedShares) * 100 : 0,
        byShareClass: Array.from(holder.byShareClass.entries()).map(([shareClass, shares]) => ({
          shareClass,
          shares,
        })),
      };
    }).sort((a, b) => b.totalShares - a.totalShares);

    // Group by shareholder type
    const typeMap = new Map<string, { count: number; shares: number }>();
    for (const holder of byShareholder) {
      const current = typeMap.get(holder.type) || { count: 0, shares: 0 };
      typeMap.set(holder.type, {
        count: current.count + 1,
        shares: current.shares + holder.totalShares,
      });
    }

    const byShareholderType = Array.from(typeMap.entries()).map(([type, data]) => ({
      type,
      holderCount: data.count,
      totalShares: data.shares,
      percentOwnership: totalIssuedShares > 0 ? (data.shares / totalIssuedShares) * 100 : 0,
    }));

    return {
      asOfDate: effectiveDate,
      totalAuthorizedShares,
      totalIssuedShares,
      totalOutstandingShares: totalIssuedShares,
      byShareClass,
      byShareholder,
      byShareholderType,
    };
  }

  /**
   * Waterfall analysis
   */
  async getWaterfall(
    organizationId: Types.ObjectId,
    input: WaterfallInput
  ): Promise<{
    exitValuation: number;
    distribution: Array<{
      shareholderId: Types.ObjectId;
      shareholderName: string;
      shareholderType: string;
      shares: number;
      percentOwnership: number;
      proceeds: number;
      multiple?: number;
    }>;
    totalDistributed: number;
  }> {
    const summary = await this.getSummary(organizationId);
    const shareClasses = await this.getShareClasses(organizationId);

    // Sort share classes by seniority (highest first for liquidation preference)
    const sortedClasses = shareClasses.sort((a, b) => b.seniority - a.seniority);

    let remainingProceeds = input.exitValuation;
    const distribution: Array<{
      shareholderId: Types.ObjectId;
      shareholderName: string;
      shareholderType: string;
      shares: number;
      percentOwnership: number;
      proceeds: number;
      multiple?: number;
    }> = [];

    // First pass: Pay liquidation preferences
    const shareholderProceeds = new Map<string, number>();
    const shareholderInvestment = new Map<string, number>(); // Track for multiple calculation

    for (const shareClass of sortedClasses) {
      if (!shareClass.liquidationPreference) continue;

      for (const holder of summary.byShareholder) {
        const classShares = holder.byShareClass.find(c => c.shareClass === shareClass.class);
        if (!classShares || classShares.shares <= 0) continue;

        // Get original investment value
        const entries = await CapTableEntry.find({
          organization: organizationId,
          shareholder: holder.shareholderId,
          shareClass: shareClass.class,
          entryType: CapTableEntryType.ISSUANCE,
        });

        const investmentValue = entries.reduce((sum, e) => sum + (e.totalValue || 0), 0);
        const liquidationAmount = investmentValue * shareClass.liquidationPreference;

        const proceeds = Math.min(liquidationAmount, remainingProceeds);
        remainingProceeds -= proceeds;

        const current = shareholderProceeds.get(holder.shareholderId.toString()) || 0;
        shareholderProceeds.set(holder.shareholderId.toString(), current + proceeds);

        const currentInv = shareholderInvestment.get(holder.shareholderId.toString()) || 0;
        shareholderInvestment.set(holder.shareholderId.toString(), currentInv + investmentValue);
      }
    }

    // Second pass: Distribute remaining pro-rata
    if (remainingProceeds > 0 && summary.totalIssuedShares > 0) {
      const pricePerShare = remainingProceeds / summary.totalIssuedShares;

      for (const holder of summary.byShareholder) {
        const proRataProceeds = holder.totalShares * pricePerShare;
        const current = shareholderProceeds.get(holder.shareholderId.toString()) || 0;
        shareholderProceeds.set(holder.shareholderId.toString(), current + proRataProceeds);
      }
    }

    // Build distribution result
    for (const holder of summary.byShareholder) {
      const proceeds = shareholderProceeds.get(holder.shareholderId.toString()) || 0;
      const investment = shareholderInvestment.get(holder.shareholderId.toString()) || 0;

      distribution.push({
        shareholderId: holder.shareholderId,
        shareholderName: holder.name,
        shareholderType: holder.type,
        shares: holder.totalShares,
        percentOwnership: holder.percentOwnership,
        proceeds,
        multiple: investment > 0 ? proceeds / investment : undefined,
      });
    }

    distribution.sort((a, b) => b.proceeds - a.proceeds);

    return {
      exitValuation: input.exitValuation,
      distribution,
      totalDistributed: distribution.reduce((sum, d) => sum + d.proceeds, 0),
    };
  }

  /**
   * Simulate a new funding round
   */
  async simulateRound(
    organizationId: Types.ObjectId,
    input: SimulateRoundInput
  ): Promise<{
    roundName: string;
    investmentAmount: number;
    pricePerShare: number;
    newShares: number;
    preMoneyValuation: number;
    postMoneyValuation: number;
    dilution: Array<{
      shareholderId: Types.ObjectId;
      shareholderName: string;
      sharesBefore: number;
      sharesAfter: number;
      percentBefore: number;
      percentAfter: number;
      dilutionPercent: number;
    }>;
    newCapTable: Array<{
      shareholderId: Types.ObjectId;
      name: string;
      type: string;
      totalShares: number;
      percentOwnership: number;
    }>;
  }> {
    const summary = await this.getSummary(organizationId);
    const currentTotalShares = summary.totalIssuedShares;

    // Calculate new shares to issue
    const postMoneyValuation = input.preMoneyValuation + input.investmentAmount;
    const pricePerShare = input.preMoneyValuation / currentTotalShares;
    const newShares = Math.floor(input.investmentAmount / pricePerShare);

    // Calculate option pool increase if any
    let optionPoolShares = 0;
    if (input.optionPoolIncrease > 0) {
      const totalAfterRound = currentTotalShares + newShares;
      optionPoolShares = Math.floor(totalAfterRound * (input.optionPoolIncrease / 100));
    }

    const totalSharesAfter = currentTotalShares + newShares + optionPoolShares;

    // Calculate dilution for each existing shareholder
    const dilution = summary.byShareholder.map(holder => ({
      shareholderId: holder.shareholderId,
      shareholderName: holder.name,
      sharesBefore: holder.totalShares,
      sharesAfter: holder.totalShares,
      percentBefore: holder.percentOwnership,
      percentAfter: (holder.totalShares / totalSharesAfter) * 100,
      dilutionPercent: holder.percentOwnership - (holder.totalShares / totalSharesAfter) * 100,
    }));

    // Build new cap table
    const newCapTable = summary.byShareholder.map(holder => ({
      shareholderId: holder.shareholderId,
      name: holder.name,
      type: holder.type,
      totalShares: holder.totalShares,
      percentOwnership: (holder.totalShares / totalSharesAfter) * 100,
    }));

    // Add new investor
    newCapTable.push({
      shareholderId: new Types.ObjectId(),
      name: `${input.roundName} Investors`,
      type: ShareholderType.INVESTOR,
      totalShares: newShares,
      percentOwnership: (newShares / totalSharesAfter) * 100,
    });

    // Add option pool increase if any
    if (optionPoolShares > 0) {
      const existingPool = newCapTable.find(h => h.type === ShareholderType.COMPANY);
      if (existingPool) {
        existingPool.totalShares += optionPoolShares;
        existingPool.percentOwnership = (existingPool.totalShares / totalSharesAfter) * 100;
      } else {
        newCapTable.push({
          shareholderId: new Types.ObjectId(),
          name: 'ESOP Pool',
          type: ShareholderType.COMPANY,
          totalShares: optionPoolShares,
          percentOwnership: (optionPoolShares / totalSharesAfter) * 100,
        });
      }
    }

    newCapTable.sort((a, b) => b.totalShares - a.totalShares);

    return {
      roundName: input.roundName,
      investmentAmount: input.investmentAmount,
      pricePerShare,
      newShares,
      preMoneyValuation: input.preMoneyValuation,
      postMoneyValuation,
      dilution,
      newCapTable,
    };
  }

  // ============ Helper Methods ============

  /**
   * Update share class issued/outstanding counts
   */
  private async updateShareClassCounts(
    organizationId: Types.ObjectId
  ): Promise<void> {
    const shareClasses = await ShareClassModel.find({
      organization: organizationId,
    });

    for (const shareClass of shareClasses) {
      const result = await CapTableEntry.aggregate([
        {
          $match: {
            organization: organizationId,
            shareClass: shareClass.class,
          },
        },
        {
          $group: {
            _id: null,
            totalShares: { $sum: '$shares' },
          },
        },
      ]);

      const totalShares = result[0]?.totalShares || 0;
      shareClass.issuedShares = totalShares;
      shareClass.outstandingShares = totalShares;
      await shareClass.save();
    }
  }

  /**
   * Recalculate ownership percentages for all entries
   */
  private async recalculateOwnership(
    organizationId: Types.ObjectId
  ): Promise<void> {
    const summary = await this.getSummary(organizationId);

    for (const holder of summary.byShareholder) {
      await CapTableEntry.updateMany(
        {
          organization: organizationId,
          shareholder: holder.shareholderId,
        },
        {
          percentOwnership: holder.percentOwnership,
        }
      );
    }
  }
}

export const capTableService = new CapTableService();
