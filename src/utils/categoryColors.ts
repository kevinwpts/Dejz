import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../constants';

/**
 * Unified Category Colors for Dejz
 * Single source of truth for category color palette, fallback assignments, and consistency.
 */

export const DEFAULT_CATEGORY_PALETTE = [
  '#6658E8', // Deep Indigo
  '#A89BFF', // Soft Lila
  '#79B8FF', // Blue
  '#5BCBC6', // Turquoise
  '#83C995', // Green
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#E9A66C', // Orange
  '#EF4444', // Red
  '#E99BBD', // Pink
  '#EC4899', // Hot Pink
  '#A855F7', // Purple
  '#3B82F6', // Royal Blue
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#64748B', // Slate
] as const;

/**
 * Deterministically compute a color for any category name if user hasn't explicitly set one.
 */
export function getCategoryColor(
  categoryName?: string | null,
  customCategories?: Array<{ name: string; color?: string }>,
  fallbackIndex?: number
): string {
  if (!categoryName) {
    if (typeof fallbackIndex === 'number' && fallbackIndex >= 0) {
      return DEFAULT_CATEGORY_PALETTE[fallbackIndex % DEFAULT_CATEGORY_PALETTE.length];
    }
    return DEFAULT_CATEGORY_PALETTE[0];
  }

  const normalized = (categoryName || '').trim().toLowerCase();

  // 1. Check if user configured an explicit color for this category
  if (customCategories && Array.isArray(customCategories)) {
    const matched = customCategories.find(c => (c?.name || '').trim().toLowerCase() === normalized);
    if (matched?.color && (matched.color || '').trim() !== '') {
      return matched.color;
    }
  }

  // 2. Check standard categories
  const defaultMatch = DEFAULT_EXPENSE_CATEGORIES.find(d => d.name.toLowerCase() === normalized)
    || DEFAULT_INCOME_CATEGORIES.find(d => d.name.toLowerCase() === normalized);
  if (defaultMatch?.color) {
    return defaultMatch.color;
  }

  // 3. Deterministic hash of category name into DEFAULT_CATEGORY_PALETTE
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  const index = Math.abs(hash) % DEFAULT_CATEGORY_PALETTE.length;
  return DEFAULT_CATEGORY_PALETTE[index];
}
