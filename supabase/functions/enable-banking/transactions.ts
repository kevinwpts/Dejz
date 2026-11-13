// Ren logik för enable-banking: tolkar bankens saldon och transaktioner till våra rader.
// Inga Deno- eller URL-importer, så att den kan testas med Vitest (tests/supabase/enable-banking).
// index.ts importerar härifrån – beteendet är detsamma som när koden låg i index.ts.

// ISO 20022 / Enable Banking balance type labels in Swedish
const BALANCE_TYPE_LABELS: Record<string, string> = {
  CLAV: "Disponibelt saldo (CLAV)",
  ITAV: "Tillgängligt saldo (ITAV)",
  ITBD: "Bokfört saldo (ITBD)",
  CLBD: "Utgående bokfört saldo (CLBD)",
  XPCD: "Förväntat saldo (XPCD)",
  OPAV: "Ingående disponibelt saldo (OPAV)",
  OPBD: "Ingående bokfört saldo (OPBD)",
  PRCD: "Tidigare bokfört saldo (PRCD)",
  FWAV: "Framtida disponibelt saldo (FWAV)",
  INFO: "Informationssaldo (INFO)",
  VALU: "Valuterat saldo (VALU)",
  OTHR: "Övrigt saldo (OTHR)",
};

// Minimal shapes of the Enable Banking API responses (only the fields this logic reads).
interface EbAmount {
  amount?: string | number | null;
  currency?: string;
  credit_debit_indicator?: string;
}

export interface EbBalance {
  balance_type?: string;
  balance_amount?: EbAmount;
  name?: string;
}

export interface EbTransaction {
  status?: string;
  transaction_amount?: EbAmount;
  amount?: string | number;
  currency?: string;
  credit_debit_indicator?: string;
  card_transaction?: { acceptor_name?: string; merchant_name?: string };
  creditor?: { name?: string };
  creditor_name?: string;
  debtor?: { name?: string };
  debtor_name?: string;
  remittance_information?: string[] | string;
  remittance_information_unstructured?: string;
  remittance_information_unstructured_array?: string[];
  additional_information?: string;
  bank_transaction_code?: { description?: string };
  booking_date?: string;
  value_date?: string;
  transaction_date?: string;
  entry_reference?: string;
  transaction_id?: string;
  internal_transaction_id?: string;
  balance_after_transaction?: EbAmount;
}

export interface BankTransactionRow {
  user_id: string;
  connection_id: string;
  bank_account_id: string;
  external_key: string;
  entry_reference: string | null;
  transaction_id: string | null;
  booking_status: EnableBankingBookingStatus;
  booking_date: string | null;
  value_date: string | null;
  transaction_date: string | null;
  amount: number;
  currency: string;
  credit_debit_indicator: string | null;
  description: string;
  counterparty_name: string | null;
  raw_json: EbTransaction;
  updated_at: string;
}

export function selectPreferredBalance(balances: EbBalance[]): {
  amount: number | null;
  currency: string;
  balanceType: string | null;
  balanceLabel: string | null;
} {
  if (!Array.isArray(balances) || balances.length === 0) {
    return {
      amount: null,
      currency: "SEK",
      balanceType: null,
      balanceLabel: null,
    };
  }

  // Priority order for displaying main balance while keeping exact bank label
  const priorityOrder = ["CLAV", "ITAV", "ITBD", "CLBD", "XPCD", "OPAV", "OPBD", "PRCD", "VALU", "INFO"];
  let chosen = balances[0];

  for (const code of priorityOrder) {
    const found = balances.find((b) => b?.balance_type === code);
    if (found && found?.balance_amount?.amount !== undefined) {
      chosen = found;
      break;
    }
  }

  const rawAmount = chosen?.balance_amount?.amount;
  const parsedAmount = rawAmount !== undefined && rawAmount !== null ? Number(rawAmount) : null;
  const currency = chosen?.balance_amount?.currency || "SEK";
  const balanceType = chosen?.balance_type || null;
  const bankProvidedName = typeof chosen?.name === "string" && chosen.name.trim().length > 0
    ? chosen.name.trim()
    : null;

  const mappedLabel = balanceType ? (BALANCE_TYPE_LABELS[balanceType] || `Saldo (${balanceType})`) : "Saldo";
  const balanceLabel = bankProvidedName && balanceType
    ? `${bankProvidedName} (${balanceType})`
    : bankProvidedName || mappedLabel;

  return {
    amount: Number.isFinite(parsedAmount) ? parsedAmount : null,
    currency,
    balanceType,
    balanceLabel,
  };
}

