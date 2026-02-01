import { parse } from 'csv-parse/sync';
import { createHash } from 'crypto';
import { CSVMappingConfig, CSVValidationResult, CSVPreviewRow } from '../types';
import { TRACKING_CONSTANTS } from '../constants';

export interface ParsedCSVRow {
  rowNumber: number;
  rawData: Record<string, string>;
  date: Date | null;
  description: string;
  amount: number | null;
  parseError?: string;
}

export interface BankTransactionInput {
  date: Date;
  description: string;
  amount: number;
  rawData: Record<string, string>;
  checksum: string;
}

/**
 * Parse CSV content into rows
 */
export function parseCSV(content: string | Buffer, skipRows: number = 0): Record<string, string>[] {
  const csvString = Buffer.isBuffer(content) ? content.toString('utf-8') : content;

  const records = parse(csvString, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, string>[];

  // Skip header rows if specified
  return records.slice(skipRows);
}

/**
 * Parse a date string using the specified format
 */
export function parseDate(dateString: string, format: string): Date | null {
  if (!dateString || !dateString.trim()) {
    return null;
  }

  const trimmed = dateString.trim();

  try {
    // Handle common formats
    if (format === 'MM/DD/YYYY') {
      const [month, day, year] = trimmed.split('/');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    if (format === 'DD/MM/YYYY') {
      const [day, month, year] = trimmed.split('/');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    if (format === 'YYYY-MM-DD') {
      const [year, month, day] = trimmed.split('-');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    if (format === 'MM-DD-YYYY') {
      const [month, day, year] = trimmed.split('-');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    if (format === 'DD-MM-YYYY') {
      const [day, month, year] = trimmed.split('-');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    // ISO format
    if (format === 'ISO' || format === 'YYYY-MM-DDTHH:mm:ss') {
      return new Date(trimmed);
    }

    // Try native parsing as fallback
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Parse an amount string into a number
 */
export function parseAmount(
  amountString: string,
  negativeExpenses: boolean = false
): number | null {
  if (!amountString || !amountString.trim()) {
    return null;
  }

  let cleaned = amountString.trim();

  // Check for parentheses (accounting format for negative)
  const isParenthesesNegative = cleaned.startsWith('(') && cleaned.endsWith(')');
  if (isParenthesesNegative) {
    cleaned = cleaned.slice(1, -1);
  }

  // Check for negative sign
  const hasNegativeSign = cleaned.startsWith('-');
  if (hasNegativeSign) {
    cleaned = cleaned.slice(1);
  }

  // Remove currency symbols and thousand separators
  cleaned = cleaned.replace(/[$€£¥,\s]/g, '');

  // Parse the number
  const num = parseFloat(cleaned);
  if (isNaN(num)) {
    return null;
  }

  // Apply negative
  let result = num;
  if (isParenthesesNegative || hasNegativeSign) {
    result = -num;
  }

  // Apply negativeExpenses setting
  if (negativeExpenses && result < 0) {
    result = Math.abs(result);
  }

  return result;
}

/**
 * Generate a checksum for deduplication
 */
export function generateChecksum(
  date: Date,
  amount: number,
  description: string
): string {
  const normalizedDate = date.toISOString().split('T')[0];
  const normalizedAmount = amount.toFixed(2);
  const normalizedDescription = description.toLowerCase().trim().replace(/\s+/g, ' ');

  const data = `${normalizedDate}|${normalizedAmount}|${normalizedDescription}`;
  return createHash('md5').update(data).digest('hex');
}

/**
 * Apply mapping configuration to parse a single row
 */
export function applyMapping(
  row: Record<string, string>,
  rowNumber: number,
  config: CSVMappingConfig
): ParsedCSVRow {
  const result: ParsedCSVRow = {
    rowNumber,
    rawData: row,
    date: null,
    description: '',
    amount: null,
  };

  // Parse date
  const dateValue = row[config.dateColumn];
  if (!dateValue) {
    result.parseError = `Missing date in column '${config.dateColumn}'`;
    return result;
  }
  result.date = parseDate(dateValue, config.dateFormat);
  if (!result.date) {
    result.parseError = `Invalid date format: '${dateValue}'`;
    return result;
  }

  // Parse description
  const descriptionValue = row[config.descriptionColumn];
  if (!descriptionValue) {
    result.parseError = `Missing description in column '${config.descriptionColumn}'`;
    return result;
  }
  result.description = descriptionValue.trim();

  // Parse amount
  if (config.amountFormat === 'single') {
    const amountValue = row[config.amountColumn];
    if (!amountValue) {
      result.parseError = `Missing amount in column '${config.amountColumn}'`;
      return result;
    }
    result.amount = parseAmount(amountValue, config.negativeExpenses);
    if (result.amount === null) {
      result.parseError = `Invalid amount: '${amountValue}'`;
      return result;
    }
  } else if (config.amountFormat === 'debit_credit') {
    const debitValue = row[config.debitColumn || ''];
    const creditValue = row[config.creditColumn || ''];

    const debit = parseAmount(debitValue || '0', false);
    const credit = parseAmount(creditValue || '0', false);

    if (debit === null && credit === null) {
      result.parseError = 'Both debit and credit columns are empty or invalid';
      return result;
    }

    // Debits are negative (money out), credits are positive (money in)
    result.amount = (credit || 0) - (debit || 0);
  }

  return result;
}

/**
 * Validate CSV content against mapping configuration
 */
export function validateCSV(
  content: string | Buffer,
  config: CSVMappingConfig
): CSVValidationResult {
  const result: CSVValidationResult = {
    isValid: true,
    rowCount: 0,
    errors: [],
    warnings: [],
  };

  try {
    const rows = parseCSV(content, config.skipRows);
    result.rowCount = rows.length;

    if (result.rowCount === 0) {
      result.isValid = false;
      result.errors.push({
        row: 0,
        column: 'file',
        message: 'CSV file is empty or has no data rows',
      });
      return result;
    }

    if (result.rowCount > TRACKING_CONSTANTS.MAX_CSV_ROWS) {
      result.isValid = false;
      result.errors.push({
        row: 0,
        column: 'file',
        message: `CSV exceeds maximum row limit of ${TRACKING_CONSTANTS.MAX_CSV_ROWS}`,
      });
      return result;
    }

    // Check required columns exist
    const firstRow = rows[0];
    const columns = Object.keys(firstRow);

    if (!columns.includes(config.dateColumn)) {
      result.isValid = false;
      result.errors.push({
        row: 0,
        column: config.dateColumn,
        message: `Date column '${config.dateColumn}' not found in CSV`,
      });
    }

    if (!columns.includes(config.descriptionColumn)) {
      result.isValid = false;
      result.errors.push({
        row: 0,
        column: config.descriptionColumn,
        message: `Description column '${config.descriptionColumn}' not found in CSV`,
      });
    }

    if (config.amountFormat === 'single') {
      if (!columns.includes(config.amountColumn)) {
        result.isValid = false;
        result.errors.push({
          row: 0,
          column: config.amountColumn,
          message: `Amount column '${config.amountColumn}' not found in CSV`,
        });
      }
    } else {
      if (config.debitColumn && !columns.includes(config.debitColumn)) {
        result.isValid = false;
        result.errors.push({
          row: 0,
          column: config.debitColumn,
          message: `Debit column '${config.debitColumn}' not found in CSV`,
        });
      }
      if (config.creditColumn && !columns.includes(config.creditColumn)) {
        result.isValid = false;
        result.errors.push({
          row: 0,
          column: config.creditColumn,
          message: `Credit column '${config.creditColumn}' not found in CSV`,
        });
      }
    }

    // Validate each row
    if (result.isValid) {
      rows.forEach((row, index) => {
        const parsed = applyMapping(row, index + 1, config);
        if (parsed.parseError) {
          result.errors.push({
            row: index + 1,
            column: 'data',
            message: parsed.parseError,
          });
        }
      });

      // Allow some errors but fail if too many
      if (result.errors.length > Math.ceil(result.rowCount * 0.1)) {
        result.isValid = false;
      }
    }
  } catch (error) {
    result.isValid = false;
    result.errors.push({
      row: 0,
      column: 'file',
      message: `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }

  return result;
}

/**
 * Generate preview of import
 */
export function previewImport(
  content: string | Buffer,
  config: CSVMappingConfig,
  duplicateChecksums: Set<string>,
  limit: number = 10
): CSVPreviewRow[] {
  const rows = parseCSV(content, config.skipRows);
  const preview: CSVPreviewRow[] = [];

  for (let i = 0; i < Math.min(rows.length, limit); i++) {
    const parsed = applyMapping(rows[i], i + 1, config);

    let isDuplicate = false;
    if (parsed.date && parsed.amount !== null) {
      const checksum = generateChecksum(parsed.date, parsed.amount, parsed.description);
      isDuplicate = duplicateChecksums.has(checksum);
    }

    preview.push({
      rowNumber: parsed.rowNumber,
      date: parsed.date?.toISOString().split('T')[0] || '',
      description: parsed.description,
      amount: parsed.amount || 0,
      isDuplicate,
      parseError: parsed.parseError,
    });
  }

  return preview;
}

/**
 * Process CSV for import
 */
export function processCSVForImport(
  content: string | Buffer,
  config: CSVMappingConfig,
  duplicateChecksums: Set<string>
): {
  transactions: BankTransactionInput[];
  skipped: number;
  errors: Array<{ row: number; message: string }>;
} {
  const rows = parseCSV(content, config.skipRows);
  const transactions: BankTransactionInput[] = [];
  const errors: Array<{ row: number; message: string }> = [];
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const parsed = applyMapping(rows[i], i + 1, config);

    if (parsed.parseError) {
      errors.push({ row: i + 1, message: parsed.parseError });
      continue;
    }

    if (!parsed.date || parsed.amount === null) {
      errors.push({ row: i + 1, message: 'Missing required fields' });
      continue;
    }

    const checksum = generateChecksum(parsed.date, parsed.amount, parsed.description);

    // Skip duplicates
    if (duplicateChecksums.has(checksum)) {
      skipped++;
      continue;
    }

    transactions.push({
      date: parsed.date,
      description: parsed.description,
      amount: parsed.amount,
      rawData: parsed.rawData,
      checksum,
    });

    // Add to set to prevent duplicates within same import
    duplicateChecksums.add(checksum);
  }

  return { transactions, skipped, errors };
}
