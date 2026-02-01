/**
 * Meeting Intelligence Service
 *
 * AI-powered meeting preparation, summarization, and follow-up
 */

import { Types } from 'mongoose';
import { openaiService } from './openai.service';
import { AIQuery } from '../models';
import {
  MEETING_PREP_PROMPT,
  MEETING_SUMMARY_PROMPT,
  FOLLOW_UP_EMAIL_PROMPT,
  ACTION_ITEMS_EXTRACTION_PROMPT,
  buildPrompt,
} from '../prompts';
import { MeetingIntelType } from '../constants';
import {
  MeetingPrepBrief,
  MeetingSummary,
  FollowUpEmail,
} from '../types';
import { NotFoundError } from '@/core/errors';

// Import from other modules
import { Meeting } from '@/modules/operations/meetings/models';
import { Investor } from '@/modules/fundraising/investors/models';
import { Round } from '@/modules/fundraising/rounds/models';
import { Milestone } from '@/modules/operations/milestones/models';

export class MeetingIntelService {
  /**
   * Generate meeting preparation brief
   */
  async generatePrepBrief(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    meetingId: string
  ): Promise<MeetingPrepBrief> {
    const startTime = Date.now();

    // Get meeting details
    const meeting = await Meeting.findOne({
      _id: new Types.ObjectId(meetingId),
      organization: organizationId,
    })
      .populate('investor')
      .populate('round')
      .lean();

    if (!meeting) {
      throw new NotFoundError('Meeting not found');
    }

    // Get investor information if linked
    let investorInfo = '';
    let previousMeetings: Array<{ date: string; outcome: string; notes: string }> = [];

    if (meeting.investor) {
      const investor = await Investor.findById(meeting.investor).lean();
      if (investor) {
        investorInfo = JSON.stringify({
          name: investor.name,
          type: investor.type,
          company: investor.company,
          status: investor.status,
          totalCommitted: investor.totalCommitted,
          totalInvested: investor.totalInvested,
        });

        // Get previous meetings with this investor
        const prevMeetings = await Meeting.find({
          organization: organizationId,
          investor: investor._id,
          status: 'completed',
          _id: { $ne: meeting._id },
        })
          .sort({ startTime: -1 })
          .limit(5)
          .lean();

        previousMeetings = prevMeetings.map(m => ({
          date: m.startTime.toISOString().split('T')[0],
          outcome: m.outcome || 'unknown',
          notes: m.outcomeNotes || m.notes || '',
        }));
      }
    }

    // Get company status for context
    const [activeRound, milestones] = await Promise.all([
      Round.findOne({ organization: organizationId, status: 'active' }).lean(),
      Milestone.find({
        organization: organizationId,
        isArchived: false,
        status: { $in: ['in_progress', 'at_risk'] },
      })
        .limit(5)
        .lean(),
    ]);

    const companyStatus = JSON.stringify({
      activeRound: activeRound
        ? { name: activeRound.name, raised: activeRound.raisedAmount, target: activeRound.targetAmount }
        : null,
      keyMilestones: milestones.map(m => ({ title: m.title, status: m.status, progress: m.progress })),
    });

    // Build prompt
    const prompt = buildPrompt(MEETING_PREP_PROMPT, {
      investorName: meeting.attendees?.[0]?.name || 'Investor',
      firmName: meeting.attendees?.[0]?.role || '',
      meetingType: meeting.type,
      meetingDate: meeting.startTime.toISOString().split('T')[0],
      investorInfo,
      previousMeetings: JSON.stringify(previousMeetings),
      companyStatus,
    });

    // Get AI response
    const result = await openaiService.completeJSON<MeetingPrepBrief>(prompt, {
      temperature: 0.7,
      maxTokens: 2500,
    });

    // Store query
    await AIQuery.create({
      organization: organizationId,
      user: userId,
      feature: 'meeting_intel',
      queryType: 'prep_brief',
      input: JSON.stringify({ meetingId }),
      response: JSON.stringify(result.data),
      model: result.model,
      tokensUsed: result.usage.totalTokens,
      processingTimeMs: Date.now() - startTime,
    });

    return result.data;
  }

  /**
   * Generate meeting summary from notes
   */
  async generateSummary(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    request: { meetingId?: string; meetingNotes: string; title?: string; attendees?: string[] }
  ): Promise<MeetingSummary> {
    const startTime = Date.now();

    let meetingTitle = request.title || 'Meeting';
    let meetingDate = new Date().toISOString().split('T')[0];
    let attendees = request.attendees || [];

    // If meetingId provided, get details
    if (request.meetingId) {
      const meeting = await Meeting.findOne({
        _id: new Types.ObjectId(request.meetingId),
        organization: organizationId,
      }).lean();

      if (meeting) {
        meetingTitle = meeting.title;
        meetingDate = meeting.startTime.toISOString().split('T')[0];
        attendees = meeting.attendees?.map(a => a.name) || [];
      }
    }

    // Build prompt
    const prompt = buildPrompt(MEETING_SUMMARY_PROMPT, {
      meetingTitle,
      meetingDate,
      attendees: attendees.join(', '),
      meetingNotes: request.meetingNotes,
    });

    // Get AI response
    const result = await openaiService.completeJSON<MeetingSummary>(prompt, {
      temperature: 0.6,
      maxTokens: 2000,
    });

    // Store query
    await AIQuery.create({
      organization: organizationId,
      user: userId,
      feature: 'meeting_intel',
      queryType: 'summary',
      input: JSON.stringify({ meetingId: request.meetingId, notesLength: request.meetingNotes.length }),
      response: JSON.stringify(result.data),
      model: result.model,
      tokensUsed: result.usage.totalTokens,
      processingTimeMs: Date.now() - startTime,
    });

    return result.data;
  }

