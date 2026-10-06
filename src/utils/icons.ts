import { 
  // Base & Finance
  Wallet, 
  Home, 
  Car, 
  Zap, 
  Smartphone, 
  Wifi, 
  Tv, 
  ShoppingBag, 
  Utensils, 
  Heart, 
  Dumbbell, 
  Plane, 
  Gift, 
  Coffee, 
  Music, 
  Gamepad2, 
  ShieldCheck, 
  GraduationCap, 
  Briefcase, 
  TrendingUp, 
  TrendingDown,
  PiggyBank, 
  Coins, 
  Banknote,
  CreditCard,
  Receipt,
  CarFront,
  Bus,
  Train,
  Stethoscope,
  Baby,
  Dog,
  Camera,
  Book,
  Globe,
  Star,
  HeartPulse,
  Flame,
  Droplets,
  Lightbulb,
  Hammer,
  Wrench,
  Trash2,
  Package,
  Truck,
  ShoppingCart,
  Store,
  Pizza,
  IceCream,
  Beer,
  Wine,
  Apple,
  Banana,
  Carrot,
  Egg,
  Fish,
  Beef,
  Cake,
  Cookie,
  Cloud,
  Sun,
  Moon,
  Wind,
  Umbrella,
  Scissors,
  Brush,
  PenTool,
  Map,
  Navigation,
  Flag,
  Trophy,
  Medal,
  Target,
  Rocket,
  Key,
  Lock,
  Bell,
  Mail,
  Phone,
  PhoneCall,
  MessageSquare,
  User,
  Users,
  UserCheck,
  Smile,
  Frown,
  Meh,
  Eye,
  Search,
  Settings,
  MoreHorizontal,
  RotateCcw,
  ArrowUpDown,
  DollarSign,
  Euro,
  // Food & Drink
  Sandwich,
  CupSoda,
  Croissant,
  Soup,
  Salad,
  Citrus,
  Candy,
  Popcorn,
  UtensilsCrossed,
  Cherry,
  Drumstick,
  GlassWater,
  Donut,
  ChefHat,
  Martini,
  Milk,
  Wheat,
  // Transport
  Fuel,
  Bike,
  Ship,
  Anchor,
  CarTaxiFront,
  BusFront,
  TrainFront,
  TramFront,
  CableCar,
  Gauge,
  PlaneLanding,
  PlaneTakeoff,
  Sailboat,
  ParkingSquare,
  // Home & Living
  Building,
  Building2,
  Warehouse,
  Bed,
  BedDouble,
  Bath,
  Armchair,
  Sofa,
  Lamp,
  LampDesk,
  PaintBucket,
  DoorClosed,
  Power,
  Drill,
  Construction,
  HardHat,
  WashingMachine,
  Fan,
  AirVent,
  ShowerHead,
  // Shopping & Apparel
  ShoppingBasket,
  Shirt,
  Watch,
  Gem,
  Footprints,
  Glasses,
  Tag,
  Tags,
  Percent,
  BadgePercent,
  WalletCards,
  // Entertainment, Sports & Leisure
  Film,
  Clapperboard,
  Ticket,
  Dice5,
  Radio,
  Headphones,
  Mic,
  Speaker,
  Volume2,
  Palette,
  Guitar,
  Piano,
  Drama,
  Award,
  Crown,
  Sparkles,
  SmilePlus,
  PartyPopper,
  // Health & Care
  Activity,
  Cross,
  Pill,
  Syringe,
  HeartHandshake,
  Shield,
  Thermometer,
  // Finance & Banking
  ReceiptText,
  ReceiptCent,
  Landmark,
  CircleDollarSign,
  BadgeDollarSign,
  Vault,
  Scale,
  // Technology
  Laptop,
  Monitor,
  Tablet,
  Server,
  Cpu,
  HardDrive,
  Battery,
  BatteryCharging,
  Printer,
  Bot,
  QrCode,
  KeyRound,
  Router,
  // Nature & Pets
  PawPrint,
  Cat,
  Bird,
  Bug,
  Palmtree,
  Trees,
  TreePine,
  Sprout,
  Flower,
  Flower2,
  Leaf,
  Clover,
  FishSymbol,
  Mountain,
  MountainSnow,
  Tent,
  Compass,
  Snowflake,
  CloudRain,
  Sunset,
  Sunrise,
  Hotel,
  Luggage,
  BaggageClaim,
  MapPin,
  // Work & School
  School,
  Library,
  Bookmark,
  Backpack,
  Calculator,
  Pencil,
  Paperclip,
  FileText,
  Folder,
  Presentation,
  Milestone,
  Blocks,
  Newspaper,
  Megaphone,
  Send,
  Check,
  X,
  HelpCircle
} from 'lucide-react';

export const isEmojiString = (val: string | undefined | null): boolean => {
  if (!val) return false;
  return val.length <= 10 && /\p{Emoji}/u.test(val) && !val.startsWith('http');
};

/**
 * Complete mapping from emoji characters to unified Lucide icon keys.
 * This guarantees that even legacy data or emoji shortcuts are displayed in the app's clean Lucide icon design.
 */
