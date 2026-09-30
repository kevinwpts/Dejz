/**
 * Unified Category Colors for Dejz
 * Single source of truth for category color palette, fallback assignments, and consistency.
 */

export const DEFAULT_CATEGORY_PALETTE = [
  '#6658E8', // Lila (Primary Purple Accent)
  '#367ACB', // Blå
  '#168A91', // Turkos
  '#34845C', // Grön
  '#C56B2B', // Orange
  '#BC527D', // Rosa
  '#79728D', // Grålila
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

  const normalized = categoryName.trim().toLowerCase();

  // 1. Check if user configured an explicit color for this category
  if (customCategories && Array.isArray(customCategories)) {
    const matched = customCategories.find(c => c.name.trim().toLowerCase() === normalized);
    if (matched?.color && matched.color.trim() !== '') {
      return matched.color;
    }
  }

  // 2. Deterministic hash of category name into DEFAULT_CATEGORY_PALETTE
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  const index = Math.abs(hash) % DEFAULT_CATEGORY_PALETTE.length;
  return DEFAULT_CATEGORY_PALETTE[index];
}
