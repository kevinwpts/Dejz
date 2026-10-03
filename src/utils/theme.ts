export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16) || 0x3b82f6;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function applyThemeColor(themeColorHex: string = '#3B82F6', isDark: boolean = false) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  const hex = (themeColorHex || '#3B82F6').trim();
  const { r, g, b } = hexToRgb(hex);

  root.style.setProperty('--user-accent-hex', hex);
  root.style.setProperty('--user-accent-rgb', `${r}, ${g}, ${b}`);
  root.style.setProperty('--user-home-bg-from', 'transparent');
  root.style.setProperty('--user-home-bg-to', 'transparent');
  root.style.setProperty('--app-bg-tint', 'transparent');

  root.style.setProperty('--user-accent', hex);
  root.style.setProperty('--user-accent-soft', isDark ? `rgba(${r}, ${g}, ${b}, 0.18)` : `rgba(${r}, ${g}, ${b}, 0.12)`);
  root.style.setProperty('--user-accent-surface', isDark ? `rgba(${r}, ${g}, ${b}, 0.08)` : `rgba(${r}, ${g}, ${b}, 0.05)`);

  root.style.setProperty('--accent-color', hex);
  root.style.setProperty('--accent-hover', hex);
  root.style.setProperty('--accent-pressed', hex);
  root.style.setProperty('--accent-soft', isDark ? `rgba(${r}, ${g}, ${b}, 0.18)` : `rgba(${r}, ${g}, ${b}, 0.12)`);
  root.style.setProperty('--on-accent', '#FFFFFF');
  root.style.setProperty('--text-on-accent', '#FFFFFF');
  root.style.setProperty('--accent-container', isDark ? `rgba(${r}, ${g}, ${b}, 0.22)` : `rgba(${r}, ${g}, ${b}, 0.12)`);
  root.style.setProperty('--on-accent-container', isDark ? '#FFFFFF' : hex);

  root.style.setProperty('--btn-primary-bg', hex);
  root.style.setProperty('--btn-primary-text', '#FFFFFF');
  root.style.setProperty('--btn-primary-hover', hex);
  root.style.setProperty('--btn-primary-pressed', hex);

  root.style.setProperty('--nav-plus-bg', hex);
  root.style.setProperty('--nav-plus-color', '#FFFFFF');
  root.style.setProperty('--nav-active-color', hex);
}
