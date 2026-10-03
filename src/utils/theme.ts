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
  const lowerHex = hex.toLowerCase();
  const isBlackTheme = lowerHex === '#1c1917' || lowerHex === '#000000' || lowerHex === '#141414';

  if (isDark) {
    if (isBlackTheme) {
      // Pure neutral monochrome dark mode
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
      root.style.setProperty('--accent-container', '#222222');
      root.style.setProperty('--on-accent-container', '#FFFFFF');

      root.style.setProperty('--btn-primary-bg', '#FFFFFF');
      root.style.setProperty('--btn-primary-text', '#141414');
      root.style.setProperty('--btn-primary-hover', '#E8E8E8');
      root.style.setProperty('--btn-primary-pressed', '#D0D0D0');
      root.style.setProperty('--nav-plus-bg', '#FFFFFF');
      root.style.setProperty('--nav-plus-color', '#141414');
      root.style.setProperty('--nav-active-color', '#FFFFFF');
    } else {
      // Vibrant theme color applied to dark mode (Dejz #635BFF, Blue, Green, Pink, Orange)
      const { r, g, b } = hexToRgb(hex);
      root.style.setProperty('--user-accent-hex', hex);
      root.style.setProperty('--user-accent-rgb', `${r}, ${g}, ${b}`);
      root.style.setProperty('--user-home-bg-from', 'transparent');
      root.style.setProperty('--user-home-bg-to', 'transparent');
      root.style.setProperty('--app-bg-tint', 'transparent');

      root.style.setProperty('--user-accent', hex);
      root.style.setProperty('--user-accent-soft', `rgba(${r}, ${g}, ${b}, 0.16)`);
      root.style.setProperty('--user-accent-surface', `rgba(${r}, ${g}, ${b}, 0.08)`);

      root.style.setProperty('--accent-color', hex);
      root.style.setProperty('--accent-hover', hex);
      root.style.setProperty('--accent-pressed', hex);
      root.style.setProperty('--accent-soft', `rgba(${r}, ${g}, ${b}, 0.16)`);
      root.style.setProperty('--on-accent', '#FFFFFF');
      root.style.setProperty('--text-on-accent', '#FFFFFF');
      root.style.setProperty('--accent-container', `rgba(${r}, ${g}, ${b}, 0.22)`);
      root.style.setProperty('--on-accent-container', '#FFFFFF');

      root.style.setProperty('--btn-primary-bg', hex);
      root.style.setProperty('--btn-primary-text', '#FFFFFF');
      root.style.setProperty('--btn-primary-hover', hex);
      root.style.setProperty('--btn-primary-pressed', hex);
      root.style.setProperty('--nav-plus-bg', hex);
      root.style.setProperty('--nav-plus-color', '#FFFFFF');
      root.style.setProperty('--nav-active-color', hex);
    }
  } else {
    // Light mode:
    const effectiveAccent = hex;
    const { r, g, b } = hexToRgb(effectiveAccent);

    root.style.setProperty('--user-accent-hex', effectiveAccent);
    root.style.setProperty('--user-accent-rgb', `${r}, ${g}, ${b}`);
    root.style.setProperty('--user-home-bg-from', 'transparent');
    root.style.setProperty('--user-home-bg-to', 'transparent');
    root.style.setProperty('--app-bg-tint', 'transparent');

    root.style.setProperty('--user-accent', effectiveAccent);
    root.style.setProperty('--user-accent-soft', `rgba(${r}, ${g}, ${b}, 0.08)`);
    root.style.setProperty('--user-accent-surface', `rgba(${r}, ${g}, ${b}, 0.04)`);

    root.style.setProperty('--accent-color', effectiveAccent);
    root.style.setProperty('--accent-soft', `rgba(${r}, ${g}, ${b}, 0.08)`);
    root.style.setProperty('--on-accent', '#FFFFFF');
    root.style.setProperty('--text-on-accent', '#FFFFFF');
    root.style.setProperty('--accent-container', isBlackTheme ? '#EAE6DE' : `rgba(${r}, ${g}, ${b}, 0.12)`);
    root.style.setProperty('--on-accent-container', effectiveAccent);

    root.style.setProperty('--btn-primary-bg', effectiveAccent);
    root.style.setProperty('--btn-primary-text', '#FFFFFF');
    root.style.setProperty('--nav-plus-bg', effectiveAccent);
    root.style.setProperty('--nav-plus-color', '#FFFFFF');
    root.style.setProperty('--nav-active-color', effectiveAccent);
  }
}
