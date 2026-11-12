import { useSyncExternalStore } from 'react';
import { getSavingsGoals, SAVINGS_GOALS_KEY, type SavingsGoalItem } from '../cache/itemMeta';

/**
 * Sparmålen (ligger i localStorage). Läses vid varje rendering och när de sparas
 * (`dejz:goals-updated`), samma lista (samma referens) så länge innehållet är oförändrat.
 */
export function useSavingsGoals(): SavingsGoalItem[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const NO_GOALS: SavingsGoalItem[] = [];
let cache: { raw: string | null; goals: SavingsGoalItem[] } | null = null;

function readRaw(): string | null {
  try {
    return localStorage.getItem(SAVINGS_GOALS_KEY);
  } catch {
    return null;
  }
}

function getSnapshot(): SavingsGoalItem[] {
  const raw = readRaw();
  if (cache === null || cache.raw !== raw) {
    cache = { raw, goals: getSavingsGoals() };
  }
  return cache.goals;
}

function getServerSnapshot(): SavingsGoalItem[] {
  return NO_GOALS;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('dejz:goals-updated', onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener('dejz:goals-updated', onChange);
    window.removeEventListener('storage', onChange);
  };
}