export const EMOJI_TO_LUCIDE_MAP: Record<string, string> = {
  // Mat & Dryck
  '🍕': 'pizza',
  '🍔': 'sandwich',
  '🍟': 'sandwich',
  '🌭': 'sandwich',
  '🥪': 'sandwich',
  '🌮': 'utensils',
  '🌯': 'utensils',
  '🥗': 'salad',
  '🍝': 'utensils',
  '🍜': 'soup',
  '🍲': 'soup',
  '🍛': 'utensils',
  '🍣': 'fish',
  '🍱': 'utensils',
  '🥟': 'utensils',
  '🍤': 'fish',
  '🍙': 'utensils',
  '🍚': 'wheat',
  '🥩': 'beef',
  '🍗': 'drumstick',
  '🍖': 'drumstick',
  '🥐': 'croissant',
  '🥖': 'croissant',
  '🍞': 'croissant',
  '🥨': 'croissant',
  '🥯': 'donut',
  '🥞': 'cake',
  '🧇': 'cake',
  '🍳': 'egg',
  '🥚': 'egg',
  '🧀': 'utensils',
  '🥓': 'beef',
  '☕': 'coffee',
  '🍵': 'coffee',
  '🧃': 'cupsoda',
  '🥤': 'cupsoda',
  '🧋': 'cupsoda',
  '🥛': 'milk',
  '🍼': 'baby',
  '🍺': 'beer',
  '🍻': 'beer',
  '🍷': 'wine',
  '🍸': 'martini',
  '🍹': 'martini',
  '🍾': 'wine',
  '🍶': 'wine',
  '🍦': 'icecream',
  '🍧': 'icecream',
  '🍨': 'icecream',
  '🍩': 'donut',
  '🍪': 'cookie',
  '🎂': 'cake',
  '🍰': 'cake',
  '🧁': 'cake',
  '🍫': 'candy',
  '🍬': 'candy',
  '🍭': 'candy',
  '🍿': 'popcorn',
  '🍎': 'apple',
  '🍏': 'apple',
  '🍌': 'banana',
  '🍒': 'cherry',
  '🍓': 'cherry',
  '🍊': 'citrus',
  '🍋': 'citrus',
  '🍇': 'wine',
  '🍉': 'citrus',
  '🥑': 'salad',
  '🥕': 'carrot',
  '🌽': 'wheat',
  '🥦': 'salad',
  '🧅': 'salad',
  '🧄': 'salad',
  '🍄': 'trees',

  // Transport
  '🚗': 'car',
  '🚘': 'carfront',
  '🚙': 'car',
  '🏎️': 'carfront',
  '🏎': 'carfront',
  '🚕': 'cartaxifront',
  '🚖': 'cartaxifront',
  '🚌': 'bus',
  '🚍': 'busfront',
  '🚎': 'bus',
  '🚐': 'busfront',
  '🚑': 'cross',
  '🚒': 'flame',
  '🚓': 'shield',
  '🚆': 'train',
  '🚅': 'trainfront',
  '🚄': 'trainfront',
  '🚈': 'trainfront',
  '🚂': 'train',
  '🚇': 'trainfront',
  '🚊': 'tramfront',
  '🚋': 'tramfront',
  '🚝': 'train',
  '🚞': 'train',
  '🚡': 'cablecar',
  '🚠': 'cablecar',
  '🚟': 'cablecar',
  '🚲': 'bike',
  '🚴': 'bike',
  '🚴‍♂️': 'bike',
  '🚴‍♀️': 'bike',
  '🛵': 'bike',
  '🏍️': 'bike',
  '🏍': 'bike',
  '🛴': 'bike',
  '⛽': 'fuel',
  '⚓': 'anchor',
  '⛵': 'sailboat',
  '🚢': 'ship',
  '⛴️': 'ship',
  '⛴': 'ship',
  '🛥️': 'ship',
  '🛥': 'ship',
  '✈️': 'plane',
  '✈': 'plane',
  '🛫': 'planetakeoff',
  '🛬': 'planelanding',
  '🛩️': 'plane',
  '🛩': 'plane',
  '🚁': 'plane',
  '🚀': 'rocket',
  '🗺️': 'map',
  '🗺': 'map',
  '🧭': 'compass',
  '🅿️': 'parkingsquare',
  '🅿': 'parkingsquare',

  // Hem & Boende
  '🏠': 'home',
  '🏡': 'home',
  '🏢': 'building',
  '🏬': 'building2',
  '🏣': 'building',
  '🏤': 'building',
  '🏥': 'cross',
  '🏦': 'landmark',
  '🏨': 'hotel',
  '🏪': 'store',
  '🏫': 'school',
  '🏛️': 'landmark',
  '🏛': 'landmark',
  '⛪': 'cross',
  '🕌': 'landmark',
  '🛏️': 'bed',
  '🛏': 'bed',
  '🛋️': 'sofa',
  '🛋': 'sofa',
  '🚪': 'doorclosed',
  '🚿': 'showerhead',
  '🛁': 'bath',
  '🚽': 'bath',
  '🧹': 'washingmachine',
  '🧺': 'washingmachine',
  '🧼': 'droplets',
  '🧽': 'droplets',
  '🪣': 'paintbucket',
  '🔑': 'key',
  '🗝️': 'keyround',
  '🗝': 'keyround',
  '🔒': 'lock',
  '🔓': 'lock',
  '💡': 'lightbulb',
  '🔦': 'lightbulb',
  '🕯️': 'flame',
  '🕯': 'flame',
  '🔌': 'power',
  '🔋': 'battery',
  '🔨': 'hammer',
  '🛠️': 'wrench',
  '🛠': 'wrench',
  '🔧': 'wrench',
  '🪛': 'wrench',
  '🪚': 'hammer',
  '🧰': 'wrench',
  '⚙️': 'settings',
  '⚙': 'settings',
  '🧱': 'construction',
  '🏗️': 'construction',
  '🏗': 'construction',
  '🪵': 'trees',
  '🗑️': 'trash',
  '🗑': 'trash',

  // Shopping & Mode
  '🛍️': 'shopping',
  '🛍': 'shopping',
  '🛒': 'shoppingcart',
  '🏷️': 'tag',
  '🏷': 'tag',
  '👕': 'shirt',
  '👔': 'shirt',
  '👗': 'shirt',
  '👘': 'shirt',
  '🥻': 'shirt',
  '🩱': 'shirt',
  '👙': 'shirt',
  '🩳': 'shirt',
  '👖': 'shirt',
  '🧥': 'shirt',
  '🥼': 'shirt',
  '🦺': 'hardhat',
  '👞': 'footprints',
  '👟': 'footprints',
  '👠': 'footprints',
  '👡': 'footprints',
  '🩰': 'footprints',
  '👢': 'footprints',
  '🥾': 'footprints',
  '🩴': 'footprints',
  '🧦': 'footprints',
  '🧤': 'shirt',
  '🧣': 'shirt',
  '🎩': 'crown',
  '🧢': 'backpack',
  '👒': 'umbrella',
  '👑': 'crown',
  '💍': 'gem',
  '💎': 'gem',
  '💄': 'brush',
  '💅': 'scissors',
  '💇': 'scissors',
  '💇‍♂️': 'scissors',
  '💇‍♀️': 'scissors',
  '👓': 'glasses',
  '🕶️': 'glasses',
  '🕶': 'glasses',
  '🥽': 'glasses',
  '🎒': 'backpack',
  '👜': 'shopping',
  '👛': 'wallet',
  '👝': 'walletcards',
  '💼': 'work',
  '🧳': 'luggage',
  '🎁': 'gift',
  '📦': 'package',
  '📮': 'send',
  '✉️': 'mail',
  '✉': 'mail',

  // Nöje & Fritid
  '🎭': 'drama',
  '🎨': 'palette',
  '🎬': 'film',
  '🎤': 'mic',
  '🎧': 'headphones',
  '🎼': 'music',
  '🎵': 'music',
  '🎶': 'music',
  '🎹': 'piano',
  '🥁': 'music',
  '🎷': 'music',
  '🎺': 'music',
  '🎸': 'guitar',
  '🪕': 'guitar',
  '🎻': 'guitar',
  '🎲': 'dice5',
  '🎯': 'target',
  '🎳': 'target',
  '🎮': 'gamepad',
  '🕹️': 'gamepad',
  '🕹': 'gamepad',
  '🎰': 'coins',
  '🧩': 'blocks',
  '🧸': 'blocks',
  '🪅': 'partypopper',
  '🪄': 'sparkles',
  '🔮': 'sparkles',
  '🎟️': 'ticket',
  '🎟': 'ticket',
  '🎫': 'ticket',
  '🎪': 'drama',
  '🎡': 'camera',
  '🎢': 'camera',
  '🎠': 'camera',
  '🎉': 'partypopper',
  '🎊': 'partypopper',
  '🎈': 'partypopper',
  '🎆': 'sparkles',
  '🎇': 'sparkles',
  '✨': 'sparkles',
  '⭐': 'star',
  '🌟': 'star',

  // Träning & Sport
  '🏋️': 'dumbbell',
  '🏋': 'dumbbell',
  '🏋️‍♂️': 'dumbbell',
  '🏋️‍♀️': 'dumbbell',
  '🤸': 'activity',
  '🤸‍♂️': 'activity',
  '🤸‍♀️': 'activity',
  '🧘': 'heart',
  '🧘‍♂️': 'heart',
  '🧘‍♀️': 'heart',
  '🏃': 'footprints',
  '🏃‍♂️': 'footprints',
  '🏃‍♀️': 'footprints',
  '🚶': 'footprints',
  '🚶‍♂️': 'footprints',
  '🚶‍♀️': 'footprints',
  '🏊': 'droplets',
  '🏊‍♂️': 'droplets',
  '🏊‍♀️': 'droplets',
  '⚽': 'trophy',
  '🏀': 'trophy',
  '🏈': 'trophy',
  '⚾': 'trophy',
  '🥎': 'trophy',
  '🎾': 'trophy',
  '🏐': 'trophy',
  '🏉': 'trophy',
  '🥏': 'target',
  '🎱': 'target',
  '🏓': 'trophy',
  '🏸': 'trophy',
  '🏒': 'trophy',
  '🏑': 'trophy',
  '🏏': 'trophy',
  '⛳': 'flag',
  '🥊': 'dumbbell',
  '🥋': 'dumbbell',
  '🎽': 'shirt',
  '🛹': 'bike',
  '🛼': 'footprints',
  '🛷': 'mountainsnow',
  '⛸️': 'mountainsnow',
  '⛸': 'mountainsnow',
  '🎿': 'mountainsnow',
  '🏆': 'trophy',
  '🥇': 'medal',
  '🥈': 'medal',
  '🥉': 'medal',
  '🏅': 'medal',
  '🎖️': 'medal',
  '🎖': 'medal',

  // Hälsa & Vård
  '🩺': 'health',
  '💊': 'pill',
  '💉': 'syringe',
  '🩸': 'droplets',
  '🩹': 'activity',
  '🧬': 'activity',
  '🔬': 'search',
  '🔭': 'eye',
  '🌡️': 'thermometer',
  '🌡': 'thermometer',
  '🦷': 'smile',
  '🩻': 'activity',
  '🦯': 'user',
  '🦽': 'user',
  '🦼': 'user',
  '🦻': 'headphones',
  '❤️': 'heart',
  '❤': 'heart',
  '🧡': 'heart',
  '💛': 'heart',
  '💚': 'heart',
  '💙': 'heart',
  '💜': 'heart',
  '🤎': 'heart',
  '🖤': 'heart',
  '🤍': 'heart',
  '💔': 'heart',
  '❣️': 'heart',
  '💕': 'heart',
  '💞': 'heart',
  '💓': 'heartpulse',
  '💗': 'heart',
  '💖': 'sparkles',
  '💘': 'target',
  '💝': 'gift',

  // Ekonomi & Finans
  '💰': 'banknote',
  '🪙': 'coins',
  '💵': 'banknote',
  '💴': 'banknote',
  '💶': 'euro',
  '💷': 'banknote',
  '💸': 'arrowdownup',
  '💳': 'creditcard',
  '🧾': 'receipt',
  '💹': 'trending',
  '📈': 'trending',
  '📉': 'trendingdown',
  '💲': 'dollarsign',
  '🐖': 'savings',
  '🏧': 'banknote',
  '⚖️': 'scale',
  '⚖': 'scale',
  '📥': 'wallet',
  '📤': 'send',

  // Teknik & Media
  '📱': 'smartphone',
  '📲': 'smartphone',
  '📞': 'phone',
  '☎️': 'phone',
  '☎': 'phone',
  '📟': 'phone',
  '📠': 'printer',
  '🪫': 'battery',
  '💻': 'laptop',
  '🖥️': 'monitor',
  '🖥': 'monitor',
  '🖨️': 'printer',
  '🖨': 'printer',
  '⌨️': 'laptop',
  '⌨': 'laptop',
  '🖱️': 'laptop',
  '🖱': 'laptop',
  '💽': 'harddrive',
  '💾': 'harddrive',
  '💿': 'film',
  '📀': 'film',
  '🧮': 'calculator',
  '🎥': 'film',
  '🎞️': 'film',
  '🎞': 'film',
  '📽️': 'film',
  '📽': 'film',
  '📺': 'tv',
  '📷': 'camera',
  '📸': 'camera',
  '📹': 'camera',
  '📼': 'film',
  '🔍': 'search',
  '🔎': 'search',
  '🏮': 'lamp',
  '🪔': 'lamp',
  '📡': 'wifi',
  '🤖': 'bot',
  '⚡': 'zap',
  '🌐': 'globe',
  '🔔': 'bell',
  '🔕': 'bell',

  // Djur & Natur
  '🐶': 'dog',
  '🐕': 'dog',
  '🐩': 'dog',
  '🦮': 'dog',
  '🐕‍🦺': 'dog',
  '🐱': 'cat',
  '🐈': 'cat',
  '🐈‍⬛': 'cat',
  '🐾': 'pawprint',
  '🦁': 'cat',
  '🐯': 'cat',
  '🦊': 'dog',
  '🐻': 'dog',
  '🐼': 'dog',
  '🐨': 'dog',
  '🐮': 'beef',
  '🐸': 'sprout',
  '🐵': 'smile',
  '🐔': 'drumstick',
  '🐧': 'bird',
  '🐦': 'bird',
  '🐤': 'bird',
  '🦆': 'bird',
  '🦅': 'bird',
  '🦉': 'bird',
  '🦇': 'bird',
  '🐺': 'dog',
  '🐗': 'beef',
  '🐴': 'trophy',
  '🦄': 'sparkles',
  '🐝': 'bug',
  '🐛': 'bug',
  '🦋': 'bug',
  '🐌': 'bug',
  '🐞': 'bug',
  '🐜': 'bug',
  '🦟': 'bug',
  '🦗': 'bug',
  '🕷️': 'bug',
  '🕷': 'bug',
  '🦂': 'bug',
  '🐢': 'sprout',
  '🐍': 'sprout',
  '🦎': 'sprout',
  '🦖': 'sprout',
  '🦕': 'sprout',
  '🐙': 'fish',
  '🦑': 'fish',
  '🦐': 'fish',
  '🦞': 'fish',
  '🦀': 'fish',
  '🐡': 'fish',
  '🐠': 'fish',
  '🐟': 'fish',
  '🐬': 'fish',
  '🐳': 'fish',
  '🐋': 'fish',
  '🦈': 'fish',
  '🦭': 'fish',
  '🐊': 'fish',
  '🌲': 'treepine',
  '🌳': 'trees',
  '🌴': 'palmtree',
  '🌵': 'sprout',
  '🌾': 'wheat',
  '🌿': 'sprout',
  '☘️': 'clover',
  '☘': 'clover',
  '🍀': 'clover',
  '🍁': 'leaf',
  '🍂': 'leaf',
  '🍃': 'leaf',
  '🪷': 'flower',
  '🌺': 'flower',
  '🌸': 'flower',
  '🌼': 'flower',
  '🌻': 'flower2',
  '🌞': 'sun',
  '🌝': 'moon',
  '☀️': 'sun',
  '🌤️': 'sun',
  '🌤': 'sun',
  '⛅': 'cloud',
  '🌥️': 'cloud',
  '🌥': 'cloud',
  '☁️': 'cloud',
  '☁': 'cloud',
  '🌦️': 'cloudrain',
  '🌦': 'cloudrain',
  '🌧️': 'cloudrain',
  '🌧': 'cloudrain',
  '⛈️': 'zap',
  '⛈': 'zap',
  '🌩️': 'zap',
  '🌩': 'zap',
  '🌨️': 'snowflake',
  '🌨': 'snowflake',
  '❄️': 'snowflake',
  '❄': 'snowflake',
  '☃️': 'snowflake',
  '☃': 'snowflake',
  '⛄': 'snowflake',
  '🌬️': 'wind',
  '🌬': 'wind',
  '💨': 'wind',
  '🌪️': 'wind',
  '🌪': 'wind',
  '🌫️': 'cloud',
  '🌫': 'cloud',
  '🌈': 'sparkles',
  '☂️': 'umbrella',
  '☂': 'umbrella',
  '☔': 'umbrella',
  '🏖️': 'palmtree',
  '🏖': 'palmtree',
  '🏝️': 'palmtree',
  '🏝': 'palmtree',
  '🏜️': 'sun',
  '🏜': 'sun',
  '🌋': 'flame',
  '⛰️': 'mountain',
  '⛰': 'mountain',
  '🏔️': 'mountainsnow',
  '🏔': 'mountainsnow',
  '🗻': 'mountain',
  '🏕️': 'tent',
  '🏕': 'tent',

  // Barn & Familj
  '👶': 'baby',
  '🧒': 'user',
  '👦': 'user',
  '👧': 'user',
  '🧑': 'user',
  '👨': 'user',
  '👩': 'user',
  '🧓': 'user',
  '👴': 'user',
  '👵': 'user',
  '👪': 'users',
  '👨‍👩‍👧': 'users',
  '👨‍👩‍👧‍👦': 'users',
  '👨‍👦': 'users',
  '👩‍👧': 'users',
  '👥': 'users',
  '🫂': 'hearthandshake',

  // Jobb & Utbildning
  '🎓': 'education',
  '📚': 'book',
  '📖': 'book',
  '📕': 'book',
  '📗': 'book',
  '📘': 'book',
  '📙': 'book',
  '📓': 'book',
  '📒': 'book',
  '📑': 'filetext',
  '📄': 'filetext',
  '📃': 'filetext',
  '📋': 'filetext',
  '📌': 'milestone',
  '📍': 'mappin',
  '📎': 'paperclip',
  '🖇️': 'paperclip',
  '🖇': 'paperclip',
  '📏': 'scale',
  '📐': 'scale',
  '✂️': 'scissors',
  '✂': 'scissors',
  '🖊️': 'pencil',
  '🖊': 'pencil',
  '🖋️': 'pencil',
  '🖋': 'pencil',
  '✒️': 'pencil',
  '✒': 'pencil',
  '✏️': 'pencil',
  '✏': 'pencil',
  '🖍️': 'brush',
  '🖍': 'brush',
  '🖌️': 'brush',
  '🖌': 'brush',
  '📁': 'folder',
  '📂': 'folder',
  '🗂️': 'folder',
  '🗂': 'folder',
  '📰': 'newspaper',
  '🗞️': 'newspaper',
  '🗞': 'newspaper',
  '📣': 'megaphone',
  '📢': 'megaphone'
};

