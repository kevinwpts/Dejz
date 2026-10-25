/**
 * Svensk datum- och tidshantering.
 * Följer alltid tidszonen Europe/Stockholm och hanterar automatiskt
 * svensk sommartid (CEST, UTC+2) och vintertid/normaltid (CET, UTC+1).
 */

const STOCKHOLM_TZ = 'Europe/Stockholm';

/**
 * Returnerar dagens datum i Sverige som 'YYYY-MM-DD'
 */
export function getSwedishDateStr(d: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('sv-SE', {
      timeZone: STOCKHOLM_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(d);
    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    return `${year}-${month}-${day}`;
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

/**
 * Returnerar gårdagens datum i Sverige som 'YYYY-MM-DD'
 */
export function getYesterdaySwedishDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getSwedishDateStr(d);
}

/**
 * Formaterar ett ISO-datum, timestamp eller Date till 'YYYY-MM-DD' i svensk tidszon
 */
export function formatIsoDateStockholm(isoOrDate: string | number | Date): string {
  try {
    if (typeof isoOrDate === 'string') {
      const trimmed = isoOrDate.trim();
      // Om det är ett rent datum utan tid 'YYYY-MM-DD'
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed;
      }
    }
    const d = typeof isoOrDate === 'object' ? isoOrDate : new Date(isoOrDate);
    if (isNaN(d.getTime())) {
      return String(isoOrDate).slice(0, 10);
    }
    return getSwedishDateStr(d);
  } catch {
    return String(isoOrDate).slice(0, 10);
  }
}

/**
 * Formaterar en ISO-tidpunkt eller timestamp till 'HH:MM' i svensk tidszon.
 * Returnerar null om klockslaget är ogiltigt eller standard-placeholders (00:00 / 12:00 utan klockslag).
 */
export function formatIsoTimeStockholm(isoOrDate: string | number | Date): string | null {
  try {
    const d = typeof isoOrDate === 'object' ? isoOrDate : new Date(isoOrDate);
    if (isNaN(d.getTime())) return null;

    const formatted = new Intl.DateTimeFormat('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: STOCKHOLM_TZ,
    }).format(d);

    const cleaned = formatted.replace('.', ':').trim();
    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(cleaned) && cleaned !== '00:00' && cleaned !== '12:00') {
      return cleaned;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Formaterar datumrubriken i transaktionslistan på naturlig svenska:
 * - 'Idag'
 * - 'Igår'
 * - '25 okt' (under innevarande år)
 * - '15 dec 2025' (för tidigare år)
 */
export function formatSwedishDateHeading(dateStr: string): string {
  if (!dateStr) return 'Okänt datum';

  const todayStr = getSwedishDateStr();
  const yesterdayStr = getYesterdaySwedishDateStr();

  if (dateStr === todayStr) return 'Idag';
  if (dateStr === yesterdayStr) return 'Igår';

  const parts = dateStr.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);

  if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;

  // Skapa datumobjekt vid kl 12:00 UTC för att undvika datumskifte vid tidszonskonvertering
  const dateObj = new Date(Date.UTC(y, m, d, 12, 0, 0));
  const currentYear = parseInt(todayStr.slice(0, 4), 10);

  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: STOCKHOLM_TZ,
    day: 'numeric',
    month: 'short',
    year: y !== currentYear ? 'numeric' : undefined,
  }).format(dateObj);
}

/**
 * Formaterar ett datum 'YYYY-MM-DD' till fullständigt svenskt datum (t.ex. '26 oktober 2026')
 */
export function formatSwedishFullDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;
  const dateObj = new Date(Date.UTC(y, m, d, 12, 0, 0));
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: STOCKHOLM_TZ,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(dateObj);
}

/**
 * Tolkar datum inbäddade i svenska bankbeskrivningar (t.ex. '25OKT', '261025', '2026-10-25', '25/10')
 */
