/**
 * OpenAI Service
 *
 * Core service for interacting with OpenAI API
 */

import OpenAI from 'openai';
import { config } from '@/config';
import { AIModel, AI_LIMITS, DEFAULT_SYSTEM_CONTEXT } from '../constants';
import { BadRequestError } from '@/core/errors';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  jsonMode?: boolean;
}

export interface CompletionResult {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: string;
}

export class OpenAIService {
  private client: OpenAI | null = null;
  private defaultModel: string;
  private defaultMaxTokens: number;

  constructor() {
    this.defaultModel = config.openai.model || AIModel.GPT_4O_MINI;
    this.defaultMaxTokens = config.openai.maxTokens || AI_LIMITS.MAX_RESPONSE_TOKENS;

    if (config.openai.apiKey) {
      this.client = new OpenAI({
        apiKey: config.openai.apiKey,
      });
    }
  }

  /**
   * Check if OpenAI is configured
   */
  isConfigured(): boolean {
    return this.client !== null;
  }

  /**
   * Ensure OpenAI is configured before making requests
   */
  private ensureConfigured(): void {
    if (!this.client) {
      throw new BadRequestError(
        'OpenAI API is not configured. Please set OPENAI_API_KEY in environment variables.'
      );
    }
  }

  /**
   * Create a chat completion
   */
  async createCompletion(
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): Promise<CompletionResult> {
    this.ensureConfigured();

    const {
      model = this.defaultModel,
      maxTokens = this.defaultMaxTokens,
      temperature = 0.7,
      systemPrompt,
      jsonMode = false,
    } = options;

    // Prepare messages with system prompt
    const allMessages: ChatMessage[] = [];

    if (systemPrompt) {
      allMessages.push({ role: 'system', content: systemPrompt });
    } else if (!messages.find(m => m.role === 'system')) {
      allMessages.push({ role: 'system', content: DEFAULT_SYSTEM_CONTEXT });
    }

    allMessages.push(...messages);

    const response = await this.client!.chat.completions.create({
      model,
      messages: allMessages,
      max_tokens: maxTokens,
      temperature,
      ...(jsonMode && { response_format: { type: 'json_object' } }),
    });

    const choice = response.choices[0];

    return {
      content: choice.message.content || '',
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
      model: response.model,
      finishReason: choice.finish_reason || 'unknown',
    };
  }

  /**
   * Simple text completion with a single prompt
   */
  async complete(
    prompt: string,
    options: CompletionOptions = {}
  ): Promise<CompletionResult> {
    return this.createCompletion(
      [{ role: 'user', content: prompt }],
      options
    );
  }

  /**
   * Complete with JSON response
   */
  async completeJSON<T = unknown>(
    prompt: string,
    options: CompletionOptions = {}
  ): Promise<{ data: T; usage: CompletionResult['usage']; model: string }> {
    const result = await this.createCompletion(
      [{ role: 'user', content: prompt }],
      { ...options, jsonMode: true }
    );

    try {
      const data = JSON.parse(result.content) as T;
      return {
        data,
        usage: result.usage,
        model: result.model,
      };
    } catch {
      throw new BadRequestError('Failed to parse AI response as JSON');
    }
  }

  /**
   * Continue a conversation
   */
  async continueConversation(
    conversationHistory: ChatMessage[],
    newMessage: string,
    options: CompletionOptions = {}
  ): Promise<CompletionResult> {
    const messages: ChatMessage[] = [
      ...conversationHistory,
      { role: 'user', content: newMessage },
    ];

    return this.createCompletion(messages, options);
  }

  /**
   * Analyze text for specific information
   */
  async analyzeText(
    text: string,
    analysisPrompt: string,
    options: CompletionOptions = {}
  ): Promise<CompletionResult> {
    const prompt = `${analysisPrompt}\n\nText to analyze:\n${text}`;
    return this.complete(prompt, options);
  }

  /**
   * Extract structured data from text
   */
  async extractStructuredData<T = unknown>(
    text: string,
    schema: string,
    options: CompletionOptions = {}
  ): Promise<{ data: T; usage: CompletionResult['usage']; model: string }> {
    const prompt = `Extract structured data from the following text according to this schema:

Schema:
${schema}

Text:
${text}

Return ONLY valid JSON matching the schema. Do not include any explanation or markdown formatting.`;

    return this.completeJSON<T>(prompt, {
      ...options,
      temperature: 0.3, // Lower temperature for more consistent extraction
    });
  }

  /**
   * Generate embeddings for text (for semantic search)
   */
  async createEmbedding(text: string): Promise<number[]> {
    this.ensureConfigured();

    const response = await this.client!.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  }

  /**
   * Batch create embeddings
   */
  async createEmbeddings(texts: string[]): Promise<number[][]> {
    this.ensureConfigured();

    const response = await this.client!.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
    });

    return response.data.map(d => d.embedding);
  }

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return Object.values(AIModel);
  }

  /**
   * Get default model
   */
  getDefaultModel(): string {
    return this.defaultModel;
  }
}

// Export singleton instance
export const openaiService = new OpenAIService();
