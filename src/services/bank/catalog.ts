// Listan över svenska banker som visas direkt utan att vänta på banktjänsten.
import swedishBanksJson from '../../data/swedishBanks.json';
import type { BankAspsp } from './types';

export const SWEDISH_BANKS_CATALOG: BankAspsp[] = swedishBanksJson as BankAspsp[];
