import React from 'react';
import {
  ShoppingCart,
  ForkKnife,
  Coffee,
  Car,
  ShoppingBag,
  FilmSlate,
  House,
  Heartbeat,
  Barbell,
  ShieldCheck,
  Broadcast,
  DeviceMobile,
  Tag,
  Coins,
  Money,
  Wallet,
  Briefcase,
  Gift,
  HandCoins,
  ArrowsLeftRight,
  Receipt,
  PiggyBank,
  TrendUp,
  Airplane,
  Sparkle,
  GraduationCap,
  Baby,
  PawPrint,
  Wrench
} from '@phosphor-icons/react';
import { getCategoryColor } from '../utils/categoryColors';

export const AVAILABLE_CATEGORY_ICONS = [
  { id: 'cart', label: 'Mat & Dagligvaror', icon: ShoppingCart },
  { id: 'fork-knife', label: 'Restaurang', icon: ForkKnife },
  { id: 'coffee', label: 'Café & Fika', icon: Coffee },
  { id: 'car', label: 'Transport & Bil', icon: Car },
  { id: 'shopping-bag', label: 'Shopping', icon: ShoppingBag },
  { id: 'film', label: 'Nöje & Film', icon: FilmSlate },
  { id: 'house', label: 'Boende & Hem', icon: House },
  { id: 'heart', label: 'Hälsa', icon: Heartbeat },
  { id: 'barbell', label: 'Träning', icon: Barbell },
  { id: 'shield', label: 'Försäkring', icon: ShieldCheck },
  { id: 'broadcast', label: 'Abonnemang', icon: Broadcast },
  { id: 'phone', label: 'Mobil & Teknik', icon: DeviceMobile },
  { id: 'coins', label: 'Lön & Inkomst', icon: Coins },
  { id: 'money', label: 'Pengar', icon: Money },
  { id: 'wallet', label: 'Plånbok', icon: Wallet },
  { id: 'briefcase', label: 'Arbete & Frilans', icon: Briefcase },
  { id: 'gift', label: 'Bidrag & Gåvor', icon: Gift },
  { id: 'hand-coins', label: 'Ersättning', icon: HandCoins },
  { id: 'transfer', label: 'Swish & Överföring', icon: ArrowsLeftRight },
  { id: 'receipt', label: 'Räkning & Faktura', icon: Receipt },
  { id: 'piggy-bank', label: 'Sparande', icon: PiggyBank },
  { id: 'trend-up', label: 'Investering', icon: TrendUp },
  { id: 'plane', label: 'Resor', icon: Airplane },
  { id: 'sparkle', label: 'Skönhet', icon: Sparkle },
  { id: 'graduation-cap', label: 'Utbildning & CSN', icon: GraduationCap },
  { id: 'baby', label: 'Barn & Familj', icon: Baby },
  { id: 'paw', label: 'Husdjur', icon: PawPrint },
  { id: 'wrench', label: 'Reparation & Verktyg', icon: Wrench },
  { id: 'tag', label: 'Övrigt', icon: Tag },
];

