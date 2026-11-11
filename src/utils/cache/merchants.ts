/** Butiksnamn: egna namn (alias), dolda förslag, borttagna poster och manuella ändringar. */
import { TRANSACTION_META_KEY } from './itemMeta';
import { extractMerchantKeyVariants, normalizeMerchantKey } from './appState';
import { syncAllUserPreferencesToSupabase } from './preferencesSync';

// --- Permanent Ignored / Blacklisted Merchants for Fixed Items ---
export const DISMISSED_FIXED_KEY = 'dejz_dismissed_fixed_merchants_v1';

export const DISMISSED_INCOME_KEY = 'dejz_dismissed_income_merchants_v1';

export const DELETED_FIXED_IDS_KEY = 'dejz_deleted_fixed_ids_v1';

export const DELETED_INCOME_IDS_KEY = 'dejz_deleted_income_ids_v1';

export const MANUAL_FIXED_OVERRIDES_KEY = 'dejz_manual_fixed_overrides_v1';

export const MANUAL_INCOME_OVERRIDES_KEY = 'dejz_manual_income_overrides_v1';

export const MERCHANT_ALIASES_KEY = 'dejz_merchant_aliases_v3';

export const GENERIC_PLACEHOLDER_MERCHANTS = new Set([
  'banktransaktion',
  'kortköp',
  'kortkop',
  'betalning',
  'autogiro',
  'bankgiro',
  'plusgiro',
  'bg',
  'pg',
  'insättning',
  'insattning',
  'utbetalning',
  'inbetalning',
  'utgift',
  'inkomst',
  'köp',
  'kop',
  'reserverat',
  'reservation',
  'överföring',
  'overforing',
  'okänd',
  'okand',
  'okänd butik',
  'okand butik',
  'övrigt',
  'ovrigt',
  'swish',
  'swish betalning',
  'swish inbetalning',
  'swish mottagen',
  'swish skickad',
  'swish från',
  'swish fran',
  'swish till',
  'swish handel',
]);

let hasRunSwishBulkCleanup = false;

export function runSwishBulkRenameCleanupOnce(): void {
  if (hasRunSwishBulkCleanup || typeof window === 'undefined') return;
  hasRunSwishBulkCleanup = true;
  try {
    if (localStorage.getItem('dejz_swish_zlatan_cleanup_v1') === 'true') return;
    localStorage.setItem('dejz_swish_zlatan_cleanup_v1', 'true');

    const rawAliases = localStorage.getItem(MERCHANT_ALIASES_KEY);
    if (rawAliases) {
      const parsedAliases = JSON.parse(rawAliases);
      if (parsedAliases && typeof parsedAliases === 'object') {
        let changed = false;
        for (const [k, v] of Object.entries(parsedAliases)) {
          const val = v as { name?: string } | null;
          if (k === 'swish' || (val?.name && /zlatan\s*kadic/i.test(val.name))) {
            delete parsedAliases[k];
            changed = true;
          }
        }
        if (changed) {
          localStorage.setItem(MERCHANT_ALIASES_KEY, JSON.stringify(parsedAliases));
        }
      }
    }

    const rawMeta = localStorage.getItem(TRANSACTION_META_KEY);
    if (rawMeta) {
      const parsedMeta = JSON.parse(rawMeta);
      if (parsedMeta && typeof parsedMeta === 'object') {
        let metaChanged = false;
        for (const [txId, meta] of Object.entries(parsedMeta)) {
          const entry = meta as { customTitle?: string } | null;
          if (entry?.customTitle && /zlatan\s*kadic/i.test(entry.customTitle)) {
            delete entry.customTitle;
            metaChanged = true;
            if (Object.keys(entry).length === 0) {
              delete parsedMeta[txId];
            }
          }
        }
        if (metaChanged) {
          localStorage.setItem(TRANSACTION_META_KEY, JSON.stringify(parsedMeta));
        }
      }
    }
  } catch {
    // ignore
  }
}

export function isGenericPlaceholderMerchant(name: string | null | undefined): boolean {
  if (!name) return true;
  const cleaned = String(name).toLowerCase().trim();
  if (!cleaned) return true;
  if (GENERIC_PLACEHOLDER_MERCHANTS.has(cleaned)) return true;
  const norm = normalizeMerchantKey(cleaned);
  if (!norm || GENERIC_PLACEHOLDER_MERCHANTS.has(norm)) return true;
  return false;
}