/**
 * Resolves any icon name, emoji, or Lucide key to a guaranteed Lucide icon key.
 */
export const resolveLucideIcon = (val: string | undefined | null): string => {
  if (!val) return 'tag';
  const trimmed = val.trim();
  const lower = trimmed.toLowerCase();

  // 1. Direct Lucide key match
  if (ICON_MAP[lower]) return lower;

  // 2. Direct emoji match
  if (EMOJI_TO_LUCIDE_MAP[trimmed]) return EMOJI_TO_LUCIDE_MAP[trimmed];

  // 3. Emoji match without variation selectors
  const stripped = trimmed.replace(/[\uFE0E\uFE0F]/g, '');
  if (EMOJI_TO_LUCIDE_MAP[stripped]) return EMOJI_TO_LUCIDE_MAP[stripped];

  // 4. Fallback search in keys
  return 'tag';
};

export const getCategoryIconName = (categoryName: string): string => {
  const name = categoryName.toLowerCase();
  if (name.includes('streaming') || name.includes('media') || name.includes('tv') || name.includes('netflix') || name.includes('spotify')) return 'tv';
  if (name.includes('fika') || name.includes('kaffe') || name.includes('café') || name.includes('kafé')) return 'coffee';
  if (name.includes('dagligvaror') || name.includes('matbutik') || name.includes('livsmedel') || name.includes('supermarket')) return 'shoppingcart';
  if (name.includes('restaurang') || name.includes('lunch') || name.includes('middag') || name.includes('utemat') || name.includes('mat')) return 'utensils';
  if (name.includes('transport') || name.includes('pendel') || name.includes('buss') || name.includes('tåg') || name.includes('bil') || name.includes('drivmedel')) return 'car';
  if (name.includes('shopping') || name.includes('kläder') || name.includes('skor')) return 'shopping';
  if (name.includes('träning') || name.includes('gym') || name.includes('fitness') || name.includes('sport')) return 'dumbbell';
  if (name.includes('skönhet') || name.includes('frisör') || name.includes('klippning') || name.includes('egenvård')) return 'scissors';
  if (name.includes('nöje') || name.includes('bio') || name.includes('kultur') || name.includes('teater') || name.includes('spel')) return 'drama';
  if (name.includes('hem') || name.includes('boende') || name.includes('hyra') || name.includes('hushåll')) return 'home';
  if (name.includes('hälsa') || name.includes('apotek') || name.includes('tand') || name.includes('vård')) return 'health';
  if (name.includes('abonnemang') || name.includes('mobil') || name.includes('telefoni') || name.includes('tjänster')) return 'smartphone';
  if (name.includes('räkningar') || name.includes('fasta utgifter') || name.includes('faktura') || name.includes('avgifter')) return 'receipt';
  if (name.includes('försäkring')) return 'shield';
  if (name.includes('resa') || name.includes('semester') || name.includes('flyg') || name.includes('hotell')) return 'plane';
  if (name.includes('familj') || name.includes('barn')) return 'baby';
  if (name.includes('djur') || name.includes('hund') || name.includes('katt') || name.includes('husdjur')) return 'dog';
  if (name.includes('spargris') || name.includes('sparande') || name.includes('buffert')) return 'savings';
  if (name.includes('lön') || name.includes('inkomst')) return 'banknote';
  if (name.includes('investering') || name.includes('aktier') || name.includes('överskott')) return 'trending';
  if (name.includes('bidrag') || name.includes('gåva') || name.includes('present')) return 'gift';
  if (name.includes('swish') || name.includes('överföring')) return 'arrowdownup';
  if (name.includes('övrigt') || name.includes('övriga') || name.includes('annat')) return 'package';
  if (name.includes('okategoriserat') || name.includes('uncategorized')) return 'tag';
  return 'tag';
};

export const ICON_MAP: Record<string, any> = {
  // Mat & Dryck
  utensils: Utensils,
  utensilscrossed: UtensilsCrossed,
  coffee: Coffee,
  pizza: Pizza,
  sandwich: Sandwich,
  croissant: Croissant,
  cupsoda: CupSoda,
  soup: Soup,
  salad: Salad,
  citrus: Citrus,
  candy: Candy,
  popcorn: Popcorn,
  cherry: Cherry,
  drumstick: Drumstick,
  glasswater: GlassWater,
  donut: Donut,
  chefhat: ChefHat,
  martini: Martini,
  milk: Milk,
  beer: Beer,
  wine: Wine,
  apple: Apple,
  banana: Banana,
  carrot: Carrot,
  egg: Egg,
  fish: Fish,
  beef: Beef,
  cake: Cake,
  cookie: Cookie,
  icecream: IceCream,
  wheat: Wheat,

  // Transport & Fordon
  car: Car,
  carfront: CarFront,
  cartaxifront: CarTaxiFront,
  bus: Bus,
  busfront: BusFront,
  train: Train,
  trainfront: TrainFront,
  tramfront: TramFront,
  cablecar: CableCar,
  bike: Bike,
  fuel: Fuel,
  gauge: Gauge,
  plane: Plane,
  planelanding: PlaneLanding,
  planetakeoff: PlaneTakeoff,
  ship: Ship,
  anchor: Anchor,
  sailboat: Sailboat,
  navigation: Navigation,
  map: Map,
  parkingsquare: ParkingSquare,

  // Hem, Boende & Bygg
  home: Home,
  building: Building,
  building2: Building2,
  warehouse: Warehouse,
  bed: Bed,
  beddouble: BedDouble,
  bath: Bath,
  armchair: Armchair,
  sofa: Sofa,
  lamp: Lamp,
  lampdesk: LampDesk,
  washingmachine: WashingMachine,
  doorclosed: DoorClosed,
  power: Power,
  paintbucket: PaintBucket,
  hammer: Hammer,
  wrench: Wrench,
  drill: Drill,
  construction: Construction,
  hardhat: HardHat,
  trash: Trash2,
  trash2: Trash2,
  droplets: Droplets,
  flame: Flame,
  lightbulb: Lightbulb,
  fan: Fan,
  airvent: AirVent,
  showerhead: ShowerHead,

  // Shopping & Kläder
  shopping: ShoppingBag,
  shoppingbag: ShoppingBag,
  shoppingcart: ShoppingCart,
  shoppingbasket: ShoppingBasket,
  store: Store,
  shirt: Shirt,
  watch: Watch,
  gem: Gem,
  footprints: Footprints,
  glasses: Glasses,
  tag: Tag,
  tags: Tags,
  percent: Percent,
  badgepercent: BadgePercent,
  walletcards: WalletCards,
  scissors: Scissors,
  gift: Gift,
  package: Package,
  truck: Truck,

  // Nöje, Kultur & Evenemang
  gamepad: Gamepad2,
  gamepad2: Gamepad2,
  music: Music,
  tv: Tv,
  film: Film,
  clapperboard: Clapperboard,
  ticket: Ticket,
  dice5: Dice5,
  radio: Radio,
  headphones: Headphones,
  mic: Mic,
  speaker: Speaker,
  volume2: Volume2,
  palette: Palette,
  brush: Brush,
  pentool: PenTool,
  guitar: Guitar,
  piano: Piano,
  drama: Drama,
  camera: Camera,
  sparkles: Sparkles,
  smile: Smile,
  smileplus: SmilePlus,
  partypopper: PartyPopper,
  book: Book,

  // Träning & Sport
  dumbbell: Dumbbell,
  trophy: Trophy,
  medal: Medal,
  award: Award,
  crown: Crown,
  target: Target,

  // Hälsa & Egenvård
  health: Stethoscope,
  stethoscope: Stethoscope,
  heart: Heart,
  heartpulse: HeartPulse,
  activity: Activity,
  cross: Cross,
  pill: Pill,
  syringe: Syringe,
  hearthandshake: HeartHandshake,
  shield: Shield,
  shieldcheck: ShieldCheck,
  umbrella: Umbrella,
  thermometer: Thermometer,

  // Ekonomi, Banker & Sparande
  wallet: Wallet,
  banknote: Banknote,
  coins: Coins,
  creditcard: CreditCard,
  receipt: Receipt,
  receipttext: ReceiptText,
  receiptcent: ReceiptCent,
  savings: PiggyBank,
  piggybank: PiggyBank,
  trending: TrendingUp,
  trendingup: TrendingUp,
  trendingdown: TrendingDown,
  landmark: Landmark,
  circledollarsign: CircleDollarSign,
  badgedollarsign: BadgeDollarSign,
  dollarsign: DollarSign,
  euro: Euro,
  vault: Vault,
  scale: Scale,
  arrowdownup: ArrowUpDown,

  // Teknik, Datorer & Gadgets
  smartphone: Smartphone,
  phone: Phone,
  phonecall: PhoneCall,
  laptop: Laptop,
  monitor: Monitor,
  tablet: Tablet,
  wifi: Wifi,
  server: Server,
  cpu: Cpu,
  harddrive: HardDrive,
  battery: Battery,
  batterycharging: BatteryCharging,
  printer: Printer,
  bot: Bot,
  qrcode: QrCode,
  zap: Zap,
  bell: Bell,
  mail: Mail,
  message: MessageSquare,
  messagesquare: MessageSquare,
  key: Key,
  keyround: KeyRound,
  lock: Lock,
  cloud: Cloud,
  router: Router,

  // Djur, Natur & Resor
  pet: Dog,
  dog: Dog,
  cat: Cat,
  pawprint: PawPrint,
  bird: Bird,
  bug: Bug,
  hotel: Hotel,
  luggage: Luggage,
  baggageclaim: BaggageClaim,
  palmtree: Palmtree,
  trees: Trees,
  treepine: TreePine,
  sprout: Sprout,
  flower: Flower,
  flower2: Flower2,
  leaf: Leaf,
  clover: Clover,
  fishsymbol: FishSymbol,
  mountain: Mountain,
  mountainsnow: MountainSnow,
  tent: Tent,
  compass: Compass,
  globe: Globe,
  sun: Sun,
  moon: Moon,
  wind: Wind,
  snowflake: Snowflake,
  cloudrain: CloudRain,
  sunset: Sunset,
  sunrise: Sunrise,
  flag: Flag,
  rocket: Rocket,
  mappin: MapPin,

  // Barn & Familj
  baby: Baby,
  user: User,
  users: Users,
  usercheck: UserCheck,

  // Arbete & Utbildning
  work: Briefcase,
  briefcase: Briefcase,
  education: GraduationCap,
  graduationcap: GraduationCap,
  school: School,
  library: Library,
  bookmark: Bookmark,
  backpack: Backpack,
  calculator: Calculator,
  pencil: Pencil,
  paperclip: Paperclip,
  filetext: FileText,
  folder: Folder,
  presentation: Presentation,
  milestone: Milestone,
  blocks: Blocks,
  newspaper: Newspaper,
  megaphone: Megaphone,
  send: Send,
  star: Star,
  eye: Eye,
  search: Search,
  settings: Settings,
  more: MoreHorizontal,
  rotateccw: RotateCcw,
  refresh: RotateCcw,
  'credit-card': CreditCard,
  'shopping-bag': ShoppingBag,
  frown: Frown,
  meh: Meh,
  check: Check,
  x: X,
  help: HelpCircle
};

