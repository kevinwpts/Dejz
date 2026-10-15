export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16) || 0x151718;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function applyThemeColor(themeColorHex: string = 'neutral', isDark: boolean = false) {
  if (typeof document === 'undefined') return;

  const rawInput = (themeColorHex || 'neutral').trim();
  const legacyRemovedHexes = ['#ceb9ef', '#ec5f8d', '#f8c4df', '#ffe0ce', '#f4d3bc', '#183b2e', '#133a2b', '#312261', '#cee876', '#c5e86c'];
  const isNeutral = rawInput.toLowerCase() === 'neutral' || rawInput.toLowerCase() === '#neutral' || rawInput.toLowerCase() === 'default' || rawInput === '' || legacyRemovedHexes.includes(rawInput.toLowerCase());

  let hex: string;
  let hoverColor: string;
  let pressedColor: string;
  let onAccentColor: string;
  let activeIconColor: string;
  let brandSignatureColor: string;
  let r: number, g: number, b: number;

  if (isNeutral) {
    try {
      localStorage.setItem('dejz_theme_color', 'neutral');
    } catch {
      // Ignore storage errors
    }

    brandSignatureColor = '#9EC5E8';

    if (isDark) {
      // Dark / Black Theme - Signature Nordic Sky (#9EC5E8)
      hex = '#9EC5E8';
      r = 158; g = 197; b = 232;
      onAccentColor = '#141312';
      hoverColor = '#87B5DF';
      pressedColor = '#72A5D5';
      activeIconColor = '#9EC5E8';
    } else {
      // Light Theme - Deep Warm Obsidian Ink (#181715) + Signature Nordic Sky (#9EC5E8)
      hex = '#181715';
      r = 24; g = 23; b = 21;
      onAccentColor = '#FCFBF9';
      hoverColor = '#2C2A27';
      pressedColor = '#0D0C0B';
      activeIconColor = '#181715';
    }
  } else {
    hex = rawInput;
    brandSignatureColor = hex;
    try {
      localStorage.setItem('dejz_theme_color', hex);
    } catch {
      // Ignore storage errors
    }

    const rgb = hexToRgb(hex);
    r = rgb.r; g = rgb.g; b = rgb.b;

    hoverColor = `color-mix(in srgb, ${hex} 88%, black)`;
    pressedColor = `color-mix(in srgb, ${hex} 75%, black)`;

    const isLightAccent = ['#c5e86c', '#dce5d8', '#dfe6e9', '#e8e1d5', '#cee876', '#d8eaac', '#dfecc6', '#c8e29b', '#f4cb6e', '#f3c86b', '#c5d4f7', '#9ec6e8', '#cfe0ee', '#8bdcc0', '#d4f1e3', '#cbecf2'].includes(hex.toLowerCase());
    onAccentColor = isLightAccent ? '#181715' : '#FCFBF9';
    activeIconColor = (!isDark && isLightAccent) ? '#181715' : hex;
  }

  const targets = [document.documentElement, document.body].filter(Boolean);

  targets.forEach((target) => {
    target.style.setProperty('--user-accent-hex', hex);
    target.style.setProperty('--user-accent-rgb', `${r}, ${g}, ${b}`);
    target.style.setProperty('--brand-signature', brandSignatureColor);
    target.style.setProperty('--logo-color', isDark ? (isNeutral ? '#F4F1EC' : activeIconColor) : activeIconColor);

    // 100% Flat Matte Nordic Canvas — Zero Gradients
    target.style.setProperty('--app-bg-gradient', 'none');
    target.style.setProperty('--app-bg-top-tint', 'transparent');
    target.style.setProperty('--app-bg-bottom-tint', 'transparent');

    target.style.setProperty('--user-home-bg-from', 'transparent');
    target.style.setProperty('--user-home-bg-to', 'transparent');
    target.style.setProperty('--app-bg-tint', 'transparent');

    target.style.setProperty('--user-accent', hex);
    target.style.setProperty('--user-accent-soft', isDark ? `rgba(${r}, ${g}, ${b}, 0.18)` : `rgba(${r}, ${g}, ${b}, 0.09)`);
    target.style.setProperty('--user-accent-surface', isDark ? `rgba(${r}, ${g}, ${b}, 0.08)` : `rgba(${r}, ${g}, ${b}, 0.04)`);

    target.style.setProperty('--accent-color', hex);
    target.style.setProperty('--accent-hover', hoverColor);
    target.style.setProperty('--accent-pressed', pressedColor);
    target.style.setProperty('--accent-gradient', hex);
    target.style.setProperty('--accent-soft', isDark ? `rgba(${r}, ${g}, ${b}, 0.18)` : `rgba(${r}, ${g}, ${b}, 0.09)`);
    target.style.setProperty('--on-accent', onAccentColor);
    target.style.setProperty('--text-on-accent', onAccentColor);
    target.style.setProperty('--accent-container', isDark ? `rgba(${r}, ${g}, ${b}, 0.18)` : `rgba(${r}, ${g}, ${b}, 0.09)`);
    target.style.setProperty('--accent-secondary-color', isDark ? `rgba(${r}, ${g}, ${b}, 0.18)` : `rgba(${r}, ${g}, ${b}, 0.09)`);
    target.style.setProperty('--on-accent-container', isDark ? '#FFFFFF' : activeIconColor);
    target.style.setProperty('--accent-on-solid', onAccentColor);
    target.style.setProperty('--dejz-accent', hex);

    target.style.setProperty('--btn-primary-bg', hex);
    target.style.setProperty('--btn-primary-text', onAccentColor);
    target.style.setProperty('--btn-primary-hover', hoverColor);
    target.style.setProperty('--btn-primary-pressed', pressedColor);

    target.style.setProperty('--nav-plus-bg', hex);
    target.style.setProperty('--nav-plus-color', onAccentColor);
    target.style.setProperty('--nav-active-color', activeIconColor);
    target.style.setProperty('--accent-active-icon', activeIconColor);
  });
}