export function getMerchantAliases(): Record<string, { name: string; category: string }> {
  if (typeof window === 'undefined') return {};
  runSwishBulkRenameCleanupOnce();
  try {
    const raw = localStorage.getItem(MERCHANT_ALIASES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};

    let dirty = false;
    const cleanedMap: Record<string, { name: string; category: string }> = {};
    for (const [k, v] of Object.entries(parsed)) {
      const val = v as { name?: string; category?: string } | null;
      if (
        !val ||
        typeof val.name !== 'string' ||
        isGenericPlaceholderMerchant(k) ||
        isGenericPlaceholderMerchant(val.name)
      ) {
        dirty = true;
        continue;
      }
      cleanedMap[k] = { name: val.name, category: val.category || 'Övrigt' };
    }

    if (dirty) {
      try {
        localStorage.setItem(MERCHANT_ALIASES_KEY, JSON.stringify(cleanedMap));
      } catch {
        // ignore
      }
    }

    return cleanedMap;
  } catch {
    return {};
  }
}

export function saveMerchantAlias(rawName: string, targetName: string, category: string): void {
  if (typeof window === 'undefined' || !rawName || !targetName) return;
  if (isGenericPlaceholderMerchant(rawName) || isGenericPlaceholderMerchant(targetName)) return;
  try {
    const map = getMerchantAliases();
    const sourceVariants = extractMerchantKeyVariants(rawName).filter(
      (v) => !isGenericPlaceholderMerchant(v)
    );
    if (sourceVariants.length === 0) return;

    // Flatten alias chains: any existing alias pointing to rawName now points to targetName
    for (const [k, v] of Object.entries(map)) {
      const existingTargetNorm = normalizeMerchantKey(v.name);
      if (sourceVariants.includes(existingTargetNorm) || v.name.toLowerCase().trim() === rawName.toLowerCase().trim()) {
        map[k] = { name: targetName, category };
      }
    }

    for (const key of sourceVariants) {
      map[key] = { name: targetName, category };
    }

    localStorage.setItem(MERCHANT_ALIASES_KEY, JSON.stringify(map));
    syncAllUserPreferencesToSupabase();
  } catch {
    // ignore
  }
}

export function resolveMerchantAlias(
  rawText: string,
  aliasesOverride?: Record<string, { name: string; category: string }>
): { name: string; category: string } | null {
  if (!rawText || isGenericPlaceholderMerchant(rawText)) return null;
  const aliases = aliasesOverride || getMerchantAliases();
  const variants = extractMerchantKeyVariants(rawText).filter(
    (v) => !isGenericPlaceholderMerchant(v)
  );
  // Endast exakt nyckelmatchning — gör ALDRIG substring-matchning (så att t.ex. "ryde" aldrig matchar "hemköp rydebäck")!
  for (const v of variants) {
    if (aliases[v] && !isGenericPlaceholderMerchant(aliases[v].name)) {
      return aliases[v];
    }
  }

  return null;
}

export function removeMerchantAliasForSources(
  sources: Array<string | null | undefined>
): void {
  if (typeof window === 'undefined' || !sources || sources.length === 0) return;
  try {
    const map = getMerchantAliases();
    const keysToRemove = new Set<string>();
    const lowerSources = new Set<string>();
    for (const s of sources) {
      if (!s || typeof s !== 'string') continue;
      const trimmed = s.trim();
      if (!trimmed) continue;
      lowerSources.add(trimmed.toLowerCase());
      for (const v of extractMerchantKeyVariants(trimmed)) {
        if (v) keysToRemove.add(v);
      }
    }
    if (keysToRemove.size === 0 && lowerSources.size === 0) return;

    let changed = false;
    for (const [k, v] of Object.entries(map)) {
      const targetNorm = normalizeMerchantKey(v.name);
      const targetLower = v.name.toLowerCase().trim();
      if (
        keysToRemove.has(k) ||
        (targetNorm && keysToRemove.has(targetNorm)) ||
        lowerSources.has(targetLower)
      ) {
        delete map[k];
        changed = true;
      }
    }
    if (changed) {
      localStorage.setItem(MERCHANT_ALIASES_KEY, JSON.stringify(map));
      syncAllUserPreferencesToSupabase();
    }
  } catch {
    // ignore
  }
}

