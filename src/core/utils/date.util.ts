/**
 * Date utility functions
 */

/**
 * Get start of day
 */
export const startOfDay = (date: Date = new Date()): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get end of day
 */
export const endOfDay = (date: Date = new Date()): Date => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Get start of month
 */
export const startOfMonth = (date: Date = new Date()): Date => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get end of month
 */
export const endOfMonth = (date: Date = new Date()): Date => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Get start of quarter
 */
export const startOfQuarter = (date: Date = new Date()): Date => {
  const d = new Date(date);
  const quarter = Math.floor(d.getMonth() / 3);
  d.setMonth(quarter * 3, 1);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get end of quarter
 */
export const endOfQuarter = (date: Date = new Date()): Date => {
  const d = new Date(date);
  const quarter = Math.floor(d.getMonth() / 3);
  d.setMonth(quarter * 3 + 3, 0);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Get start of year
 */
export const startOfYear = (date: Date = new Date()): Date => {
  const d = new Date(date);
  d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get end of year
 */
export const endOfYear = (date: Date = new Date()): Date => {
  const d = new Date(date);
  d.setMonth(11, 31);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Add days to date
 */
export const addDays = (date: Date, days: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

/**
 * Add months to date
 */
export const addMonths = (date: Date, months: number): Date => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

/**
 * Difference in days between two dates
 */
export const diffInDays = (date1: Date, date2: Date): number => {
  const timeDiff = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
};

/**
 * Check if date is in range
 */
export const isDateInRange = (date: Date, startDate: Date, endDate: Date): boolean => {
  return date >= startDate && date <= endDate;
};

/**
 * Format date to ISO string (date only)
 */
export const formatDateISO = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Parse ISO date string to Date
 */
export const parseISODate = (dateString: string): Date => {
  return new Date(dateString);
};

/**
 * Get fiscal quarter from date
 */
export const getFiscalQuarter = (date: Date, fiscalYearStartMonth: number = 0): number => {
  const month = (date.getMonth() - fiscalYearStartMonth + 12) % 12;
  return Math.floor(month / 3) + 1;
};

/**
 * Get fiscal year from date
 */
export const getFiscalYear = (date: Date, fiscalYearStartMonth: number = 0): number => {
  const year = date.getFullYear();
  const month = date.getMonth();
  return month < fiscalYearStartMonth ? year : year + 1;
};

export default {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  addDays,
  addMonths,
  diffInDays,
  isDateInRange,
  formatDateISO,
  parseISODate,
  getFiscalQuarter,
  getFiscalYear,
};