export function resolveCategoryIconComponent(
  categoryName?: string | null,
  iconId?: string | null
): React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties; weight?: any }> {
  // 1. Direct match by icon id
  if (iconId) {
    const idLower = iconId.toLowerCase().trim();
    const found = AVAILABLE_CATEGORY_ICONS.find(
      (item) => item.id.toLowerCase() === idLower || item.label.toLowerCase().includes(idLower)
    );
    if (found) return found.icon;

    // Legacy / semantic icon aliases from constants
    if (idLower.includes('ingredient') || idLower.includes('cart') || idLower.includes('mat')) return ShoppingCart;
    if (idLower.includes('restaurant') || idLower.includes('fork') || idLower.includes('food')) return ForkKnife;
    if (idLower.includes('coffee') || idLower.includes('fika')) return Coffee;
    if (idLower.includes('car') || idLower.includes('transport')) return Car;
    if (idLower.includes('shopping') || idLower.includes('bag')) return ShoppingBag;
    if (idLower.includes('theatre') || idLower.includes('film') || idLower.includes('noje')) return FilmSlate;
    if (idLower.includes('home') || idLower.includes('house') || idLower.includes('boende')) return House;
    if (idLower.includes('heart') || idLower.includes('halsa')) return Heartbeat;
    if (idLower.includes('shield') || idLower.includes('forsakring')) return ShieldCheck;
    if (idLower.includes('phone') || idLower.includes('smartphone') || idLower.includes('abonnemang')) return Broadcast;
    if (idLower.includes('money') || idLower.includes('lon') || idLower.includes('income')) return Coins;
    if (idLower.includes('briefcase') || idLower.includes('frilans')) return Briefcase;
    if (idLower.includes('gift') || idLower.includes('bidrag')) return Gift;
    if (idLower.includes('card') || idLower.includes('swish')) return ArrowsLeftRight;
    if (idLower.includes('receipt') || idLower.includes('rakning')) return Receipt;
    if (idLower.includes('piggy') || idLower.includes('sparande')) return PiggyBank;
  }

  // 2. Semantic matching based on category name
  const cat = (categoryName || '').toLowerCase().trim();

  if (cat.includes('mat') || cat.includes('dagligvaror') || cat.includes('livsmedel') || cat.includes('ica') || cat.includes('coop')) {
    return ShoppingCart;
  }
  if (cat.includes('restaurang') || cat.includes('café') || cat.includes('cafe') || cat.includes('fika') || cat.includes('lunch') || cat.includes('middag')) {
    return ForkKnife;
  }
  if (cat.includes('transport') || cat.includes('bil') || cat.includes('bensin') || cat.includes('parkering') || cat.includes('drivmedel') || cat.includes('pendling')) {
    return Car;
  }
  if (cat.includes('shopping') || cat.includes('kläder') || cat.includes('mode') || cat.includes('skor') || cat.includes('hem')) {
    return ShoppingBag;
  }
  if (cat.includes('nöje') || cat.includes('noje') || cat.includes('fritid') || cat.includes('underhållning') || cat.includes('spel') || cat.includes('bio')) {
    return FilmSlate;
  }
  if (cat.includes('boende') || cat.includes('hyra') || cat.includes('hushåll') || cat.includes('hushall') || cat.includes('el') || cat.includes('hemmet')) {
    return House;
  }
  if (cat.includes('träning') || cat.includes('traning') || cat.includes('gym') || cat.includes('fitness')) {
    return Barbell;
  }
  if (cat.includes('hälsa') || cat.includes('halsa') || cat.includes('apotek') || cat.includes('tandläkare') || cat.includes('läkare')) {
    return Heartbeat;
  }
  if (cat.includes('försäkring') || cat.includes('forsakring') || cat.includes('trygghet')) {
    return ShieldCheck;
  }
  if (cat.includes('abonnemang') || cat.includes('bredband') || cat.includes('telefoni') || cat.includes('mobil') || cat.includes('streaming')) {
    return Broadcast;
  }
  if (cat.includes('lön') || cat.includes('lon') || cat.includes('löne') || cat.includes('salary')) {
    return Coins;
  }
  if (cat.includes('extra') || cat.includes('frilans') || cat.includes('konsult') || cat.includes('arbete') || cat.includes('jobb')) {
    return Briefcase;
  }
  if (cat.includes('bidrag') || cat.includes('ersättning') || cat.includes('ersattning') || cat.includes('gåva') || cat.includes('gava')) {
    return Gift;
  }
  if (cat.includes('swish') || cat.includes('överföring') || cat.includes('overforing')) {
    return ArrowsLeftRight;
  }
  if (cat.includes('räkning') || cat.includes('rakning') || cat.includes('faktura') || cat.includes('avgift')) {
    return Receipt;
  }
  if (cat.includes('sparande') || cat.includes('spar') || cat.includes('spara') || cat.includes('buffert')) {
    return PiggyBank;
  }
  if (cat.includes('investering') || cat.includes('aktier') || cat.includes('fonder') || cat.includes('avkastning')) {
    return TrendUp;
  }
  if (cat.includes('resa') || cat.includes('semester') || cat.includes('flyg') || cat.includes('hotell')) {
    return Airplane;
  }
  if (cat.includes('skönhet') || cat.includes('skonhet') || cat.includes('frisör') || cat.includes('frisor')) {
    return Sparkle;
  }
  if (cat.includes('csn') || cat.includes('studier') || cat.includes('utbildning') || cat.includes('kurs')) {
    return GraduationCap;
  }
  if (cat.includes('barn') || cat.includes('familj') || cat.includes('skola')) {
    return Baby;
  }
  if (cat.includes('husdjur') || cat.includes('hund') || cat.includes('katt') || cat.includes('veterinär')) {
    return PawPrint;
  }

  return Tag;
}

interface CategoryIconProps {
  category?: string;
  iconId?: string;
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
  badge?: boolean;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  category,
  iconId,
  size = 13,
  color: explicitColor,
  className = '',
  style = {},
  badge = false,
}) => {
  const IconComponent = resolveCategoryIconComponent(category, iconId);
  const resolvedColor = explicitColor || getCategoryColor(category);

  if (badge) {
    return (
      <div
        className={`rounded-lg flex items-center justify-center shrink-0 ${className}`}
        style={{
          width: size * 2.2,
          height: size * 2.2,
          backgroundColor: `${resolvedColor}18`,
          color: resolvedColor,
          ...style,
        }}
      >
        <IconComponent size={size} weight="bold" />
      </div>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{
        color: resolvedColor,
        ...style,
      }}
    >
      <IconComponent size={size} weight="bold" />
    </span>
  );
};
