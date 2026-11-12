/** Små hjälpfunktioner för sparmål (namn → bild, tusentalsavgränsare, aktivitetstexter). */
import { GOAL_ARTWORKS } from '../ui/VisualArtwork';

export type CreateWizardStep = 1 | 2 | 3 | 4 | 5 | 6;

export function inferArtworkFromGoalName(rawName: string): string {
  const q = rawName.trim().toLowerCase();
  if (!q) return 'piggy';

  if (
    /hus|lägenhet|bostad|kontantinsats|hem|renovering|stuga|villa|radhus|soffa|möbler/.test(q)
  ) {
    return 'house';
  }
  if (
    /semester|sol|strand|bad|sommarresa|spanien|grekland|italien|mallorca|kreta|cypern|thailand/.test(
      q
    )
  ) {
    return 'beach';
  }
  if (
    /resa|utlandsresa|flyg|världen|äventyr|japan|usa|new york|london|paris|weekend|tåg/.test(q)
  ) {
    return 'globe';
  }
  if (/kassaskåp|trygghet|pension|nödfond|säkerhet|skatt/.test(q)) {
    return 'safe';
  }
  if (/bröllop|fest|födelsedag|kalas|fira|jubileum|student|examen|konsert/.test(q)) {
    return 'celebration';
  }
  if (/jul|julklapp|nyår|midsommar|högtid|framtid|kalender|vinter/.test(q)) {
    return 'calendar';
  }
  if (
    /shopping|kläder|klocka|väska|skor|mode|present|dator|macbook|iphone|telefon|mobil|kamera|bil|mc|cykel/.test(
      q
    )
  ) {
    return 'shopping';
  }

  for (const art of GOAL_ARTWORKS) {
    if (art.keywords.some((kw) => q.includes(kw.toLowerCase()))) {
      return art.id;
    }
  }
  return 'piggy';
}

export function cleanActivityLabel(text: string, hasAmount: boolean): string {
  if (!hasAmount) return text;
  if (/^satte in\s+[\d\s\u00A0]+kr$/i.test(text.trim())) {
    return 'Insättning';
  }
  if (/^tog ut\s+[\d\s\u00A0]+kr$/i.test(text.trim())) {
    return 'Uttag';
  }
  return text.replace(/\s*\([+-]?[\d\s\u00A0]+kr\)\s*$/i, '').trim() || text;
}
