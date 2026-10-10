import React from 'react';
import {
  House,
  ClockCounterClockwise,
  ChartBar,
  Wallet,
  Plus,
  Check,
  Sun,
  Moon,
  Desktop,
  Calendar,
  Clock,
  CaretRight,
  CaretDown,
  CaretLeft,
  ArrowCounterClockwise,
  Bell,
  Receipt,
  Globe,
  Palette,
  Coins,
  Prohibit,
  Tag,
  ChartPie,
  CreditCard,
  X,
  Spinner,
  PaperPlaneTilt,
  Chat,
  Bug,
  Lightbulb,
  Handshake,
  PencilSimple,
  Repeat,
  Paperclip,
  FileText,
  Trash,
  ArrowDownLeft,
  PiggyBank,
  ArrowsDownUp,
  Cookie,
  CheckCircle,
  WarningCircle,
  Warning,
  Info,
  User,
  ArrowRight,
  MagnifyingGlass,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  Camera,
  Backspace,
  Target,
  Shield,
  ArrowLeft,
  Copy,
  Lightning,
  ArrowClockwise,
  Envelope,
  SignOut,
  LinkBreak,
  EnvelopeOpen,
  ShoppingBag,
  Fingerprint,
  Eye,
  ChatCentered,
  CameraRotate,
  LightningSlash,
  Image,
  Users,
  UserCheck,
  DeviceMobile,
  BookOpen,
  Crown,
  EyeSlash,
  HandCoins,
  Star,
  Download,
  ShareNetwork,
  PlusSquare,
  DotsThreeVertical,
  ArrowUp,
  Divide,
  Minus,
  Percent,
  Equals,
  Layout,
  UsersThree,
  DotsThree,
  Sparkle,
  Key,
  CircleHalf,
  CalendarCheck,
  Funnel,
  SlidersHorizontal
} from '@phosphor-icons/react';

export type IconName =
  | 'house'
  | 'home'
  | 'clock-counter-clockwise'
  | 'chart-bar'
  | 'wallet'
  | 'plus'
  | 'check'
  | 'sun'
  | 'moon'
  | 'desktop'
  | 'monitor'
  | 'calendar'
  | 'clock'
  | 'caret-right'
  | 'chevron-right'
  | 'caret-down'
  | 'chevron-down'
  | 'caret-left'
  | 'chevron-left'
  | 'arrow-counter-clockwise'
  | 'rotate-ccw'
  | 'bell'
  | 'receipt'
  | 'globe'
  | 'palette'
  | 'coins'
  | 'prohibit'
  | 'ban'
  | 'tag'
  | 'chart-pie'
  | 'pie-chart'
  | 'credit-card'
  | 'x'
  | 'spinner'
  | 'loader-2'
  | 'paper-plane-tilt'
  | 'send'
  | 'chat-bubble'
  | 'message-square'
  | 'bug'
  | 'lightbulb'
  | 'handshake'
  | 'heart-handshake'
  | 'pencil'
  | 'edit'
  | 'edit-3'
  | 'arrows-repeat'
  | 'repeat'
  | 'paperclip'
  | 'file-text'
  | 'trash'
  | 'trash-2'
  | 'arrow-down-left'
  | 'piggy-bank'
  | 'arrows-down-up'
  | 'arrow-up-down'
  | 'cookie'
  | 'check-circle'
  | 'check-circle-2'
  | 'warning-circle'
  | 'alert-circle'
  | 'warning'
  | 'info'
  | 'user'
  | 'arrow-right'
  | 'magnifying-glass'
  | 'search'
  | 'arrow-down-right'
  | 'arrow-up-right'
  | 'shield-check'
  | 'camera'
  | 'backspace'
  | 'delete'
  | 'target'
  | 'shield'
  | 'arrow-left'
  | 'copy'
  | 'lightning'
  | 'zap'
  | 'arrow-clockwise'
  | 'rotate-cw'
  | 'envelope'
  | 'mail'
  | 'sign-out'
  | 'log-out'
  | 'link-break'
  | 'unlink'
  | 'envelope-simple-open'
  | 'mail-check'
  | 'shopping-bag'
  | 'fingerprint'
  | 'eye'
  | 'chat-centered-heart'
  | 'message-heart'
  | 'camera-rotate'
  | 'switch-camera'
  | 'lightning-slash'
  | 'zap-off'
  | 'image'
  | 'users'
  | 'users-2'
  | 'user-check'
  | 'smartphone'
  | 'book-open'
  | 'crown'
  | 'eye-slash'
  | 'eye-off'
  | 'history'
  | 'hand-coins'
  | 'star'
  | 'download'
  | 'share-network'
  | 'share'
  | 'plus-square'
  | 'dots-three-vertical'
  | 'more-vertical'
  | 'arrow-up'
  | 'divide'
  | 'minus'
  | 'percent'
  | 'equals'
  | 'layout'
  | 'layout-grid'
  | 'users-three'
  | 'dots-three'
  | 'more-horizontal'
  | 'sparkles'
  | 'sparkle'
  | 'key'
  | 'circle-half'
  | 'calendar-check'
  | 'filter'
  | 'sliders'
  | 'sliders-horizontal';

