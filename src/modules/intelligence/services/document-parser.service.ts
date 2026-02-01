/**
 * Document Parser Service
 *
 * Extract structured data from various document types using AI
 */

import { Types } from 'mongoose';
import { openaiService } from './openai.service';
import { AIQuery } from '../models';
import {
  DOCUMENT_TYPE_DETECTION_PROMPT,
  BANK_STATEMENT_PARSER_PROMPT,
  INVOICE_PARSER_PROMPT,
  TERM_SHEET_PARSER_PROMPT,
  buildPrompt,
} from '../prompts';
import { DocumentType, ParseStatus, DocumentTypeValue } from '../constants';
import {
  DocumentParseRequest,
  ParsedDocument,
  ExtractedData,
  ExtractedTransaction,
} from '../types';
import { BadRequestError } from '@/core/errors';

export class DocumentParserService {
  /**
   * Parse a document and extract structured data
   */
  async parseDocument(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    request: DocumentParseRequest
  ): Promise<ParsedDocument> {
    const startTime = Date.now();

    // Validate request
    if (!request.fileContent && !request.fileUrl) {
      throw new BadRequestError('Either fileContent or fileUrl must be provided');
    }

    // Get document content
    let textContent: string;
    if (request.fileContent) {
      textContent = this.extractTextFromContent(request.fileContent, request.mimeType);
    } else {
      // In production, you'd fetch and extract from URL
      throw new BadRequestError('File URL parsing not implemented. Please provide fileContent.');
    }

    // Detect document type if not specified
    let documentType = request.documentType;
    if (!documentType) {
      const detected = await this.detectDocumentType(textContent);
      documentType = detected.type;
    }

    // Parse based on document type
    let extractedData: ExtractedData;
    let confidence = 0.8;
    const warnings: string[] = [];

    switch (documentType) {
      case DocumentType.BANK_STATEMENT:
        extractedData = await this.parseBankStatement(textContent);
        break;
      case DocumentType.INVOICE:
        extractedData = await this.parseInvoice(textContent);
        break;
      case DocumentType.TERM_SHEET:
        extractedData = await this.parseTermSheet(textContent);
        break;
      case DocumentType.RECEIPT:
        extractedData = await this.parseReceipt(textContent);
        break;
      default:
        extractedData = await this.parseGeneric(textContent);
        confidence = 0.5;
        warnings.push('Document type could not be determined. Extracted generic data.');
    }

    // Validate extracted data
    const validation = this.validateExtractedData(documentType, extractedData);
    if (validation.warnings.length > 0) {
      warnings.push(...validation.warnings);
    }
    confidence = Math.min(confidence, validation.confidence);

    // Store query
    await AIQuery.create({
      organization: organizationId,
      user: userId,
      feature: 'document_parser',
      input: JSON.stringify({
        fileName: request.fileName,
        mimeType: request.mimeType,
        documentType,
        textLength: textContent.length,
      }),
      response: JSON.stringify({ extractedData, confidence }),
      model: openaiService.getDefaultModel(),
      tokensUsed: 0, // Updated in actual parsing
      processingTimeMs: Date.now() - startTime,
    });

    return {
      documentType,
      status: confidence >= 0.7 ? ParseStatus.COMPLETED : ParseStatus.NEEDS_REVIEW,
      extractedData,
      confidence,
      rawText: textContent.substring(0, 1000), // First 1000 chars for debugging
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Detect document type from content
   */
  async detectDocumentType(
    text: string
  ): Promise<{ type: DocumentTypeValue; confidence: number }> {
    const prompt = buildPrompt(DOCUMENT_TYPE_DETECTION_PROMPT, {
      text: text.substring(0, 2000),
    });

    try {
      const result = await openaiService.completeJSON<{
        documentType: string;
        confidence: number;
        reasoning: string;
      }>(prompt, { temperature: 0.3 });

      const validTypes = Object.values(DocumentType) as DocumentTypeValue[];
      const docType = result.data.documentType as DocumentTypeValue;
      if (validTypes.includes(docType)) {
        return {
          type: docType,
          confidence: result.data.confidence,
        };
      }
      return { type: DocumentType.UNKNOWN, confidence: 0 };
    } catch {
      return { type: DocumentType.UNKNOWN, confidence: 0 };
    }
  }

  /**
   * Parse bank statement
   */
  private async parseBankStatement(text: string): Promise<ExtractedData> {
    const prompt = buildPrompt(BANK_STATEMENT_PARSER_PROMPT, { text });

    const result = await openaiService.completeJSON<{
      bankName: string | null;
      accountNumber: string | null;
      statementPeriod: { start: string; end: string } | null;
      openingBalance: number | null;
      closingBalance: number | null;
      transactions: Array<{
        date: string;
        description: string;
        amount: number;
        type: 'credit' | 'debit';
        balance?: number;
      }>;
    }>(prompt, {
      temperature: 0.2,
      maxTokens: 4000,
    });

    // Normalize transactions
    const transactions: ExtractedTransaction[] = (result.data.transactions || []).map(t => ({
      date: t.date,
      description: t.description,
      amount: Math.abs(t.amount),
      type: t.amount >= 0 ? 'credit' : 'debit',
      balance: t.balance,
    }));

    return {
      bankName: result.data.bankName ?? undefined,
      accountNumber: result.data.accountNumber ?? undefined,
      statementPeriod: result.data.statementPeriod ?? undefined,
      openingBalance: result.data.openingBalance ?? undefined,
      closingBalance: result.data.closingBalance ?? undefined,
      transactions,
    };
  }

  /**
   * Parse invoice
   */
  private async parseInvoice(text: string): Promise<ExtractedData> {
    const prompt = buildPrompt(INVOICE_PARSER_PROMPT, { text });

    const result = await openaiService.completeJSON<{
      invoiceNumber: string | null;
      invoiceDate: string | null;
      dueDate: string | null;
      vendor: {
        name: string;
        address?: string;
        email?: string;
        taxId?: string;
      } | null;
      lineItems: Array<{
        description: string;
        quantity?: number;
        unitPrice?: number;
        amount: number;
      }>;
      subtotal: number | null;
      tax: number | null;
      total: number | null;
    }>(prompt, {
      temperature: 0.2,
      maxTokens: 3000,
    });

    return {
      invoiceNumber: result.data.invoiceNumber ?? undefined,
      invoiceDate: result.data.invoiceDate ?? undefined,
      dueDate: result.data.dueDate ?? undefined,
      vendor: result.data.vendor ?? undefined,
      lineItems: result.data.lineItems,
      subtotal: result.data.subtotal ?? undefined,
      tax: result.data.tax ?? undefined,
      total: result.data.total ?? undefined,
    };
  }

  /**
   * Parse term sheet
   */
  private async parseTermSheet(text: string): Promise<ExtractedData> {
    const prompt = buildPrompt(TERM_SHEET_PARSER_PROMPT, { text });

    const result = await openaiService.completeJSON<{
      roundType: string | null;
      investmentAmount: number | null;
      preMoneyValuation: number | null;
      postMoneyValuation: number | null;
      pricePerShare: number | null;
      leadInvestor: string | null;
      terms: Record<string, unknown> | null;
      otherTerms: string[] | null;
    }>(prompt, {
      temperature: 0.2,
      maxTokens: 3000,
    });

    return {
      roundType: result.data.roundType ?? undefined,
      investmentAmount: result.data.investmentAmount ?? undefined,
      valuation: result.data.preMoneyValuation ?? undefined,
      leadInvestor: result.data.leadInvestor ?? undefined,
      terms: result.data.terms ?? undefined,
      metadata: {
        postMoneyValuation: result.data.postMoneyValuation,
        pricePerShare: result.data.pricePerShare,
        otherTerms: result.data.otherTerms,
      },
    };
  }

  /**
   * Parse receipt
   */
  private async parseReceipt(text: string): Promise<ExtractedData> {
    const prompt = `Extract data from this receipt:

${text}

Return JSON:
{
  "merchant": "merchant name",
  "purchaseDate": "YYYY-MM-DD",
  "items": [{"description": "item", "quantity": 1, "amount": 0.00}],
  "subtotal": 0.00,
  "tax": 0.00,
  "total": 0.00,
  "paymentMethod": "cash|credit|debit|unknown"
}`;

    const result = await openaiService.completeJSON<{
      merchant: string | null;
      purchaseDate: string | null;
      items: Array<{ description: string; quantity?: number; amount: number }>;
      subtotal: number | null;
      tax: number | null;
      total: number | null;
      paymentMethod: string | null;
    }>(prompt, {
      temperature: 0.2,
    });

    return {
      merchant: result.data.merchant ?? undefined,
      purchaseDate: result.data.purchaseDate ?? undefined,
      items: result.data.items,
      subtotal: result.data.subtotal ?? undefined,
      tax: result.data.tax ?? undefined,
      total: result.data.total ?? undefined,
      paymentMethod: result.data.paymentMethod ?? undefined,
    };
  }

  /**
   * Parse generic document
   */
  private async parseGeneric(text: string): Promise<ExtractedData> {
    const prompt = `Extract any financial or business information from this document:

${text.substring(0, 3000)}

Return JSON with any relevant fields you can extract:
{
  "metadata": { ... }
}`;

    const result = await openaiService.completeJSON<{ metadata: Record<string, unknown> }>(
      prompt,
      { temperature: 0.3 }
    );

    return {
      metadata: result.data.metadata,
    };
  }

  /**
   * Extract text from content based on mime type
   */
  private extractTextFromContent(content: string, mimeType: string): string {
    // For base64 encoded content
    if (content.startsWith('data:')) {
      const base64Data = content.split(',')[1];
      if (mimeType.includes('text') || mimeType.includes('csv')) {
        return Buffer.from(base64Data, 'base64').toString('utf-8');
      }
    }

    // For plain text
    if (mimeType.includes('text') || mimeType.includes('csv')) {
      return content;
    }

    // For PDF, you'd need a PDF parser library
    if (mimeType.includes('pdf')) {
      throw new BadRequestError(
        'PDF parsing requires server-side PDF extraction. Please use a PDF-to-text tool first.'
      );
    }

    return content;
  }

  /**
   * Validate extracted data
   */
  private validateExtractedData(
    documentType: DocumentTypeValue,
    data: ExtractedData
  ): { confidence: number; warnings: string[] } {
    const warnings: string[] = [];
    let confidence = 1.0;

    switch (documentType) {
      case DocumentType.BANK_STATEMENT:
        if (!data.transactions || data.transactions.length === 0) {
          warnings.push('No transactions extracted');
          confidence -= 0.3;
        }
        if (!data.statementPeriod) {
          warnings.push('Statement period not found');
          confidence -= 0.1;
        }
        break;

      case DocumentType.INVOICE:
        if (!data.total) {
          warnings.push('Invoice total not found');
          confidence -= 0.2;
        }
        if (!data.vendor?.name) {
          warnings.push('Vendor name not found');
          confidence -= 0.1;
        }
        break;

      case DocumentType.TERM_SHEET:
        if (!data.investmentAmount) {
          warnings.push('Investment amount not found');
          confidence -= 0.2;
        }
        if (!data.valuation) {
          warnings.push('Valuation not found');
          confidence -= 0.1;
        }
        break;
    }

    return { confidence: Math.max(0, confidence), warnings };
  }

  /**
   * Get supported document types
   */
  getSupportedTypes(): string[] {
    return Object.values(DocumentType);
  }
}

export const documentParserService = new DocumentParserService();
