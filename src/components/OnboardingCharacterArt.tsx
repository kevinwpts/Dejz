import React from 'react';
import { motion } from 'motion/react';

export type OnboardingStepType = 'name' | 'age' | 'gender' | 'payday' | 'income' | 'expenses' | 'budget' | 'goals' | 'midMonth' | 'summary';

interface OnboardingCharacterArtProps {
  step: OnboardingStepType;
  days?: number;
  payday?: number;
}

export function OnboardingCharacterArt({ step, days = 12, payday = 25 }: OnboardingCharacterArtProps) {
  const isWelcomeStep = step === 'name' || step === 'age' || step === 'gender';

  return (
    <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto flex items-center justify-center select-none py-1 overflow-visible">
      {/* Subtle Architectural Ambient Glow */}
      <motion.div
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.35, 0.55, 0.35],
        }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        className={`absolute inset-0 rounded-full blur-xl pointer-events-none ${
          step === 'income' || step === 'summary'
            ? 'bg-[var(--success-color)]/14 dark:bg-[var(--success-color)]/18'
            : 'bg-[var(--accent-color)]/14 dark:bg-[var(--accent-color)]/18'
        }`}
      />

      {/* Gentle Floating Architectural Mini-UI Card */}
      <motion.div
        animate={{ y: [0, -3.5, 0] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
        className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center overflow-visible"
      >
        {isWelcomeStep && <CharacterWelcome />}
        {step === 'payday' && <CharacterPayday payday={payday} />}
        {step === 'income' && <CharacterIncome />}
        {step === 'expenses' && <CharacterExpenses />}
        {step === 'budget' && <CharacterIncome />}
        {step === 'goals' && <CharacterGoals />}
        {step === 'midMonth' && <CharacterMidMonth days={days} />}
        {step === 'summary' && <CharacterCelebration />}
      </motion.div>
    </div>
  );
}

// 1. WELCOME STEP - PERSONAL PROFILE MINI-CARD
function CharacterWelcome() {
  return (
    <svg viewBox="0 0 140 140" className="w-full h-full overflow-visible">
      <defs>
        <filter id="dejzCardShadowWelcome" x="-35%" y="-35%" width="170%" height="175%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#0B0B0F" floodOpacity="0.10" />
        </filter>
      </defs>

      {/* Tilted Background Signature Vermilion Card */}
      <g transform="translate(70, 70) rotate(-8) translate(-70, -70)">
        <rect
          x="24"
          y="22"
          width="88"
          height="92"
          rx="22"
          fill="var(--brand-signature, #F0485E)"
        />
      </g>

      {/* Foreground Personal Profile Card */}
      <g filter="url(#dejzCardShadowWelcome)">
        <rect
          x="26"
          y="24"
          width="88"
          height="92"
          rx="22"
          fill="var(--surface-color, #FFFFFF)"
          stroke="var(--border-divider, rgba(20, 19, 18, 0.08))"
          strokeWidth="1.5"
        />
      </g>

      {/* Subtle Soft Ring Around Avatar */}
      <circle
        cx="70"
        cy="58"
        r="23"
        fill="var(--accent-soft, rgba(11, 11, 15, 0.08))"
      />

      {/* Avatar Circle in Accent Color */}
      <circle
        cx="70"
        cy="58"
        r="19"
        fill="var(--accent-color, #0B0B0F)"
      />

      {/* Minimalist User Silhouette */}
      <circle
        cx="70"
        cy="52.5"
        r="6"
        fill="var(--on-accent, #FFFFFF)"
      />
      <path
        d="M 58.5 68.5 C 58.5 62.5 63.5 59.5 70 59.5 C 76.5 59.5 81.5 62.5 81.5 68.5"
        stroke="var(--on-accent, #FFFFFF)"
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Name & Profile Placeholder Lines on Card */}
      <rect
        x="45"
        y="88"
        width="50"
        height="6"
        rx="3"
        fill="var(--text-primary, #0B0B0F)"
        opacity="0.85"
      />
      <rect
        x="54"
        y="99"
        width="32"
        height="4.5"
        rx="2.25"
        fill="var(--text-secondary, #57534E)"
        opacity="0.35"
      />

      {/* Corner Badge */}
      <g transform="translate(94, 92)">
        <circle
          cx="12"
          cy="12"
          r="13"
          fill="var(--text-primary, #0B0B0F)"
          stroke="var(--surface-color, #FFFFFF)"
          strokeWidth="2.5"
        />
        <path
          d="M 7.5 12.2 L 10.6 15.2 L 16.8 9"
          stroke="var(--surface-color, #FFFFFF)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    </svg>
  );
}

