/** Swish-nummer → namn som du själv har kopplat ihop. */
import { syncAllUserPreferencesToSupabase } from './preferencesSync';

// --- Swish Phone-to-Name Directory & Lookup Cache ---
const SWISH_PHONE_LOOKUP_KEY = 'dejz_swish_phone_lookup_v1';

export function normalizeSwishPhoneKey(rawPhone: string | null | undefined): string {
  if (!rawPhone) return '';
  const digits = String(rawPhone).replace(/\D/g, '');
  if (digits.startsWith('467') && digits.length === 11) {
    return '07' + digits.slice(3);
  }
  if (digits.startsWith('00467') && digits.length === 13) {
    return '07' + digits.slice(5);
  }
  if ((digits.startsWith('07') || digits.startsWith('123')) && digits.length === 10) {
    return digits;
  }
  return digits;
}

export function getSwishPhoneDirectoryMap(): Record<string, string> {
  const map: Record<string, string> = {};
  if (typeof window === 'undefined') return map;
  try {
    const rawContacts = localStorage.getItem('dejz_swish_contacts');
    if (rawContacts) {
      const parsed = JSON.parse(rawContacts);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const norm = normalizeSwishPhoneKey(item?.phone);
          const name = String(item?.name || '').trim();
          if (norm === '0739976655' && /^kristoffer nilsson$/i.test(name)) continue;
          if (norm && name) {
            map[norm] = name;
          }
        }
      }
    }
    const rawLookup = localStorage.getItem(SWISH_PHONE_LOOKUP_KEY);
    if (rawLookup) {
      const parsedLookup = JSON.parse(rawLookup);
      if (parsedLookup && typeof parsedLookup === 'object') {
        for (const [k, v] of Object.entries(parsedLookup)) {
          const norm = normalizeSwishPhoneKey(k);
          const name = String(v || '').trim();
          if (norm === '0739976655' && /^kristoffer nilsson$/i.test(name)) continue;
          if (norm && name) {
            map[norm] = name;
          }
        }
      }
    }
  } catch {
    // ignore
  }
  return map;
}

export function resolveSwishPhoneToName(rawPhone: string | null | undefined): string | null {
  const norm = normalizeSwishPhoneKey(rawPhone);
  if (!norm) return null;
  const map = getSwishPhoneDirectoryMap();
  return map[norm] || null;
}

export function saveSwishPhoneDirectoryEntry(rawPhone: string, rawName: string): void {
  if (typeof window === 'undefined') return;
  const norm = normalizeSwishPhoneKey(rawPhone);
  const cleanName = String(rawName || '')
    .replace(/^swish\s*(från|fran|till|mottagen|skickad|inbetalning|betalning)?\s*/i, '')
    .replace(/\(\s*[\d\s+-]+\s*\)/g, '')
    .trim();
  if (!norm || !cleanName || /^swish$/i.test(cleanName) || /^[\d\s+-]+$/.test(cleanName)) {
    return;
  }
  try {
    const rawLookup = localStorage.getItem(SWISH_PHONE_LOOKUP_KEY);
    const lookupMap: Record<string, string> = rawLookup ? JSON.parse(rawLookup) : {};
    lookupMap[norm] = cleanName;
    localStorage.setItem(SWISH_PHONE_LOOKUP_KEY, JSON.stringify(lookupMap));

    // Also keep dejz_swish_contacts in sync so quick-split Swish picker has the contact
    const rawContacts = localStorage.getItem('dejz_swish_contacts');
    const contactsList: { name: string; phone: string }[] = rawContacts
      ? JSON.parse(rawContacts)
      : [];
    const formattedPhone =
      /^07\d{8}$/.test(norm)
        ? `${norm.slice(0, 3)}-${norm.slice(3, 6)} ${norm.slice(6, 8)} ${norm.slice(8, 10)}`
        : norm;
    const existingIdx = Array.isArray(contactsList)
      ? contactsList.findIndex((c) => normalizeSwishPhoneKey(c?.phone) === norm)
      : -1;
    if (existingIdx >= 0) {
      contactsList[existingIdx] = { name: cleanName, phone: formattedPhone };
    } else if (Array.isArray(contactsList)) {
      contactsList.unshift({ name: cleanName, phone: formattedPhone });
    }
    localStorage.setItem('dejz_swish_contacts', JSON.stringify(contactsList.slice(0, 50)));

    window.dispatchEvent(
      new CustomEvent('dejz:swish-directory-updated', { detail: { phone: norm, name: cleanName } })
    );
    syncAllUserPreferencesToSupabase();
  } catch {
    // ignore
  }
}

export function removeSwishPhoneDirectoryEntry(rawPhone: string): void {
  if (typeof window === 'undefined') return;
  const norm = normalizeSwishPhoneKey(rawPhone);
  if (!norm) return;
  try {
    const rawLookup = localStorage.getItem(SWISH_PHONE_LOOKUP_KEY);
    if (rawLookup) {
      const lookupMap: Record<string, string> = JSON.parse(rawLookup);
      if (lookupMap && typeof lookupMap === 'object' && norm in lookupMap) {
        delete lookupMap[norm];
        localStorage.setItem(SWISH_PHONE_LOOKUP_KEY, JSON.stringify(lookupMap));
      }
    }

    const rawContacts = localStorage.getItem('dejz_swish_contacts');
    if (rawContacts) {
      const contactsList: { name: string; phone: string }[] = JSON.parse(rawContacts);
      if (Array.isArray(contactsList)) {
        const filtered = contactsList.filter((c) => normalizeSwishPhoneKey(c?.phone) !== norm);
        localStorage.setItem('dejz_swish_contacts', JSON.stringify(filtered));
      }
    }

    window.dispatchEvent(
      new CustomEvent('dejz:swish-directory-updated', { detail: { phone: norm, name: '' } })
    );
    syncAllUserPreferencesToSupabase();
  } catch {
    // ignore
  }
}