export function parseDateFromSwedishText(text: string, todayStr: string = getSwedishDateStr()): string | null {
  if (!text || typeof text !== 'string') return null;

  // 1. ISO-format YYYY-MM-DD
  const isoMatch = text.match(/\b(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const currentYear = parseInt(todayStr.slice(0, 4), 10);

  // 2. Kortköpsstämpel YYMMDD (t.ex. 261025)
  const yymmddMatch = text.match(/\b(2[4-9])(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\b/);
  if (yymmddMatch) {
    const y = 2000 + parseInt(yymmddMatch[1], 10);
    return `${y}-${yymmddMatch[2]}-${yymmddMatch[3]}`;
  }

  // 3. Svenska månadsförkortningar (t.ex. 25OKT, 25 okt, 25-okt)
  const monthMap: Record<string, string> = {
    jan: '01',
    feb: '02',
    mar: '03',
    apr: '04',
    maj: '05',
    jun: '06',
    jul: '07',
    aug: '08',
    sep: '09',
    okt: '10',
    nov: '11',
    dec: '12',
  };
  const swedishMonthMatch = text.match(
    /\b(0?[1-9]|[12]\d|3[01])\s*[-/.]?\s*(jan|feb|mar|apr|maj|jun|jul|aug|sep|okt|nov|dec)\b/i
  );
  if (swedishMonthMatch) {
    const day = swedishMonthMatch[1].padStart(2, '0');
    const month = monthMap[swedishMonthMatch[2].toLowerCase()];
    if (month) {
      return `${currentYear}-${month}-${day}`;
    }
  }

  // 4. DD/MM eller DD.MM (t.ex. 25/10)
  const slashMatch = text.match(/\b(0?[1-9]|[12]\d|3[01])[/.](0?[1-9]|1[0-2])\b/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, '0');
    const month = slashMatch[2].padStart(2, '0');
    return `${currentYear}-${month}-${day}`;
  }

  return null;
}

export interface BankTxDateSource {
  description?: string | null;
  counterparty_name?: string | null;
  booking_status?: string | null;
  booking_date?: string | null;
  value_date?: string | null;
  transaction_date?: string | null;
  created_at?: string | null;
  raw_json?: any;
}

/**
 * Extraherar det faktiska betaldatumet (när köpet utfördes) och bankens bokföringsdatum.
 * Garanterar att betaldatumet ALDRIG ligger i framtiden (t.ex. måndagens bokföringsdatum för helgköp).
 */
export function getActualBankPaymentDateAndMeta(
  bt: BankTxDateSource,
  knownReservationDate?: string,
  knownReservationTime?: string
): {
  paymentDate: string;
  bookingDate?: string;
  bookingStatus: string;
  paymentTime?: string;
} {
  const raw = bt.raw_json || {};
  const status = (bt.booking_status || 'BOOK').toUpperCase();
  const description = `${bt.description || ''} ${bt.counterparty_name || ''} ${raw.remittance_information || ''}`.trim();

  // 1. Bankens officiella bokföringsdatum
  let bookingDate: string | undefined = undefined;
  for (const bCandidate of [raw.booking_date, bt.booking_date, raw.value_date, bt.value_date]) {
    if (typeof bCandidate === 'string' && bCandidate.trim()) {
      const match = bCandidate.trim().match(/^(\d{4}-\d{2}-\d{2})/);
      if (match) {
        bookingDate = match[1];
        break;
      }
    }
  }

  // 2. Om vi har sparad reservation från när köpet gjordes:
  if (knownReservationDate && /^\d{4}-\d{2}-\d{2}$/.test(knownReservationDate)) {
    return {
      paymentDate: knownReservationDate,
      bookingDate: bookingDate || knownReservationDate,
      bookingStatus: status,
      paymentTime: knownReservationTime,
    };
  }

  // 3. Faktiska köp-/transaktionsdatumfält i API:et
  const txCandidates = [
    raw.transaction_date_time,
    raw.transaction_date,
    raw.execution_date_time,
    raw.execution_date,
    raw.card_transaction?.authorized_date,
    raw.card_transaction?.transaction_date,
    raw.card_transaction?.transaction_date_time,
    raw.acceptance_date_time,
    raw.origination_date,
    bt.transaction_date,
  ];

  let rawPurchaseDate: string | null = null;
  let rawPurchaseTime: string | null = null;

  for (const candidate of txCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      const trimmed = candidate.trim();
      if (trimmed.includes('T')) {
        const parsedDate = formatIsoDateStockholm(trimmed);
        if (parsedDate && /^\d{4}-\d{2}-\d{2}$/.test(parsedDate)) {
          rawPurchaseDate = parsedDate;
          rawPurchaseTime = formatIsoTimeStockholm(trimmed);
          break;
        }
      }
      const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
      if (match) {
        rawPurchaseDate = match[1];
        break;
      }
    }
  }

  // 4. Leta efter köpdatum i transaktionstexten
  if (!rawPurchaseDate && description) {
    const textDate = parseDateFromSwedishText(description);
    if (textDate) {
      rawPurchaseDate = textDate;
    }
  }

  // 5. Kontrollera skapandedatum i databasen (när köpet först dök upp i appen)
  if (!rawPurchaseDate && bt.created_at) {
    const createdDate = formatIsoDateStockholm(bt.created_at);
    if (createdDate && /^\d{4}-\d{2}-\d{2}$/.test(createdDate)) {
      rawPurchaseDate = createdDate;
      if (!rawPurchaseTime) {
        rawPurchaseTime = formatIsoTimeStockholm(bt.created_at);
      }
    }
  }

  const paymentDate = rawPurchaseDate || bookingDate || getSwedishDateStr();

  return {
    paymentDate,
    bookingDate: bookingDate || paymentDate,
    bookingStatus: status,
    paymentTime: rawPurchaseTime || undefined,
  };
}