// 2. PAYDAY STEP - ARCHITECTURAL CALENDAR MINI-CARD
function CharacterPayday({ payday = 25 }: { payday?: number }) {
  return (
    <svg viewBox="0 0 140 140" className="w-full h-full overflow-visible">
      <defs>
        <filter id="dejzCardShadowPayday" x="-35%" y="-35%" width="170%" height="175%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#0B0B0F" floodOpacity="0.10" />
        </filter>
      </defs>

      {/* Tilted Background Signature Vermilion Card */}
      <g transform="translate(70, 70) rotate(-8) translate(-70, -70)">
        <rect
          x="24"
          y="22"
          width="88"
          height="92"
          rx="22"
          fill="var(--brand-signature, #F0485E)"
        />
      </g>

      {/* Foreground Calendar Card */}
      <g filter="url(#dejzCardShadowPayday)">
        <rect
          x="26"
          y="24"
          width="88"
          height="92"
          rx="22"
          fill="var(--surface-color, #FFFFFF)"
          stroke="var(--border-divider, rgba(20, 19, 18, 0.08))"
          strokeWidth="1.5"
        />
      </g>

      {/* Calendar Top Header Pill */}
      <rect
        x="36"
        y="34"
        width="68"
        height="16"
        rx="8"
        fill="var(--accent-soft, rgba(11, 11, 15, 0.08))"
      />
      <circle cx="48" cy="42" r="2.5" fill="var(--accent-color, #0B0B0F)" />
      <circle cx="92" cy="42" r="2.5" fill="var(--accent-color, #0B0B0F)" />
      <rect x="57" y="40" width="26" height="4" rx="2" fill="var(--accent-color, #0B0B0F)" opacity="0.7" />

      {/* Dynamic Payday Number */}
      <text
        x="70"
        y="83"
        fontSize="34"
        fontWeight="800"
        fill="var(--text-primary, #0B0B0F)"
        textAnchor="middle"
        style={{ fontFamily: 'var(--font-amount, Outfit, sans-serif)', fontVariantNumeric: 'tabular-nums' }}
        letterSpacing="-1"
      >
        {payday}
      </text>

      {/* Subtle Bottom Indicator Bar */}
      <rect
        x="52"
        y="95"
        width="36"
        height="5"
        rx="2.5"
        fill="var(--text-secondary, #57534E)"
        opacity="0.28"
      />

      {/* Corner Badge */}
      <g transform="translate(94, 92)">
        <circle
          cx="12"
          cy="12"
          r="13"
          fill="var(--accent-color, #0B0B0F)"
          stroke="var(--surface-color, #FFFFFF)"
          strokeWidth="2.5"
        />
        <path
          d="M 7.5 12.2 L 10.6 15.2 L 16.8 9"
          stroke="var(--on-accent, #FFFFFF)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    </svg>
  );
}

