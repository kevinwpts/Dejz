/**
 * Dejz Design System - Central Semantic Design Tokens (Phase 1)
 * Single source of truth for design measurements, styles, colors, typography, and layout.
 * Controlled via CSS custom properties in index.css with strict fallback values.
 */

export const DEJZ_COLORS = {
  light: {
    canvas: 'var(--bg-color, #F4F1EC)',
    surface: 'var(--surface-color, #FCFBF9)',
    surfaceRaised: 'var(--surface-raised, #FCFBF9)',
    surfaceHigh: 'var(--surface-high, #EAE4DC)',
    surfaceMuted: 'var(--surface-muted, #EAE4DC)',
    surfaceHover: 'var(--bg-hover, #E3DDD3)',
    textPrimary: 'var(--text-primary, #181715)',
    textMetricLabel: 'var(--text-metric-label, #3D3A36)',
    textSecondary: 'var(--text-secondary, #57534E)',
    textTertiary: 'var(--text-tertiary, #78736C)',
    textMuted: 'var(--text-muted, #78736C)',
    textDisabled: 'var(--text-disabled, #A6A098)',
    textInactive: 'var(--text-inactive, #A6A098)',
    borderSubtle: 'var(--border-subtle, transparent)',
    border: 'var(--border-color, transparent)',
    borderStrong: 'var(--border-strong, transparent)',
    borderControl: 'var(--border-control, transparent)',
    borderDivider: 'var(--border-divider, rgba(24, 23, 21, 0.065))',
    accent: 'var(--accent-color, #181715)',
    accentHover: 'var(--accent-hover, #2C2A27)',
    accentPressed: 'var(--accent-pressed, #0D0C0B)',
    accentSoft: 'var(--accent-soft, rgba(24, 23, 21, 0.08))',
    accentContainer: 'var(--accent-container, rgba(24, 23, 21, 0.08))',
    onAccent: 'var(--on-accent, #FCFBF9)',
    onAccentContainer: 'var(--on-accent-container, #181715)',
    danger: 'var(--danger-color, #D9483B)',
    dangerContainer: 'var(--danger-container, rgba(217, 72, 59, 0.11))',
    warning: 'var(--warning-color, #D97706)',
    warningContainer: 'var(--warning-container, rgba(217, 119, 6, 0.12))',
    success: 'var(--success-color, #15804A)',
    successContainer: 'var(--success-container, rgba(21, 128, 74, 0.11))',
    info: 'var(--info-color, #181715)',
    infoContainer: 'var(--info-container, rgba(24, 23, 21, 0.07))',
    scrim: 'var(--scrim-color, rgba(15, 14, 13, 0.58))',
  },
  dark: {
    canvas: 'var(--bg-color, #141312)',
    surface: 'var(--surface-color, #1C1B19)',
    surfaceRaised: 'var(--surface-raised, #242320)',
    surfaceHigh: 'var(--surface-high, #292724)',
    surfaceMuted: 'var(--surface-muted, #292724)',
    surfaceHover: 'var(--bg-hover, #312F2B)',
    textPrimary: 'var(--text-primary, #F4F1EC)',
    textMetricLabel: 'var(--text-metric-label, #D8D3CC)',
    textSecondary: 'var(--text-secondary, #B3ADA5)',
    textTertiary: 'var(--text-tertiary, #918B83)',
    textMuted: 'var(--text-muted, #918B83)',
    textDisabled: 'var(--text-disabled, #6B6660)',
    textInactive: 'var(--text-inactive, #6B6660)',
    borderSubtle: 'var(--border-subtle, transparent)',
    border: 'var(--border-color, transparent)',
    borderStrong: 'var(--border-strong, transparent)',
    borderControl: 'var(--border-control, transparent)',
    borderDivider: 'var(--border-divider, rgba(255, 255, 255, 0.06))',
    accent: 'var(--accent-color, #F4F1EC)',
    accentHover: 'var(--accent-hover, #E6E2DC)',
    accentPressed: 'var(--accent-pressed, #D6D1CA)',
    accentSoft: 'var(--accent-soft, rgba(244, 241, 236, 0.18))',
    accentContainer: 'var(--accent-container, rgba(244, 241, 236, 0.18))',
    onAccent: 'var(--on-accent, #141312)',
    onAccentContainer: 'var(--on-accent-container, #F4F1EC)',
    danger: 'var(--danger-color, #FF8080)',
    dangerContainer: 'var(--danger-container, #381F1F)',
    warning: 'var(--warning-color, #FBBF24)',
    warningContainer: 'var(--warning-container, #342A16)',
    success: 'var(--success-color, #4ADE80)',
    successContainer: 'var(--success-container, #163025)',
    info: 'var(--info-color, #F4F1EC)',
    infoContainer: 'var(--info-container, #1C1B19)',
    scrim: 'var(--scrim-color, rgba(0, 0, 0, 0.60))',
  },
  black: {
    canvas: 'var(--bg-color, #0A0A0A)',
    surface: 'var(--surface-color, #121212)',
    surfaceRaised: 'var(--surface-raised, #181818)',
    surfaceHigh: 'var(--surface-high, #202020)',
    surfaceMuted: 'var(--surface-muted, #1A1A1A)',
    surfaceHover: 'var(--bg-hover, #222222)',
    textPrimary: 'var(--text-primary, #FFFFFF)',
    textSecondary: 'var(--text-secondary, #B8B8B8)',
    textTertiary: 'var(--text-tertiary, #999999)',
    textMuted: 'var(--text-muted, #999999)',
    textDisabled: 'var(--text-disabled, #707070)',
    textInactive: 'var(--text-inactive, #707070)',
    borderSubtle: 'var(--border-subtle, rgba(255, 255, 255, 0.06))',
    border: 'var(--border-color, rgba(255, 255, 255, 0.06))',
    borderStrong: 'var(--border-strong, #333333)',
    borderControl: 'var(--border-control, #2A2A2A)',
    borderDivider: 'var(--border-divider, rgba(255, 255, 255, 0.06))',
    accent: 'var(--accent-color, #F5F3F0)',
    accentHover: 'var(--accent-hover, #E6E2DC)',
    accentPressed: 'var(--accent-pressed, #D6D1CA)',
    accentSoft: 'var(--accent-soft, rgba(245, 243, 240, 0.18))',
    accentContainer: 'var(--accent-container, rgba(245, 243, 240, 0.18))',
    onAccent: 'var(--on-accent, #181615)',
    onAccentContainer: 'var(--on-accent-container, #F5F3F0)',
    danger: 'var(--danger-color, #FF8080)',
    dangerContainer: 'var(--danger-container, #381F1F)',
    warning: 'var(--warning-color, #FBBF24)',
    warningContainer: 'var(--warning-container, #342A16)',
    success: 'var(--success-color, #4ADE80)',
    successContainer: 'var(--success-container, #163025)',
    info: 'var(--info-color, #FFFFFF)',
    infoContainer: 'var(--info-container, #1C1C1C)',
    scrim: 'var(--scrim-color, rgba(0, 0, 0, 0.60))',
  },
} as const;