export function getDismissedFixedMerchants(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DISMISSED_FIXED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    const set = new Set<string>();
    if (Array.isArray(arr)) {
      for (const item of arr) {
        for (const v of extractMerchantKeyVariants(String(item))) {
          set.add(v);
        }
      }
    }
    return set;
  } catch {
    return new Set();
  }
}

export function dismissFixedMerchant(name: string, originalName?: string): void {
  if (typeof window === 'undefined' || !name) return;
  try {
    const set = getDismissedFixedMerchants();
    for (const v of extractMerchantKeyVariants(name)) {
      set.add(v);
    }
    if (originalName) {
      for (const v of extractMerchantKeyVariants(originalName)) {
        set.add(v);
      }
    }
    // Also dismiss any alias keys that pointed to this merchant
    const aliases = getMerchantAliases();
    const targetNorm = normalizeMerchantKey(name);
    for (const [k, info] of Object.entries(aliases)) {
      if (normalizeMerchantKey(info.name) === targetNorm) {
        set.add(k);
      }
    }
    localStorage.setItem(DISMISSED_FIXED_KEY, JSON.stringify(Array.from(set)));
    syncAllUserPreferencesToSupabase();
  } catch {
    // ignore
  }
}

export function unDismissFixedMerchant(name: string, originalName?: string): void {
  if (typeof window === 'undefined' || !name) return;
  try {
    const set = getDismissedFixedMerchants();
    for (const v of extractMerchantKeyVariants(name)) {
      set.delete(v);
    }
    if (originalName) {
      for (const v of extractMerchantKeyVariants(originalName)) {
        set.delete(v);
      }
    }
    const aliases = getMerchantAliases();
    const targetNorm = normalizeMerchantKey(name);
    for (const [k, info] of Object.entries(aliases)) {
      if (normalizeMerchantKey(info.name) === targetNorm) {
        set.delete(k);
      }
    }
    localStorage.setItem(DISMISSED_FIXED_KEY, JSON.stringify(Array.from(set)));
    syncAllUserPreferencesToSupabase();
  } catch {
    // ignore
  }
}

export function getDismissedIncomeMerchants(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DISMISSED_INCOME_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    const set = new Set<string>();
    if (Array.isArray(arr)) {
      for (const item of arr) {
        for (const v of extractMerchantKeyVariants(String(item))) {
          set.add(v);
        }
      }
    }
    return set;
  } catch {
    return new Set();
  }
}

export function dismissIncomeMerchant(name: string, originalName?: string): void {
  if (typeof window === 'undefined' || !name) return;
  try {
    const set = getDismissedIncomeMerchants();
    for (const v of extractMerchantKeyVariants(name)) {
      set.add(v);
    }
    if (originalName) {
      for (const v of extractMerchantKeyVariants(originalName)) {
        set.add(v);
      }
    }
    const aliases = getMerchantAliases();
    const targetNorm = normalizeMerchantKey(name);
    for (const [k, info] of Object.entries(aliases)) {
      if (normalizeMerchantKey(info.name) === targetNorm) {
        set.add(k);
      }
    }
    localStorage.setItem(DISMISSED_INCOME_KEY, JSON.stringify(Array.from(set)));
    syncAllUserPreferencesToSupabase();
  } catch {
    // ignore
  }
}

export function unDismissIncomeMerchant(name: string, originalName?: string): void {
  if (typeof window === 'undefined' || !name) return;
  try {
    const set = getDismissedIncomeMerchants();
    for (const v of extractMerchantKeyVariants(name)) {
      set.delete(v);
    }
    if (originalName) {
      for (const v of extractMerchantKeyVariants(originalName)) {
        set.delete(v);
      }
    }
    const aliases = getMerchantAliases();
    const targetNorm = normalizeMerchantKey(name);
    for (const [k, info] of Object.entries(aliases)) {
      if (normalizeMerchantKey(info.name) === targetNorm) {
        set.delete(k);
      }
    }
    localStorage.setItem(DISMISSED_INCOME_KEY, JSON.stringify(Array.from(set)));
    syncAllUserPreferencesToSupabase();
  } catch {
    // ignore
  }
}

export function getDeletedFixedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DELETED_FIXED_IDS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

