import React from 'react'
import {
  Sprout,
  Wheat,
  Leaf,
  Trees,
  Tractor,
  Droplets,
  Gauge,
  Waves,
  Zap,
  Sun,
  Battery,
  Activity,
  Video,
  Camera,
  Moon,
  Eye,
  Radio,
  Thermometer,
  Compass,
  Cpu,
  Route,
  Waypoints,
  Shield,
  ShieldCheck,
  Map,
  MapPin,
  ShoppingCart,
  Store,
  Package,
  CreditCard,
  Tag,
  Box,
  Check,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  ArrowLeft,
  ArrowRight,
  Search,
  LogOut,
  User,
  Users,
  BarChart3,
  Layers,
  Settings,
  Clock,
  Sparkles,
  Phone,
  Mail,
  FileText,
  Calendar,
  ChevronDown,
  ChevronRight,
  Filter,
  Plus,
  RefreshCw,
  Sliders,
  Award,
  Circle,
  HelpCircle
} from 'lucide-react'

// Master Icon Registry
const ICON_MAP = {
  // Agriculture & Crops
  sprout: Sprout,
  wheat: Wheat,
  leaf: Leaf,
  tree: Trees,
  tractor: Tractor,
  crop: Sprout,
  seed: Sprout,
  tomato: Sprout,
  onion: Sprout,
  potato: Sprout,
  banana: Sprout,
  mango: Trees,
  carrot: Sprout,
  cabbage: Leaf,
  cauliflower: Sprout,
  rice: Wheat,
  cotton: Leaf,
  groundnut: Sprout,
  chilli: Sprout,
  sugarcane: Wheat,
  maize: Wheat,
  soybean: Leaf,

  // Water & Borewells
  water: Droplets,
  droplets: Droplets,
  borewell: Droplets,
  pump: Gauge,
  gauge: Gauge,
  waves: Waves,
  pipeline: Route,

  // Energy & Solar
  power: Zap,
  zap: Zap,
  solar: Sun,
  sun: Sun,
  battery: Battery,
  activity: Activity,
  feeder: Zap,

  // Devices & Sensors
  cctv: Video,
  video: Video,
  camera: Camera,
  sensor: Radio,
  radio: Radio,
  iot: Cpu,
  thermometer: Thermometer,
  temperature: Thermometer,
  moisture: Droplets,
  ec: Compass,

  // Land, Map & Boundaries
  map: Map,
  mapPin: MapPin,
  location: MapPin,
  boundary: Shield,
  fence: Shield,
  road: Route,
  divider: Waypoints,
  zone: Layers,
  layers: Layers,

  // Commerce & Marketplace
  cart: ShoppingCart,
  shoppingCart: ShoppingCart,
  store: Store,
  marketplace: Store,
  package: Package,
  order: Package,
  orders: Package,
  box: Box,
  tag: Tag,
  payment: CreditCard,
  verified: ShieldCheck,
  award: Award,

  // Navigation & Actions
  home: Store,
  back: ArrowLeft,
  forward: ArrowRight,
  close: X,
  check: Check,
  checkCircle: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
  search: Search,
  logout: LogOut,
  user: User,
  users: Users,
  farmer: User,
  dealer: Store,
  surveyor: Compass,
  admin: Shield,
  consumer: ShoppingCart,
  stats: BarChart3,
  chart: BarChart3,
  settings: Settings,
  clock: Clock,
  night: Moon,
  moon: Moon,
  snapshot: Camera,
  sparkles: Sparkles,
  phone: Phone,
  mail: Mail,
  document: FileText,
  calendar: Calendar,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  filter: Filter,
  plus: Plus,
  refresh: RefreshCw,
  sliders: Sliders,
  circle: Circle,
  default: HelpCircle
}

/**
 * emojiToIconKey
 * Maps stored farmer emojis to clean icon keys at render time.
 * Strictly non-destructive — saved farmer data remains untouched.
 */
export function emojiToIconKey(emoji) {
  if (!emoji || typeof emoji !== 'string') return 'sprout'
  const clean = emoji.trim()
  
  // Crop & nature emojis
  if (['🌾', '🌾'].includes(clean)) return 'wheat'
  if (['🍅', '🧅', '🥔', '🥕', '🥬', '🥦', '🌽', '🥜', '🌶️'].includes(clean)) return 'sprout'
  if (['🥭', '🍌', '🌴', '🌳', '🌲'].includes(clean)) return 'tree'
  if (['🌱', '🌿', '☘️', '🍀'].includes(clean)) return 'leaf'
  
  // Device & infrastructure emojis
  if (['💧', '🚰', '🌊'].includes(clean)) return 'droplets'
  if (['📹', '📷', '🎥'].includes(clean)) return 'video'
  if (['⚡', '🔋', '🔌'].includes(clean)) return 'power'
  if (['📡', '📶'].includes(clean)) return 'sensor'
  if (['🚜'].includes(clean)) return 'tractor'
  if (['🛡️', '🚧', '📐'].includes(clean)) return 'boundary'
  if (['🗺️', '📍'].includes(clean)) return 'mapPin'
  
  // Commerce & status emojis
  if (['🛒'].includes(clean)) return 'cart'
  if (['📦', '📬', '🏷️'].includes(clean)) return 'package'
  if (['⭐', '🌟', '✨', '✓', '✅'].includes(clean)) return 'verified'
  if (['🧑‍🌾', '👨‍🌾', '👩‍🌾', '👤'].includes(clean)) return 'farmer'
  if (['🏭', '🏪', '🏬'].includes(clean)) return 'store'
  if (['📸'].includes(clean)) return 'camera'
  if (['🌙'].includes(clean)) return 'night'
  if (['☀️', '🌞'].includes(clean)) return 'solar'

  return 'sprout'
}

/**
 * Icon Component
 * Universal vector icon renderer using Lucide icons.
 * Consistent 1.75 stroke width, standard size tokens, currentColor styling.
 */
export default function Icon({
  name,
  size = 20,
  className = '',
  color,
  strokeWidth = 1.75,
  'aria-label': ariaLabel,
  title,
  ...props
}) {
  const normalizedKey = (name || 'default').toLowerCase().replace(/[-_]/g, '')
  const Component = ICON_MAP[name] || ICON_MAP[normalizedKey] || ICON_MAP.default

  const sizeClass =
    typeof size === 'number'
      ? ''
      : size === 'sm'
      ? 'w-4 h-4'
      : size === 'lg'
      ? 'w-6 h-6'
      : 'w-5 h-5'

  const inlineSize = typeof size === 'number' ? { width: size, height: size } : {}

  return (
    <Component
      className={`inline-block shrink-0 align-middle ${sizeClass} ${className}`}
      style={{
        ...inlineSize,
        strokeWidth,
        color: color || 'currentColor',
        ...(props.style || {})
      }}
      aria-hidden={!ariaLabel && !title ? 'true' : undefined}
      aria-label={ariaLabel}
      {...props}
    >
      {title && <title>{title}</title>}
    </Component>
  )
}
