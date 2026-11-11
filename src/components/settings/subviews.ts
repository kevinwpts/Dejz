/** Undersidorna i Inställningar och deras rubriker (egen liten fil så att sidhuvudet inte laddar hela Inställningar). */
export type SettingsSubView =
  | 'main'
  | 'admin'
  | 'household'
  | 'discover'
  | 'categories'
  | 'goals'
  | 'paymentMethods'
  | 'period'
  | 'bank'
  | 'appearance'
  | 'security'
  | 'preferences'
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
  household: 'Delad ekonomi',
  discover: 'Hitta fasta poster',
  categories: 'Kategorier',
  goals: 'Sparmål & buffert',
  paymentMethods: 'Betalsätt',
  period: 'Lönedag',
  bank: 'Bankkonton',
  appearance: 'Utseende',
  preferences: 'Överföringar',
  security: 'Data & säkerhet',
  feedback: 'Hjälp & feedback',
  legal: 'Villkor & integritet',
  privacy: 'Integritetspolicy',
  terms: 'Användarvillkor',
  psd2: 'Open Banking',
  cookies: 'Cookies & lagring',
};
