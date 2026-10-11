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
    }).replace(/\s/g, ' ').replace(/\u00a0/g, ' ').replace(/^-/, '−');
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
  if (integerPart === '-' && decimalPart !== '') return '−' + decimalPart;
  
  // Use a manual regex for grouping to ensure spaces are always used consistently
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  // If the user is typing "0", allow it
  if (integerPart === '0' && parts.length === 1) return '0';
  if (integerPart === '-0' && parts.length === 1) return '−0';

  return (formattedInteger + decimalPart).replace(/^-/, '−');
};

export interface FormatCurrencyOptions {
  showPlus?: boolean;
  suffix?: string;
  hideCurrency?: boolean;
}

/**
 * Central funktion för valutaformatering i hela Dejz.
 * Säkerställer konsekvent hantering av:
 * - Valfri valutasymbol (kr, €, $, £ etc.)
 * - Tusentalsavgränsare (konsekvent mellanslag)
 * - Decimaler (enligt valt språk)
 * - Typografiskt minustecken (U+2212 '−')
 * - Mellanrum före valutasymbol
 *
 * Exempel:
 * formatCurrency(19100, '€') => "19 100 €"
 * formatCurrency(0, '€') => "0 €"
 * formatCurrency(-120, '€') => "−120 €"
 * formatCurrency(500, '€', 'sv', { showPlus: true }) => "+500 €"
 */
export const formatCurrency = (
  val: string | number | null | undefined,
  currency: string = 'kr',
  language: string = 'sv-SE',
  options?: FormatCurrencyOptions
): string => {
  const curr = currency || 'kr';
  if (val === null || val === undefined || val === '') {
    return options?.hideCurrency ? '0' : `0 ${curr}${options?.suffix || ''}`;
  }

  const numVal = typeof val === 'number' ? val : parseAmount(val);
  const isNegative = typeof val === 'number'
    ? val < 0
    : String(val).trim().startsWith('-') || String(val).trim().startsWith('−');
  const isZero = numVal === 0;

  const absNum = Math.abs(numVal);
  const formattedAbs = formatAmount(absNum, language) || '0';

  let prefix = '';
  if (isNegative && !isZero) {
    prefix = '−';
  } else if (options?.showPlus && !isZero) {
    prefix = '+';
  }

  if (options?.hideCurrency) {
    return `${prefix}${formattedAbs}${options?.suffix || ''}`;
  }

  return `${prefix}${formattedAbs} ${curr}${options?.suffix || ''}`;
};

/**
 * Formats day of month into ordinal representation (e.g. 1st, 2nd, 25th in EN or 1:a, 2:a, 25:e in SV/others)
 */
export const formatOrdinalDay = (day: number, lang: string = 'sv'): string => {
  const isEn = lang === 'en' || lang === 'en-US';
  if (isEn) {
    if (day >= 11 && day <= 13) return `${day}th`;
    const lastDigit = day % 10;
    if (lastDigit === 1) return `${day}st`;
    if (lastDigit === 2) return `${day}nd`;
    if (lastDigit === 3) return `${day}rd`;
    return `${day}th`;
  }
  // Swedish / Nordic: 1:a, 2:a, 21:a, 22:a, 31:a, others :e
  if (day === 1 || day === 2 || day === 21 || day === 22 || day === 31) {
    return `${day}:a`;
  }
  return `${day}:e`;
};

/**
 * Formats payday summary sentence for settings and onboarding
 */
export const formatPaydaySummary = (day: number, lang: string = 'sv'): string => {
  const isEn = lang === 'en' || lang === 'en-US';
  const ordinal = formatOrdinalDay(day, lang);
  if (isEn) {
    return `The ${ordinal} of each month`;
  }
  return `Den ${ordinal} varje månad`;
};

export const parseAmount = (val: string): number => {
  if (!val) return 0;
  
  // Replace typographical minus with standard minus
  const clean = val.trim().replace(/^−/, '-');

  // If simple signed number with optional spaces and comma/dot
  if (/^[-+]?\d+([.,]\d+)?$/.test(clean.replace(/\s/g, ''))) {
    const normalized = clean.replace(/\s/g, '').replace(/,/g, '.');
    return parseFloat(normalized) || 0;
  }

  // Try evaluating as math expression first if operators are present
  const mathVal = parseMathAmount(val);
  if (mathVal !== null) {
    return mathVal;
  }

  // Replace comma with dot for parseFloat and remove spaces
  const normalized = clean.replace(/\s/g, '').replace(/,/g, '.');
  return parseFloat(normalized) || 0;
};

/**
 * Formats a deduction day (1-31 or 99/32) into user-friendly text.
 */
export const formatDeductionDayDisplay = (day?: number | null, language: string = 'sv', short: boolean = false): string => {
  if (!day) return '-';
  const isEn = language === 'en' || language === 'en-US';

  if (day === 1) {
    return isEn ? '1st' : '1:a';
  }

  if (day === 31 || day === 99 || day === 32) {
    if (short) return isEn ? 'Last day' : 'Sista dagen';
    return isEn ? 'Last day of month' : 'Sista dagen i månaden';
  }

  return formatOrdinalDay(day, language);
};

/**
 * Returns options list for deduction day selects.
 */
export const getDeductionDayOptions = (language: string = 'sv') => {
  const isEn = language === 'en' || language === 'en-US';
  const options = [
    { value: 1, label: isEn ? '1st - First day of month' : 'Första dagen i månaden (1:a)' },
  ];

  for (let d = 2; d <= 30; d++) {
    options.push({ value: d, label: formatOrdinalDay(d, language) });
  }

  options.push({
    value: 31,
    label: isEn ? 'Last day of month' : 'Sista dagen i månaden',
  });

  return options;
};
