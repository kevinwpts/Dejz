/**
 * Regler för att hålla inställningar i synk mellan flera enheter – en nyckel i taget.
 *
 * Varje enhet minns, per nyckel, vilken version från servern den senast såg (`seen`) och hur
 * värdet såg ut då (`hash`). Då vet vi:
 * - har jag ändrat något här sedan dess? → skicka bara den nyckeln
 * - har någon annan enhet ändrat den? → hämta den, om jag inte själv har en osparad ändring
 *
 * Rena funktioner utan localStorage, så att de går att testa.
 */

export interface PrefSyncMeta {
  uid: string;
  /** true när enheten har jämfört med servern minst en gång */
  initialized: boolean;
  /** Serverns tidsstämpel per nyckel som enheten senast såg */
  seen: Record<string, string>;
  /** Hur värdet såg ut senast det var i synk med servern */
  hash: Record<string, string>;
}

export const emptyMeta = (uid: string): PrefSyncMeta => ({ uid, initialized: false, seen: {}, hash: {} });

/** JSON med sorterade nycklar, så att samma innehåll alltid ger samma text. */
function stableStringify(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(',')}}`;
}

/** Kort fingeravtryck av ett värde (FNV-1a). Bara för att jämföra, inte säkerhet. */
export function hashValue(value: unknown): string {
  const s = stableStringify(value);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${(h >>> 0).toString(36)}:${s.length}`;
}

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as object).length === 0;
  return false;
}

/** Nycklar som ändrats på den här enheten sedan senaste synk. */
export function findDirtyKeys(local: Record<string, unknown>, meta: PrefSyncMeta): string[] {
  if (!meta.initialized) return [];
  return Object.keys(local).filter((k) => k !== 'updatedAt' && hashValue(local[k]) !== meta.hash[k]);
}

export interface HydratePlan {
  /** Nycklar där serverns värde ska skrivas till enheten */
  apply: string[];
  /** Nycklar där enhetens egen, osparade ändring behålls (skickas vid nästa synk) */
  keepLocal: string[];
  meta: PrefSyncMeta;
}

/**
 * Bestämmer vad som ska hämtas från servern.
 * @param keys nycklar som får skrivas från servern
 * @param remoteStamps serverns tidsstämplar per nyckel (`_updatedAt`)
 * @param legacyStamp äldre data saknar tidsstämpel per nyckel – då används hela paketets tid
 */
export function planHydrate(
  keys: string[],
  local: Record<string, unknown>,
  remote: Record<string, unknown>,
  remoteStamps: Record<string, string>,
  legacyStamp: string,
  meta: PrefSyncMeta
): HydratePlan {
  const next: PrefSyncMeta = { ...meta, seen: { ...meta.seen }, hash: { ...meta.hash } };
  const apply: string[] = [];
  const keepLocal: string[] = [];

  for (const k of keys) {
    if (!(k in remote)) continue;
    const remoteStamp = remoteStamps[k] || legacyStamp || 'legacy';
    if (meta.initialized && meta.seen[k] === remoteStamp) continue; // redan i synk

    const remoteHash = hashValue(remote[k]);
    const localHash = hashValue(local[k]);
    const known = meta.hash[k] !== undefined;
    // Första gången (ingen historik): servern gäller – den har det som senast sparades från någon enhet.
    // Enhetens tomma värde räknas aldrig som en ändring.
    const changedHere = known && localHash !== meta.hash[k] && !isEmptyValue(local[k]);

    next.seen[k] = remoteStamp;
    if (localHash === remoteHash) {
      next.hash[k] = remoteHash;
    } else if (changedHere) {
      keepLocal.push(k);
    } else {
      apply.push(k);
      next.hash[k] = remoteHash;
    }
  }
  next.initialized = true;
  return { apply, keepLocal, meta: next };
}
