import type { BankConnection } from './types';

/**
 * Dagar kvar tills bankkopplingen går ut: serverns `days_until_expiry` i första hand,
 * annars räknat från `valid_until`. `nowMs` skickas in så att komponenter inte läser
 * klockan under render (React Compiler kräver att render är "ren").
 */
export function getConnectionDaysLeft(conn: BankConnection, nowMs: number): number | null {
  if (conn.days_until_expiry !== undefined && conn.days_until_expiry !== null) {
    return conn.days_until_expiry;
  }
  const validMs = conn.valid_until ? new Date(conn.valid_until).getTime() : NaN;
  return Number.isNaN(validMs) ? null : Math.ceil((validMs - nowMs) / (24 * 60 * 60 * 1000));
}
