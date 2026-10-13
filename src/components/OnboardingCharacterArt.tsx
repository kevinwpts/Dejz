import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Star } from 'lucide-react';

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
      {/* Dynamic Ambient Background Glow */}
      <motion.div
        animate={{
          scale: [1, 1.12, 1],
          opacity: [0.45, 0.7, 0.45],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className={`absolute inset-0 rounded-full blur-xl pointer-events-none ${
          isWelcomeStep ? 'bg-[var(--accent-color)]/15 dark:bg-[var(--accent-color)]/20' :
          step === 'payday' ? 'bg-gradient-to-tr from-amber-500/40 via-yellow-400/30 to-orange-500/25' :
          step === 'income' ? 'bg-gradient-to-tr from-emerald-500/35 via-teal-400/30 to-green-500/25' :
          step === 'expenses' ? 'bg-gradient-to-tr from-rose-500/40 via-purple-400/30 to-pink-500/25' :
          step === 'budget' ? 'bg-gradient-to-tr from-indigo-500/35 via-amber-400/30 to-cyan-500/25' :
          step === 'goals' ? 'bg-gradient-to-tr from-sky-500/40 via-cyan-400/35 to-blue-500/25' :
          step === 'midMonth' ? 'bg-gradient-to-tr from-amber-500/40 via-yellow-400/25 to-teal-400/25' :
          'bg-gradient-to-tr from-emerald-500/35 via-amber-400/35 to-cyan-400/35'
        }`}
      />

      {/* Floating Artwork Container */}
      <motion.div
        animate={
          isWelcomeStep
            ? { y: [0, -3, 0] }
            : { y: [0, -5, 0], rotate: [0, 1.2, -1.2, 0] }
        }
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center overflow-visible"
      >
        {/* Render Step-Specific Artwork */}
        {isWelcomeStep && <CharacterWelcome />}
        {step === 'payday' && <CharacterPayday payday={payday} />}
        {step === 'income' && <CharacterIncome />}
        {step === 'expenses' && <CharacterExpenses />}
        {step === 'budget' && <CharacterIncome />}
        {step === 'goals' && <CharacterGoals />}
        {step === 'midMonth' && <CharacterMidMonth days={days} />}
        {step === 'summary' && <CharacterCelebration />}

        {/* Micro Sparkle Accents (only on non-welcome steps) */}
        {!isWelcomeStep && (
          <>
            <motion.div
              animate={{ scale: [0.85, 1.3, 0.85], opacity: [0.6, 1, 0.6], rotate: [0, 90, 0] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="absolute -top-1 -right-1 text-[var(--warning-color)] drop-shadow-subtle"
            >
              <Sparkles size={18} />
            </motion.div>

            <motion.div
              animate={{ scale: [1.2, 0.8, 1.2], opacity: [0.5, 0.9, 0.5], rotate: [0, -60, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, delay: 0.5 }}
              className="absolute -bottom-1 -left-1 text-[var(--accent-color)] drop-shadow-subtle"
            >
              <Star size={14} className="fill-current" />
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  );
}

// 1. WELCOME STEP - DEJZ PERSONAL PROFILE CARD IN BRAND GRADIENT & ACCENT COLOR
function CharacterWelcome() {
  return (
    <svg viewBox="0 0 140 140" className="w-full h-full overflow-visible">
      <defs>
        {/* Dejz Signature Brand Gradient (Peach -> Soft Pink -> Lavender) */}
        <linearGradient id="dejzBrandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFE0CE" />
          <stop offset="50%" stopColor="#F8C4DF" />
          <stop offset="100%" stopColor="#CEB9EF" />
        </linearGradient>
        <filter id="dejzCardShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#151718" floodOpacity="0.10" />
        </filter>
      </defs>

      {/* Tilted Background Signature Gradient Card */}
      <g transform="translate(70, 70) rotate(-8) translate(-70, -70)">
        <rect
          x="24"
          y="22"
          width="88"
          height="92"
          rx="22"
          fill="url(#dejzBrandGrad)"
        />
      </g>

      {/* Foreground Personal Profile Card */}
      <g filter="url(#dejzCardShadow)">
        <rect
          x="26"
          y="24"
          width="88"
          height="92"
          rx="22"
          fill="var(--surface-color, #FFFFFF)"
          stroke="var(--border-divider, rgba(21, 23, 24, 0.08))"
          strokeWidth="1.5"
        />
      </g>

      {/* Subtle Brand Gradient Halo Ring Around Avatar */}
      <circle
        cx="70"
        cy="58"
        r="23"
        fill="url(#dejzBrandGrad)"
        opacity="0.35"
      />

      {/* Avatar Circle in User/App Accent Color */}
      <circle
        cx="70"
        cy="58"
        r="19"
        fill="var(--accent-color, #151718)"
      />

      {/* Minimalist User Silhouette in On-Accent Color */}
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
        fill="var(--text-primary, #151718)"
        opacity="0.85"
      />
      <rect
        x="54"
        y="99"
        width="32"
        height="4.5"
        rx="2.25"
        fill="var(--text-secondary, #60686B)"
        opacity="0.35"
      />

      {/* Verified / Welcome Badge in Bottom-Right Corner */}
      <g transform="translate(94, 92)">
        <circle
          cx="12"
          cy="12"
          r="13"
          fill="var(--accent-color, #151718)"
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

// 2. PAYDAY STEP - DEJZY HOLDING 3D PAYDAY CALENDAR & BELL
function CharacterPayday({ payday = 25 }: { payday?: number }) {
  return (
    <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-subtle overflow-visible">
      <defs>
        <radialGradient id="mascotBody2" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="40%" stopColor="#FEF3C7" />
          <stop offset="85%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </radialGradient>
        <linearGradient id="calSheet" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F8FAFC" />
        </linearGradient>
        <linearGradient id="calTop" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="goldCoinGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
      </defs>

      {/* Mascot Peeking Behind Calendar */}
      <circle cx="70" cy="50" r="32" fill="url(#mascotBody2)" stroke="#FFFFFF" strokeWidth="2.5" />
      
      {/* Mascot Cute Cheerful Eyes Looking Down at Date */}
      <ellipse cx="58" cy="46" rx="4.5" ry="6" fill="#451A03" />
      <circle cx="56" cy="44" r="2" fill="#FFFFFF" />
      <ellipse cx="82" cy="46" rx="4.5" ry="6" fill="#451A03" />
      <circle cx="80" cy="44" r="2" fill="#FFFFFF" />
      <path d="M 66 54 Q 70 58 74 54" fill="none" stroke="#451A03" strokeWidth="2.2" strokeLinecap="round" />

      {/* Cute Party Horn / Crown on Top */}
      <polygon points="62,22 70,8 78,22" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="1.5" />
      <circle cx="70" cy="8" r="3.5" fill="#EF4444" />

      {/* 3D Big Calendar Held in Front */}
      <g transform="translate(25, 52)">
        {/* Calendar Backing Shadow */}
        <rect x="4" y="4" width="82" height="66" rx="14" fill="#D97706" opacity="0.3" />
        
        {/* Main White Calendar Board */}
        <rect x="0" y="0" width="82" height="66" rx="14" fill="url(#calSheet)" stroke="#CBD5E1" strokeWidth="1.5" />
        
        {/* Red / Gold Banner Header */}
        <path d="M 0 16 L 0 12 C 0 6.5 5.5 0 12 0 L 70 0 C 76.5 0 82 6.5 82 12 L 82 16 Z" fill="url(#calTop)" />
        
        {/* Binder Rings */}
        <rect x="18" y="-6" width="7" height="12" rx="3.5" fill="#78350F" />
        <rect x="57" y="-6" width="7" height="12" rx="3.5" fill="#78350F" />
        
        {/* Big Embossed Payday Date Number */}
        <text x="41" y="48" fontSize="30" fontWeight="900" fill="#0F172A" textAnchor="middle" fontFamily="sans-serif" letterSpacing="-1">
          {payday}
        </text>
        
        {/* "LÖN" Banner Ribbon Badge */}
        <rect x="22" y="52" width="38" height="11" rx="5.5" fill="#10B981" />
        <text x="41" y="60.5" fontSize="7.5" fontWeight="900" fill="#FFFFFF" textAnchor="middle" letterSpacing="0.5">
          LÖNEDAG
        </text>
      </g>

      {/* Little Paws Holding Calendar */}
      <ellipse cx="32" cy="74" rx="6.5" ry="5.5" fill="#FEF3C7" stroke="#451A03" strokeWidth="1.5" />
      <ellipse cx="108" cy="74" rx="6.5" ry="5.5" fill="#FEF3C7" stroke="#451A03" strokeWidth="1.5" />

      {/* Floating Golden Coin Badge */}
      <g transform="translate(100, 30)">
        <circle cx="12" cy="12" r="13" fill="url(#goldCoinGrad2)" stroke="#FFFFFF" strokeWidth="2" />
        <text x="12" y="16.5" fontSize="11" fontWeight="900" fill="#78350F" textAnchor="middle">kr</text>
      </g>
    </svg>
  );
}

// 3. INCOME STEP - DEJZY CELEBRATING WITH MONEY & GOLDEN VAULT
function CharacterIncome() {
  return (
    <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-subtle overflow-visible">
      <defs>
        <radialGradient id="mascotBody3" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="40%" stopColor="#DCFCE7" />
          <stop offset="85%" stopColor="#86EFAC" />
          <stop offset="100%" stopColor="#22C55E" />
        </radialGradient>
        <linearGradient id="emeraldBag" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="50%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="billGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ECFDF5" />
          <stop offset="100%" stopColor="#A7F3D0" />
        </linearGradient>
      </defs>

      {/* Floating Cash Banknotes in Background */}
      <rect x="18" y="24" width="34" height="20" rx="4" fill="url(#billGrad2)" stroke="#10B981" strokeWidth="1.2" transform="rotate(-18 35 34)" />
      <text x="35" y="38" fontSize="8" fontWeight="bold" fill="#047857" textAnchor="middle" transform="rotate(-18 35 34)">$$$</text>

      <rect x="88" y="18" width="34" height="20" rx="4" fill="url(#billGrad2)" stroke="#10B981" strokeWidth="1.2" transform="rotate(22 105 28)" />
      <text x="105" y="32" fontSize="8" fontWeight="bold" fill="#047857" textAnchor="middle" transform="rotate(22 105 28)">$$$</text>

      {/* Mascot Body */}
      <circle cx="70" cy="65" r="36" fill="url(#mascotBody3)" stroke="#FFFFFF" strokeWidth="3" />

      {/* Cheeks */}
      <circle cx="52" cy="70" r="6" fill="#86EFAC" opacity="0.6" />
      <circle cx="88" cy="70" r="6" fill="#86EFAC" opacity="0.6" />

      {/* Big Sparkling Excited Eyes (Dollar / Star Sparkle) */}
      <circle cx="58" cy="60" r="6" fill="#064E3B" />
      <circle cx="56" cy="58" r="2.2" fill="#FFFFFF" />
      <circle cx="82" cy="60" r="6" fill="#064E3B" />
      <circle cx="80" cy="58" r="2.2" fill="#FFFFFF" />

      {/* Big Wide Happy Open Smile */}
      <path d="M 62 68 Q 70 78 78 68 Z" fill="#064E3B" />
      <path d="M 66 73 Q 70 76 74 73" fill="#FDA4AF" />

      {/* Big Glowing Money Bag Held in Front */}
      <g transform="translate(38, 72)">
        <path d="M 22 6 C 8 16 0 32 6 44 C 12 52 52 52 58 44 C 64 32 56 16 42 6 Z" fill="url(#emeraldBag)" stroke="#FFFFFF" strokeWidth="2.5" />
        {/* Bag Golden Tie */}
        <rect x="24" y="4" width="16" height="5" rx="2.5" fill="#FBBF24" />
        {/* Golden Kr Icon on Bag */}
        <circle cx="32" cy="30" r="11" fill="#FEF08A" stroke="#F59E0B" strokeWidth="1.5" />
        <text x="32" y="34.5" fontSize="10" fontWeight="900" fill="#78350F" textAnchor="middle">kr</text>
      </g>

      {/* Paws Hugging the Money Bag */}
      <circle cx="44" cy="85" r="6.5" fill="#DCFCE7" stroke="#064E3B" strokeWidth="1.5" />
      <circle cx="96" cy="85" r="6.5" fill="#DCFCE7" stroke="#064E3B" strokeWidth="1.5" />

      {/* Green Growth Arrow Sprouting Up */}
      <g transform="translate(104, 62)">
        <circle cx="10" cy="10" r="11" fill="#10B981" stroke="#FFFFFF" strokeWidth="1.8" />
        <path d="M 6 12 L 10 7 L 14 12 M 10 7 L 10 14" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

// 4. FIXED EXPENSES STEP - DEJZY MANAGING BILLS WITH SMART CARD & VERIFIED BADGE
function CharacterExpenses() {
  return (
    <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-subtle overflow-visible">
      <defs>
        <radialGradient id="mascotBody4" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="40%" stopColor="#EDE9FE" />
          <stop offset="85%" stopColor="#C4B5FD" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </radialGradient>
        <linearGradient id="darkCard" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="50%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <linearGradient id="receiptGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F1F5F9" />
        </linearGradient>
      </defs>

      {/* Background Receipt Checklist */}
      <g transform="translate(24, 20) rotate(-12)">
        <path d="M 0 0 L 40 0 L 40 50 L 35 46 L 30 50 L 25 46 L 20 50 L 15 46 L 10 50 L 5 46 L 0 50 Z" fill="url(#receiptGrad)" stroke="#CBD5E1" strokeWidth="1.2" />
        <line x1="8" y1="12" x2="24" y2="12" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="8" y1="20" x2="32" y2="20" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="8" y1="28" x2="28" y2="28" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="32" cy="12" r="3.5" fill="#10B981" />
      </g>

      {/* Mascot Body */}
      <circle cx="76" cy="65" r="35" fill="url(#mascotBody4)" stroke="#FFFFFF" strokeWidth="3" />

      {/* Cute Smart Glasses / Visor */}
      <g transform="translate(48, 52)">
        {/* Left Frame */}
        <rect x="0" y="0" width="22" height="15" rx="5" fill="none" stroke="#4C1D95" strokeWidth="2.5" />
        {/* Right Frame */}
        <rect x="28" y="0" width="22" height="15" rx="5" fill="none" stroke="#4C1D95" strokeWidth="2.5" />
        {/* Bridge */}
        <line x1="22" y1="7" x2="28" y2="7" stroke="#4C1D95" strokeWidth="2.5" />
      </g>

      {/* Confident Focused Eyes Inside Glasses */}
      <ellipse cx="59" cy="59" rx="4" ry="5.5" fill="#2E1065" />
      <circle cx="58" cy="57" r="1.8" fill="#FFFFFF" />
      <ellipse cx="87" cy="59" rx="4" ry="5.5" fill="#2E1065" />
      <circle cx="86" cy="57" r="1.8" fill="#FFFFFF" />

      {/* Smart Confident Smile */}
      <path d="M 68 74 Q 74 79 80 74" fill="none" stroke="#2E1065" strokeWidth="2.5" strokeLinecap="round" />

      {/* 3D Black Titanium Card with Golden Chip Held in Front */}
      <g transform="translate(38, 76) rotate(6)">
        <rect x="0" y="0" width="62" height="38" rx="8" fill="url(#darkCard)" stroke="#94A3B8" strokeWidth="1.5" />
        {/* Gold EMV Chip */}
        <rect x="8" y="10" width="10" height="8" rx="2" fill="#FBBF24" stroke="#B45309" strokeWidth="0.8" />
        {/* Card Number Lines */}
        <line x1="8" y1="26" x2="36" y2="26" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        {/* Contactless waves */}
        <path d="M 48 10 A 5 5 0 0 1 48 18" stroke="#FFFFFF" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.8" />
      </g>

      {/* Mascot Paws Holding the Card */}
      <circle cx="42" cy="94" rx="6" ry="5" fill="#EDE9FE" stroke="#4C1D95" strokeWidth="1.5" />
      <circle cx="98" cy="98" rx="6" ry="5" fill="#EDE9FE" stroke="#4C1D95" strokeWidth="1.5" />

      {/* Verified Shield Badge (Green Checkmark) */}
      <g transform="translate(100, 32)">
        <circle cx="12" cy="12" r="12" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
        <path d="M 8 12 L 11 15 L 17 9" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    </svg>
  );
}

// 5. SAVINGS GOALS STEP - DEJZY WITH GOLDEN KEY & FLOATING DIAMOND TREASURE
function CharacterGoals() {
  return (
    <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-subtle overflow-visible">
      <defs>
        <radialGradient id="mascotBody5" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="40%" stopColor="#E0F2FE" />
          <stop offset="85%" stopColor="#7DD3FC" />
          <stop offset="100%" stopColor="#0284C7" />
        </radialGradient>
        <linearGradient id="diamondGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="30%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
        <linearGradient id="vaultGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
      </defs>

      {/* Floating Glowing Diamond / Crystal Goal on Top */}
      <g transform="translate(56, 10)">
        <polygon points="14,0 28,10 22,24 6,24 0,10" fill="url(#diamondGrad)" stroke="#FFFFFF" strokeWidth="2" />
        <polygon points="14,0 20,10 14,24 8,10" fill="#FFFFFF" fillOpacity="0.4" />
        <line x1="0" y1="10" x2="28" y2="10" stroke="#FFFFFF" strokeWidth="1" />
      </g>

      {/* Mascot Looking Up in Wonder */}
      <circle cx="70" cy="74" r="38" fill="url(#mascotBody5)" stroke="#FFFFFF" strokeWidth="3" />

      {/* Big Starry Eyes Looking Upwards */}
      <g transform="translate(50, 60)">
        <ellipse cx="6" cy="8" rx="6" ry="7.5" fill="#0C4A6E" />
        {/* Star highlight */}
        <polygon points="6,3 7.5,6.5 11,7 8.5,9.5 9,13 6,11 3,13 3.5,9.5 1,7 4.5,6.5" fill="#FEF08A" />
      </g>

      <g transform="translate(76, 60)">
        <ellipse cx="6" cy="8" rx="6" ry="7.5" fill="#0C4A6E" />
        {/* Star highlight */}
        <polygon points="6,3 7.5,6.5 11,7 8.5,9.5 9,13 6,11 3,13 3.5,9.5 1,7 4.5,6.5" fill="#FEF08A" />
      </g>

      {/* Cute Open Mouth in Awe */}
      <ellipse cx="69" cy="84" rx="4.5" ry="6" fill="#0C4A6E" />

      {/* 3D Golden Vault Key Held in Hands */}
      <g transform="translate(24, 76) rotate(-25)">
        <circle cx="10" cy="10" r="10" fill="none" stroke="url(#vaultGold)" strokeWidth="4" />
        <rect x="18" y="8" width="22" height="4" rx="2" fill="url(#vaultGold)" />
        <rect x="34" y="12" width="4" height="6" rx="1.5" fill="url(#vaultGold)" />
        <rect x="28" y="12" width="4" height="4" rx="1.5" fill="url(#vaultGold)" />
      </g>

      {/* Right Hand Waving Up to Diamond */}
      <circle cx="106" cy="70" r="7" fill="#E0F2FE" stroke="#0C4A6E" strokeWidth="2" />
    </svg>
  );
}

// 6. MID-MONTH STEP - DEJZY TIMELINE WITH HOURGLASS & DAYS COUNTDOWN
function CharacterMidMonth({ days = 12 }: { days?: number }) {
  return (
    <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-subtle overflow-visible">
      <defs>
        <radialGradient id="mascotBody6" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="40%" stopColor="#FEF3C7" />
          <stop offset="85%" stopColor="#FCD34D" />
          <stop offset="100%" stopColor="#D97706" />
        </radialGradient>
        <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#E2E8F0" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="sandGold2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>

      {/* Mascot Body */}
      <circle cx="60" cy="66" r="36" fill="url(#mascotBody6)" stroke="#FFFFFF" strokeWidth="3" />

      {/* Happy Friendly Eyes */}
      <ellipse cx="48" cy="58" rx="5" ry="6.5" fill="#451A03" />
      <circle cx="46" cy="56" r="2" fill="#FFFFFF" />
      <ellipse cx="72" cy="58" rx="5" ry="6.5" fill="#451A03" />
      <circle cx="70" cy="56" r="2" fill="#FFFFFF" />

      {/* Cheerful Smile */}
      <path d="M 54 70 Q 60 76 66 70" fill="none" stroke="#451A03" strokeWidth="2.5" strokeLinecap="round" />

      {/* Hand Pointing to Hourglass / Countdown */}
      <g transform="translate(86, 68)">
        <ellipse cx="8" cy="8" rx="6" ry="8" fill="#FEF3C7" stroke="#451A03" strokeWidth="1.8" />
      </g>

      {/* 3D Glass Hourglass on the Right */}
      <g transform="translate(82, 34)">
        {/* Wood / Metal Caps */}
        <rect x="6" y="0" width="32" height="5" rx="2.5" fill="#78350F" stroke="#FFFFFF" strokeWidth="1" />
        <rect x="6" y="52" width="32" height="5" rx="2.5" fill="#78350F" stroke="#FFFFFF" strokeWidth="1" />
        
        {/* Hourglass Glass Shell */}
        <path d="M 10 5 C 10 20 20 26 20 28.5 C 20 31 10 37 10 52 L 34 52 C 34 37 24 31 24 28.5 C 24 26 34 20 34 5 Z" fill="url(#glassGrad)" stroke="#FFFFFF" strokeWidth="1.8" />
        
        {/* Upper Flowing Sand */}
        <path d="M 14 12 C 18 18 26 18 30 12 L 23 27 L 21 27 Z" fill="url(#sandGold2)" />
        <line x1="22" y1="28" x2="22" y2="45" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="2 1.5" />
        {/* Bottom Settled Sand */}
        <path d="M 14 51 C 18 44 26 44 30 51 Z" fill="url(#sandGold2)" />
      </g>

      {/* Floating Days Countdown Pill Badge */}
      <g transform="translate(24, 86)">
        <rect x="0" y="0" width="58" height="24" rx="12" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" className="drop-shadow-subtle" />
        <text x="29" y="16" fontSize="11" fontWeight="900" fill="#FFFFFF" textAnchor="middle" fontFamily="sans-serif">
          {days} {days === 1 ? 'dag' : 'dagar'}! 🗓️
        </text>
      </g>
    </svg>
  );
}

// 7. SUMMARY STEP - DEJZY JUMPING FOR JOY WITH CHAMPION TROPHY & CONFETTI
function CharacterCelebration() {
  return (
    <svg viewBox="0 0 150 150" className="w-full h-full drop-shadow-subtle overflow-visible">
      <defs>
        <radialGradient id="mascotBody7" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="35%" stopColor="#DCFCE7" />
          <stop offset="75%" stopColor="#86EFAC" />
          <stop offset="100%" stopColor="#10B981" />
        </radialGradient>
        <linearGradient id="trophyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="40%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id="goldRibbon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>

      {/* Confetti ribbons bursting in background */}
      <path d="M 22 28 Q 30 18 42 24 Q 50 32 38 40" stroke="#EF4444" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M 108 22 Q 120 16 128 26 Q 134 38 122 42" stroke="#3B82F6" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="28" cy="52" r="3" fill="#F59E0B" />
      <circle cx="120" cy="56" r="3" fill="#10B981" />
      <polygon points="126,30 130,34 124,36" fill="#EC4899" />

      {/* Mascot Floating in Joy */}
      <circle cx="75" cy="76" r="40" fill="url(#mascotBody7)" stroke="#FFFFFF" strokeWidth="3.5" />

      {/* Cheerful Starry Eyes with Huge Happy Arch */}
      <path d="M 54 68 Q 62 60 70 68" fill="none" stroke="#064E3B" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M 80 68 Q 88 60 96 68" fill="none" stroke="#064E3B" strokeWidth="3.5" strokeLinecap="round" />

      {/* Rosy Blush */}
      <circle cx="52" cy="74" r="7" fill="#FDA4AF" opacity="0.8" />
      <circle cx="98" cy="74" r="7" fill="#FDA4AF" opacity="0.8" />

      {/* Big Cheerful Open Mouth */}
      <path d="M 66 76 Q 75 90 84 76 Z" fill="#064E3B" />
      <path d="M 70 82 Q 75 86 80 82" fill="#FDA4AF" />

      {/* Big Glowing Golden Champion Trophy Cup Held High */}
      <g transform="translate(51, 8)">
        {/* Trophy Handles */}
        <path d="M 4 16 C -6 16 -6 32 6 34" stroke="url(#trophyGrad)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d="M 44 16 C 54 16 54 32 42 34" stroke="url(#trophyGrad)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        {/* Main Cup Body */}
        <path d="M 6 4 L 42 4 C 42 24 32 36 24 36 C 16 36 6 24 6 4 Z" fill="url(#trophyGrad)" stroke="#FFFFFF" strokeWidth="2" />
        {/* Trophy Stem & Base */}
        <rect x="21" y="36" width="6" height="8" fill="url(#trophyGrad)" />
        <rect x="12" y="44" width="24" height="6" rx="2" fill="#78350F" stroke="#FFFFFF" strokeWidth="1" />
        {/* Embossed Champion Star */}
        <polygon points="24,12 26.5,17 32,18 28,22 29,27.5 24,24.5 19,27.5 20,22 16,18 21.5,17" fill="#FEF08A" stroke="#B45309" strokeWidth="0.8" />
      </g>

      {/* Hands Holding the Trophy Base */}
      <circle cx="60" cy="52" r="7" fill="#DCFCE7" stroke="#064E3B" strokeWidth="2" />
      <circle cx="90" cy="52" r="7" fill="#DCFCE7" stroke="#064E3B" strokeWidth="2" />
    </svg>
  );
}