export interface IconProps extends React.ComponentPropsWithoutRef<'svg'> {
  name: IconName;
  size?: number | string;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
  color?: string;
  className?: string;
}

const iconMap: Record<IconName, React.ComponentType<any>> = {
  house: House,
  home: House,
  'clock-counter-clockwise': ClockCounterClockwise,
  'chart-bar': ChartBar,
  wallet: Wallet,
  plus: Plus,
  check: Check,
  sun: Sun,
  moon: Moon,
  desktop: Desktop,
  monitor: Desktop,
  calendar: Calendar,
  clock: Clock,
  'caret-right': CaretRight,
  'chevron-right': CaretRight,
  'caret-down': CaretDown,
  'chevron-down': CaretDown,
  'caret-left': CaretLeft,
  'chevron-left': CaretLeft,
  'arrow-counter-clockwise': ArrowCounterClockwise,
  'rotate-ccw': ArrowCounterClockwise,
  bell: Bell,
  receipt: Receipt,
  globe: Globe,
  palette: Palette,
  coins: Coins,
  prohibit: Prohibit,
  ban: Prohibit,
  tag: Tag,
  'chart-pie': ChartPie,
  'pie-chart': ChartPie,
  'credit-card': CreditCard,
  x: X,
  spinner: Spinner,
  'loader-2': Spinner,
  'paper-plane-tilt': PaperPlaneTilt,
  send: PaperPlaneTilt,
  'chat-bubble': Chat,
  'message-square': Chat,
  bug: Bug,
  lightbulb: Lightbulb,
  handshake: Handshake,
  'heart-handshake': Handshake,
  pencil: PencilSimple,
  edit: PencilSimple,
  'edit-3': PencilSimple,
  'arrows-repeat': Repeat,
  repeat: Repeat,
  paperclip: Paperclip,
  'file-text': FileText,
  trash: Trash,
  'trash-2': Trash,
  'arrow-down-left': ArrowDownLeft,
  'piggy-bank': PiggyBank,
  'arrows-down-up': ArrowsDownUp,
  'arrow-up-down': ArrowsDownUp,
  cookie: Cookie,
  'check-circle': CheckCircle,
  'check-circle-2': CheckCircle,
  'warning-circle': WarningCircle,
  'alert-circle': WarningCircle,
  warning: Warning,
  info: Info,
  user: User,
  'arrow-right': ArrowRight,
  'magnifying-glass': MagnifyingGlass,
  search: MagnifyingGlass,
  'arrow-down-right': ArrowDownRight,
  'arrow-up-right': ArrowUpRight,
  'shield-check': ShieldCheck,
  camera: Camera,
  backspace: Backspace,
  delete: Backspace,
  target: Target,
  shield: Shield,
  'arrow-left': ArrowLeft,
  copy: Copy,
  lightning: Lightning,
  zap: Lightning,
  'arrow-clockwise': ArrowClockwise,
  'rotate-cw': ArrowClockwise,
  envelope: Envelope,
  mail: Envelope,
  'sign-out': SignOut,
  'log-out': SignOut,
  'link-break': LinkBreak,
  unlink: LinkBreak,
  'envelope-simple-open': EnvelopeOpen,
  'mail-check': EnvelopeOpen,
  'shopping-bag': ShoppingBag,
  fingerprint: Fingerprint,
  eye: Eye,
  'chat-centered-heart': ChatCentered,
  'message-heart': ChatCentered,
  'camera-rotate': CameraRotate,
  'switch-camera': CameraRotate,
  'lightning-slash': LightningSlash,
  'zap-off': LightningSlash,
  image: Image,
  users: Users,
  'users-2': Users,
  'user-check': UserCheck,
  smartphone: DeviceMobile,
  'book-open': BookOpen,
  crown: Crown,
  'eye-slash': EyeSlash,
  'eye-off': EyeSlash,
  history: ClockCounterClockwise,
  'hand-coins': HandCoins,
  star: Star,
  download: Download,
  'share-network': ShareNetwork,
  share: ShareNetwork,
  'plus-square': PlusSquare,
  'dots-three-vertical': DotsThreeVertical,
  'more-vertical': DotsThreeVertical,
  'arrow-up': ArrowUp,
  divide: Divide,
  minus: Minus,
  percent: Percent,
  equals: Equals,
  layout: Layout,
  'layout-grid': Layout,
  'users-three': UsersThree,
  'dots-three': DotsThree,
  'more-horizontal': DotsThree,
  sparkles: Sparkle,
  sparkle: Sparkle,
  key: Key,
  'circle-half': CircleHalf,
  'calendar-check': CalendarCheck,
  filter: Funnel,
  sliders: SlidersHorizontal,
  'sliders-horizontal': SlidersHorizontal,
};

export function Icon({
  name,
  size = 20,
  weight = 'regular',
  color = 'currentColor',
  className = '',
  ...props
}: IconProps) {
  const IconComponent = iconMap[name];
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in central Icon component.`);
    return null;
  }
  return (
    <IconComponent
      size={size}
      weight={weight}
      color={color}
      className={className}
      {...props}
    />
  );
}
