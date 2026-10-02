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

  if (isDark) {
    // Pure neutral monochrome dark mode specification
    root.style.setProperty('--user-accent-hex', '#FFFFFF');
    root.style.setProperty('--user-accent-rgb', '255, 255, 255');
    root.style.setProperty('--user-home-bg-from', 'transparent');
    root.style.setProperty('--user-home-bg-to', 'transparent');
    root.style.setProperty('--app-bg-tint', 'transparent');

    root.style.setProperty('--user-accent', '#FFFFFF');
    root.style.setProperty('--user-accent-soft', 'rgba(255, 255, 255, 0.12)');
    root.style.setProperty('--user-accent-surface', 'rgba(255, 255, 255, 0.05)');

    root.style.setProperty('--accent-color', '#FFFFFF');
    root.style.setProperty('--accent-hover', '#E8E8E8');
    root.style.setProperty('--accent-pressed', '#D0D0D0');
    root.style.setProperty('--accent-soft', 'rgba(255, 255, 255, 0.12)');
    root.style.setProperty('--on-accent', '#141414');
    root.style.setProperty('--text-on-accent', '#141414');
    root.style.setProperty('--accent-container', '#2D2D2D');
    root.style.setProperty('--on-accent-container', '#FFFFFF');

    root.style.setProperty('--btn-primary-bg', '#FFFFFF');
    root.style.setProperty('--btn-primary-text', '#141414');
    root.style.setProperty('--btn-primary-hover', '#E8E8E8');
    root.style.setProperty('--btn-primary-pressed', '#D0D0D0');
    root.style.setProperty('--nav-plus-bg', '#FFFFFF');
    root.style.setProperty('--nav-plus-color', '#141414');
  } else {
    const effectiveAccent = themeColorHex || '#635BFF';
    const { r, g, b } = hexToRgb(effectiveAccent);

    root.style.setProperty('--user-accent-hex', effectiveAccent);
    root.style.setProperty('--user-accent-rgb', `${r}, ${g}, ${b}`);
    root.style.setProperty('--user-home-bg-from', 'transparent');
    root.style.setProperty('--user-home-bg-to', 'transparent');
    root.style.setProperty('--app-bg-tint', 'transparent');

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
