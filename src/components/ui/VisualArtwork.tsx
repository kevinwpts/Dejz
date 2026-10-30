import React from 'react';
import {
  MusicNotes,
  FilmSlate,
  ArrowsClockwise,
  Coins,
  Bank,
  TrendUp,
  Package,
  Truck,
  Barcode,
  Heart,
  Sparkle,
  ShoppingBag,
  Receipt,
  Paperclip,
  FileText,
  Bell,
  Check,
  Flag,
} from '@phosphor-icons/react';

export interface GoalArtworkTheme {
  id: string;
  label: string;
  keywords: string[];
  tileBg: string;
  heroBg: string;
  progressColor: string;
}

export const GOAL_ARTWORKS: GoalArtworkTheme[] = [
  {
    id: 'piggy',
    label: 'Spargris & buffert',
    keywords: ['spargris', 'buffert', 'spara', 'pengar', 'mynt', 'allmänt', 'playstation', 'pryl'],
    tileBg: '#0E4D42',
    heroBg: 'linear-gradient(165deg, #134E43 0%, #0B332C 100%)',
    progressColor: '#52B79A',
  },
  {
    id: 'safe',
    label: 'Kassaskåp & trygghet',
    keywords: ['kassaskåp', 'trygghet', 'buffert', 'pension', 'säkerhet', 'bank', 'nödfond'],
    tileBg: '#C4C9CE',
    heroBg: 'linear-gradient(165deg, #374151 0%, #1F2937 100%)',
    progressColor: '#94A3B8',
  },
  {
    id: 'globe',
    label: 'Världen & storresa',
    keywords: ['världen', 'jorden', 'resa', 'utlandsresa', 'äventyr', 'flyg', 'glob'],
    tileBg: '#0B1CF4',
    heroBg: 'linear-gradient(165deg, #1E3A8A 0%, #0F1D4B 100%)',
    progressColor: '#60A5FA',
  },
  {
    id: 'beach',
    label: 'Semester & sol',
    keywords: ['semester', 'sol', 'strand', 'bad', 'sommar', 'parasoll', 'resa', 'spanien'],
    tileBg: '#4294FF',
    heroBg: 'linear-gradient(165deg, #1D4ED8 0%, #0F296B 100%)',
    progressColor: '#38BDF8',
  },
  {
    id: 'shopping',
    label: 'Shopping & kläder',
    keywords: ['shopping', 'kläder', 'present', 'mode', 'unna', 'butik', 'prylar'],
    tileBg: '#5BB5FF',
    heroBg: 'linear-gradient(165deg, #0284C7 0%, #0B3C5D 100%)',
    progressColor: '#7DD3FC',
  },
  {
    id: 'celebration',
    label: 'Firande & fest',
    keywords: ['tårta', 'födelsedag', 'fest', 'bröllop', 'kalas', 'fira', 'jubileum'],
    tileBg: '#F4513E',
    heroBg: 'linear-gradient(165deg, #991B1B 0%, #4C0D0D 100%)',
    progressColor: '#F87171',
  },
  {
    id: 'calendar',
    label: 'Framtida plan & datum',
    keywords: ['kalender', 'månad', 'plan', 'år', 'jul', 'högtid', 'framtid'],
    tileBg: '#F4D8DC',
    heroBg: 'linear-gradient(165deg, #831843 0%, #430C22 100%)',
    progressColor: '#F472B6',
  },
  {
    id: 'house',
    label: 'Boende & kontantinsats',
    keywords: ['hus', 'boende', 'lägenhet', 'kontantinsats', 'renovering', 'hem', 'stuga'],
    tileBg: '#67DFAA',
    heroBg: 'linear-gradient(165deg, #065F46 0%, #033024 100%)',
    progressColor: '#6EE7B7',
  },
];

export function getGoalArtworkTheme(artworkId?: string): GoalArtworkTheme {
  if (!artworkId) return GOAL_ARTWORKS[0];
  return GOAL_ARTWORKS.find((a) => a.id === artworkId) || GOAL_ARTWORKS[0];
}

