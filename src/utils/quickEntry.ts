/**
 * Tolkar ett snabbt köp från röst eller text: "Ica 143", "ICA 143 kronor", "143 kr på Ica",
 * "Ica för 1 250 kr", "Max 129,50". Returnerar null om texten inte innehåller både namn och belopp.
 */
export function parseQuickEntry(text: string): { name: string; amount: number } | null {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return null;

  // Belopp: siffror, ev. tusentalsavgränsat med mellanslag, ev. decimaler, ev. "kr"/"kronor"/":-"
  const amountPattern = '(\\d{1,3}(?:[ .]\\d{3})+|\\d+)(?:[.,](\\d{1,2}))?\\s*(?:kr|kronor|kronor\\.|:-|sek)?';

  const trailing = clean.match(new RegExp(`^(.*?\\D)\\s+${amountPattern}\\.?$`, 'i'));
  const leading = clean.match(new RegExp(`^${amountPattern}\\s+(\\D.*)$`, 'i'));

  let name: string | undefined;
  let whole: string | undefined;
  let decimals: string | undefined;

  if (trailing) {
    [, name, whole, decimals] = trailing;
  } else if (leading) {
    [, whole, decimals, name] = leading;
  }
  if (!name || !whole) return null;

  const amount = Math.round(Number(`${whole.replace(/[ .]/g, '')}.${decimals || '0'}`));

  // Ta bort utfyllnadsord som kommer med när man pratar: "på Ica", "Ica för", "hos Max"
  const trimmedName = name
    .trim()
    .replace(/^(på|hos|i|från|till|köpte|handlade)\s+/i, '')
    .replace(/\s+(för|på|i|kostade)$/i, '')
    .replace(/[.,!?]+$/, '')
    .trim();
  if (!trimmedName || !Number.isFinite(amount) || amount <= 0) return null;
  // "89 kr" / "143 kronor" är bara ett belopp – valutan är inget namn på ett köp
  if (/^(kr|kronor|sek|:-)$/i.test(trimmedName)) return null;

  // Stor bokstav först, som i resten av appen ("ica" → "Ica")
  const prettyName = trimmedName.charAt(0).toUpperCase() + trimmedName.slice(1);
  return { name: prettyName, amount };
}
