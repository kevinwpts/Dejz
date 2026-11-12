/**
 * Webb eller app i telefonen (App Store-versionen byggs med Capacitor)?
 *
 * I appen laddas sidan inte från dejz.se, så relativa adresser som "/api/..." och
 * window.location.origin pekar fel. Använd apiUrl() och appOrigin() i stället.
 */
import { Capacitor } from '@capacitor/core';

const WEB_ORIGIN = 'https://dejz.se';

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/** Adress till dejz.se:s egna serverfunktioner (/api/...) – fungerar både på webben och i appen */
export function apiUrl(path: string): string {
  return isNativeApp() ? `${WEB_ORIGIN}${path}` : path;
}

/** Var inloggnings- och bekräftelselänkar ska leda: dejz.se i appen, annars sidan man är på */
export function appOrigin(): string {
  if (isNativeApp()) return WEB_ORIGIN;
  try {
    return window.location.origin;
  } catch {
    return WEB_ORIGIN;
  }
}