export interface IconCategory {
  id: string;
  label: string;
  icon: string;
}

export const ICON_CATEGORIES: IconCategory[] = [
  { id: 'all', label: 'Alla ikoner', icon: 'sparkles' },
  { id: 'food', label: 'Mat & Dryck', icon: 'utensils' },
  { id: 'transport', label: 'Transport', icon: 'car' },
  { id: 'shopping', label: 'Shopping', icon: 'shopping' },
  { id: 'home', label: 'Hem & Boende', icon: 'home' },
  { id: 'leisure', label: 'Nöje & Kultur', icon: 'drama' },
  { id: 'sports', label: 'Träning & Sport', icon: 'dumbbell' },
  { id: 'health', label: 'Hälsa & Vård', icon: 'health' },
  { id: 'finance', label: 'Ekonomi & Spar', icon: 'banknote' },
  { id: 'tech', label: 'Teknik & Media', icon: 'smartphone' },
  { id: 'nature', label: 'Natur & Djur', icon: 'trees' },
  { id: 'travel', label: 'Resor & Hotell', icon: 'plane' },
  { id: 'family', label: 'Barn & Familj', icon: 'baby' },
  { id: 'work', label: 'Jobb & Skola', icon: 'work' }
];

export interface IconItem {
  key: string;
  name: string;
  category: string;
  keywords: string[];
}