export const GoalArtworkIllustration: React.FC<{
  artworkId?: string;
  className?: string;
}> = ({ artworkId = 'piggy', className = 'w-full h-full' }) => {
  switch (artworkId) {
    case 'safe':
      return (
        <svg viewBox="0 0 120 120" fill="none" className={className}>
          {/* Shadow */}
          <path d="M24 85L62 104L98 84L60 66L24 85Z" fill="#000" fillOpacity="0.18" />
          {/* Left face */}
          <path
            d="M24 38L62 56V98L24 79V38Z"
            fill="#9CA3AF"
            stroke="#111827"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          {/* Right face */}
          <path
            d="M96 38L62 56V98L96 79V38Z"
            fill="#6B7280"
            stroke="#111827"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          {/* Top face */}
          <path
            d="M60 20L96 38L62 56L24 38L60 20Z"
            fill="#E5E7EB"
            stroke="#111827"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          {/* Top inner shine */}
          <path
            d="M60 25L88 38L62 51L32 38L60 25Z"
            fill="#F9FAFB"
            stroke="#374151"
            strokeWidth="1"
          />
          {/* Safe door inset on left face */}
          <path
            d="M30 45L56 58V90L30 77V45Z"
            fill="#D1D5DB"
            stroke="#111827"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Hinges */}
          <rect
            x="26"
            y="49"
            width="6"
            height="8"
            rx="1.5"
            fill="#E5E7EB"
            stroke="#111827"
            strokeWidth="1.4"
          />
          <rect
            x="26"
            y="67"
            width="6"
            height="8"
            rx="1.5"
            fill="#E5E7EB"
            stroke="#111827"
            strokeWidth="1.4"
          />
          {/* Combination dial */}
          <circle
            cx="45"
            cy="68"
            r="7.5"
            fill="#F3F4F6"
            stroke="#111827"
            strokeWidth="1.6"
          />
          <circle
            cx="43.5"
            cy="68"
            r="4"
            fill="#4B5563"
            stroke="#111827"
            strokeWidth="1.4"
          />
        </svg>
      );

    case 'globe':
      return (
        <svg viewBox="0 0 120 120" fill="none" className={className}>
          {/* Stand base */}
          <ellipse
            cx="54"
            cy="98"
            rx="18"
            ry="6"
            fill="#0284C7"
            stroke="#0F172A"
            strokeWidth="1.8"
          />
          <path
            d="M48 86H60V96C60 98 48 98 48 96V86Z"
            fill="#38BDF8"
            stroke="#0F172A"
            strokeWidth="1.8"
          />
          {/* Meridian arc */}
          <path
            d="M54 20C32 20 18 37 18 55C18 73 32 88 54 88"
            stroke="#38BDF8"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <path
            d="M54 20C32 20 18 37 18 55C18 73 32 88 54 88"
            stroke="#0F172A"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {/* Globe sphere */}
          <circle
            cx="60"
            cy="54"
            r="31"
            fill="#7DD3FC"
            stroke="#0F172A"
            strokeWidth="1.8"
          />
          {/* Continents */}
          <path
            d="M54 28C61 28 66 32 64 38C62 43 55 44 56 49C57 53 65 52 68 57C71 62 66 74 59 77C53 79 49 71 49 64C49 58 43 55 44 48C45 41 48 28 54 28Z"
            fill="#0284C7"
            stroke="#0F172A"
            strokeWidth="1.4"
          />
          <path
            d="M78 36C83 40 88 48 86 57C84 65 77 69 74 64C71 59 73 51 71 45C69 39 74 33 78 36Z"
            fill="#0284C7"
            stroke="#0F172A"
            strokeWidth="1.4"
          />
        </svg>
      );

    case 'beach':
      return (
        <svg viewBox="0 0 120 120" fill="none" className={className}>
          {/* Water ring */}
          <ellipse
            cx="60"
            cy="78"
            rx="44"
            ry="24"
            fill="#60A5FA"
            stroke="#1E3A8A"
            strokeWidth="1.5"
          />
          {/* Sand island */}
          <ellipse
            cx="60"
            cy="75"
            rx="37"
            ry="19"
            fill="#FBBF24"
            stroke="#78350F"
            strokeWidth="1.6"
          />
          {/* Shadow on sand */}
          <ellipse cx="62" cy="77" rx="22" ry="8" fill="#D97706" fillOpacity="0.45" />
          {/* Deck chair */}
          <path
            d="M36 76L53 52L70 60L55 83L36 76Z"
            fill="#F9FAFB"
            stroke="#111827"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M34 78L48 85M55 83L64 87M51 55L42 74"
            stroke="#92400E"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Umbrella pole */}
          <path d="M68 38L62 76" stroke="#111827" strokeWidth="2.2" strokeLinecap="round" />
          {/* Umbrella canopy */}
          <path
            d="M44 37C48 22 68 18 86 28C76 36 58 40 44 37Z"
            fill="#EF4444"
            stroke="#111827"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M55 38C60 25 69 22 76 32"
            fill="#F9FAFB"
            stroke="#111827"
            strokeWidth="1.4"
          />
        </svg>
      );

    case 'shopping':
      return (
        <svg viewBox="0 0 120 120" fill="none" className={className}>
          {/* Shopping bag back */}
          <path
            d="M26 36L56 26L62 76L30 88L26 36Z"
            fill="#38BDF8"
            stroke="#0F172A"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Handles */}
          <path
            d="M35 34C35 23 47 20 48 30"
            stroke="#BAE6FD"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M41 37C41 26 53 23 54 33"
            stroke="#BAE6FD"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          {/* Bag front */}
          <path
            d="M32 40L62 30L66 80L34 92L32 40Z"
            fill="#60A5FA"
            stroke="#0F172A"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Folded sweater / box in front */}
          <path
            d="M48 68L78 54L100 68L68 86L48 68Z"
            fill="#3B82F6"
            stroke="#0F172A"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M48 68V75L68 93L100 75V68"
            fill="#2563EB"
            stroke="#0F172A"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'celebration':
      return (
        <svg viewBox="0 0 120 120" fill="none" className={className}>
          {/* Plate */}
          <path
            d="M18 78L60 98L102 78L60 58L18 78Z"
            fill="#FECACA"
            stroke="#111827"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Cake cylinder body */}
          <path
            d="M34 52V74C34 81 46 86 60 86C74 86 86 81 86 74V52"
            fill="#E7C6B5"
            stroke="#111827"
            strokeWidth="1.6"
          />
          {/* Cake middle layer stripe */}
          <path
            d="M34 65C34 72 46 77 60 77C74 77 86 72 86 65"
            stroke="#451A03"
            strokeWidth="3.5"
          />
          {/* Chocolate icing top + drips */}
          <path
            d="M34 52C34 45 46 40 60 40C74 40 86 45 86 52C86 56 83 59 80 59C78 59 77 66 75 66C73 66 72 59 68 60C65 61 64 69 61 69C58 69 57 60 53 60C49 60 48 67 45 67C42 67 42 58 38 57C35 56 34 54 34 52Z"
            fill="#3E1F0D"
            stroke="#111827"
            strokeWidth="1.6"
          />
          {/* Candle */}
          <rect
            x="58"
            y="26"
            width="4"
            height="22"
            rx="1.5"
            fill="#FDE2E4"
            stroke="#111827"
            strokeWidth="1.3"
          />
          {/* Flame */}
          <path
            d="M60 16C62.5 19.5 62.5 23 60 25C57.5 23 57.5 19.5 60 16Z"
            fill="#FBBF24"
            stroke="#D97706"
            strokeWidth="1"
          />
        </svg>
      );

    case 'calendar':
      return (
        <svg viewBox="0 0 120 120" fill="none" className={className}>
          {/* Shadow */}
          <path d="M36 86L76 96L94 84L56 72L36 86Z" fill="#111827" fillOpacity="0.85" />
          {/* Calendar body */}
          <path
            d="M44 34L86 48L78 88L36 74L44 34Z"
            fill="#F3F4F6"
            stroke="#111827"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Red header */}
          <path
            d="M44 34L86 48L89 36L47 22L44 34Z"
            fill="#E11D48"
            stroke="#111827"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Binder rings */}
          <path
            d="M54 20C51 15 44 18 46 25"
            stroke="#881337"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M78 28C75 23 68 26 70 33"
            stroke="#881337"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Grid cells */}
          <path
            d="M46 46L78 57M44 56L76 67M42 66L74 77M55 42L49 74M67 46L61 78"
            stroke="#9CA3AF"
            strokeWidth="1.5"
          />
          {/* Gold coins bottom left */}
          <ellipse
            cx="38"
            cy="82"
            rx="10"
            ry="6"
            fill="#F59E0B"
            stroke="#111827"
            strokeWidth="1.5"
          />
          <ellipse
            cx="35"
            cy="77"
            rx="10"
            ry="6"
            fill="#FBBF24"
            stroke="#111827"
            strokeWidth="1.5"
          />
        </svg>
      );

    case 'house':
      return (
        <svg viewBox="0 0 120 120" fill="none" className={className}>
          {/* Left wall */}
          <path
            d="M26 54L60 70V98L26 81V54Z"
            fill="#34D399"
            stroke="#064E3B"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Right wall */}
          <path
            d="M94 54L60 70V98L94 81V54Z"
            fill="#10B981"
            stroke="#064E3B"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Left roof */}
          <path
            d="M22 54L44 30L60 70L22 54Z"
            fill="#6EE7B7"
            stroke="#064E3B"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Right roof */}
          <path
            d="M44 30L78 20L98 54L60 70L44 30Z"
            fill="#A7F3D0"
            stroke="#064E3B"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Chimney */}
          <path
            d="M66 22V32L74 30V20L66 22Z"
            fill="#34D399"
            stroke="#064E3B"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Door & Window */}
          <path
            d="M40 66L50 71V93L40 88V66Z"
            fill="#047857"
            stroke="#064E3B"
            strokeWidth="1.4"
          />
          <path
            d="M72 68L84 62V76L72 82V68Z"
            fill="#A7F3D0"
            stroke="#064E3B"
            strokeWidth="1.4"
          />
        </svg>
      );

    case 'piggy':
    default:
      return (
        <svg viewBox="0 0 120 120" fill="none" className={className}>
          {/* Drop shadow */}
          <ellipse cx="64" cy="96" rx="28" ry="9" fill="#000000" fillOpacity="0.28" />
          {/* Back feet */}
          <path
            d="M44 84L41 94C41 96 47 97 49 94L52 86"
            fill="#3B9B81"
            stroke="#05201A"
            strokeWidth="1.6"
          />
          <path
            d="M75 85L77 95C77 97 83 97 84 94L83 83"
            fill="#3B9B81"
            stroke="#05201A"
            strokeWidth="1.6"
          />
          {/* Main 3D Piggy Body */}
          <ellipse
            cx="62"
            cy="60"
            rx="34"
            ry="29"
            fill="#52B79A"
            stroke="#05201A"
            strokeWidth="1.8"
          />
          {/* Subtle body highlight */}
          <path
            d="M36 44C44 33 66 30 82 38"
            stroke="#84D9C0"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.65"
          />
          {/* Snout */}
          <ellipse
            cx="30"
            cy="68"
            rx="9"
            ry="11"
            transform="rotate(-14 30 68)"
            fill="#68C8AC"
            stroke="#05201A"
            strokeWidth="1.8"
          />
          {/* Nostrils */}
          <ellipse cx="27.5" cy="67" rx="1.6" ry="2.8" fill="#05201A" />
          <ellipse cx="32.5" cy="69" rx="1.6" ry="2.8" fill="#05201A" />
          {/* Eyes */}
          <ellipse cx="37" cy="54" rx="1.6" ry="2.5" fill="#05201A" />
          <ellipse cx="49" cy="57" rx="1.6" ry="2.5" fill="#05201A" />
          {/* Ears */}
          <path
            d="M33 43C29 36 34 32 40 37"
            fill="#52B79A"
            stroke="#05201A"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M54 51C54 43 61 42 63 50"
            fill="#3B9B81"
            stroke="#05201A"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Coin slot on top */}
          <path
            d="M50 35C56 33 64 33 70 36"
            stroke="#05201A"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Cascading Gold Coins on Piggy Back (exact match to Lunar screenshot #4/#8) */}
          <ellipse
            cx="63"
            cy="43"
            rx="8.5"
            ry="5"
            transform="rotate(-12 63 43)"
            fill="#D4AF37"
            stroke="#5C480D"
            strokeWidth="1.3"
          />
          <ellipse
            cx="76"
            cy="45"
            rx="8.5"
            ry="5"
            transform="rotate(8 76 45)"
            fill="#C9A227"
            stroke="#5C480D"
            strokeWidth="1.3"
          />
          <ellipse
            cx="71"
            cy="52"
            rx="9"
            ry="5.5"
            transform="rotate(-6 71 52)"
            fill="#E0BC42"
            stroke="#5C480D"
            strokeWidth="1.3"
          />
          <ellipse
            cx="84"
            cy="55"
            rx="8.5"
            ry="5"
            transform="rotate(15 84 55)"
            fill="#C9A227"
            stroke="#5C480D"
            strokeWidth="1.3"
          />
          <ellipse
            cx="78"
            cy="63"
            rx="8.5"
            ry="5"
            transform="rotate(-8 78 63)"
            fill="#D4AF37"
            stroke="#5C480D"
            strokeWidth="1.3"
          />
        </svg>
      );
  }
};