  /**
   * Extract action items from meeting notes
   */
  async extractActionItems(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    notes: string
  ): Promise<Array<{
    item: string;
    owner?: string;
    dueDate?: string;
    priority: 'high' | 'medium' | 'low';
    context?: string;
  }>> {
    const startTime = Date.now();

    const prompt = buildPrompt(ACTION_ITEMS_EXTRACTION_PROMPT, { notes });

    const result = await openaiService.completeJSON<{
      actionItems: Array<{
        item: string;
        owner?: string;
        dueDate?: string;
        priority: 'high' | 'medium' | 'low';
        context?: string;
      }>;
    }>(prompt, {
      temperature: 0.4,
      maxTokens: 1500,
    });

    // Store query
    await AIQuery.create({
      organization: organizationId,
      user: userId,
      feature: 'meeting_intel',
      queryType: 'action_items',
      input: notes.substring(0, 500),
      response: JSON.stringify(result.data),
      model: result.model,
      tokensUsed: result.usage.totalTokens,
      processingTimeMs: Date.now() - startTime,
    });

    return result.data.actionItems;
  }

  /**
   * Generate follow-up email
   */
  async generateFollowUpEmail(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    request: {
      meetingId?: string;
      meetingSummary?: string;
      actionItems?: string[];
      tone?: string;
    }
  ): Promise<FollowUpEmail> {
    const startTime = Date.now();

    let meetingDetails = '';
    let meetingSummary = request.meetingSummary || '';
    let actionItems = request.actionItems || [];

    // If meetingId provided, get details
    if (request.meetingId) {
      const meeting = await Meeting.findOne({
        _id: new Types.ObjectId(request.meetingId),
        organization: organizationId,
      }).lean();

      if (meeting) {
        meetingDetails = JSON.stringify({
          title: meeting.title,
          date: meeting.startTime.toISOString().split('T')[0],
          type: meeting.type,
          attendees: meeting.attendees?.map(a => a.name),
          outcome: meeting.outcome,
          outcomeNotes: meeting.outcomeNotes,
        });

        if (!meetingSummary && meeting.notes) {
          meetingSummary = meeting.notes;
        }

        if (actionItems.length === 0 && meeting.actionItems) {
          actionItems = meeting.actionItems.map(a => a.title);
        }
      }
    }

    const prompt = buildPrompt(FOLLOW_UP_EMAIL_PROMPT, {
      meetingDetails,
      meetingSummary,
      actionItems: actionItems.join('\n'),
      tone: request.tone || 'professional',
    });

    const result = await openaiService.completeJSON<FollowUpEmail>(prompt, {
      temperature: 0.7,
      maxTokens: 1500,
    });

    // Store query
    await AIQuery.create({
      organization: organizationId,
      user: userId,
      feature: 'meeting_intel',
      queryType: 'follow_up_email',
      input: JSON.stringify({ meetingId: request.meetingId }),
      response: JSON.stringify(result.data),
      model: result.model,
      tokensUsed: result.usage.totalTokens,
      processingTimeMs: Date.now() - startTime,
    });

    return result.data;
  }

  /**
   * Research an investor (using web search if available)
   */
  async researchInvestor(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    investorId: string
  ): Promise<{
    summary: string;
    investmentFocus: string[];
    notableInvestments: string[];
    recentNews: string[];
    suggestedApproach: string;
  }> {
    const startTime = Date.now();

    const investor = await Investor.findOne({
      _id: new Types.ObjectId(investorId),
      organization: organizationId,
    }).lean();

    if (!investor) {
      throw new NotFoundError('Investor not found');
    }

    // Generate research using available information
    // In production, you might integrate with a web search API
    const prompt = `Research and provide insights about this investor:

Name: ${investor.name}
Type: ${investor.type}
Company/Firm: ${investor.company || 'Unknown'}
Website: ${investor.website || 'Unknown'}

Based on common knowledge about investors of this type and any available public information:

Return JSON:
{
  "summary": "Brief overview of the investor/firm",
  "investmentFocus": ["typical investment areas"],
  "notableInvestments": ["known portfolio companies or typical investments"],
  "recentNews": ["any known recent activity or focus areas"],
  "suggestedApproach": "How to best approach this type of investor"
}

Note: If specific information is not available, provide general insights based on investor type.`;

    const result = await openaiService.completeJSON<{
      summary: string;
      investmentFocus: string[];
      notableInvestments: string[];
      recentNews: string[];
      suggestedApproach: string;
    }>(prompt, {
      temperature: 0.7,
      maxTokens: 1500,
    });

    // Store query
    await AIQuery.create({
      organization: organizationId,
      user: userId,
      feature: 'meeting_intel',
      queryType: 'investor_research',
      input: JSON.stringify({ investorId }),
      response: JSON.stringify(result.data),
      model: result.model,
      tokensUsed: result.usage.totalTokens,
      processingTimeMs: Date.now() - startTime,
    });

    return result.data;
  }

  /**
   * Get meeting intelligence types
   */
  getIntelTypes(): string[] {
    return Object.values(MeetingIntelType);
  }
}

export const meetingIntelService = new MeetingIntelService();