export const ALL_ICONS_LIST: IconItem[] = [
  // Mat & Dryck
  { key: 'utensils', name: 'Restaurang / Mat', category: 'food', keywords: ['mat', 'lunch', 'middag', 'restaurang', 'krog', 'utensils', 'food', 'äta', 'restaurangbesök'] },
  { key: 'utensilscrossed', name: 'Bestick / Kök', category: 'food', keywords: ['bestick', 'mat', 'lunch', 'middag', 'äta', 'kök', 'matlagning'] },
  { key: 'coffee', name: 'Kaffe / Fika', category: 'food', keywords: ['kaffe', 'fika', 'cafe', 'espresso', 'te', 'bullar', 'coffee', 'starbucks', 'espresso house'] },
  { key: 'pizza', name: 'Pizza / Snabbmat', category: 'food', keywords: ['pizza', 'snabbmat', 'pizzeria', 'takeaway', 'fastfood', 'kebab'] },
  { key: 'sandwich', name: 'Smörgås / Macka', category: 'food', keywords: ['macka', 'smörgås', 'sandwich', 'lunch', 'subway', 'baguette'] },
  { key: 'croissant', name: 'Bageri / Frukost', category: 'food', keywords: ['croissant', 'frukost', 'bageri', 'bröd', 'konditori', 'fika'] },
  { key: 'cupsoda', name: 'Läsk / Dryck', category: 'food', keywords: ['läsk', 'dryck', 'soda', 'fastfood', 'juice', 'dricka', 'coca cola'] },
  { key: 'soup', name: 'Soppa / Varm mat', category: 'food', keywords: ['soppa', 'soup', 'lunch', 'varmt', 'gryta'] },
  { key: 'salad', name: 'Sallad / Vego', category: 'food', keywords: ['sallad', 'grönsaker', 'vego', 'vegan', 'hälsosamt', 'salad', 'vegetariskt'] },
  { key: 'citrus', name: 'Frukt / Citrus', category: 'food', keywords: ['citron', 'apelsin', 'frukt', 'lime', 'citrus', 'vitamin', 'mellanmål'] },
  { key: 'candy', name: 'Godis / Snacks', category: 'food', keywords: ['godis', 'sötsaker', 'candy', 'lördagsgodis', 'snacks', 'choklad'] },
  { key: 'popcorn', name: 'Popcorn / Snacks', category: 'food', keywords: ['popcorn', 'bio', 'snacks', 'film', 'mys', 'chips'] },
  { key: 'cherry', name: 'Bär / Körsbär', category: 'food', keywords: ['bär', 'körsbär', 'frukt', 'jordgubbar', 'hallon', 'blåbär'] },
  { key: 'drumstick', name: 'Kyckling / Fågel', category: 'food', keywords: ['kyckling', 'drumstick', 'kött', 'mat', 'middag'] },
  { key: 'glasswater', name: 'Vatten / Dryck', category: 'food', keywords: ['vatten', 'glas', 'dryck', 'mineralvatten', 'hälsa'] },
  { key: 'donut', name: 'Munk / Donut', category: 'food', keywords: ['donut', 'munk', 'fika', 'sött', 'bageri'] },
  { key: 'chefhat', name: 'Kock / Matlagning', category: 'food', keywords: ['kock', 'chef', 'matlagning', 'gourmet', 'restaurang'] },
  { key: 'martini', name: 'Cocktail / Bar', category: 'food', keywords: ['cocktail', 'drink', 'bar', 'fest', 'martini', 'afterwork', 'krog'] },
  { key: 'milk', name: 'Mjölk / Mejeri', category: 'food', keywords: ['mjölk', 'mejeri', 'frukost', 'latte', 'dryck', 'ost', 'yoghurt'] },
  { key: 'beer', name: 'Öl / Pub', category: 'food', keywords: ['öl', 'beer', 'pub', 'bar', 'bryggeri', 'fest', 'afterwork', 'systembolaget'] },
  { key: 'wine', name: 'Vin / Systembolaget', category: 'food', keywords: ['vin', 'systembolaget', 'wine', 'restaurang', 'alkohol', 'middag', 'fest'] },
  { key: 'apple', name: 'Äpple / Frukt', category: 'food', keywords: ['äpple', 'frukt', 'mellanmål', 'hälsa', 'apple'] },
  { key: 'banana', name: 'Banan / Frukt', category: 'food', keywords: ['banan', 'frukt', 'träning', 'mellanmål'] },
  { key: 'carrot', name: 'Grönsaker / Morot', category: 'food', keywords: ['morot', 'grönsaker', 'eko', 'matlagning', 'vegetariskt'] },
  { key: 'egg', name: 'Ägg / Frukost', category: 'food', keywords: ['ägg', 'frukost', 'mat', 'bakning', 'brunch'] },
  { key: 'fish', name: 'Fisk / Sushi', category: 'food', keywords: ['fisk', 'lax', 'sushi', 'skaldjur', 'middag'] },
  { key: 'beef', name: 'Kött / Biff', category: 'food', keywords: ['kött', 'biff', 'steak', 'middag', 'chark', 'grilla'] },
  { key: 'cake', name: 'Tårta / Kalas', category: 'food', keywords: ['tårta', 'födelsedag', 'firande', 'fest', 'kalas', 'bageri'] },
  { key: 'cookie', name: 'Kakor / Kex', category: 'food', keywords: ['kaka', 'kex', 'cookie', 'fika', 'småkakor'] },
  { key: 'icecream', name: 'Glass / Efterrätt', category: 'food', keywords: ['glass', 'icecream', 'efterrätt', 'sommar', 'sött'] },
  { key: 'wheat', name: 'Spannmål / Bageri', category: 'food', keywords: ['mjöl', 'bröd', 'bageri', 'spannmål', 'frukost'] },

  // Transport & Fordon
  { key: 'car', name: 'Bil', category: 'transport', keywords: ['bil', 'bilar', 'fordon', 'körning', 'car', 'parkering', 'volvo', 'leasing', 'bensin', 'bränsle', 'bilresa'] },
  { key: 'carfront', name: 'Bil framifrån', category: 'transport', keywords: ['bil', 'fordon', 'garage', 'parkering', 'tull', 'biltull'] },
  { key: 'cartaxifront', name: 'Taxi / Skjuts', category: 'transport', keywords: ['taxi', 'uber', 'bolt', 'skjuts', 'transport'] },
  { key: 'bus', name: 'Buss / Pendel', category: 'transport', keywords: ['buss', 'sl', 'västtrafik', 'skånetrafiken', 'pendel', 'kollektivtrafik'] },
  { key: 'busfront', name: 'Buss framifrån', category: 'transport', keywords: ['buss', 'pendling', 'lokaltrafik', 'månadskort'] },
  { key: 'train', name: 'Tåg / Järnväg', category: 'transport', keywords: ['tåg', 'sj', 'mtrexpress', 'pendeltåg', 'järnväg', 'train'] },
  { key: 'trainfront', name: 'Tunnelbana / Snabbtåg', category: 'transport', keywords: ['tåg', 'snabbtåg', 'tunnelbana', 'metro', 'arlanda express'] },
  { key: 'tramfront', name: 'Spårvagn', category: 'transport', keywords: ['spårvagn', 'tram', 'kollektivtrafik', 'göteborg', 'norrrköping'] },
  { key: 'cablecar', name: 'Linbana / Skidlift', category: 'transport', keywords: ['linbana', 'lift', 'skidresa', 'fjällen', 'alperna', 'liftkort'] },
  { key: 'bike', name: 'Cykel / Elcykel', category: 'transport', keywords: ['cykel', 'elcykel', 'pendla', 'träning', 'reparation', 'cykelservice'] },
  { key: 'fuel', name: 'Drivmedel / Drivmedel', category: 'transport', keywords: ['bensin', 'diesel', 'drivmedel', 'tanka', 'cirklek', 'preem', 'okq8', 'mack'] },
  { key: 'gauge', name: 'Besiktning / Service', category: 'transport', keywords: ['besiktning', 'service', 'reparation', 'mätare', 'bilprovningen'] },
  { key: 'ship', name: 'Färja / Kryssning', category: 'transport', keywords: ['båt', 'färja', 'kryssning', 'silja', 'vikingline', 'skärgård'] },
  { key: 'anchor', name: 'Hamn / Båtklubb', category: 'transport', keywords: ['hamn', 'båtplats', 'båtklubb', 'marin', 'sommar'] },
  { key: 'sailboat', name: 'Segelbåt / Fritidsbåt', category: 'transport', keywords: ['segelbåt', 'sommar', 'båt', 'skärgård', 'båtliv'] },
  { key: 'navigation', name: 'GPS / Navigation', category: 'transport', keywords: ['gps', 'karta', 'vägbeskrivning', 'resa', 'navigation'] },
  { key: 'parkingsquare', name: 'Parkering / P-bot', category: 'transport', keywords: ['parkering', 'easypark', 'parkster', 'p-bot', 'garage'] },

  // Hem & Boende
  { key: 'home', name: 'Hem / Boende', category: 'home', keywords: ['hem', 'hus', 'lägenhet', 'hyra', 'bostadsrätt', 'home', 'bolån'] },
  { key: 'building', name: 'Fastighet / Förening', category: 'home', keywords: ['fastighet', 'lägenhetshus', 'kontor', 'byggnad', 'brf'] },
  { key: 'building2', name: 'Höghus / Stad', category: 'home', keywords: ['höghus', 'skyskrapa', 'stad', 'samfällighet'] },
  { key: 'warehouse', name: 'Förråd / Lager', category: 'home', keywords: ['förråd', 'lager', 'magasinering', 'flytt', 'shurgard'] },
  { key: 'bed', name: 'Säng / Sovrum', category: 'home', keywords: ['säng', 'sovrum', 'möbler', 'vila', 'ikea'] },
  { key: 'beddouble', name: 'Möbler / Sovrum', category: 'home', keywords: ['dubbelsäng', 'madrass', 'inredning', 'möbler'] },
  { key: 'bath', name: 'Badrum / VVS', category: 'home', keywords: ['badkar', 'badrum', 'spa', 'vvs', 'dusch', 'toalett'] },
  { key: 'showerhead', name: 'Dusch / Bad', category: 'home', keywords: ['dusch', 'badrum', 'vatten', 'sanitet'] },
  { key: 'armchair', name: 'Fåtölj / Möbler', category: 'home', keywords: ['fåtölj', 'vardagsrum', 'inredning', 'möbler', 'ikea'] },
  { key: 'sofa', name: 'Soffa / Vardagsrum', category: 'home', keywords: ['soffa', 'vardagsrum', 'mys', 'möbler', 'inredning'] },
  { key: 'lamp', name: 'Belysning / Lampa', category: 'home', keywords: ['lampa', 'belysning', 'el', 'inredning', 'armatur'] },
  { key: 'lampdesk', name: 'Skrivbordsbelysning', category: 'home', keywords: ['skrivbord', 'arbetsrum', 'kontor', 'studier'] },
  { key: 'washingmachine', name: 'Tvättstuga / Vitvaror', category: 'home', keywords: ['tvätt', 'tvättmaskin', 'hushåll', 'vitvaror', 'tvättmedel'] },
  { key: 'doorclosed', name: 'Entré / Dörr', category: 'home', keywords: ['dörr', 'ingång', 'entré', 'lås', 'ytterdörr'] },
  { key: 'power', name: 'Elavtal / Ström', category: 'home', keywords: ['el', 'ström', 'energi', 'elräkning', 'vattenfall', 'fortum', 'tibber'] },
  { key: 'paintbucket', name: 'Färg / Renovering', category: 'home', keywords: ['måla', 'renovering', 'färg', 'tapet', 'fixa', 'målare'] },
  { key: 'hammer', name: 'Verktyg / Snickeri', category: 'home', keywords: ['hammare', 'verktyg', 'snickra', 'hantverkare', 'bygg'] },
  { key: 'wrench', name: 'Reparation / Underhåll', category: 'home', keywords: ['reparation', 'mekaniker', 'service', 'underhåll', 'vvs'] },
  { key: 'drill', name: 'Borrmaskin / Verktyg', category: 'home', keywords: ['borr', 'borrmaskin', 'renovera', 'byggvaruhus', 'bauhaus'] },
  { key: 'construction', name: 'Bygg / Ombyggnad', category: 'home', keywords: ['bygg', 'arbete', 'renovering', 'hantverkare'] },
  { key: 'hardhat', name: 'Hantverkare / Säkerhet', category: 'home', keywords: ['hjälm', 'entreprenör', 'hantverkare', 'byggare'] },
  { key: 'trash', name: 'Sophämtning / Återvinning', category: 'home', keywords: ['sopor', 'återvinning', 'renhållning', 'avfall', 'sophämtning'] },
  { key: 'droplets', name: 'Vatten & Avlopp', category: 'home', keywords: ['vatten', 'va', 'kommun', 'vvs', 'droppar', 'vattenräkning'] },
  { key: 'flame', name: 'Uppvärmning / Fjärrvärme', category: 'home', keywords: ['värme', 'fjärrvärme', 'gas', 'pellets', 'ved', 'eld'] },
  { key: 'lightbulb', name: 'Glödlampa / Energi', category: 'home', keywords: ['glödlampa', 'el', 'lampa', 'energi', 'belysning'] },
  { key: 'fan', name: 'Fläkt / Ventilation', category: 'home', keywords: ['fläkt', 'ventilation', 'klimat', 'sommar'] },
  { key: 'airvent', name: 'Luftvärmepump / Värme', category: 'home', keywords: ['värmepump', 'ac', 'kyla', 'ventilation'] },

  // Shopping & Kläder
  { key: 'shopping', name: 'Shopping / Påse', category: 'shopping', keywords: ['shopping', 'köp', 'påse', 'butik', 'mall', 'galleria'] },
  { key: 'shoppingcart', name: 'Matvaror / Handla', category: 'shopping', keywords: ['matvaror', 'ica', 'coop', 'willys', 'lidl', 'handel', 'cart', 'storhandling'] },
  { key: 'shoppingbasket', name: 'Snabbköp / Korg', category: 'shopping', keywords: ['korg', 'livsmedel', 'småhandling', 'närbutik', 'pressbyrån', '7eleven'] },
  { key: 'store', name: 'Butik / Affär', category: 'shopping', keywords: ['affär', 'butik', 'galleria', 'varuhus', 'åhlens', 'nk'] },
  { key: 'shirt', name: 'Kläder / Mode', category: 'shopping', keywords: ['kläder', 'tröja', 'skjorta', 'mode', 'fashion', 'hm', 'zara', 'outfit'] },
  { key: 'watch', name: 'Klocka / Accessoarer', category: 'shopping', keywords: ['klocka', 'ur', 'smycken', 'accessoarer', 'lyx', 'apple watch'] },
  { key: 'gem', name: 'Smycken / Guld', category: 'shopping', keywords: ['smycken', 'guld', 'silver', 'diamant', 'ring', 'lyx', 'juveler'] },
  { key: 'footprints', name: 'Skor / Sneakers', category: 'shopping', keywords: ['skor', 'sneakers', 'kängor', 'promenad', 'stövlar', 'nike', 'adidas'] },
  { key: 'glasses', name: 'Glasögon / Optiker', category: 'shopping', keywords: ['glasögon', 'solglasögon', 'optiker', 'synoptik', 'linser', 'synsam'] },
  { key: 'tag', name: 'Pris / Rea', category: 'shopping', keywords: ['rea', 'rabatt', 'fynd', 'kampanj', 'outlet', 'prislapp'] },
  { key: 'tags', name: 'Erbjudanden / Etiketter', category: 'shopping', keywords: ['kampanjer', 'medlem', 'rabatter', 'taggar'] },
  { key: 'percent', name: 'Rabatt / Procent', category: 'shopping', keywords: ['rabatt', 'erbjudande', 'kampanj', 'procent', 'kupong'] },
  { key: 'badgepercent', name: 'Kampanj / Medlem', category: 'shopping', keywords: ['bonus', 'medlem', 'rabatt', 'erbjudande', 'återbäring'] },
  { key: 'walletcards', name: 'Presentkort / Klubbkort', category: 'shopping', keywords: ['presentkort', 'medlemskort', 'kundklubb'] },
  { key: 'scissors', name: 'Frisör / Skönhet', category: 'shopping', keywords: ['frisör', 'klippning', 'hår', 'salong', 'barberare', 'hårvård'] },
  { key: 'gift', name: 'Present / Gåva', category: 'shopping', keywords: ['present', 'gåva', 'julklapp', 'födelsedag', 'firande'] },
  { key: 'package', name: 'Paket / Postleverans', category: 'shopping', keywords: ['paket', 'post', 'postnord', 'dhl', 'budbee', 'instabox', 'leverans'] },
  { key: 'truck', name: 'Frakt / Hemleverans', category: 'shopping', keywords: ['frakt', 'transport', 'hemleverans', 'flyttbil'] },

  // Nöje & Kultur
  { key: 'drama', name: 'Teater / Scenkonst', category: 'leisure', keywords: ['teater', 'opera', 'musikal', 'kultur', 'skådespel', 'drama'] },
  { key: 'gamepad', name: 'Gaming / Spel', category: 'leisure', keywords: ['spel', 'gaming', 'playstation', 'xbox', 'nintendo', 'steam', 'datorspel'] },
  { key: 'music', name: 'Musik / Spotify', category: 'leisure', keywords: ['musik', 'spotify', 'konsert', 'låtar', 'apple music', 'streaming'] },
  { key: 'tv', name: 'TV / Streaming', category: 'leisure', keywords: ['tv', 'netflix', 'hbo', 'disney', 'viaplay', 'streaming', 'film'] },
  { key: 'film', name: 'Film / Bio', category: 'leisure', keywords: ['film', 'bio', 'biograf', 'sf', 'filmstaden'] },
  { key: 'clapperboard', name: 'Video / Serie', category: 'leisure', keywords: ['filmklappa', 'video', 'serie', 'regi', 'media'] },
  { key: 'ticket', name: 'Biljetter / Evenemang', category: 'leisure', keywords: ['biljett', 'evenemang', 'konsert', 'teater', 'match'] },
  { key: 'dice5', name: 'Brädspel / Spelkväll', category: 'leisure', keywords: ['brädspel', 'tärning', 'casino', 'spelkväll'] },
  { key: 'radio', name: 'Podd / Ljudbok', category: 'leisure', keywords: ['radio', 'podd', 'podcast', 'ljudbok', 'storytel', 'bookbeat'] },
  { key: 'headphones', name: 'Hörlurar / Audio', category: 'leisure', keywords: ['hörlurar', 'headset', 'ljud', 'airpods'] },
  { key: 'mic', name: 'Mikrofon / Sång', category: 'leisure', keywords: ['mikrofon', 'karaoke', 'sång', 'föreläsning'] },
  { key: 'speaker', name: 'Högtalare / Ljud', category: 'leisure', keywords: ['högtalare', 'sonos', 'fest', 'ljudsystem'] },
  { key: 'volume2', name: 'Ljud / Volym', category: 'leisure', keywords: ['ljud', 'volym', 'underhållning'] },
  { key: 'palette', name: 'Konst & Skapande', category: 'leisure', keywords: ['konst', 'måla', 'hobby', 'pyssel', 'kreativitet', 'museum'] },
  { key: 'brush', name: 'Pensel / Makeup', category: 'leisure', keywords: ['pensel', 'smink', 'makeup', 'skönhet', 'måla'] },
  { key: 'pentool', name: 'Design / Teckning', category: 'leisure', keywords: ['design', 'grafik', 'ritning', 'illustratör'] },
  { key: 'guitar', name: 'Gitarr / Musik', category: 'leisure', keywords: ['gitarr', 'musik', 'instrument', 'band'] },
  { key: 'piano', name: 'Piano / Instrument', category: 'leisure', keywords: ['piano', 'ackord', 'musikskola', 'instrument'] },
  { key: 'camera', name: 'Kamera / Foto', category: 'leisure', keywords: ['kamera', 'foto', 'fotograf', 'framkallning', 'minnen'] },
  { key: 'sparkles', name: 'Fest & Glitter', category: 'leisure', keywords: ['stjärnor', 'lyx', 'magi', 'premium', 'glitter', 'fest'] },
  { key: 'partypopper', name: 'Firande / Party', category: 'leisure', keywords: ['fest', 'kalas', 'firande', 'party', 'födelsedag', 'nyår'] },
  { key: 'book', name: 'Böcker / Läsning', category: 'leisure', keywords: ['bok', 'bokhandel', 'läsning', 'storytel', 'bokklubb', 'pocket'] },

  // Träning & Sport
  { key: 'dumbbell', name: 'Gym / Träning', category: 'sports', keywords: ['gym', 'träning', 'fitness', 'sats', 'nordicwellness', 'f24s', 'styrketräning'] },
  { key: 'trophy', name: 'Pokal / Match', category: 'sports', keywords: ['pokal', 'vinst', 'tävling', 'turnering', 'idrott', 'match'] },
  { key: 'medal', name: 'Medalj / Lopp', category: 'sports', keywords: ['medalj', 'maraton', 'löptävling', 'prestation', 'midnattsloppet'] },
  { key: 'award', name: 'Pris / Utmärkelse', category: 'sports', keywords: ['pris', 'utmärkelse', 'stipendium'] },
  { key: 'crown', name: 'VIP / Guld', category: 'sports', keywords: ['krona', 'vip', 'lyx', 'premium', 'vinnare'] },
  { key: 'target', name: 'Mål / Fokus', category: 'sports', keywords: ['boll', 'bollar', 'fotboll', 'fotbollar', 'basketboll', 'tennisboll', 'volleyboll', 'rugbyboll', 'biljardboll', 'bowlingboll', 'sportboll', 'klot', 'mål', 'dart', 'skytte', 'fokus', 'träff', 'sport'] },

   // Hälsa & Vård
  { key: 'health', name: 'Läkare / Vård', category: 'health', keywords: ['läkare', 'vårdcentral', 'doktor', 'sjukvård', 'hälsa', 'kry', 'doktor.se', 'medicin'] },
  { key: 'heart', name: 'Hälsa / Hjärtat', category: 'health', keywords: ['hälsa', 'hjärta', 'kärlek', 'välgörenhet', 'apotekhjärtat'] },
  { key: 'heartpulse', name: 'Puls & Kondition', category: 'health', keywords: ['puls', 'kondition', 'hälsa', 'kontroll', 'blodtryck'] },
  { key: 'activity', name: 'Aktivitet / Hälsa', category: 'health', keywords: ['aktivitet', 'steg', 'hälsa', 'mätning', 'apple health'] },
  { key: 'cross', name: 'Apotek / Medicin', category: 'health', keywords: ['apotek', 'medicin', 'apotea', 'kronans', 'recept', 'hjärtat', 'nässpray', 'spray', 'förkylning', 'näsa'] },
  { key: 'pill', name: 'Piller / Vitaminer', category: 'health', keywords: ['tabletter', 'piller', 'vitaminer', 'tillskott', 'kosttillskott', 'medicin', 'nässpray', 'förkylning'] },
  { key: 'syringe', name: 'Vaccin / Provtagning', category: 'health', keywords: ['vaccin', 'spruta', 'blodprov', 'behandling', 'tbe', 'medicin'] },
  { key: 'hearthandshake', name: 'Omsorg / Terapi', category: 'health', keywords: ['omsorg', 'stöd', 'terapi', 'psykolog', 'hjälp', 'kurator'] },
  { key: 'shield', name: 'Försäkring / Skydd', category: 'health', keywords: ['försäkring', 'if', 'trygghansa', 'länsförsäkringar', 'folksam', 'skydd'] },
  { key: 'umbrella', name: 'Trygghet / Skyddsnät', category: 'health', keywords: ['paraply', 'väder', 'trygghet', 'skydd', 'a-kassa'] },
  { key: 'thermometer', name: 'Feber / Kontroll', category: 'health', keywords: ['feber', 'termometer', 'sjuk', 'vård', 'förkylning', 'nässpray'] },

  // Ekonomi & Sparande
  { key: 'wallet', name: 'Plånbok / Fickpengar', category: 'finance', keywords: ['plånbok', 'fickpengar', 'kontanter', 'budget'] },
  { key: 'banknote', name: 'Lön / Inkomst', category: 'finance', keywords: ['sedlar', 'kontanter', 'lön', 'utbetalning', 'inkomst', 'utbetalning'] },
  { key: 'coins', name: 'Mynt / Växel', category: 'finance', keywords: ['mynt', 'växel', 'dricks', 'sparande'] },
  { key: 'creditcard', name: 'Betalkort / Kreditkort', category: 'finance', keywords: ['kort', 'kreditkort', 'visa', 'mastercard', 'klarna'] },
  { key: 'receipt', name: 'Kvitto / Utlägg', category: 'finance', keywords: ['kvitto', 'räkning', 'faktura', 'utgift', 'utlägg'] },
  { key: 'receipttext', name: 'Faktura / Räkning', category: 'finance', keywords: ['faktura', 'räkningar', 'autogiro', 'specifikation'] },
  { key: 'receiptcent', name: 'Avgifter / Ränta', category: 'finance', keywords: ['avgift', 'ränta', 'bankavgift', 'courtage'] },
  { key: 'savings', name: 'Spargris / Buffert', category: 'finance', keywords: ['sparande', 'buffert', 'spargris', 'spara', 'mål', 'fondspar'] },
  { key: 'trending', name: 'Investering / Aktier', category: 'finance', keywords: ['aktier', 'fonder', 'avanza', 'nordnet', 'börs', 'avkastning', 'isk'] },
  { key: 'trendingdown', name: 'Förlust / Nedgång', category: 'finance', keywords: ['nedgång', 'förlust', 'börsfall'] },
  { key: 'landmark', name: 'Bank / Myndighet', category: 'finance', keywords: ['bank', 'skatteverket', 'csn', 'swedbank', 'seb', 'nordea', 'handelsbanken'] },
  { key: 'circledollarsign', name: 'Valuta / Valutaväxling', category: 'finance', keywords: ['pengar', 'valuta', 'dollar', 'euro', 'finans'] },
  { key: 'dollarsign', name: 'Dollar / USD', category: 'finance', keywords: ['dollar', 'usd', 'utland'] },
  { key: 'euro', name: 'Euro / EUR', category: 'finance', keywords: ['euro', 'eur', 'europa'] },
  { key: 'vault', name: 'Kassaskåp / Valv', category: 'finance', keywords: ['kassaskåp', 'valv', 'guld', 'tryggt sparande'] },
  { key: 'scale', name: 'Skatt & Juridik', category: 'finance', keywords: ['skatt', 'juridik', 'advokat', 'rättvisa', 'skattedeklaration'] },
  { key: 'arrowdownup', name: 'Swish / Överföring', category: 'finance', keywords: ['överföring', 'swish', 'transaktion', 'växling', 'bankgiro'] },

  // Teknik & Media
  { key: 'smartphone', name: 'Mobil / Abonnemang', category: 'tech', keywords: ['mobil', 'telefon', 'abonnemang', 'telia', 'tele2', 'telenor', 'tre', 'halebop'] },
  { key: 'phone', name: 'Telefoni / Support', category: 'tech', keywords: ['telefon', 'samtal', 'support', 'kundtjänst'] },
  { key: 'laptop', name: 'Dator / Laptop', category: 'tech', keywords: ['dator', 'laptop', 'macbook', 'pc', 'arbete'] },
  { key: 'monitor', name: 'Bildskärm / Monitor', category: 'tech', keywords: ['skärm', 'dator', 'arbetsplats', 'kontor'] },
  { key: 'tablet', name: 'Surfplatta / iPad', category: 'tech', keywords: ['ipad', 'surfplatta', 'tablet'] },
  { key: 'wifi', name: 'Bredband & WiFi', category: 'tech', keywords: ['bredband', 'internet', 'wifi', 'router', 'fiber', 'bahnhof'] },
  { key: 'server', name: 'Hosting / Moln', category: 'tech', keywords: ['server', 'webbhotell', 'domän', 'hosting', 'cloud'] },
  { key: 'cpu', name: 'Komponenter / Hårdvara', category: 'tech', keywords: ['processor', 'hårdvara', 'komponenter', 'inet', 'komplett'] },
  { key: 'harddrive', name: 'Hårddisk / Backup', category: 'tech', keywords: ['lagring', 'backup', 'hårddisk', 'ssd'] },
  { key: 'battery', name: 'Batteri / Laddare', category: 'tech', keywords: ['batteri', 'laddning', 'tillbehör'] },
  { key: 'batterycharging', name: 'Elbilsladdning', category: 'tech', keywords: ['laddning', 'elbil', 'tesla', 'ionity', 'snabbladdare', 'mer'] },
  { key: 'printer', name: 'Skrivare & Toner', category: 'tech', keywords: ['skrivare', 'bläck', 'toner', 'papper'] },
  { key: 'bot', name: 'AI & Mjukvara', category: 'tech', keywords: ['ai', 'chatgpt', 'mjukvara', 'licens', 'copilot', 'programvara'] },
  { key: 'qrcode', name: 'QR / Digital betalning', category: 'tech', keywords: ['qr', 'skanna', 'betalning'] },
  { key: 'zap', name: 'Energi & Blixt', category: 'tech', keywords: ['el', 'tibber', 'energi', 'kraft', 'elavtal'] },
  { key: 'bell', name: 'Larm & Notiser', category: 'tech', keywords: ['larm', 'notiser', 'bevakning', 'verisure', 'sectoralarm'] },
  { key: 'mail', name: 'E-post & Brev', category: 'tech', keywords: ['mail', 'epost', 'brev', 'prenumeration'] },
  { key: 'message', name: 'SMS & Chatt', category: 'tech', keywords: ['sms', 'chatt', 'meddelanden'] },
  { key: 'key', name: 'Nyckel & Taggar', category: 'tech', keywords: ['nyckel', 'access', 'passersystem'] },
  { key: 'lock', name: 'Säkerhet & Lösenord', category: 'tech', keywords: ['lås', 'säkerhet', 'lösenord', 'vpn', 'skydd'] },
  { key: 'cloud', name: 'iCloud / Molnlagring', category: 'tech', keywords: ['icloud', 'google drive', 'dropbox', 'molnlagring', 'backup'] },

  // Natur & Djur
  { key: 'dog', name: 'Hund & Husdjur', category: 'nature', keywords: ['hund', 'djur', 'veterinär', 'hundmat', 'arkenzoo', 'valp'] },
  { key: 'cat', name: 'Katt & Djurtillbehör', category: 'nature', keywords: ['katt', 'kattmat', 'veterinär', 'kattlåda', 'zoo'] },
  { key: 'pawprint', name: 'Djurvård / Tass', category: 'nature', keywords: ['djur', 'tassar', 'agria', 'djurförsäkring', 'trim'] },
  { key: 'bird', name: 'Fågel / Trädgård', category: 'nature', keywords: ['fågel', 'fågelmat', 'trädgård'] },
  { key: 'bug', name: 'Skadedjurssanering', category: 'nature', keywords: ['anticimex', 'skadedjur', 'sanering', 'natur'] },
  { key: 'trees', name: 'Skog & Friluftsliv', category: 'nature', keywords: ['skog', 'friluftsliv', 'vandring', 'natur'] },
  { key: 'treepine', name: 'Gran & Barrskog', category: 'nature', keywords: ['julgran', 'vinter', 'tall', 'skog'] },
  { key: 'sprout', name: 'Odling & Växter', category: 'nature', keywords: ['odla', 'plantera', 'växter', 'blomsterlandet', 'plantagen'] },
  { key: 'flower', name: 'Blommor & Buketter', category: 'nature', keywords: ['blomma', 'bukett', 'interflora', 'växter'] },
  { key: 'flower2', name: 'Trädgård & Rabatt', category: 'nature', keywords: ['trädgård', 'rabatt', 'sommarblommor'] },
  { key: 'leaf', name: 'Natur & Miljö', category: 'nature', keywords: ['löv', 'miljö', 'ekologiskt', 'hållbarhet'] },
  { key: 'clover', name: 'Klöver & Lycka', category: 'nature', keywords: ['klöver', 'tur', 'lotto', 'spel'] },
  { key: 'mountain', name: 'Berg & Vandring', category: 'nature', keywords: ['berg', 'vandring', 'topptur', 'äventyr'] },
  { key: 'mountainsnow', name: 'Fjällen & Skidåkning', category: 'nature', keywords: ['skidor', 'snowboard', 'fjällen', 'åre', 'sälen', 'alperna'] },
  { key: 'tent', name: 'Tält & Camping', category: 'nature', keywords: ['camping', 'tälta', 'friluftsliv', 'husbil', 'husvagn'] },
  { key: 'sun', name: 'Sol & Sommar', category: 'nature', keywords: ['sol', 'sommar', 'solarium', 'solkräm'] },
  { key: 'moon', name: 'Natt & Kväll', category: 'nature', keywords: ['natt', 'vila', 'kväll'] },
  { key: 'snowflake', name: 'Vinter & Snö', category: 'nature', keywords: ['snö', 'vinter', 'halka', 'vinterdäck', 'plogning'] },

  // Resor & Hotell
  { key: 'plane', name: 'Flyg / Semester', category: 'travel', keywords: ['flyg', 'flygbiljett', 'resa', 'semester', 'sas', 'norwegian', 'plane'] },
  { key: 'planetakeoff', name: 'Flyg avgång', category: 'travel', keywords: ['avresa', 'semester', 'flygplats', 'arlanda', 'landvetter'] },
  { key: 'planelanding', name: 'Flyg ankomst', category: 'travel', keywords: ['landning', 'hemresa', 'ankomst'] },
  { key: 'hotel', name: 'Hotell & Boende', category: 'travel', keywords: ['hotell', 'övernattning', 'weekend', 'resort', 'spa', 'booking', 'airbnb'] },
  { key: 'luggage', name: 'Resväska & Bagage', category: 'travel', keywords: ['resväska', 'bagage', 'packning', 'charter', 'samsonite'] },
  { key: 'baggageclaim', name: 'Bagageutlämning', category: 'travel', keywords: ['flygplats', 'tull', 'ankomst', 'terminal'] },
  { key: 'palmtree', name: 'Solsemester & Bad', category: 'travel', keywords: ['sol', 'bad', 'charter', 'medelhavet', 'thailand', 'kanarieöarna'] },
  { key: 'compass', name: 'Äventyr & Orientering', category: 'travel', keywords: ['kompass', 'orientering', 'utflykt', 'safari'] },
  { key: 'globe', name: 'Utlandsresa / Valuta', category: 'travel', keywords: ['utland', 'internationellt', 'visum', 'valuta', 'världen'] },
  { key: 'mappin', name: 'Plats & Destination', category: 'travel', keywords: ['destination', 'plats', 'karta', 'adress'] },
  { key: 'sunset', name: 'Solnedgång & Utsikt', category: 'travel', keywords: ['kväll', 'utsikt', 'avkoppling', 'solnedgång'] },
  { key: 'sunrise', name: 'Soluppgång & Morgon', category: 'travel', keywords: ['morgon', 'tidigt', 'start'] },
  { key: 'flag', name: 'Land & Destination', category: 'travel', keywords: ['flagga', 'nationalitet', 'destination'] },

  // Barn & Familj
  { key: 'baby', name: 'Barn & Bebis', category: 'family', keywords: ['bebis', 'barn', 'förskola', 'barnbidrag', 'blöjor', 'leksaker', 'välling'] },
  { key: 'user', name: 'Personligt / Eget', category: 'family', keywords: ['personligt', 'profil', 'medlem', 'jag'] },
  { key: 'users', name: 'Familj & Hushåll', category: 'family', keywords: ['familj', 'vänner', 'förening', 'klubb', 'hushåll', 'gemensamt'] },
  { key: 'usercheck', name: 'Fickpengar / Barnkonto', category: 'family', keywords: ['fickpengar', 'veckopeng', 'barnkonto'] },
  { key: 'blocks', name: 'Leksaker & Barnpyssel', category: 'family', keywords: ['leksaker', 'klossar', 'barn', 'dagis', 'förskola', 'lego'] },

  // Jobb & Skola
  { key: 'work', name: 'Arbete / Jobb', category: 'work', keywords: ['jobb', 'arbete', 'konsult', 'företag', 'lön', 'kontor'] },
  { key: 'education', name: 'Studier & Examen', category: 'work', keywords: ['examen', 'universitet', 'högskola', 'csn', 'studier', 'student'] },
  { key: 'school', name: 'Skola & Kurser', category: 'work', keywords: ['skola', 'gymnasium', 'grundskola', 'kurs', 'lärare'] },
  { key: 'library', name: 'Bibliotek & Kurslitteratur', category: 'work', keywords: ['bibliotek', 'forskning', 'studier', 'litteratur', 'kursbok'] },
  { key: 'bookmark', name: 'Bokmärke & Sparat', category: 'work', keywords: ['bokmärke', 'sparat', 'viktigt'] },
  { key: 'backpack', name: 'Ryggsäck & Skolstart', category: 'work', keywords: ['ryggsäck', 'skolstart', 'pendla', 'packning'] },
  { key: 'calculator', name: 'Bokföring & Räkna', category: 'work', keywords: ['kalkylator', 'bokföring', 'skatt', 'matte', 'räkna'] },
  { key: 'pencil', name: 'Kontorsmaterial & Skriva', category: 'work', keywords: ['penna', 'anteckningar', 'block', 'kontorsmaterial'] },
  { key: 'paperclip', name: 'Dokument & Bilagor', category: 'work', keywords: ['gem', 'dokument', 'avtal', 'blanketter'] },
  { key: 'filetext', name: 'Avtal & Kontrakt', category: 'work', keywords: ['avtal', 'kontrakt', 'papper', 'faktura', 'pdf'] },
  { key: 'folder', name: 'Arkiv & Mappar', category: 'work', keywords: ['mapp', 'arkiv', 'sortering', 'ordning'] },
  { key: 'presentation', name: 'Presentation & Möten', category: 'work', keywords: ['presentation', 'möte', 'konferens', 'föreläsning'] },
  { key: 'milestone', name: 'Mål & Karriär', category: 'work', keywords: ['mål', 'plan', 'framsteg', 'karriär'] },
  { key: 'newspaper', name: 'Nyheter & Tidning', category: 'work', keywords: ['tidning', 'dn', 'svd', 'aftonbladet', 'expressen', 'nyheter'] },
  { key: 'megaphone', name: 'Annonser & Reklam', category: 'work', keywords: ['annons', 'marknadsföring', 'reklam'] },
  { key: 'send', name: 'Post & Försändelser', category: 'work', keywords: ['skicka', 'telegram', 'meddelande', 'leverera'] },
  { key: 'star', name: 'Favorit & Viktigt', category: 'work', keywords: ['favorit', 'betyg', 'viktigt', 'stjärna'] },
  { key: 'search', name: 'Sök & Utredning', category: 'work', keywords: ['sök', 'hitta', 'granska'] },
  { key: 'settings', name: 'Inställningar & Drift', category: 'work', keywords: ['inställningar', 'drift', 'konfiguration'] },
  { key: 'more', name: 'Övrigt & Diverse', category: 'work', keywords: ['övrigt', 'annat', 'diverse', 'blandat'] }
];