// 3. INCOME STEP - ARCHITECTURAL MONTHLY INCOME MINI-CARD
function CharacterIncome() {
  return (
    <svg viewBox="0 0 140 140" className="w-full h-full overflow-visible">
      <defs>
        <filter id="dejzCardShadowIncome" x="-35%" y="-35%" width="170%" height="175%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#0B0B0F" floodOpacity="0.10" />
        </filter>
      </defs>

      {/* Tilted Background Card in Dark Obsidian */}
      <g transform="translate(70, 70) rotate(-8) translate(-70, -70)">
        <rect
          x="24"
          y="22"
          width="88"
          height="92"
          rx="22"
          fill="var(--text-primary, #0B0B0F)"
        />
      </g>

      {/* Foreground Income Card */}
      <g filter="url(#dejzCardShadowIncome)">
        <rect
          x="26"
          y="24"
          width="88"
          height="92"
          rx="22"
          fill="var(--surface-color, #FFFFFF)"
          stroke="var(--border-divider, rgba(20, 19, 18, 0.08))"
          strokeWidth="1.5"
        />
      </g>

      {/* Emerald Income Icon Circle */}
      <circle
        cx="70"
        cy="56"
        r="21"
        fill="var(--success-container, rgba(21, 128, 74, 0.12))"
      />
      <circle
        cx="70"
        cy="56"
        r="15"
        fill="var(--success-color, #15804A)"
      />
      {/* Up-Right Arrow */}
      <path
        d="M 65 61 L 75 51 M 67 51 L 75 51 L 75 59"
        stroke="#FFFFFF"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Amount & Subtitle Lines */}
      <rect
        x="43"
        y="86"
        width="54"
        height="6.5"
        rx="3.25"
        fill="var(--text-primary, #0B0B0F)"
        opacity="0.88"
      />
      <rect
        x="52"
        y="98"
        width="36"
        height="4.5"
        rx="2.25"
        fill="var(--success-color, #15804A)"
        opacity="0.55"
      />

      {/* Corner Plus Badge */}
      <g transform="translate(94, 92)">
        <circle
          cx="12"
          cy="12"
          r="13"
          fill="var(--success-color, #15804A)"
          stroke="var(--surface-color, #FFFFFF)"
          strokeWidth="2.5"
        />
        <path
          d="M 12 7.5 L 12 16.5 M 7.5 12 L 16.5 12"
          stroke="#FFFFFF"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  );
}

// 4. FIXED EXPENSES STEP - ARCHITECTURAL RECURRING BILLS MINI-CARD
function CharacterExpenses() {
  return (
    <svg viewBox="0 0 140 140" className="w-full h-full overflow-visible">
      <defs>
        <filter id="dejzCardShadowExpenses" x="-35%" y="-35%" width="170%" height="175%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#0B0B0F" floodOpacity="0.10" />
        </filter>
      </defs>

      {/* Tilted Background Signature Vermilion Card */}
      <g transform="translate(70, 70) rotate(-8) translate(-70, -70)">
        <rect
          x="24"
          y="22"
          width="88"
          height="92"
          rx="22"
          fill="var(--brand-signature, #F0485E)"
        />
      </g>

      {/* Foreground Checklist Card */}
      <g filter="url(#dejzCardShadowExpenses)">
        <rect
          x="26"
          y="24"
          width="88"
          height="92"
          rx="22"
          fill="var(--surface-color, #FFFFFF)"
          stroke="var(--border-divider, rgba(20, 19, 18, 0.08))"
          strokeWidth="1.5"
        />
      </g>

      {/* Row 1 */}
      <rect x="36" y="38" width="68" height="18" rx="7" fill="var(--card-nested-bg, #F4F5F7)" />
      <circle cx="45" cy="47" r="4.5" fill="var(--accent-color, #0B0B0F)" />
      <rect x="54" y="44.5" width="28" height="5" rx="2.5" fill="var(--text-primary, #0B0B0F)" opacity="0.85" />
      <rect x="88" y="44.5" width="10" height="5" rx="2.5" fill="var(--text-secondary, #57534E)" opacity="0.45" />

      {/* Row 2 */}
      <rect x="36" y="61" width="68" height="18" rx="7" fill="var(--card-nested-bg, #F4F5F7)" />
      <circle cx="45" cy="70" r="4.5" fill="var(--text-primary, #0B0B0F)" opacity="0.75" />
      <rect x="54" y="67.5" width="22" height="5" rx="2.5" fill="var(--text-primary, #0B0B0F)" opacity="0.85" />
      <rect x="88" y="67.5" width="10" height="5" rx="2.5" fill="var(--text-secondary, #57534E)" opacity="0.45" />

      {/* Row 3 */}
      <rect x="36" y="84" width="68" height="18" rx="7" fill="var(--card-nested-bg, #F4F5F7)" />
      <circle cx="45" cy="93" r="4.5" fill="var(--text-secondary, #57534E)" opacity="0.45" />
      <rect x="54" y="90.5" width="25" height="5" rx="2.5" fill="var(--text-primary, #0B0B0F)" opacity="0.85" />
      <rect x="88" y="90.5" width="10" height="5" rx="2.5" fill="var(--text-secondary, #57534E)" opacity="0.45" />

      {/* Corner Badge */}
      <g transform="translate(94, 92)">
        <circle
          cx="12"
          cy="12"
          r="13"
          fill="var(--text-primary, #0B0B0F)"
          stroke="var(--surface-color, #FFFFFF)"
          strokeWidth="2.5"
        />
        <path
          d="M 7.5 12.2 L 10.6 15.2 L 16.8 9"
          stroke="var(--surface-color, #FFFFFF)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    </svg>
  );
}

