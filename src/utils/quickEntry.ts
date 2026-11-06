/**
 * Snabbinmatning av köp: "Ica 342", "342 Ica", "Ica 1 250 kr", "Max 129,50".
 * Fungerar också med tangentbordets diktering ("Ica trehundrafyrtiotvå" skrivs som "Ica 342").
 * Returnerar null om texten inte innehåller både namn och belopp.
 */
export function parseQuickEntry(text: string): { name: string; amount: number } | null {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return null;

  // Belopp: siffror, ev. tusentalsavgränsat med mellanslag, ev. decimaler, ev. "kr"/"kronor"/":-"
  const amountPattern = '(\\d{1,3}(?:[ .]\\d{3})+|\\d+)(?:[.,](\\d{1,2}))?\\s*(?:kr|kronor|:-)?';

  const trailing = clean.match(new RegExp(`^(.*?\\D)\\s+${amountPattern}$`, 'i'));
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
  const trimmedName = name.trim();
  if (!trimmedName || !Number.isFinite(amount) || amount <= 0) return null;

  // Stor bokstav först, som i resten av appen ("ica" → "Ica")
  const prettyName = trimmedName.charAt(0).toUpperCase() + trimmedName.slice(1);
  return { name: prettyName, amount };
}
