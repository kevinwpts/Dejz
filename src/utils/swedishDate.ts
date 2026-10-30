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

const SHORT_MONTHS_SV = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const SHORT_WEEKDAYS_SV = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];

/**
 * Formaterar datumrubriken i hela appen på ett modernt och luftigt sätt:
 * - 'Idag, 30 okt'
 * - 'Igår, 29 okt'
 * - 'Mån, 28 sep' (under innevarande år)
 * - 'Mån, 15 dec 2025' (för tidigare år)
 */
export function formatSwedishDateHeading(dateStr: string): string {
  if (!dateStr) return 'Okänt datum';

  const todayStr = getSwedishDateStr();
  const yesterdayStr = getYesterdaySwedishDateStr();

  const parts = dateStr.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);

  if (isNaN(y) || isNaN(m) || isNaN(d) || m < 0 || m > 11) return dateStr;

  const dateObj = new Date(Date.UTC(y, m, d, 12, 0, 0));
  const currentYear = parseInt(todayStr.slice(0, 4), 10);

  const shortMonth = SHORT_MONTHS_SV[m] || '';
  const formattedMonthDay = y !== currentYear ? `${d} ${shortMonth} ${y}` : `${d} ${shortMonth}`;

  if (dateStr === todayStr) {
    return `Idag, ${formattedMonthDay}`;
  }
  if (dateStr === yesterdayStr) {
    return `Igår, ${formattedMonthDay}`;
  }

  const weekdayIndex = dateObj.getUTCDay();
  const shortWeekday = SHORT_WEEKDAYS_SV[weekdayIndex] || '';
  return `${shortWeekday}, ${formattedMonthDay}`;
}

/**
 * Formaterar ett datum 'YYYY-MM-DD' till modernt svenskt datum (t.ex. '28 sep 2026')
 */
export function formatSwedishFullDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d) || m < 0 || m > 11) return dateStr;
  const shortMonth = SHORT_MONTHS_SV[m] || '';
  return `${d} ${shortMonth} ${y}`;
}

export interface ReceiptAttachment {
  url: string;
  name: string;
}

/**
 * Extraherar alla bifogade kvitton från en transaktion eller fast utgift
 * (kompatibel med både receipts-array och äldre receiptUrl/receiptName).
 */