/**
 * Overlapping 3-circle icon clusters & tilted mini-cards inspired by Lunar's empty states and promo cards.
 */
export const EmptyClusterArtwork: React.FC<{
  variant:
    | 'fixed'
    | 'income'
    | 'savings'
    | 'packages'
    | 'saved'
    | 'receipts'
    | 'notifications';
}> = ({ variant }) => {
  if (variant === 'fixed') {
    // Exact visual inspiration from Lunar Screenshot #2: Pink music note, Green film/media, Purple loop
    return (
      <div className="relative w-24 h-20 mx-auto mb-3 select-none" aria-hidden="true">
        {/* Left Pink Circle */}
        <div className="absolute left-1.5 top-4 w-12 h-12 rounded-full bg-[#FF47B6] text-white flex items-center justify-center shadow-md ring-2 ring-[var(--surface-color)]">
          <MusicNotes size={22} weight="fill" />
        </div>
        {/* Top Right Green Circle */}
        <div className="absolute right-2.5 top-0 w-11 h-11 rounded-full bg-[#1ED739] text-white flex items-center justify-center shadow-md ring-2 ring-[var(--surface-color)] z-10">
          <FilmSlate size={20} weight="fill" />
        </div>
        {/* Bottom Right Purple Circle */}
        <div className="absolute right-2 bottom-1 w-12 h-12 rounded-full bg-[#A855F7] text-white flex items-center justify-center shadow-lg ring-2 ring-[var(--surface-color)] z-20">
          <ArrowsClockwise size={22} weight="bold" />
        </div>
      </div>
    );
  }

  if (variant === 'income') {
    return (
      <div className="relative w-24 h-20 mx-auto mb-3 select-none" aria-hidden="true">
        <div className="absolute left-1.5 top-4 w-12 h-12 rounded-full bg-[#10B981] text-white flex items-center justify-center shadow-md ring-2 ring-[var(--surface-color)]">
          <Coins size={22} weight="fill" />
        </div>
        <div className="absolute right-2.5 top-0 w-11 h-11 rounded-full bg-[#3B82F6] text-white flex items-center justify-center shadow-md ring-2 ring-[var(--surface-color)] z-10">
          <Bank size={19} weight="fill" />
        </div>
        <div className="absolute right-2 bottom-1 w-12 h-12 rounded-full bg-[#F59E0B] text-white flex items-center justify-center shadow-lg ring-2 ring-[var(--surface-color)] z-20">
          <TrendUp size={21} weight="bold" />
        </div>
      </div>
    );
  }

  if (variant === 'packages') {
    return (
      <div className="relative w-24 h-20 mx-auto mb-3 select-none" aria-hidden="true">
        <div className="absolute left-1.5 top-4 w-12 h-12 rounded-full bg-[#F59E0B] text-white flex items-center justify-center shadow-md ring-2 ring-[var(--surface-color)]">
          <Package size={22} weight="fill" />
        </div>
        <div className="absolute right-2.5 top-0 w-11 h-11 rounded-full bg-[#38BDF8] text-white flex items-center justify-center shadow-md ring-2 ring-[var(--surface-color)] z-10">
          <Truck size={19} weight="fill" />
        </div>
        <div className="absolute right-2 bottom-1 w-12 h-12 rounded-full bg-[#EC4899] text-white flex items-center justify-center shadow-lg ring-2 ring-[var(--surface-color)] z-20">
          <Barcode size={21} weight="bold" />
        </div>
      </div>
    );
  }

  if (variant === 'saved') {
    return (
      <div className="relative w-24 h-20 mx-auto mb-3 select-none" aria-hidden="true">
        <div className="absolute left-1.5 top-4 w-12 h-12 rounded-full bg-[#F43F5E] text-white flex items-center justify-center shadow-md ring-2 ring-[var(--surface-color)]">
          <Heart size={22} weight="fill" />
        </div>
        <div className="absolute right-2.5 top-0 w-11 h-11 rounded-full bg-[#8B5CF6] text-white flex items-center justify-center shadow-md ring-2 ring-[var(--surface-color)] z-10">
          <ShoppingBag size={19} weight="fill" />
        </div>
        <div className="absolute right-2 bottom-1 w-12 h-12 rounded-full bg-[#F59E0B] text-white flex items-center justify-center shadow-lg ring-2 ring-[var(--surface-color)] z-20">
          <Sparkle size={20} weight="fill" />
        </div>
      </div>
    );
  }

  if (variant === 'receipts') {
    return (
      <div className="relative w-24 h-20 mx-auto mb-3 select-none" aria-hidden="true">
        <div className="absolute left-1.5 top-4 w-12 h-12 rounded-full bg-[#0EA5E9] text-white flex items-center justify-center shadow-md ring-2 ring-[var(--surface-color)]">
          <Receipt size={22} weight="fill" />
        </div>
        <div className="absolute right-2.5 top-0 w-11 h-11 rounded-full bg-[#10B981] text-white flex items-center justify-center shadow-md ring-2 ring-[var(--surface-color)] z-10">
          <FileText size={19} weight="fill" />
        </div>
        <div className="absolute right-2 bottom-1 w-12 h-12 rounded-full bg-[#6366F1] text-white flex items-center justify-center shadow-lg ring-2 ring-[var(--surface-color)] z-20">
          <Paperclip size={20} weight="bold" />
        </div>
      </div>
    );
  }

  if (variant === 'notifications') {
    return (
      <div className="relative w-24 h-20 mx-auto mb-3 select-none" aria-hidden="true">
        <div className="absolute left-1.5 top-4 w-12 h-12 rounded-full bg-[#6366F1] text-white flex items-center justify-center shadow-md ring-2 ring-[var(--surface-color)]">
          <Bell size={22} weight="fill" />
        </div>
        <div className="absolute right-2.5 top-0 w-11 h-11 rounded-full bg-[#10B981] text-white flex items-center justify-center shadow-md ring-2 ring-[var(--surface-color)] z-10">
          <Check size={19} weight="bold" />
        </div>
        <div className="absolute right-2 bottom-1 w-12 h-12 rounded-full bg-[#EC4899] text-white flex items-center justify-center shadow-lg ring-2 ring-[var(--surface-color)] z-20">
          <Sparkle size={20} weight="fill" />
        </div>
      </div>
    );
  }

  // Default: 'savings' (Speckled ceramic 3D piggy bank with floating mint coins – exact match to Lunar Screenshot #5)
  return (
    <div className="relative w-28 h-24 mx-auto mb-2 select-none" aria-hidden="true">
      <svg viewBox="0 0 120 105" fill="none" className="w-full h-full">
        <defs>
          <radialGradient id="ceramicPigGrad" cx="38%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#F8FAFC" />
            <stop offset="65%" stopColor="#CBD5E1" />
            <stop offset="100%" stopColor="#64748B" />
          </radialGradient>
        </defs>
        {/* Floating coin top */}
        <circle
          cx="62"
          cy="14"
          r="8.5"
          fill="#D1FAE5"
          stroke="#6EE7B7"
          strokeWidth="1.5"
        />
        <text
          x="62"
          y="17.5"
          textAnchor="middle"
          fill="#059669"
          fontSize="9"
          fontWeight="700"
        >
          kr
        </text>
        {/* Floating coin left */}
        <circle
          cx="25"
          cy="34"
          r="8"
          fill="#D1FAE5"
          stroke="#6EE7B7"
          strokeWidth="1.5"
        />
        <text
          x="25"
          y="37"
          textAnchor="middle"
          fill="#059669"
          fontSize="8.5"
          fontWeight="700"
        >
          kr
        </text>
        {/* Floating coin right */}
        <circle
          cx="90"
          cy="56"
          r="9"
          fill="#D1FAE5"
          stroke="#6EE7B7"
          strokeWidth="1.5"
        />
        <text
          x="90"
          y="59.5"
          textAnchor="middle"
          fill="#059669"
          fontSize="9"
          fontWeight="700"
        >
          kr
        </text>

        {/* Ceramic 3D Piggy Legs */}
        <path
          d="M38 74L34 89C34 91 41 92 43 89L47 77"
          fill="url(#ceramicPigGrad)"
        />
        <path
          d="M68 76L71 91C71 93 78 93 79 89L77 74"
          fill="url(#ceramicPigGrad)"
        />
        {/* Ceramic 3D Piggy Body */}
        <ellipse cx="56" cy="56" rx="28" ry="23" fill="url(#ceramicPigGrad)" />
        {/* Snout */}
        <ellipse
          cx="31"
          cy="48"
          rx="7.5"
          ry="9"
          transform="rotate(20 31 48)"
          fill="url(#ceramicPigGrad)"
        />
        {/* Ears */}
        <path d="M44 36L49 24L57 34Z" fill="url(#ceramicPigGrad)" />
        <path d="M62 36L70 26L74 38Z" fill="url(#ceramicPigGrad)" />
        {/* Eye */}
        <circle cx="43" cy="43" r="2.2" fill="#0F172A" />
        {/* Ceramic speckles */}
        <circle cx="54" cy="48" r="1" fill="#2563EB" />
        <circle cx="64" cy="55" r="1.2" fill="#D97706" />
        <circle cx="48" cy="62" r="0.9" fill="#2563EB" />
        <circle cx="71" cy="46" r="1" fill="#10B981" />
        <circle cx="60" cy="68" r="1.1" fill="#2563EB" />
        <circle cx="40" cy="56" r="0.9" fill="#D97706" />
      </svg>
    </div>
  );
};

