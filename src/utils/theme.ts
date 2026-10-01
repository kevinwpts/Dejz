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
  const { r, g, b } = hexToRgb(themeColorHex);

  // Set base RGB variables
  root.style.setProperty('--user-accent-hex', themeColorHex);
  root.style.setProperty('--user-accent-rgb', `${r}, ${g}, ${b}`);

  if (isDark) {
    root.style.setProperty('--user-accent', themeColorHex);
    root.style.setProperty('--user-accent-soft', `rgba(${r}, ${g}, ${b}, 0.22)`);
    root.style.setProperty('--user-accent-surface', `rgba(${r}, ${g}, ${b}, 0.08)`);
    root.style.setProperty('--user-home-bg-from', `rgba(${r}, ${g}, ${b}, 0.08)`);
    root.style.setProperty('--user-home-bg-to', `rgba(${r}, ${g}, ${b}, 0.01)`);
    root.style.setProperty('--app-bg-tint', `rgba(${r}, ${g}, ${b}, 0.03)`);

    root.style.setProperty('--accent-color', themeColorHex);
    root.style.setProperty('--accent-soft', `rgba(${r}, ${g}, ${b}, 0.2)`);
    root.style.setProperty('--accent-secondary-color', `rgba(${r}, ${g}, ${b}, 0.18)`);
  } else {
    root.style.setProperty('--user-accent', themeColorHex);
    root.style.setProperty('--user-accent-soft', `rgba(${r}, ${g}, ${b}, 0.12)`);
    root.style.setProperty('--user-accent-surface', `rgba(${r}, ${g}, ${b}, 0.05)`);
    root.style.setProperty('--user-home-bg-from', `rgba(${r}, ${g}, ${b}, 0.035)`);
    root.style.setProperty('--user-home-bg-to', `rgba(${r}, ${g}, ${b}, 0.005)`);
    root.style.setProperty('--app-bg-tint', `rgba(${r}, ${g}, ${b}, 0.015)`);

    root.style.setProperty('--accent-color', themeColorHex);
    root.style.setProperty('--accent-soft', `rgba(${r}, ${g}, ${b}, 0.12)`);
    root.style.setProperty('--accent-secondary-color', `rgba(${r}, ${g}, ${b}, 0.12)`);
  }
}