export const POPULAR_EMOJIS = [
  '🏷️', '🍔', '🍕', '🍣', '☕', '🥐', '🍦', '🍷', '🍺', '🛒',
  '🚗', '⛽', '✈️', '🚆', '🚲', '🚕', '🏠', '🛋️', '💡', '🧹',
  '🛍️', '👕', '👗', '👟', '💍', '🎁', '🎮', '🎬', '🎧', '🎸',
  '⚽', '🏋️', '🏊', '🎨', '📚', '💊', '🩺', '🦷', '💅', '✂️',
  '💰', '💳', '🏦', '📈', '🪙', '📱', '💻', '📺', '⚡', '📶',
  '🐶', '🐱', '🐾', '🌴', '🏖️', '🏕️', '🏔️', '👶', '🎓', '💼'
];

export const suggestIcon = (name?: string | null): string => {
  const n = (name || '').toLowerCase().trim();
  
  if (n.includes('lön') || n.includes('salary') || n.includes('inkomst')) return 'banknote';
  if (n.includes('hyra') || n.includes('hem') || n.includes('home') || n.includes('lägenhet') || n.includes('bostad')) return 'home';
  if (n.includes('bil') || n.includes('car') || n.includes('fordon')) return 'car';
  if (n.includes('el') || n.includes('elektr') || n.includes('ström')) return 'zap';
  if (n.includes('mobil') || n.includes('telefon') || n.includes('telenor') || n.includes('telia')) return 'smartphone';
  if (n.includes('internet') || n.includes('bredband') || n.includes('wifi')) return 'wifi';
  if (n.includes('tv') || n.includes('netflix') || n.includes('hbo') || n.includes('disney')) return 'tv';
  if (n.includes('mat') || n.includes('livsmedel') || n.includes('ica') || n.includes('coop') || n.includes('willys')) return 'shoppingcart';
  
  // Gym & Träning
  if (
    n.includes('gym') || 
    n.includes('träning') || 
    n.includes('traning') || 
    n.includes('fitness') || 
    n.includes('24seven') || 
    n.includes('24/7') || 
    n.includes('24 7') || 
    n.includes('f24s') || 
    n.includes('sats') || 
    n.includes('nordic wellness') || 
    n.includes('nordicwellness') || 
    n.includes('friskis') || 
    n.includes('svettis') || 
    n.includes('actic') || 
    n.includes('stc') || 
    n.includes('padel') || 
    n.includes('crossfit') || 
    n.includes('yoga') || 
    n.includes('simhall')
  ) return 'dumbbell';

  if (n.includes('bensin') || n.includes('diesel') || n.includes('tanka') || n.includes('drivmedel')) return 'fuel';
  if (n.includes('cykel') || n.includes('cykla')) return 'bike';
  if (n.includes('försäkring') || n.includes('insurance')) return 'shield';
  if (n.includes('spar') || n.includes('buffert') || n.includes('savings')) return 'savings';
  if (n.includes('resa') || n.includes('flyg') || n.includes('semester')) return 'plane';
  if (n.includes('hotell') || n.includes('airbnb') || n.includes('booking')) return 'hotel';
  if (n.includes('restaurang') || n.includes('äta') || n.includes('lunch') || n.includes('middag')) return 'utensils';
  if (n.includes('fika') || n.includes('kaffe') || n.includes('cafe')) return 'coffee';
  if (n.includes('öl') || n.includes('pub') || n.includes('bar')) return 'beer';
  if (n.includes('vin') || n.includes('systembolaget')) return 'wine';
  if (n.includes('hälsa') || n.includes('apotek') || n.includes('medicin')) return 'health';
  if (n.includes('djur') || n.includes('hund') || n.includes('katt')) return 'dog';
  if (n.includes('spel') || n.includes('gaming')) return 'gamepad';
  if (n.includes('kläder') || n.includes('shopping') || n.includes('mode')) return 'shirt';
  if (n.includes('prenumeration') || n.includes('youtube') || n.includes('spotify')) return 'music';
  if (n.includes('garage') || n.includes('parkering')) return 'parkingsquare';
  if (n.includes('a-kassa') || n.includes('unionen')) return 'shield';
  if (n.includes('icloud') || n.includes('moln')) return 'cloud';
  if (n.includes('bio') || n.includes('film')) return 'film';
  if (n.includes('frisör') || n.includes('klipp')) return 'scissors';
  
  return 'receipt'; // Default
};