type EnableBankingBookingStatus = "BOOK" | "PDNG" | "HOLD" | "SCHD" | "CNCL" | "RJCT" | "OTHR";

export function normalizeAccountIdentity(iban?: string | null, bban?: string | null, uid?: string | null): string {
  const cleanIban = (iban || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (cleanIban.length >= 8) return `IBAN:${cleanIban}`;
  const cleanBban = (bban || "").replace(/[^0-9]/g, "");
  if (cleanBban.length >= 6) return `BBAN:${cleanBban}`;
  return `UID:${String(uid || "").trim()}`;
}

export function isLikelyIncomingCreditText(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    // Inte \b: i JavaScript räknas å/ä/ö inte som bokstäver där, så "återbetalning" missades
    /(?<![\p{L}\p{N}_])(lön|salary|insättning|återköp|återbetalning|refund|return|kreditering|utbetalning|barnbidrag|csn|pension|skatteverket)(?![\p{L}\p{N}_])/iu.test(lower) ||
    lower.includes("från ")
  );
}

export function extractCounterpartyAndDescription(tx: EbTransaction, occurrenceIndex = 1): {
  description: string;
  counterpartyName: string | null;
  amount: number;
  currency: string;
  creditDebitIndicator: string | null;
  baseExternalKey: string;
  externalKey: string;
  bookingDate: string | null;
  valueDate: string | null;
  transactionDate: string | null;
  bookingStatus: EnableBankingBookingStatus;
} {
  const rawStatus = String(tx?.status || "BOOK").toUpperCase();
  const validStatuses = new Set(["BOOK", "PDNG", "HOLD", "SCHD", "CNCL", "RJCT", "OTHR"]);
  const bookingStatus: EnableBankingBookingStatus = validStatuses.has(rawStatus)
    ? (rawStatus as EnableBankingBookingStatus)
    : "OTHR";

  const rawAmountStr = tx?.transaction_amount?.amount ?? tx?.amount ?? "0";
  let numericAmount = Number(String(rawAmountStr).replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(numericAmount)) numericAmount = 0;

  const rawIndicator =
    tx?.credit_debit_indicator ||
    tx?.transaction_amount?.credit_debit_indicator ||
    null;
  const indicator = rawIndicator ? String(rawIndicator).toUpperCase().trim() : null;

  const cardAcceptorName =
    tx?.card_transaction?.acceptor_name ||
    tx?.card_transaction?.merchant_name ||
    null;
  const creditorName = tx?.creditor?.name || tx?.creditor_name || cardAcceptorName || null;
  const debtorName = tx?.debtor?.name || tx?.debtor_name || null;

  let remittance = "";
  if (Array.isArray(tx?.remittance_information)) {
    remittance = tx.remittance_information.filter(Boolean).join(" ").trim();
  } else if (typeof tx?.remittance_information === "string") {
    remittance = tx.remittance_information.trim();
  } else if (typeof tx?.remittance_information_unstructured === "string") {
    remittance = tx.remittance_information_unstructured.trim();
  } else if (Array.isArray(tx?.remittance_information_unstructured_array)) {
    remittance = tx.remittance_information_unstructured_array.filter(Boolean).join(" ").trim();
  }

  const prelimCounterparty =
    indicator === "DBIT"
      ? creditorName || debtorName
      : indicator === "CRDT"
      ? debtorName || creditorName
      : creditorName || debtorName;

  const description =
    remittance ||
    prelimCounterparty ||
    cardAcceptorName ||
    tx?.additional_information ||
    tx?.bank_transaction_code?.description ||
    "Banktransaktion";

  const isReservedStatus = bookingStatus === "PDNG" || bookingStatus === "HOLD";

  // Normalize signed amount according to Enable Banking credit_debit_indicator & status rules:
  // - DBIT is always negative outflow.
  // - CRDT is positive inflow, EXCEPT when an ASPSP returns a reserved card hold (PDNG/HOLD)
  //   with a creditor (merchant) or non-refund purchase description and missing/mislabelled indicator.
  if (indicator === "DBIT") {
    numericAmount = -Math.abs(numericAmount);
  } else if (indicator === "CRDT") {
    if (isReservedStatus && !debtorName && !isLikelyIncomingCreditText(description)) {
      numericAmount = -Math.abs(numericAmount);
    } else {
      numericAmount = Math.abs(numericAmount);
    }
  } else if (isReservedStatus && numericAmount > 0 && !isLikelyIncomingCreditText(description)) {
    numericAmount = -Math.abs(numericAmount);
  }

  const counterpartyName =
    numericAmount < 0
      ? creditorName || debtorName
      : debtorName || creditorName;

  const currency = String(tx?.transaction_amount?.currency || tx?.currency || "SEK").toUpperCase().trim();

  // Preserve booking_date, value_date, and transaction_date strictly as distinct fields when present.
  // Never fabricate a date or copy booking_date into transaction_date when missing.
  const normalizeIsoDate = (val: unknown): string | null => {
    if (!val || typeof val !== "string") return null;
    const trimmed = val.trim();
    const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  };

  const bookingDate = normalizeIsoDate(tx?.booking_date);
  const valueDate = normalizeIsoDate(tx?.value_date);
  const transactionDate = normalizeIsoDate(tx?.transaction_date);

  // Build deterministic unique key per bank item; occurrenceIndex disambiguates legitimate
  // identical purchases on the same day when the bank omits a unique transaction_id.
  const rawId =
    tx?.entry_reference ||
    tx?.transaction_id ||
    tx?.internal_transaction_id ||
    null;

  let stableId = rawId ? String(rawId).trim() : null;
  if (stableId) {
    // SEB generates an ephemeral AES-encrypted entry_reference (<22-char IV>_<22-char ciphertext>)
    // on every API request, and transaction_id is just Base64(entry_reference).
    // Do not use volatile SEB tokens as stableId across syncs.
    const isSebVolatileRef = /^[A-Za-z0-9_-]{20,24}_[A-Za-z0-9_-]{16,}$/.test(stableId);
    const isSebBase64Ref = /^aGxk[A-Za-z0-9+/=_-]{30,}$/.test(stableId);
    if (isSebVolatileRef || isSebBase64Ref) {
      stableId = null;
    }
  }

  const rawBalAfter = tx?.balance_after_transaction?.amount;
  const parsedBalAfter =
    rawBalAfter !== undefined && rawBalAfter !== null && String(rawBalAfter).trim() !== ""
      ? Number(String(rawBalAfter).replace(/\s/g, "").replace(",", "."))
      : NaN;
  const balAfterStr = Number.isFinite(parsedBalAfter) ? parsedBalAfter.toFixed(2) : "nobal";

  const dateAnchor = bookingDate || transactionDate || valueDate || "nodate";
  const valAnchor = valueDate || "noval";
  const baseExternalKey = stableId
    ? `${stableId}_${bookingStatus}`
    : `${bookingStatus}_${dateAnchor}_${valAnchor}_${numericAmount.toFixed(2)}_${currency}_${balAfterStr}_${description.slice(0, 64)}`;

  const externalKey = occurrenceIndex > 1 ? `${baseExternalKey}#${occurrenceIndex}` : baseExternalKey;

  return {
    description,
    counterpartyName,
    amount: numericAmount,
    currency,
    creditDebitIndicator: indicator,
    baseExternalKey,
    externalKey,
    bookingDate,
    valueDate,
    transactionDate,
    bookingStatus,
  };
}