export function markFixedIdDeleted(id: string): void {
  if (typeof window === 'undefined' || !id) return;
  try {
    const set = getDeletedFixedIds();
    set.add(id);
    localStorage.setItem(DELETED_FIXED_IDS_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

export function unmarkFixedIdDeleted(id: string): void {
  if (typeof window === 'undefined' || !id) return;
  try {
    const set = getDeletedFixedIds();
    if (set.delete(id)) {
      localStorage.setItem(DELETED_FIXED_IDS_KEY, JSON.stringify(Array.from(set)));
    }
  } catch {
    // ignore
  }
}

export function getDeletedIncomeIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DELETED_INCOME_IDS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

export function markIncomeIdDeleted(id: string): void {
  if (typeof window === 'undefined' || !id) return;
  try {
    const set = getDeletedIncomeIds();
    set.add(id);
    localStorage.setItem(DELETED_INCOME_IDS_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

export function unmarkIncomeIdDeleted(id: string): void {
  if (typeof window === 'undefined' || !id) return;
  try {
    const set = getDeletedIncomeIds();
    if (set.delete(id)) {
      localStorage.setItem(DELETED_INCOME_IDS_KEY, JSON.stringify(Array.from(set)));
    }
  } catch {
    // ignore
  }
}

export interface ManualFixedOverride {
  amount?: number;
  fullAmount?: number;
  isShared?: boolean;
  dueDay?: number;
  category?: string;
  paymentMethod?: string;
  name?: string;
  linkedAliases?: string[];
  linkedGoalId?: string;
  receipts?: { url: string; name: string }[];
  isCancelled?: boolean;
  lastPaymentDate?: string;
  hasNoMorePayments?: boolean;
}

/**
 * Compresses an uploaded image file (receipt photo or avatar) via HTML5 Canvas
 * so Base64 strings stay small (~20-90 KB) and never exceed localStorage quotas.
 */
export function compressImageFileToDataUrl(
  file: File,
  maxDimension = 1280,
  quality = 0.74
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () =>
        typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Read error'));
      reader.onerror = () => reject(new Error('Read error'));
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== 'string') {
        reject(new Error('Invalid file data'));
        return;
      }
      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width >= height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed.length < dataUrl.length ? compressed : dataUrl);
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function getManualFixedOverrides(): Record<string, ManualFixedOverride> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(MANUAL_FIXED_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveManualFixedOverride(
  name: string,
  override: ManualFixedOverride,
  previousOrOriginalName?: string,
  itemId?: string,
  skipGenericMerchantKey?: boolean
): void {
  if (typeof window === 'undefined' || !name) return;
  try {
    const map = getManualFixedOverrides();
    if (itemId) {
      map[`id:${itemId}`] = { ...(map[`id:${itemId}`] || {}), ...override };
    }
    if (!skipGenericMerchantKey) {
      const keys = new Set<string>(extractMerchantKeyVariants(name));
      if (previousOrOriginalName) {
        for (const v of extractMerchantKeyVariants(previousOrOriginalName)) {
          keys.add(v);
        }
      }
      for (const key of keys) {
        map[key] = { ...(map[key] || {}), ...override };
      }
    }
    localStorage.setItem(MANUAL_FIXED_OVERRIDES_KEY, JSON.stringify(map));
    syncAllUserPreferencesToSupabase();
  } catch {
    // ignore
  }
}

export interface ManualIncomeOverride {
  amount?: number;
  payday?: number;
  category?: string;
  name?: string;
  linkedAliases?: string[];
}

export function getManualIncomeOverrides(): Record<string, ManualIncomeOverride> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(MANUAL_INCOME_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveManualIncomeOverride(
  name: string,
  override: ManualIncomeOverride,
  previousOrOriginalName?: string,
  itemId?: string,
  skipGenericMerchantKey?: boolean
): void {
  if (typeof window === 'undefined' || !name) return;
  try {
    const map = getManualIncomeOverrides();
    if (itemId) {
      map[`id:${itemId}`] = { ...(map[`id:${itemId}`] || {}), ...override };
    }
    if (!skipGenericMerchantKey) {
      const keys = new Set<string>(extractMerchantKeyVariants(name));
      if (previousOrOriginalName) {
        for (const v of extractMerchantKeyVariants(previousOrOriginalName)) {
          keys.add(v);
        }
      }
      for (const key of keys) {
        map[key] = { ...(map[key] || {}), ...override };
      }
    }
    localStorage.setItem(MANUAL_INCOME_OVERRIDES_KEY, JSON.stringify(map));
    syncAllUserPreferencesToSupabase();
  } catch {
    // ignore
  }
}