export const calculateRelevanceScore = (item: IconItem, searchQuery: string): number => {
  if (!searchQuery || !searchQuery.trim()) return 1;
  const q = searchQuery.toLowerCase().trim();
  const nameLower = item.name.toLowerCase();
  const keyLower = item.key.toLowerCase();
  const keywords = item.keywords.map(k => k.toLowerCase());

  let score = 0;
  const normalize = (str: string) => str.replace(/(ar|er|n|s|r)$/g, '');
  const qNorm = normalize(q);

  // 1. Exact matches
  if (nameLower === q || keyLower === q || keywords.includes(q)) {
    score += 150;
  }

  // 2. Starts with query
  if (nameLower.startsWith(q) || keyLower.startsWith(q) || keywords.some(k => k.startsWith(q))) {
    score += 90;
  }

  // 3. Inclusion
  if (nameLower.includes(q) || keyLower.includes(q)) {
    score += 60;
  }

  for (const kw of keywords) {
    const kwNorm = normalize(kw);
    if (kw.includes(q) || q.includes(kw) || kwNorm.includes(qNorm) || qNorm.includes(kwNorm)) {
      score += 80;
    }
  }

  // 4. Token matching
  const tokens = q.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    const tokenNorm = normalize(token);
    if (nameLower.includes(token) || keyLower.includes(token)) {
      score += 30;
    }
    for (const kw of keywords) {
      if (kw.includes(token) || normalize(kw).includes(tokenNorm) || tokenNorm.includes(normalize(kw))) {
        score += 40;
      }
    }
  }

  return score;
};

