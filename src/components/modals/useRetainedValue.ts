import { useState } from 'react';

/**
 * Behåller det senaste värdet som inte var null – t.ex. posten en ruta visade, så att den
 * inte töms under stängningsanimationen (240 ms) när föräldern redan satt den till null.
 * Sparas i state ("adjust state when a prop changes") i stället för en ref som läses under render.
 */
export function useRetainedValue<T>(value: T | null | undefined): T | null {
  const [retained, setRetained] = useState<T | null>(value ?? null);
  if (value && value !== retained) {
    setRetained(value);
  }
  return value || retained;
}
