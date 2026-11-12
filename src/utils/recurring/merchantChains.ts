// Kända butiks- och tjänstekedjor, så att t.ex. "Circle K Varberg" och "Circle K Lund" räknas som samma.
import type { TransactionItem } from '../../app/models';

const KNOWN_MERCHANT_CHAINS: { key: string; label: string; patterns: RegExp[] }[] = [
  { key: 'hemkop', label: 'Hemköp', patterns: [/\bhemk[öo]p\b/i] },
  { key: 'coop', label: 'Coop', patterns: [/\b(stora\s+coop|coop\s+forum|coop\s+konsum|coop\s+n[äa]ra|coop\s+extra|coop)\b/i] },
  {
    key: 'ica',
    label: 'ICA',
    patterns: [/\b(ica\s+maxi|maxi\s+ica|ica\s+kvantum|ica\s+supermarket|ica\s+n[äa]ra|ica\s+butik)\b/i, /\bica\b(?!\s*(banken|f[öo]rs[äa]kring))/i],
  },
  { key: 'willys', label: 'Willys', patterns: [/\bwillys\b/i] },
  { key: 'lidl', label: 'Lidl', patterns: [/\blidl\b/i] },
  { key: 'citygross', label: 'City Gross', patterns: [/\bcity\s*gross\b/i] },
  { key: 'systembolaget', label: 'Systembolaget', patterns: [/\bsystembolaget\b/i] },
  { key: 'espressohouse', label: 'Espresso House', patterns: [/\bespresso\s*house\b/i] },
  { key: 'mcdonalds', label: "McDonald's", patterns: [/\bmcdonald'?s?\b/i] },
  { key: 'maxburgers', label: 'Max Burgers', patterns: [/\bmax\s+(burgers|hamburger)/i] },
  { key: 'burgerking', label: 'Burger King', patterns: [/\bburger\s*king\b/i] },
  { key: 'pressbyran', label: 'Pressbyrån', patterns: [/\bpressbyr[åa]n\b/i] },
  { key: '7eleven', label: '7-Eleven', patterns: [/\b7[\s-]*eleven\b/i] },
  { key: 'foodora', label: 'Foodora', patterns: [/\bfoodora\b/i] },
  { key: 'wolt', label: 'Wolt', patterns: [/\bwolt\b/i] },
  { key: 'apoteket', label: 'Apoteket', patterns: [/\bapoteket\b/i] },
  { key: 'apotekhjartat', label: 'Apotek Hjärtat', patterns: [/\bapotek\s+hj[äa]rtat\b/i] },
  { key: 'kronansapotek', label: 'Kronans Apotek', patterns: [/\bkronans\s+apotek\b/i] },
  { key: 'apotea', label: 'Apotea', patterns: [/\bapotea\b/i] },
  { key: 'clasohlson', label: 'Clas Ohlson', patterns: [/\bclas\s*ohlson\b/i] },
  { key: 'ikea', label: 'IKEA', patterns: [/\bikea\b/i] },
  { key: 'biltema', label: 'Biltema', patterns: [/\bbiltema\b/i] },
  { key: 'jula', label: 'Jula', patterns: [/\bjula\b/i] },
  { key: 'rusta', label: 'Rusta', patterns: [/\brusta\b/i] },
  { key: 'normal', label: 'Normal', patterns: [/\bnormal\b/i] },
  { key: 'ahlens', label: 'Åhléns', patterns: [/\b[åa]hl[ée]ns\b/i] },
  { key: 'hm', label: 'H&M', patterns: [/\bh\s*&\s*m\b/i, /\bhennes\s*&\s*mauritz\b/i] },
  { key: 'elgiganten', label: 'Elgiganten', patterns: [/\belgiganten\b/i] },
  { key: 'netonnet', label: 'NetOnNet', patterns: [/\bnetonnet\b/i] },
  { key: 'kjell', label: 'Kjell & Company', patterns: [/\bkjell\s*(&|o)\s*co/i] },
  { key: 'skanetrafiken', label: 'Skånetrafiken', patterns: [/\bsk[åa]netrafiken\b/i] },
  { key: 'vasttrafik', label: 'Västtrafik', patterns: [/\bv[äa]sttrafik\b/i] },
  { key: 'sl', label: 'SL', patterns: [/\bab\s+storstockholms\s+lokaltrafik\b/i] },
  { key: 'sj', label: 'SJ', patterns: [/\bsj\s+ab\b/i] },
  { key: 'uber', label: 'Uber', patterns: [/\buber\b/i] },
  { key: 'bolt', label: 'Bolt', patterns: [/\bbolt\b/i] },
  { key: 'circlek', label: 'Circle K', patterns: [/\bcircle\s*k\b/i] },
  { key: 'okq8', label: 'OKQ8', patterns: [/\bokq8\b/i] },
  { key: 'preem', label: 'Preem', patterns: [/\bpreem\b/i] },
  { key: 'easypark', label: 'EasyPark', patterns: [/\beasypark\b/i] },
  { key: 'aimopark', label: 'Aimo Park', patterns: [/\baimo\s*park\b/i] },
  { key: 'parkster', label: 'Parkster', patterns: [/\bparkster\b/i] },
  { key: 'klarna', label: 'Klarna', patterns: [/\bklarna\b/i] },
  { key: 'spotify', label: 'Spotify', patterns: [/\bspotify\b/i] },
  { key: 'netflix', label: 'Netflix', patterns: [/\bnetflix\b/i] },
  { key: 'sveafastigheter', label: 'Svea Fastigheter', patterns: [/\bsvea\s*fastigheter\b/i] },
  { key: 'heimstaden', label: 'Heimstaden', patterns: [/\bheimstaden\b/i] },
];

export function detectMerchantChain(tx: Partial<TransactionItem>): { key: string; label: string } | null {
  const combined = [tx.title, tx.rawDescription, tx.counterpartyName].filter(Boolean).join(' ');
  if (!combined) return null;
  for (const chain of KNOWN_MERCHANT_CHAINS) {
    if (chain.patterns.some((re) => re.test(combined))) {
      return { key: chain.key, label: chain.label };
    }
  }
  return null;
}