export const getSuggestedIconsForQuery = (query: string, limit = 6): IconItem[] => {
  if (!query || !query.trim()) return [];
  const scored = ALL_ICONS_LIST.map(item => ({
    item,
    score: calculateRelevanceScore(item, query)
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.filter(s => s.score > 0).slice(0, limit).map(s => s.item);
};

export const suggestCategory = (
  name?: string | null,
  availableCategories?: { name: string }[]
): string | undefined => {
  if (!name || !availableCategories || availableCategories.length === 0) return undefined;
  const n = (name || '').toLowerCase().trim();

  const match = (keywords: string[]) => {
    return availableCategories.find(c => {
      const catLower = (c?.name || '').toLowerCase();
      return keywords.some(k => catLower.includes(k) || k.includes(catLower));
    })?.name;
  };

  // Gym / Träning / Hälsa
  if (
    n.includes('fitness') ||
    n.includes('24/7') ||
    n.includes('24 7') ||
    n.includes('24seven') ||
    n.includes('f24s') ||
    n.includes('gym') ||
    n.includes('träning') ||
    n.includes('traning') ||
    n.includes('sats') ||
    n.includes('nordic wellness') ||
    n.includes('nordicwellness') ||
    n.includes('friskis') ||
    n.includes('svettis') ||
    n.includes('actic') ||
    n.includes('stc') ||
    n.includes('padel') ||
    n.includes('crossfit') ||
    n.includes('yoga')
  ) {
    return match(['träning', 'gym', 'hälsa', 'friskvård', 'nöje']);
  }

  // Livsmedel & Matbutiker
  if (
    n.includes('ica') ||
    n.includes('coop') ||
    n.includes('willys') ||
    n.includes('lidl') ||
    n.includes('hemköp') ||
    n.includes('matrebellerna') ||
    n.includes('tempo') ||
    n.includes('city gross')
  ) {
    return match(['mat', 'livsmedel', 'matvaror', 'hushåll']);
  }

  // Restaurang & Fika
  if (
    n.includes('mcdonalds') ||
    n.includes('donken') ||
    n.includes('max') ||
    n.includes('burger king') ||
    n.includes('subway') ||
    n.includes('pizza') ||
    n.includes('sushi') ||
    n.includes('espresso house') ||
    n.includes('starbucks') ||
    n.includes('restaurang') ||
    n.includes('krog') ||
    n.includes('cafe') ||
    n.includes('bageri')
  ) {
    return match(['restaurang', 'fika', 'äta ute', 'mat']);
  }

  // Resor & Transport
  if (
    n.includes('sl') ||
    n.includes('sj') ||
    n.includes('skånetrafiken') ||
    n.includes('västtrafik') ||
    n.includes('uber') ||
    n.includes('bolt') ||
    n.includes('taxi') ||
    n.includes('sas') ||
    n.includes('norwegian') ||
    n.includes('ryanair') ||
    n.includes('tanka') ||
    n.includes('bensin') ||
    n.includes('circle k') ||
    n.includes('preem') ||
    n.includes('okq8') ||
    n.includes('ingomack') ||
    n.includes('st1')
  ) {
    return match(['transport', 'resor', 'pendling', 'bil']);
  }

  // Hälsa & Apotek
  if (
    n.includes('apotek') ||
    n.includes('apotea') ||
    n.includes('kry') ||
    n.includes('mindoktor') ||
    n.includes('doktor.se') ||
    n.includes('folktandvården') ||
    n.includes('tandläkare')
  ) {
    return match(['hälsa', 'vård', 'apotek', 'sjukvård']);
  }

  // Shopping & Kläder
  if (
    n.includes('h&m') ||
    n.includes('zara') ||
    n.includes('zalando') ||
    n.includes('åhlens') ||
    n.includes('amazon') ||
    n.includes('ikea') ||
    n.includes('clas ohlson') ||
    n.includes('elgiganten') ||
    n.includes('mediamarkt') ||
    n.includes('power')
  ) {
    return match(['shopping', 'kläder', 'hem', 'inredning']);
  }

  // Nöje & Streaming
  if (
    n.includes('spotify') ||
    n.includes('netflix') ||
    n.includes('hbo') ||
    n.includes('disney') ||
    n.includes('viaplay') ||
    n.includes('steam') ||
    n.includes('playstation') ||
    n.includes('xbox') ||
    n.includes('nintendo') ||
    n.includes('filmstaden') ||
    n.includes('bio')
  ) {
    return match(['nöje', 'underhållning', 'abonnemang', 'streaming']);
  }

  // Hotell & Resor
  if (
    n.includes('airbnb') ||
    n.includes('hotel') ||
    n.includes('booking') ||
    n.includes('resa') ||
    n.includes('semester')
  ) {
    return match(['resor', 'resa', 'semester']);
  }

  return undefined;
};

export const getPaymentMethodIcon = (method: string): any => {
  const m = method.toLowerCase();
  if (m.includes('apple')) return Apple;
  if (m.includes('kort')) return CreditCard;
  if (m.includes('swish')) return Smartphone;
  if (m.includes('klarna')) return ShoppingBag;
  if (m.includes('paypal')) return Wallet;
  if (m.includes('faktura')) return Receipt;
  if (m.includes('autogiro')) return RotateCcw;
  if (m.includes('kontant')) return Banknote;
  if (m.includes('överföring') || m.includes('bank')) return Landmark;
  return Wallet;
};