export const DS = {
  colors: DEJZ_COLORS,

  /**
   * Semantic Corner Radii tokens
   * Any change in index.css CSS variables will automatically propagate.
   */
  radius: {
    card: 'rounded-[var(--radius-card,24px)]',
    cardNested: 'rounded-[var(--radius-card-nested,16px)]',
    button: 'rounded-[var(--radius-button,9999px)]',
    buttonSm: 'rounded-[var(--radius-button-sm,9999px)]',
    buttonLg: 'rounded-[var(--radius-button-lg,9999px)]',
    input: 'rounded-[var(--radius-input,16px)]',
    modal: 'rounded-[var(--radius-modal,28px)]',
    modalSheet: 'rounded-t-[var(--radius-modal,28px)] sm:rounded-[var(--radius-modal,28px)]',
    chip: 'rounded-[var(--radius-chip,9999px)]',
    badge: 'rounded-[var(--radius-badge,9999px)]',
    sm: 'rounded-[var(--radius-sm,8px)]',
    xs: 'rounded-[var(--radius-xs,8px)]',
    icon: 'rounded-[var(--radius-icon-button,9999px)]',
    pill: 'rounded-[var(--radius-pill,9999px)]',
    bottomNav: 'rounded-[var(--radius-modal,28px)]',
    container: 'rounded-[var(--radius-container,24px)]',
  },

  /**
   * Component Dimensions / Heights
   */
  heights: {
    input: 'h-[var(--height-input,46px)]',
    button: 'h-[var(--height-button,46px)]',
    buttonSm: 'h-[var(--height-button-sm,32px)]',
    buttonLg: 'h-[var(--height-button-lg,48px)]',
    buttonPill: 'h-8',
    search: 'h-[var(--height-search,46px)]',
    iconButtonSm: 'w-7 h-7',
    iconButton: 'w-8 h-8',
    iconButtonLg: 'w-10 h-10',
    iconContainerSm: 'w-8 h-8',
    iconContainer: 'w-10 h-10',
    iconContainerLg: 'w-12 h-12',
    header: 'h-[var(--height-header,64px)]',
    bottomNav: 'h-[var(--height-bottom-nav,64px)]',
  },

  /**
   * Standard Typography token classes
   */
  typography: {
    heroAmount: 'text-hero-amount',
    largeAmount: 'text-large-amount',
    listAmount: 'text-list-amount',
    pageTitle: 'text-page-title',
    sectionTitle: 'text-section-title',
    cardTitle: 'text-card-title',
    metricLabel: 'text-metric-label',
    body: 'text-body',
    bodyMedium: 'text-body-medium',
    secondary: 'text-secondary',
    label: 'text-label',
    micro: 'text-micro-label',
    // Keep existing utility roles mapped to new scale as needed
    amount: 'text-list-amount tabular-nums',
    metadata: 'text-micro-label',
    button: 'text-body-medium',
    input: 'text-body',
  },

  weights: {
    regular: 'font-normal',
    ui: 'font-medium',
    emphasis: 'font-semibold',
    strong: 'font-semibold',
  },

  /**
   * Border, Divide, Shadow & Ring Tokens
   */
  borders: {
    subtle: 'border-subtle',
    control: 'border-control',
    strong: 'border-strong',
    divider: 'border-divider',
  },
  shadows: {
    none: 'shadow-none',
    subtle: 'shadow-subtle',
    modal: 'shadow-modal',
  },
  divides: {
    subtle: 'divide-subtle',
    divider: 'divide-divider',
  },
  rings: {
    focus: 'ring-focus',
    control: 'ring-control',
    accent: 'ring-accent',
  },

  /**
   * Spacing & Layout Tokens
   */
  spacing: {
    pageContainer: 'page-container',
    pagePx: 'page-px',
    pageMax: 'page-max',
    cardPadding: 'card-p',
    cardPaddingSm: 'card-p-sm',
    cardPaddingLg: 'card-p-lg',
    rowPadding: 'row-p',
    elementGap: 'gap-element',
    sectionGap: 'gap-section',
    sectionSpace: 'space-y-section',
    elementSpace: 'space-y-element',
    modalPadding: 'modal-p',
  },

  /**
   * Layering & Z-Index constants
   */
  zIndex: {
    base: 1,
    dropdown: 20,
    sticky: 30,
    header: 40,
    bottomNav: 40,
    backdrop: 90,
    modal: 100,
    sheet: 110,
    toast: 120,
    tooltip: 130,
  },

  /**
   * Transitions & Motion
   */
  transitions: {
    default: 'transition-all duration-150 ease-out',
    fast: 'transition-all duration-100 ease-out',
    bounce: 'transition-transform active:scale-[0.98]',
  },
} as const;

export const designSystem = DS;