// 5. SAVINGS GOALS STEP - ARCHITECTURAL SAVINGS RING MINI-CARD
function CharacterGoals() {
  return (
    <svg viewBox="0 0 140 140" className="w-full h-full overflow-visible">
      <defs>
        <filter id="dejzCardShadowGoals" x="-35%" y="-35%" width="170%" height="175%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#0B0B0F" floodOpacity="0.10" />
        </filter>
      </defs>

      {/* Tilted Background Signature Vermilion Card */}
      <g transform="translate(70, 70) rotate(-8) translate(-70, -70)">
        <rect
          x="24"
          y="22"
          width="88"
          height="92"
          rx="22"
          fill="var(--brand-signature, #F0485E)"
        />
      </g>

      {/* Foreground Savings Card */}
      <g filter="url(#dejzCardShadowGoals)">
        <rect
          x="26"
          y="24"
          width="88"
          height="92"
          rx="22"
          fill="var(--surface-color, #FFFFFF)"
          stroke="var(--border-divider, rgba(20, 19, 18, 0.08))"
          strokeWidth="1.5"
        />
      </g>

      {/* Progress Ring Track */}
      <circle
        cx="70"
        cy="57"
        r="20"
        fill="none"
        stroke="var(--card-nested-bg, #F4F5F7)"
        strokeWidth="6"
      />
      {/* Progress Ring Value (75%) */}
      <circle
        cx="70"
        cy="57"
        r="20"
        fill="none"
        stroke="var(--accent-color, #0B0B0F)"
        strokeWidth="6"
        strokeDasharray="94 126"
        strokeLinecap="round"
        transform="rotate(-90 70 57)"
      />
      {/* Center Dot */}
      <circle cx="70" cy="57" r="6" fill="var(--text-primary, #0B0B0F)" />

      {/* Label Lines */}
      <rect
        x="46"
        y="88"
        width="48"
        height="6"
        rx="3"
        fill="var(--text-primary, #0B0B0F)"
        opacity="0.85"
      />
      <rect
        x="55"
        y="99"
        width="30"
        height="4.5"
        rx="2.25"
        fill="var(--text-secondary, #57534E)"
        opacity="0.35"
      />

      {/* Corner Badge */}
      <g transform="translate(94, 92)">
        <circle
          cx="12"
          cy="12"
          r="13"
          fill="var(--accent-color, #0B0B0F)"
          stroke="var(--surface-color, #FFFFFF)"
          strokeWidth="2.5"
        />
        <path
          d="M 7.5 12.2 L 10.6 15.2 L 16.8 9"
          stroke="var(--on-accent, #FFFFFF)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    </svg>
  );
}

