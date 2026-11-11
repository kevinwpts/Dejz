/** Admin: om delad-budget-simulatorn (två skärmar bredvid varandra) är på. Liten fil så att den inte drar in hela simulatorn. */
export const SPLIT_SIMULATOR_STORAGE_KEY = 'dejz_split_simulator_active_v1';

export function getSplitSimulatorActive(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(SPLIT_SIMULATOR_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setSplitSimulatorActive(active: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SPLIT_SIMULATOR_STORAGE_KEY, String(active));
    window.dispatchEvent(new CustomEvent('dejz:simulator-toggled'));
    window.dispatchEvent(new CustomEvent('dejz:split-simulator-changed'));
  } catch {
    // ignore
  }
}
