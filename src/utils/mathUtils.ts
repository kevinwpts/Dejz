/**
 * Utility functions for evaluating quick math expressions in amount inputs
 * e.g., "2000 / 2", "150 + 250", "1000 * 0.5", "2000 ÷ 2"
 */

export function parseMathAmount(expr: string): number | null {
  if (!expr || !expr.trim()) return null;

  // Replace Swedish non-breaking spaces, regular spaces, commas to dots, and custom math symbols
  let sanitized = expr
    .replace(/[\s\u00A0\u200F]/g, '')
    .replace(/,/g, '.')
    .replace(/×/g, '*')
    .replace(/x/gi, '*')
    .replace(/÷/g, '/');

  // Strip trailing operators if user is mid-typing (e.g. "2000 + " or "2000/")
  sanitized = sanitized.replace(/[+\-*/.]+$/, '');

  if (!sanitized) return null;

  // Security check: strictly allow digits, decimal points, and basic math operators
  if (!/^[0-9+\-*/.()]+$/.test(sanitized)) {
    return null;
  }

  try {
    const result = new Function(`"use strict"; return (${sanitized});`)();
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      return Math.max(0, Math.round(result * 100) / 100);
    }
  } catch {
    return null;
  }

  return null;
}

export function evaluateAndFormatAmount(expr: string): string {
  const result = parseMathAmount(expr);
  if (result !== null) {
    const hasDecimals = Math.abs(result % 1) > 1e-6;
    return result.toLocaleString('sv-SE', {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    }).replace(/\s/g, ' ').replace(/\u00a0/g, ' ');
  }
  return expr;
}

export function hasMathOperators(expr: string): boolean {
  return /[+×*xX÷/-]/.test(expr);
}

export function formatLiveMathPreview(expr: string): string | null {
  if (!hasMathOperators(expr)) return null;
  const result = parseMathAmount(expr);
  if (result === null) return null;
  
  const hasDecimals = Math.abs(result % 1) > 1e-6;
  return result.toLocaleString('sv-SE', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).replace(/\s/g, ' ').replace(/\u00a0/g, ' ');
}
