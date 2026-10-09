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
  const hex = (themeColorHex || '#3B82F6').trim();
  try {
    localStorage.setItem('dejz_theme_color', hex);
  } catch {
    // Ignore storage errors
  }
  const targets = [document.documentElement, document.body].filter(Boolean);
  const { r, g, b } = hexToRgb(hex);

  targets.forEach((target) => {
    target.style.setProperty('--user-accent-hex', hex);
    target.style.setProperty('--user-accent-rgb', `${r}, ${g}, ${b}`);

    // Soft, premium, tinted ambient background for Light Mode
    // Starts with a subtle top accent tint (0.075), gently transitions through a faint mist (0.035),
    // and settles into a serene, airy tinted off-white (0.015).
    const lightBgTop = `rgba(${r}, ${g}, ${b}, 0.075)`;
    const lightBgMid = `rgba(${r}, ${g}, ${b}, 0.035)`;
    const lightBgBottom = `rgba(${r}, ${g}, ${b}, 0.015)`;
    const lightBgGradient = `linear-gradient(180deg, ${lightBgTop} 0%, ${lightBgMid} 420px, ${lightBgBottom} 100%)`;

    target.style.setProperty('--app-bg-gradient', isDark ? 'none' : lightBgGradient);
    target.style.setProperty('--app-bg-top-tint', isDark ? 'transparent' : lightBgTop);
    target.style.setProperty('--app-bg-bottom-tint', isDark ? 'transparent' : lightBgBottom);

    target.style.setProperty('--user-home-bg-from', 'transparent');
    target.style.setProperty('--user-home-bg-to', 'transparent');
    target.style.setProperty('--app-bg-tint', isDark ? 'transparent' : lightBgTop);

    target.style.setProperty('--user-accent', hex);
    target.style.setProperty('--user-accent-soft', isDark ? `rgba(${r}, ${g}, ${b}, 0.18)` : `rgba(${r}, ${g}, ${b}, 0.10)`);
    target.style.setProperty('--user-accent-surface', isDark ? `rgba(${r}, ${g}, ${b}, 0.08)` : `rgba(${r}, ${g}, ${b}, 0.04)`);

    target.style.setProperty('--accent-color', hex);
    target.style.setProperty('--accent-hover', hex);
    target.style.setProperty('--accent-pressed', hex);
    target.style.setProperty('--accent-gradient', hex);
    target.style.setProperty('--accent-soft', isDark ? `rgba(${r}, ${g}, ${b}, 0.18)` : `rgba(${r}, ${g}, ${b}, 0.12)`);
    target.style.setProperty('--on-accent', '#FFFFFF');
    target.style.setProperty('--text-on-accent', '#FFFFFF');
    target.style.setProperty('--accent-container', isDark ? `rgba(${r}, ${g}, ${b}, 0.22)` : `rgba(${r}, ${g}, ${b}, 0.12)`);
    target.style.setProperty('--on-accent-container', isDark ? '#FFFFFF' : hex);
    target.style.setProperty('--accent-on-solid', '#FFFFFF');
    target.style.setProperty('--dejz-accent', hex);

    target.style.setProperty('--btn-primary-bg', hex);
    target.style.setProperty('--btn-primary-text', '#FFFFFF');
    target.style.setProperty('--btn-primary-hover', hex);
    target.style.setProperty('--btn-primary-pressed', hex);

    target.style.setProperty('--nav-plus-bg', hex);
    target.style.setProperty('--nav-plus-color', '#FFFFFF');
    target.style.setProperty('--nav-active-color', hex);
  });
}
