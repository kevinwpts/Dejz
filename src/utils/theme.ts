export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16) || 0x635bff;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function applyThemeColor(themeColorHex: string = '#635BFF', isDark: boolean = false) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // In dark mode with default brand purple, use #7C75FF as standard dark accent
  const effectiveAccent = isDark && (themeColorHex === '#635BFF' || !themeColorHex)
    ? '#7C75FF'
    : themeColorHex || '#635BFF';

  const { r, g, b } = hexToRgb(effectiveAccent);

  // Set base RGB variables
  root.style.setProperty('--user-accent-hex', effectiveAccent);
  root.style.setProperty('--user-accent-rgb', `${r}, ${g}, ${b}`);

  root.style.setProperty('--user-home-bg-from', 'transparent');
  root.style.setProperty('--user-home-bg-to', 'transparent');
  root.style.setProperty('--app-bg-tint', 'transparent');

  // Calculate perceived luminance to ensure WCAG compliant on-accent text
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const onAccent = lum > 0.38 ? '#121416' : '#FFFFFF';

  if (isDark) {
    root.style.setProperty('--user-accent', effectiveAccent);
    root.style.setProperty('--user-accent-soft', `rgba(${r}, ${g}, ${b}, 0.2)`);
    root.style.setProperty('--user-accent-surface', `rgba(${r}, ${g}, ${b}, 0.08)`);

    root.style.setProperty('--accent-color', effectiveAccent);
    root.style.setProperty('--accent-soft', `rgba(${r}, ${g}, ${b}, 0.2)`);
    root.style.setProperty('--on-accent', onAccent);
    root.style.setProperty('--text-on-accent', onAccent);
    root.style.setProperty('--accent-container', `rgba(${r}, ${g}, ${b}, 0.18)`);
    root.style.setProperty('--on-accent-container', lum > 0.6 ? '#121416' : '#D5D1FF');

    root.style.setProperty('--btn-primary-bg', effectiveAccent);
    root.style.setProperty('--btn-primary-text', onAccent);
    root.style.setProperty('--nav-plus-bg', effectiveAccent);
    root.style.setProperty('--nav-plus-color', onAccent);
  } else {
    root.style.setProperty('--user-accent', effectiveAccent);
    root.style.setProperty('--user-accent-soft', `rgba(${r}, ${g}, ${b}, 0.12)`);
    root.style.setProperty('--user-accent-surface', `rgba(${r}, ${g}, ${b}, 0.05)`);

    root.style.setProperty('--accent-color', effectiveAccent);
    root.style.setProperty('--accent-soft', `rgba(${r}, ${g}, ${b}, 0.12)`);
    root.style.setProperty('--on-accent', '#FFFFFF');
    root.style.setProperty('--text-on-accent', '#FFFFFF');
    root.style.setProperty('--accent-container', '#EEECFF');
    root.style.setProperty('--on-accent-container', effectiveAccent);

    root.style.setProperty('--btn-primary-bg', '#1C1917');
    root.style.setProperty('--btn-primary-text', '#FFFFFF');
    root.style.setProperty('--nav-plus-bg', effectiveAccent);
    root.style.setProperty('--nav-plus-color', '#FFFFFF');
  }
}
