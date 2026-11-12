// Inställningar för introduktionen: banklistor, stegordning och markering vid bankkoppling.
// Flyttade från OnboardingFlow.tsx.
import { BankAspsp } from '../../services/bank/types';
import { SWEDISH_BANKS_CATALOG } from '../../services/bank/catalog';

export const POPULAR_SWEDISH_BANKS: { id: string; name: string; displayName: string }[] = [
  { id: 'swedbank', name: 'Swedbank', displayName: 'Swedbank' },
  { id: 'handelsbanken', name: 'Handelsbanken', displayName: 'Handelsbanken' },
  { id: 'seb', name: 'SEB', displayName: 'SEB' },
  { id: 'nordea', name: 'Nordea', displayName: 'Nordea' },
  { id: 'lansforsakringar', name: 'Länsförsäkringar Bank', displayName: 'Länsförsäkringar' },
  { id: 'danske', name: 'Danske Bank', displayName: 'Danske Bank' },
  { id: 'icabanken', name: 'ICA Banken', displayName: 'ICA Banken' },
  { id: 'sbab', name: 'SBAB', displayName: 'SBAB' },
  { id: 'avanza', name: 'Avanza', displayName: 'Avanza' },
];

const EXCLUDED_B2B_OR_FOREIGN_ASPSP_PATTERNS = [
  /corporate/i,
  /first card/i,
  /airplus/i,
  /airwallex/i,
  /dipocket/i,
  /finductive/i,
  /finom/i,
  /genome/i,
  /intergiro/i,
  /pleo/i,
  /payhawk/i,
  /soldo/i,
  /qonto/i,
  /paysera/i,
  /satchel/i,
  /wallester/i,
  /worldfirst/i,
  /viva\.com/i,
  /transfermate/i,
  /equals money/i,
  /3s money/i,
  /ebanx/i,
  /nium/i,
  /banking circle/i,
];

export const CONSUMER_SWEDISH_BANKS: BankAspsp[] = SWEDISH_BANKS_CATALOG.filter(
  (b) => !EXCLUDED_B2B_OR_FOREIGN_ASPSP_PATTERNS.some((rx) => rx.test(b.name))
);

export type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Sätts när bankkopplingen startar i introduktionen – se bankReturnPending nedan. */
export const BANK_RETURN_MARKER_KEY = 'dejz_onboarding_bank_return';
export const BANK_RETURN_MAX_AGE_MS = 30 * 60 * 1000;

export function hasFreshBankReturnMarker(): boolean {
  try {
    const ts = Number(localStorage.getItem(BANK_RETURN_MARKER_KEY));
    if (!ts) return false;
    if (Date.now() - ts > BANK_RETURN_MAX_AGE_MS) {
      localStorage.removeItem(BANK_RETURN_MARKER_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function clearBankReturnMarker() {
  try {
    localStorage.removeItem(BANK_RETURN_MARKER_KEY);
  } catch {
    // ignore
  }
}

/**
 * Stegordning. Med bank: namn → bank → inkomster (lönen) → fasta → lönedag (hoppas över om lönen
 * hittades i banken) → resultat. Bekräfta-korten gör att det går på under en minut.
 * Utan bank följer flödet hur man tänker lön till lön: namn → lönedag → inkomst → fasta → resultat.
 */
export const STEP_ORDER_WITH_BANK: OnboardingStep[] = [1, 2, 4, 3, 5, 6];
// Utan bank: sist frågar vi efter saldot på kontot (steg 7), så "kvar till lön" stämmer från dag ett
export const STEP_ORDER_MANUAL: OnboardingStep[] = [1, 5, 4, 3, 6, 7];

export interface SheetEditorState {
  mode: 'add' | 'edit';
  type: 'income' | 'fixed';
  id?: string;
  name: string;
  amount: string;
  day: number;
  category: string;
  paymentMethod?: string;
  logo?: string;
  isShared?: boolean;
  fullAmount?: string;
}