/**
 * Tilted mini-cards with pink flag badge (Exact match to Lunar Screenshot #6: "Spara till en resa, en pryl eller din nästa stora grej")
 */
export const TiltedGoalsPromoArtwork: React.FC = () => {
  return (
    <div className="relative w-20 h-16 shrink-0 select-none" aria-hidden="true">
      {/* Left tilted card (tech/gadget vibe) */}
      <div className="absolute left-0 top-2 w-11 h-12 rounded-xl bg-gradient-to-br from-slate-200 to-slate-400 dark:from-slate-600 dark:to-slate-800 border border-white/40 shadow-md -rotate-12 overflow-hidden flex flex-col justify-end p-1.5">
        <div className="w-6 h-1.5 rounded-full bg-teal-600/80 mb-1" />
        <div className="w-full h-3 rounded bg-slate-900/30" />
      </div>
      {/* Right tilted card (beach/sky travel vibe) */}
      <div className="absolute right-2 top-1 w-11 h-12 rounded-xl bg-gradient-to-b from-[#0284C7] via-[#38BDF8] to-[#FDE68A] border border-white/40 shadow-md rotate-12 overflow-hidden">
        <div className="w-4 h-2 rounded-full bg-white/80 mt-1.5 ml-1.5" />
        <div className="w-5 h-1.5 rounded-full bg-white/60 mt-1 ml-4" />
      </div>
      {/* Pink Flag Badge */}
      <div className="absolute right-0 bottom-0 w-7 h-7 rounded-full bg-[#DB2777] text-white flex items-center justify-center shadow-md ring-2 ring-[var(--surface-color)] z-10">
        <Flag size={13} weight="fill" />
      </div>
    </div>
  );
};
