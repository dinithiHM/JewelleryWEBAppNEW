/**
 * Format a number as currency
 * @param value The number to format
 * @param locale The locale to use for formatting (default: 'en-US')
 * @param currency The currency code (default: 'LKR')
 * @returns Formatted currency string
 */
export const formatCurrency = (
  value: number | string,
  locale: string = 'en-US',
  currency: string = 'LKR'
): string => {
  // Convert to number if it's a string
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;

  // Handle NaN values
  if (isNaN(numericValue)) {
    console.warn('Invalid value for currency formatting:', value);
    return 'Rs. 0.00';
  }

  // Use the Sri Lankan Rupee symbol (Rs) instead of LKR text
  return 'Rs. ' + new Intl.NumberFormat(locale, {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue);
};

/**
 * Format a date string
 * @param dateString The date string to format
 * @param locale The locale to use for formatting (default: 'en-US')
 * @returns Formatted date string
 */
export const formatDate = (
  dateString: string,
  locale: string = 'en-US'
): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  }).format(date);
};
