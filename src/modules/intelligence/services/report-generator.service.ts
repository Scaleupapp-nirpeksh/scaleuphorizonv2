/**
 * Report Generator Service
 *
 * Generate investor updates and financial reports using AI
 */

import { Types } from 'mongoose';
import { openaiService } from './openai.service';
import { AIQuery } from '../models';
import { INVESTOR_UPDATE_PROMPT, MONTHLY_SUMMARY_PROMPT, buildPrompt } from '../prompts';
import { ReportType, ReportTone } from '../constants';
import {
  ReportGenerationRequest,
  GeneratedReport,
  ReportSection,
  FinancialContext,
} from '../types';

// Import from other modules
import { Expense } from '@/modules/tracking/expenses/models';
import { RevenueEntry } from '@/modules/tracking/revenue/models';
import { Round } from '@/modules/fundraising/rounds/models';
import { Investor } from '@/modules/fundraising/investors/models';
import { Milestone } from '@/modules/operations/milestones/models';
import { Organization } from '@/modules/organization/models';

export class ReportGeneratorService {
  /**
   * Generate a report
   */
  async generateReport(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    request: ReportGenerationRequest
  ): Promise<GeneratedReport> {
    const startTime = Date.now();

    // Get organization info
    const organization = await Organization.findById(organizationId).lean();
    if (!organization) {
      throw new Error('Organization not found');
    }

    // Determine date range
    const endDate = request.period?.end ? new Date(request.period.end) : new Date();
    const startDate = request.period?.start
      ? new Date(request.period.start)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Gather data for the report
    const [financialData, milestones, fundraisingData] = await Promise.all([
      this.gatherFinancialData(organizationId, startDate, endDate),
      this.gatherMilestoneData(organizationId),
      this.gatherFundraisingData(organizationId),
    ]);

    // Generate based on report type
    let report: GeneratedReport;

    switch (request.reportType) {
      case ReportType.INVESTOR_UPDATE:
        report = await this.generateInvestorUpdate(
          organization.name,
          { start: startDate, end: endDate },
          financialData,
          milestones,
          fundraisingData,
          request.tone || ReportTone.PROFESSIONAL,
          request.customInstructions
        );
        break;

      case ReportType.MONTHLY_SUMMARY:
        report = await this.generateMonthlySummary(
          organization.name,
          { start: startDate, end: endDate },
          financialData
        );
        break;

      case ReportType.FINANCIAL_HIGHLIGHTS:
        report = await this.generateFinancialHighlights(
          organization.name,
          { start: startDate, end: endDate },
          financialData
        );
        break;

      case ReportType.MILESTONE_UPDATE:
        report = await this.generateMilestoneUpdate(organization.name, milestones);
        break;

      case ReportType.FUNDRAISING_STATUS:
        report = await this.generateFundraisingStatus(
          organization.name,
          fundraisingData
        );
        break;

      default:
        report = await this.generateCustomReport(
          organization.name,
          request,
          financialData,
          milestones,
          fundraisingData
        );
    }

    // Store query
    await AIQuery.create({
      organization: organizationId,
      user: userId,
      feature: 'report_generator',
      input: JSON.stringify(request),
      response: JSON.stringify(report),
      model: openaiService.getDefaultModel(),
      tokensUsed: 0,
      processingTimeMs: Date.now() - startTime,
    });

    return report;
  }

