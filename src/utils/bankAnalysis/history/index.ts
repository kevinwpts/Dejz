// Analys av bankhistorik (introduktion och synk). Del av bankanalysen.
// Samlar delarna i den här mappen så att importer från './history' fungerar som förut.
export { getBankTxCodeDescription } from '../txFields';
export { runCoreBankDetection } from './core';
export type { CoreBankDetectionResult } from './core';
export { analyzeBankTransactionsForOnboarding } from './onboarding';
export { extractOnboardingAiCandidates, formatDateWithWeekday } from './aiCandidates';
export type { OnboardingAiCandidateGroup } from './aiCandidates';
