/**
 * En loggkälla per bank: kvadratiska appikoner som ligger lokalt i public/banks/icons
 * (inga favicons eller ordbilder från nätet, som blev brus, streck eller "Ha").
 * Banker utan en igenkännbar ikon i liten storlek får en bokstavsruta i en fast ton.
 */
export interface BankMark {
  /** Lokal appikon (kvadratisk). Saknas → bokstavsruta. */
  icon?: string;
  /** Ton för bokstavsrutan (1–8, se --mono-N i index.css). */
  tint?: number;
}

const ICON_BASE = '/banks/icons/';

// Ordningen spelar roll: mer specifika namn före bredare (Sparbanken före Swedbank).
const BANK_MARKS: { re: RegExp; mark: BankMark }[] = [
  { re: /sparbank/i, mark: { icon: `${ICON_BASE}sparbanken.webp` } },
  { re: /swedbank/i, mark: { icon: `${ICON_BASE}swedbank.webp` } },
  { re: /handelsbank|\bshb\b/i, mark: { tint: 1 } },
  { re: /\bseb\b|skandinaviska enskilda/i, mark: { icon: `${ICON_BASE}seb.webp` } },
  { re: /nordea/i, mark: { icon: `${ICON_BASE}nordea.webp` } },
  { re: /l[äa]nsf[öo]rs[äa]kringar/i, mark: { icon: `${ICON_BASE}lansforsakringar.webp` } },
  { re: /danske/i, mark: { tint: 2 } },
  { re: /ica[\s-]?banken/i, mark: { icon: `${ICON_BASE}icabanken.webp` } },
  { re: /\bsbab\b/i, mark: { icon: `${ICON_BASE}sbab.webp` } },
  { re: /avanza/i, mark: { icon: `${ICON_BASE}avanza.webp` } },
  { re: /skandia/i, mark: { icon: `${ICON_BASE}skandia.webp` } },
  { re: /nordnet/i, mark: { icon: `${ICON_BASE}nordnet.webp` } },
  { re: /klarna/i, mark: { icon: `${ICON_BASE}klarna.webp` } },
  { re: /revolut/i, mark: { icon: `${ICON_BASE}revolut.webp` } },
];

/**
 * Kända banker → lokal appikon eller bokstavsruta. Okända namn → undefined (vanlig logglogik).
 * Namnet måste börja med banken ("Swedbank Mastercard" ja, "Lön från Swedbank" nej),
 * så att butiker och personer aldrig får en bankikon av misstag.
 */
export function findBankMark(name?: string): BankMark | undefined {
  const clean = (name || '').trim();
  if (!clean) return undefined;
  const hit = BANK_MARKS.find((b) => b.re.exec(clean)?.index === 0);
  return hit?.mark;
}