export function getItemReceipts(item: any): ReceiptAttachment[] {
  if (!item) return [];
  const result: ReceiptAttachment[] = [];
  const seenUrls = new Set<string>();

  if (Array.isArray(item.receipts)) {
    for (const r of item.receipts) {
      if (r && typeof r.url === 'string' && r.url.trim()) {
        const trimmedUrl = r.url.trim();
        if (!seenUrls.has(trimmedUrl)) {
          seenUrls.add(trimmedUrl);
          result.push({
            url: trimmedUrl,
            name: (typeof r.name === 'string' && r.name.trim()) || 'Bifogat kvitto',
          });
        }
      }
    }
  }

  if (typeof item.receiptUrl === 'string' && item.receiptUrl.trim()) {
    const legacyUrl = item.receiptUrl.trim();
    if (!seenUrls.has(legacyUrl)) {
      seenUrls.add(legacyUrl);
      result.push({
        url: legacyUrl,
        name: (typeof item.receiptName === 'string' && item.receiptName.trim()) || 'Bifogat kvitto',
      });
    }
  }

  return result;
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

  // 1b. SEB kortköpsformat YY-MM-DD (t.ex. /26-10-25 eller 26-10-25)
  const yyDashMatch = text.match(/(?:^|[\s/])(2[4-9])-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/);
  if (yyDashMatch) {
    const y = 2000 + parseInt(yyDashMatch[1], 10);
    return `${y}-${yyDashMatch[2]}-${yyDashMatch[3]}`;
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
  const todayStr = getSwedishDateStr();
  const raw = bt.raw_json || {};
  const status = (bt.booking_status || 'BOOK').toUpperCase();
  const description = `${bt.description || ''} ${bt.counterparty_name || ''} ${
    Array.isArray(raw.remittance_information)
      ? raw.remittance_information.join(' ')
      : raw.remittance_information || ''
  }`.trim();

  // 1. Extrahera separata value_date (valuteringsdatum = köptillfälle) och booking_date (bokföringsdatum)
  let valueDate: string | undefined = undefined;
  for (const vCandidate of [raw.value_date, bt.value_date]) {
    if (typeof vCandidate === 'string' && vCandidate.trim()) {
      const match = vCandidate.trim().match(/^(\d{4}-\d{2}-\d{2})/);
      if (match) {
        valueDate = match[1];
        break;
      }
    }
  }

  let bookingDate: string | undefined = undefined;
  for (const bCandidate of [raw.booking_date, bt.booking_date]) {
    if (typeof bCandidate === 'string' && bCandidate.trim()) {
      const match = bCandidate.trim().match(/^(\d{4}-\d{2}-\d{2})/);
      if (match) {
        bookingDate = match[1];
        break;
      }
    }
  }
  if (!bookingDate) bookingDate = valueDate;

  // 2. Om vi har sparad reservation från när köpet gjordes:
  if (knownReservationDate && /^\d{4}-\d{2}-\d{2}$/.test(knownReservationDate) && knownReservationDate <= todayStr) {
    return {
      paymentDate: knownReservationDate,
      bookingDate: bookingDate || knownReservationDate,
      bookingStatus: status,
      paymentTime: knownReservationTime,
    };
  }

  // 3. Sök först efter köpdatum inbäddat i kortläsarens/butikens textstämpel (t.ex. "KORTKÖP 261024", "24OKT", "24/10")
  let textDate: string | null = null;
  if (description) {
    const parsedText = parseDateFromSwedishText(description, todayStr);
    if (parsedText && parsedText <= todayStr) {
      textDate = parsedText;
    }
  }

  // 4. Faktiska köp-/transaktionsdatumfält i API:et (kortauktorisering)
  const txCandidates = [
    raw.card_transaction?.authorized_date,
    raw.card_transaction?.transaction_date_time,
    raw.card_transaction?.transaction_date,
    raw.transaction_date_time,
    raw.execution_date_time,
    raw.acceptance_date_time,
    raw.origination_date_time,
    raw.origination_date,
    raw.transaction_date,
    bt.transaction_date,
  ];

  let rawPurchaseDate: string | null = null;
  let rawPurchaseTime: string | null = null;

  for (const candidate of txCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      const trimmed = candidate.trim();
      let candidateDateStr: string | null = null;
      if (trimmed.includes('T')) {
        const parsedDate = formatIsoDateStockholm(trimmed);
        if (parsedDate && /^\d{4}-\d{2}-\d{2}$/.test(parsedDate)) {
          candidateDateStr = parsedDate;
          if (!rawPurchaseTime) rawPurchaseTime = formatIsoTimeStockholm(trimmed);
        }
      } else {
        const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
        if (match) candidateDateStr = match[1];
      }

      // Förkasta alla datum som ligger i framtiden (framtida avräkningsdatum)
      if (candidateDateStr && candidateDateStr <= todayStr) {
        rawPurchaseDate = candidateDateStr;
        break;
      }
    }
  }

  const isSwish =
    description.toLowerCase().includes('swish') ||
    /^(?:\+?46[\s-]*7[02369]|07[02369])(?:[\s-]?\d){7}$/.test(description.trim());

  // 5. Extrahera när transaktionen först registrerades hos oss (created_at i svensk tid).
  // För reserverade köp (PDNG/HOLD) fungerar detta som ett låst ankare om banken saknar
  // köpdatum eller rullar fram bokföringsdatumet dag för dag medan köpet är reserverat.
  let createdAtDate: string | undefined = undefined;
  for (const cCandidate of [bt.created_at, raw.created_at]) {
    if (typeof cCandidate === 'string' && cCandidate.trim()) {
      const parsedCreated = formatIsoDateStockholm(cCandidate.trim());
      if (parsedCreated && /^\d{4}-\d{2}-\d{2}$/.test(parsedCreated) && parsedCreated <= todayStr) {
        createdAtDate = parsedCreated;
        break;
      }
    }
  }

  const isPending = status === 'PDNG' || status === 'HOLD';

  // 6. Fastställ det faktiska köpdatumet
  let paymentDate: string;
  if (isSwish) {
    // Swish-betalningar sker direkt i realtid dygnet runt (RIX-Inst) -> använd alltid exakta valuteringsdatumet
    if (valueDate && valueDate <= todayStr) {
      paymentDate = valueDate;
    } else if (bookingDate && bookingDate <= todayStr) {
      paymentDate = bookingDate;
    } else {
      paymentDate = valueDate || bookingDate || createdAtDate || todayStr;
    }
  } else if (textDate) {
    paymentDate = textDate;
  } else if (rawPurchaseDate) {
    paymentDate = rawPurchaseDate;
  } else if (valueDate && valueDate <= todayStr) {
    paymentDate = valueDate;
  } else if (bookingDate && bookingDate <= todayStr) {
    paymentDate = bookingDate;
  } else {
    paymentDate = createdAtDate || todayStr;
  }

  // En reservation som redan fanns i vår databas vid createdAtDate kan aldrig ha genomförts
  // på ett senare datum (förhindrar att reserverade köp hoppar till "Idag" vid midnatt).
  if (isPending && createdAtDate && paymentDate > createdAtDate) {
    paymentDate = createdAtDate;
  }

  if (paymentDate > todayStr) {
    paymentDate = todayStr;
  }

  return {
    paymentDate,
    bookingDate: bookingDate || paymentDate,
    bookingStatus: status,
    paymentTime: rawPurchaseTime || undefined,
  };
}

