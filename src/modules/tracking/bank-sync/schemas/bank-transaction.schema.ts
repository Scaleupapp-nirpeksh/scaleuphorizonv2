import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { BankTransactionStatus, TRACKING_CONSTANTS } from '../../constants';

extendZodWithOpenApi(z);

// ============ Bank Transaction Status Schema ============

export const bankTransactionStatusSchema = z
  .enum(Object.values(BankTransactionStatus) as [string, ...string[]])
  .openapi({
    description: 'Bank transaction reconciliation status',
    example: 'unmatched',
  });

// ============ Update Bank Transaction Schema ============

export const updateBankTransactionSchema = z.object({
  body: z
    .object({
      category: z.string().max(100).optional().nullable(),
      notes: z.string().max(TRACKING_CONSTANTS.NOTES_MAX_LENGTH).optional().nullable(),
    })
    .openapi('UpdateBankTransactionRequest'),
});

export type UpdateBankTransactionInput = z.infer<typeof updateBankTransactionSchema>['body'];

// ============ Match Transaction Schema ============

export const matchTransactionSchema = z.object({
  body: z
    .object({
      transactionId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid transaction ID format')
        .openapi({ description: 'ID of the transaction to match with' }),
    })
    .openapi('MatchTransactionRequest'),
});

export type MatchTransactionInput = z.infer<typeof matchTransactionSchema>['body'];

// ============ Query Schema ============

export const bankTransactionQuerySchema = z.object({
  query: z
    .object({
      bankAccountId: z.string().optional(),
      status: bankTransactionStatusSchema.optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      minAmount: z.coerce.number().optional(),
      maxAmount: z.coerce.number().optional(),
      category: z.string().optional(),
      importBatchId: z.string().optional(),
      search: z.string().optional(),
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      sortBy: z.enum(['date', 'amount', 'importedAt', 'status']).default('date'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
    })
    .openapi('BankTransactionQueryParams'),
});

export type BankTransactionQueryInput = z.infer<typeof bankTransactionQuerySchema>['query'];

// ============ CSV Import Schema ============

export const csvImportSchema = z.object({
  body: z
    .object({
      csvData: z.string().openapi({ description: 'Raw CSV data content' }),
      columnMapping: z
        .object({
          date: z.string().openapi({ example: 'Transaction Date' }),
          description: z.string().openapi({ example: 'Description' }),
          amount: z.string().openapi({ example: 'Amount' }),
          debit: z.string().optional().openapi({ example: 'Debit' }),
          credit: z.string().optional().openapi({ example: 'Credit' }),
          balance: z.string().optional().openapi({ example: 'Balance' }),
          reference: z.string().optional().openapi({ example: 'Reference' }),
        })
        .openapi('CSVColumnMapping'),
      dateFormat: z
        .string()
        .default('MM/DD/YYYY')
        .openapi({ example: 'MM/DD/YYYY', description: 'Date format in the CSV' }),
      skipRows: z.number().min(0).default(0).openapi({ description: 'Number of header rows to skip' }),
      hasHeader: z.boolean().default(true),
    })
    .openapi('CSVImportRequest'),
});

export type CSVImportInput = z.infer<typeof csvImportSchema>['body'];

// ============ Response Schemas ============

export const bankTransactionResponseSchema = z
  .object({
    id: z.string(),
    organization: z.string(),
    bankAccount: z
      .object({
        id: z.string(),
        name: z.string(),
        bankName: z.string(),
      })
      .optional(),
    amount: z.number(),
    date: z.string(),
    description: z.string(),
    category: z.string().optional(),
    suggestedCategory: z.string().optional(),
    status: bankTransactionStatusSchema,
    matchedTransaction: z.string().optional(),
    matchConfidence: z.number().optional(),
    importedAt: z.string(),
    importBatchId: z.string(),
    externalId: z.string().optional(),
    checksum: z.string(),
    reconciledBy: z.string().optional(),
    reconciledAt: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('BankTransaction');

export const singleBankTransactionResponseSchema = z.object({
  success: z.literal(true),
  data: bankTransactionResponseSchema,
});

export const bankTransactionListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(bankTransactionResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
    totalCount: z.number(),
    hasNextPage: z.boolean(),
    hasPrevPage: z.boolean(),
  }),
});

// ============ Import Result Schema ============

export const importResultResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      importBatchId: z.string(),
      totalRows: z.number(),
      imported: z.number(),
      skipped: z.number(),
      duplicates: z.number(),
      errors: z.array(
        z.object({
          row: z.number(),
          error: z.string(),
        })
      ),
    }),
  })
  .openapi('ImportResultResponse');

// ============ Auto Match Result Schema ============

export const autoMatchResultResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      processed: z.number(),
      matched: z.number(),
      unmatched: z.number(),
      matches: z.array(
        z.object({
          bankTransactionId: z.string(),
          transactionId: z.string(),
          confidence: z.number(),
        })
      ),
    }),
  })
  .openapi('AutoMatchResultResponse');
