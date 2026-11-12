/** Undersidorna i Inställningar och deras rubriker (egen liten fil så att sidhuvudet inte laddar hela Inställningar). */
export type SettingsSubView =
  | 'main'
  | 'admin'
  | 'discover'
  | 'categories'
  | 'paymentMethods'
  | 'period'
  | 'bank'
  | 'appearance'
  | 'security'
  | 'profile'
  | 'feedback'
  | 'legal'
  | 'privacy'
  | 'terms'
  | 'psd2'
  | 'cookies';

export const SETTINGS_SUBVIEW_TITLES: Record<Exclude<SettingsSubView, 'main'>, string> = {
  admin: 'Admin & Testsimulator',
  profile: 'Profil',
  discover: 'Hitta fasta poster',
  categories: 'Kategorier',
  paymentMethods: 'Betalsätt',
  period: 'Lönedag',
  bank: 'Bankkonton',
  appearance: 'Utseende',
  security: 'Data & säkerhet',
  feedback: 'Hjälp & feedback',
  legal: 'Villkor & integritet',
  privacy: 'Integritetspolicy',
  terms: 'Användarvillkor',
  psd2: 'Open Banking',
  cookies: 'Cookies & lagring',
};
