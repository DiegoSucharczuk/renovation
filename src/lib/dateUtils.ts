/**
 * Centralized date formatting utilities for consistent date display across the app
 * All functions handle null/undefined/invalid dates gracefully
 */

/**
 * Format date to short format: dd-mm-yyyy
 * @param date - Date object, string, or null/undefined
 * @returns Formatted date string or '—' if invalid
 * @example formatDateShort(new Date()) => "25-02-2026"
 */
export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) return '—';

  // Hebrew locale may return dd/mm/yyyy or dd.mm.yyyy depending on browser
  // We standardize to dd-mm-yyyy by replacing separators (NOT reversing!)
  const formatted = dateObj.toLocaleDateString('he-IL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // Replace both / and . with - to standardize format
  // Hebrew locale already returns dd/mm/yyyy or dd.mm.yyyy, so no need to reverse
  return formatted.replace(/[/.]/g, '-');
}

/**
 * Format date to long format with full weekday and month names
 * @param date - Date object, string, or null/undefined
 * @returns Formatted date string or '—' if invalid
 * @example formatDateLong(new Date()) => "יום שלישי, 25 בפברואר 2026"
 */
export function formatDateLong(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) return '—';

  return dateObj.toLocaleDateString('he-IL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format date to medium format with abbreviated month
 * @param date - Date object, string, or null/undefined
 * @returns Formatted date string or '—' if invalid
 * @example formatDateMedium(new Date()) => "25 בפבר׳ 2026"
 */
export function formatDateMedium(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) return '—';

  return dateObj.toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date with short weekday (for compact displays)
 * @param date - Date object, string, or null/undefined
 * @returns Formatted date string or '—' if invalid
 * @example formatDateWithWeekday(new Date()) => "יום ג׳, 25 בפבר׳"
 */
export function formatDateWithWeekday(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) return '—';

  return dateObj.toLocaleDateString('he-IL', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date to simple format without year (for current year dates)
 * @param date - Date object, string, or null/undefined
 * @returns Formatted date string or '—' if invalid
 * @example formatDateNoYear(new Date()) => "25 בפברואר"
 */
export function formatDateNoYear(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) return '—';

  return dateObj.toLocaleDateString('he-IL', {
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Calculate days overdue from a due date
 * @param dueDate - Due date
 * @returns Number of days overdue (positive) or until due (negative), or null if invalid
 */
export function calculateDaysOverdue(dueDate: Date | string | null | undefined): number | null {
  if (!dueDate) return null;
  const dueDateObj = dueDate instanceof Date ? dueDate : new Date(dueDate);
  if (isNaN(dueDateObj.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDateObj.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - dueDateObj.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Check if a date is in the past
 * @param date - Date to check
 * @returns true if date is before today
 */
export function isDateInPast(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dateObj.setHours(0, 0, 0, 0);

  return dateObj < today;
}

/**
 * Check if a date is today
 * @param date - Date to check
 * @returns true if date is today
 */
export function isToday(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) return false;

  const today = new Date();
  return (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  );
}

/**
 * Convert date to ISO string for input fields (yyyy-mm-dd)
 * @param date - Date object, string, or null/undefined
 * @returns ISO date string or empty string if invalid
 */
export function toInputDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) return '';

  return dateObj.toISOString().split('T')[0];
}

/**
 * Parse input date string to Date object
 * @param dateString - Date string in yyyy-mm-dd format
 * @returns Date object or null if invalid
 */
export function fromInputDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  return date;
}

// Default export with all formatters as an object (for convenience)
export const formatDate = {
  short: formatDateShort,
  long: formatDateLong,
  medium: formatDateMedium,
  withWeekday: formatDateWithWeekday,
  noYear: formatDateNoYear,
};