  /**
   * Generate investor update email
   */
  private async generateInvestorUpdate(
    companyName: string,
    period: { start: Date; end: Date },
    financialData: FinancialContext,
    milestones: Array<{ title: string; status: string; progress: number }>,
    _fundraisingData: unknown,
    tone: string,
    customInstructions?: string
  ): Promise<GeneratedReport> {
    const prompt = buildPrompt(INVESTOR_UPDATE_PROMPT, {
      companyName,
      period: `${period.start.toISOString().split('T')[0]} to ${period.end.toISOString().split('T')[0]}`,
      tone,
      financialData: JSON.stringify(financialData.summary, null, 2),
      milestones: JSON.stringify(milestones, null, 2),
      metrics: JSON.stringify(
        {
          burnRate: financialData.summary.burnRate,
          runway: financialData.summary.runway,
          revenueGrowth: financialData.trends?.revenueGrowth,
        },
        null,
        2
      ),
      customInstructions: customInstructions || 'No additional instructions.',
    });

    const result = await openaiService.completeJSON<{
      subject: string;
      greeting: string;
      summary: string;
      sections: ReportSection[];
      highlights: string[];
      challenges: string[];
      askOrCTA: string;
      closing: string;
    }>(prompt, {
      temperature: 0.7,
      maxTokens: 3000,
    });

    return {
      reportType: ReportType.INVESTOR_UPDATE,
      title: `Investor Update - ${period.end.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      subject: result.data.subject,
      content: {
        greeting: result.data.greeting,
        summary: result.data.summary,
        sections: result.data.sections,
        highlights: result.data.highlights,
        challenges: result.data.challenges,
        askOrCTA: result.data.askOrCTA,
        closing: result.data.closing,
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        period: {
          start: period.start.toISOString(),
          end: period.end.toISOString(),
        },
        dataPoints: 0,
        model: openaiService.getDefaultModel(),
      },
    };
  }

  /**
   * Generate monthly summary
   */
  private async generateMonthlySummary(
    companyName: string,
    period: { start: Date; end: Date },
    financialData: FinancialContext
  ): Promise<GeneratedReport> {
    const prompt = buildPrompt(MONTHLY_SUMMARY_PROMPT, {
      companyName,
      month: period.end.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      financialData: JSON.stringify(financialData, null, 2),
    });

    const result = await openaiService.completeJSON<{
      sections: Array<{
        title: string;
        content: string;
        metrics?: Array<{ label: string; value: string; change?: string; trend?: string }>;
      }>;
    }>(prompt, {
      temperature: 0.6,
      maxTokens: 2500,
    });

    // Transform sections to ensure metrics have correct types
    const rawSections = result.data.sections || [];
    const sections: ReportSection[] = rawSections.map(s => ({
      title: s.title,
      content: s.content,
      metrics: s.metrics?.map(m => ({
        label: m.label,
        value: m.value,
        change: m.change,
        trend: (m.trend === 'up' || m.trend === 'down' || m.trend === 'neutral')
          ? m.trend as 'up' | 'down' | 'neutral'
          : undefined,
      })),
    }));

    return {
      reportType: ReportType.MONTHLY_SUMMARY,
      title: `Monthly Summary - ${period.end.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      content: {
        summary: 'Monthly financial summary for internal review.',
        sections,
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        period: {
          start: period.start.toISOString(),
          end: period.end.toISOString(),
        },
        dataPoints: 0,
        model: openaiService.getDefaultModel(),
      },
    };
  }

  /**
   * Generate financial highlights
   */
  private async generateFinancialHighlights(
    companyName: string,
    period: { start: Date; end: Date },
    financialData: FinancialContext
  ): Promise<GeneratedReport> {
    const prompt = `Generate financial highlights for ${companyName}.

Period: ${period.start.toISOString().split('T')[0]} to ${period.end.toISOString().split('T')[0]}

Financial Data:
${JSON.stringify(financialData, null, 2)}

Return JSON with:
{
  "highlights": ["3-5 key financial highlights"],
  "metrics": [{"label": "metric", "value": "value", "trend": "up|down|neutral"}],
  "summary": "2-3 sentence summary"
}`;

    const result = await openaiService.completeJSON<{
      highlights: string[];
      metrics: Array<{ label: string; value: string; trend: string }>;
      summary: string;
    }>(prompt, { temperature: 0.6 });

    const metricsData = (result.data.metrics || []).map(m => ({
      label: m.label,
      value: m.value,
      trend: (m.trend === 'up' || m.trend === 'down' || m.trend === 'neutral')
        ? m.trend as 'up' | 'down' | 'neutral'
        : undefined,
    }));

    return {
      reportType: ReportType.FINANCIAL_HIGHLIGHTS,
      title: 'Financial Highlights',
      content: {
        summary: result.data.summary || '',
        sections: [
          {
            title: 'Key Metrics',
            content: '',
            metrics: metricsData,
          },
        ],
        highlights: result.data.highlights || [],
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        period: {
          start: period.start.toISOString(),
          end: period.end.toISOString(),
        },
        dataPoints: 0,
        model: openaiService.getDefaultModel(),
      },
    };
  }

  /**
   * Generate milestone update
   */
  private async generateMilestoneUpdate(
    companyName: string,
    milestones: Array<{ title: string; status: string; progress: number }>
  ): Promise<GeneratedReport> {
    const prompt = `Generate a milestone update for ${companyName}.

Milestones:
${JSON.stringify(milestones, null, 2)}

Return JSON:
{
  "summary": "overview of milestone progress",
  "completed": ["recently completed milestones"],
  "inProgress": [{"title": "milestone", "progress": 50, "update": "status update"}],
  "upcoming": ["upcoming milestones"]
}`;

    const result = await openaiService.completeJSON<{
      summary: string;
      completed: string[];
      inProgress: Array<{ title: string; progress: number; update: string }>;
      upcoming: string[];
    }>(prompt, { temperature: 0.6 });

    return {
      reportType: ReportType.MILESTONE_UPDATE,
      title: 'Milestone Update',
      content: {
        summary: result.data.summary,
        sections: [
          {
            title: 'Completed',
            content: result.data.completed.join('\n- '),
          },
          {
            title: 'In Progress',
            content: result.data.inProgress
              .map(m => `${m.title} (${m.progress}%): ${m.update}`)
              .join('\n'),
          },
          {
            title: 'Upcoming',
            content: result.data.upcoming.join('\n- '),
          },
        ],
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        period: { start: '', end: '' },
        dataPoints: milestones.length,
        model: openaiService.getDefaultModel(),
      },
    };
  }

  /**
   * Generate fundraising status
   */
  private async generateFundraisingStatus(
    companyName: string,
    fundraisingData: unknown
  ): Promise<GeneratedReport> {
    const prompt = `Generate a fundraising status update for ${companyName}.

Data:
${JSON.stringify(fundraisingData, null, 2)}

Return JSON:
{
  "summary": "current fundraising status",
  "activeRound": {"name": "round name", "raised": "$X", "target": "$Y", "percentComplete": 50},
  "recentActivity": ["recent investor activity"],
  "nextSteps": ["next steps"]
}`;

    const result = await openaiService.completeJSON<{
      summary: string;
      activeRound?: { name: string; raised: string; target: string; percentComplete: number };
      recentActivity: string[];
      nextSteps: string[];
    }>(prompt, { temperature: 0.6 });

    const sections: ReportSection[] = [
      {
        title: 'Summary',
        content: result.data.summary,
      },
    ];

    if (result.data.activeRound) {
      sections.push({
        title: 'Active Round',
        content: `${result.data.activeRound.name}: ${result.data.activeRound.raised} of ${result.data.activeRound.target} (${result.data.activeRound.percentComplete}%)`,
      });
    }

    return {
      reportType: ReportType.FUNDRAISING_STATUS,
      title: 'Fundraising Status',
      content: {
        summary: result.data.summary,
        sections,
        highlights: result.data.recentActivity,
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        period: { start: '', end: '' },
        dataPoints: 0,
        model: openaiService.getDefaultModel(),
      },
    };
  }

  /**
   * Generate custom report
   */
  private async generateCustomReport(
    companyName: string,
    request: ReportGenerationRequest,
    financialData: FinancialContext,
    milestones: unknown[],
    fundraisingData: unknown
  ): Promise<GeneratedReport> {
    const prompt = `Generate a custom report for ${companyName}.

Instructions: ${request.customInstructions || 'Generate a comprehensive status report.'}

Available Data:
- Financial: ${JSON.stringify(financialData.summary)}
- Milestones: ${milestones.length} total
- Fundraising: ${JSON.stringify(fundraisingData)}

Return JSON:
{
  "title": "report title",
  "summary": "executive summary",
  "sections": [{"title": "section", "content": "content"}]
}`;

    const result = await openaiService.completeJSON<{
      title: string;
      summary: string;
      sections: Array<{ title: string; content: string }>;
    }>(prompt, { temperature: 0.7 });

    return {
      reportType: ReportType.CUSTOM,
      title: result.data.title,
      content: {
        summary: result.data.summary,
        sections: result.data.sections,
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        period: {
          start: request.period?.start || '',
          end: request.period?.end || '',
        },
        dataPoints: 0,
        model: openaiService.getDefaultModel(),
      },
    };
  }

  // Data gathering methods
  private async gatherFinancialData(
    organizationId: Types.ObjectId,
    startDate: Date,
    endDate: Date
  ): Promise<FinancialContext> {
    const [expenses, revenue] = await Promise.all([
      Expense.find({
        organization: organizationId,
        date: { $gte: startDate, $lte: endDate },
        status: { $in: ['approved', 'paid'] },
      }).lean(),
      RevenueEntry.find({
        organization: organizationId,
        date: { $gte: startDate, $lte: endDate },
        status: 'received',
      }).lean(),
    ]);

    const totalRevenue = revenue.reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const daysDiff = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)));
    const monthlyBurn = (totalExpenses / daysDiff) * 30;

    return {
      summary: {
        totalRevenue,
        totalExpenses,
        netIncome: totalRevenue - totalExpenses,
        burnRate: Math.round(monthlyBurn),
        runway: 12, // Placeholder
        cashBalance: 500000, // Placeholder
      },
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    };
  }

  private async gatherMilestoneData(
    organizationId: Types.ObjectId
  ): Promise<Array<{ title: string; status: string; progress: number }>> {
    const milestones = await Milestone.find({
      organization: organizationId,
      isArchived: false,
    })
      .select('title status progress')
      .lean();

    return milestones.map(m => ({
      title: m.title,
      status: m.status,
      progress: m.progress || 0,
    }));
  }

  private async gatherFundraisingData(organizationId: Types.ObjectId): Promise<unknown> {
    const [activeRound, investors] = await Promise.all([
      Round.findOne({ organization: organizationId, status: 'active' }).lean(),
      Investor.find({
        organization: organizationId,
        status: { $in: ['committed', 'invested'] },
      }).lean(),
    ]);

    return {
      activeRound: activeRound
        ? {
            name: activeRound.name,
            target: activeRound.targetAmount,
            raised: activeRound.raisedAmount || 0,
          }
        : null,
      totalRaised: investors.reduce((sum, i) => sum + (i.totalInvested || 0), 0),
      investorCount: investors.length,
    };
  }

  /**
   * Get available report types
   */
  getReportTypes(): string[] {
    return Object.values(ReportType);
  }

  /**
   * Get available tones
   */
  getTones(): string[] {
    return Object.values(ReportTone);
  }
}

export const reportGeneratorService = new ReportGeneratorService();
