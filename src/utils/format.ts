import { parseMathAmount, hasMathOperators } from './mathUtils';

/**
 * Capitalizes the first letter of a string.
 */
export const capitalize = (s: string) => {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

/**
 * Formats a string or number with spaces as thousands separators.
 * Example: "20000" -> "20 000"
 */
export const formatAmount = (val: string | number, language: string = 'sv-SE'): string => {
  if (val === undefined || val === null || val === '') return '';
  
  if (typeof val === 'number') {
    const locale = (language === 'en' || language === 'en-US') ? 'en-US' : 'sv-SE';
    const hasDecimals = Math.abs(val % 1) > 1e-6;
    return val.toLocaleString(locale, {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2
    }).replace(/\s/g, ' ').replace(/\u00a0/g, ' ');
  }

  // If the input contains math operators, preserve them nicely
  if (hasMathOperators(val)) {
    return val;
  }

  // Filter allowed characters: digits, comma, dot, minus
  let cleanValue = val.replace(/[^\d.,-]/g, '');
  
  // Only allow one decimal separator
  const commaIndex = cleanValue.indexOf(',');
  const dotIndex = cleanValue.indexOf('.');
  
  if (commaIndex !== -1 && dotIndex !== -1) {
    // If both exist, keep the first one and remove others
    if (commaIndex < dotIndex) {
      cleanValue = cleanValue.slice(0, dotIndex).replace(/\./g, '') + cleanValue.slice(dotIndex);
    } else {
      cleanValue = cleanValue.slice(0, commaIndex).replace(/,/g, '') + cleanValue.slice(commaIndex);
    }
  }

  // Handle formatting of the integer part
  const parts = cleanValue.split(/[.,]/);
  const integerPart = parts[0];
  const decimalPart = parts.length > 1 ? (cleanValue.includes(',') ? ',' : '.') + parts[1] : '';

  if (integerPart === '' && decimalPart !== '') return decimalPart;
  if (integerPart === '-' && decimalPart !== '') return '-' + decimalPart;
  
  // Use a manual regex for grouping to ensure spaces are always used consistently
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  // If the user is typing "0", allow it
  if (integerPart === '0' && parts.length === 1) return '0';
  if (integerPart === '-0' && parts.length === 1) return '-0';

  return formattedInteger + decimalPart;
};

/**
 * Parses a formatted string back to a number.
 * Example: "20 000,50" -> 20000.5
 * Example: "2 000 / 2" -> 1000
 */
export const parseAmount = (val: string): number => {
  if (!val) return 0;
  
  // Try evaluating as math expression first if operators are present
  const mathVal = parseMathAmount(val);
  if (mathVal !== null) {
    return mathVal;
  }

  // Replace comma with dot for parseFloat and remove spaces
  const normalized = val.replace(/\s/g, '').replace(/,/g, '.');
  return parseFloat(normalized) || 0;
};