// 6. MID-MONTH STEP - ARCHITECTURAL TIMELINE MINI-CARD
function CharacterMidMonth({ days = 12 }: { days?: number }) {
  return (
    <svg viewBox="0 0 140 140" className="w-full h-full overflow-visible">
      <defs>
        <filter id="dejzCardShadowMid" x="-35%" y="-35%" width="170%" height="175%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#0B0B0F" floodOpacity="0.10" />
        </filter>
      </defs>

      {/* Tilted Background Card in Dark Obsidian */}
      <g transform="translate(70, 70) rotate(-8) translate(-70, -70)">
        <rect
          x="24"
          y="22"
          width="88"
          height="92"
          rx="22"
          fill="var(--text-primary, #0B0B0F)"
        />
      </g>

      {/* Foreground Timeline Card */}
      <g filter="url(#dejzCardShadowMid)">
        <rect
          x="26"
          y="24"
          width="88"
          height="92"
          rx="22"
          fill="var(--surface-color, #FFFFFF)"
          stroke="var(--border-divider, rgba(20, 19, 18, 0.08))"
          strokeWidth="1.5"
        />
      </g>

      {/* 3 Mini Day Pills Representing the Period Timeline */}
      <rect x="35" y="38" width="20" height="26" rx="7" fill="var(--card-nested-bg, #F4F5F7)" />
      <rect x="60" y="36" width="20" height="30" rx="7" fill="var(--accent-color, #0B0B0F)" />
      <rect x="85" y="38" width="20" height="26" rx="7" fill="var(--card-nested-bg, #F4F5F7)" />

      {/* Active Day Indicator Lines */}
      <rect x="65" y="44" width="10" height="3" rx="1.5" fill="#FFFFFF" opacity="0.8" />
      <rect x="64" y="51" width="12" height="6" rx="2" fill="#FFFFFF" />

      {/* Days Into Period Pill */}
      <rect
        x="38"
        y="76"
        width="64"
        height="24"
        rx="12"
        fill="var(--accent-soft, rgba(11, 11, 15, 0.08))"
      />
      <text
        x="70"
        y="92"
        fontSize="12.5"
        fontWeight="800"
        fill="var(--accent-color, #0B0B0F)"
        textAnchor="middle"
        style={{ fontFamily: 'var(--font-amount, Outfit, sans-serif)', fontVariantNumeric: 'tabular-nums' }}
      >
        {days} {days === 1 ? 'dag' : 'dagar'}
      </text>
    </svg>
  );
}

// 7. SUMMARY STEP - COMPLETED DEJZ BUDGET PLAN MINI-CARD
function CharacterCelebration() {
  return (
    <svg viewBox="0 0 140 140" className="w-full h-full overflow-visible">
      <defs>
        <filter id="dejzCardShadowSummary" x="-35%" y="-35%" width="170%" height="175%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#0B0B0F" floodOpacity="0.10" />
        </filter>
      </defs>

      {/* Tilted Background Signature Vermilion Card */}
      <g transform="translate(70, 70) rotate(-8) translate(-70, -70)">
        <rect
          x="24"
          y="22"
          width="88"
          height="92"
          rx="22"
          fill="var(--brand-signature, #F0485E)"
        />
      </g>

      {/* Foreground Plan Ready Card */}
      <g filter="url(#dejzCardShadowSummary)">
        <rect
          x="26"
          y="24"
          width="88"
          height="92"
          rx="22"
          fill="var(--surface-color, #FFFFFF)"
          stroke="var(--border-divider, rgba(20, 19, 18, 0.08))"
          strokeWidth="1.5"
        />
      </g>

      {/* Verified Plan Icon */}
      <circle
        cx="70"
        cy="54"
        r="19"
        fill="var(--success-container, rgba(21, 128, 74, 0.12))"
      />
      <circle
        cx="70"
        cy="54"
        r="14"
        fill="var(--success-color, #15804A)"
      />
      <path
        d="M 64.5 54.2 L 68.2 57.8 L 75.8 50.2"
        stroke="#FFFFFF"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Remaining to Spend Progress Bar */}
      <rect
        x="38"
        y="82"
        width="64"
        height="7"
        rx="3.5"
        fill="var(--card-nested-bg, #F4F5F7)"
      />
      <rect
        x="38"
        y="82"
        width="48"
        height="7"
        rx="3.5"
        fill="var(--brand-signature, #F0485E)"
      />

      {/* Bottom Metric Line */}
      <rect
        x="48"
        y="96"
        width="44"
        height="4.5"
        rx="2.25"
        fill="var(--text-primary, #0B0B0F)"
        opacity="0.7"
      />
    </svg>
  );
}
