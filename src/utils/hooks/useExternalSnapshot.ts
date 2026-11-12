import { useState } from 'react';

/**
 * Läser ett värde som ligger utanför React (t.ex. localStorage) och läser om det när något i
 * `deps` ändras – som `useMemo(read, deps)`, fast deps gäller även om `read` inte använder dem.
 *
 * Behövs med React Compiler: den räknar ut beroenden från koden och skulle annars bara läsa
 * värdet en gång (tricket `void isOpen` i en useMemo tas bort av kompilatorn).
 */
export function useExternalSnapshot<T>(read: () => T, deps: readonly unknown[]): T {
  const [snapshot, setSnapshot] = useState(() => ({ deps, value: read() }));
  const changed =
    snapshot.deps.length !== deps.length || snapshot.deps.some((d, i) => !Object.is(d, deps[i]));
  if (changed) {
    // Läses i en uppdaterarfunktion: React Compiler memoiserar inte det som händer där inne,
    // och React ritar om direkt (innan något visas) med det nya värdet.
    setSnapshot(() => ({ deps, value: read() }));
  }
  return snapshot.value;
}