export function buildBatchTransactionRows(
  rawTxs: EbTransaction[],
  userId: string,
  connectionId: string,
  bankAccountId: string,
): BankTransactionRow[] {
  const baseKeyCounts = new Map<string, number>();
  const rows: BankTransactionRow[] = [];

  for (const tx of rawTxs) {
    const firstPass = extractCounterpartyAndDescription(tx, 1);
    const nextCount = (baseKeyCounts.get(firstPass.baseExternalKey) || 0) + 1;
    baseKeyCounts.set(firstPass.baseExternalKey, nextCount);

    const parsed = nextCount > 1 ? extractCounterpartyAndDescription(tx, nextCount) : firstPass;
    rows.push({
      user_id: userId,
      connection_id: connectionId,
      bank_account_id: bankAccountId,
      external_key: parsed.externalKey,
      entry_reference: tx?.entry_reference || null,
      transaction_id: tx?.transaction_id || null,
      booking_status: parsed.bookingStatus,
      booking_date: parsed.bookingDate,
      value_date: parsed.valueDate,
      transaction_date: parsed.transactionDate,
      amount: parsed.amount,
      currency: parsed.currency,
      credit_debit_indicator: parsed.creditDebitIndicator,
      description: parsed.description,
      counterparty_name: parsed.counterpartyName,
      raw_json: tx,
      updated_at: new Date().toISOString(),
    });
  }

  return rows;
}

export function extractClientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || null;
}
