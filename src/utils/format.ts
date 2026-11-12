/**
 * Normalizes a transaction's receiptUrl / receiptUrls into a clean array of URLs.
 * Supports single string URLs, JSON-encoded string arrays in receiptUrl, and receiptUrls arrays.
 */
export const getTransactionReceipts = (
  tx?: { receiptUrl?: string | null; receiptUrls?: string[] | null; receipt_url?: string | null } | null
): string[] => {
  if (!tx) return [];

  const result: string[] = [];
  const addUrl = (val: unknown) => {
    if (typeof val !== 'string') return;
    const trimmed = val.trim();
    if (!trimmed) return;
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          parsed.forEach(addUrl);
          return;
        }
      } catch {
        // treat as normal string if JSON parse fails
      }
    }
    if (!result.includes(trimmed)) {
      result.push(trimmed);
    }
  };

  if (Array.isArray(tx.receiptUrls)) {
    tx.receiptUrls.forEach(addUrl);
  }
  if (tx.receiptUrl) {
    addUrl(tx.receiptUrl);
  }
  if (tx.receipt_url) {
    addUrl(tx.receipt_url);
  }

  return result;
};

/**
 * Serializes an array of receipt URLs for database storage in the `receipt_url` text column.
 * Stores null when empty, single URL string when 1 item, or JSON array string when 2+ items.
 */
export const serializeTransactionReceipts = (urls?: string[] | null, fallbackSingle?: string | null): string | null => {
  const normalized = getTransactionReceipts({ receiptUrls: urls, receiptUrl: fallbackSingle });
  if (normalized.length === 0) return null;
  if (normalized.length === 1) return normalized[0];
  return JSON.stringify(normalized);
};

