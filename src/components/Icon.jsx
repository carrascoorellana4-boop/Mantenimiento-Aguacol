import {
  Home, BarChart3, ClipboardList, BookOpen, Network, Package, Plus, PackageMinus, ShoppingCart, Wrench, Settings,
  Landmark, Factory, Droplets, Search, X, ChevronDown, ChevronRight, Zap, FolderOpen, Check, Pencil, Clock,
  TriangleAlert, RefreshCw, ShieldCheck, Ruler, Hourglass, Ban, CircleCheck, Timer, Cog, Snowflake, Handshake,
  FileText, Files, BookMarked, Tag, CreditCard, Banknote, PartyPopper, CalendarDays, User, Target,
} from 'lucide-react'

// Un solo lugar para los íconos de la app: nombre -> componente (trazo uniforme, hereda color y tamaño del texto).
const ICONS = {
  home: Home, chart: BarChart3, list: ClipboardList, book: BookOpen, tree: Network, box: Package, plus: Plus,
  out: PackageMinus, cart: ShoppingCart, tools: Wrench, cog: Settings, parent: Landmark, factory: Factory,
  flask: Droplets, search: Search, x: X, down: ChevronDown, right: ChevronRight, zap: Zap, folder: FolderOpen,
  check: Check, edit: Pencil, clock: Clock, warn: TriangleAlert, refresh: RefreshCw, shield: ShieldCheck,
  ruler: Ruler, wait: Hourglass, ban: Ban, done: CircleCheck, timer: Timer, gear: Cog, snow: Snowflake,
  link: Handshake, doc: FileText, docs: Files, manual: BookMarked, tag: Tag, card: CreditCard, money: Banknote,
  party: PartyPopper, calendar: CalendarDays, user: User, target: Target,
}

// Los datos del árbol de activos traían un emoji por área: se aceptan y se traducen al ícono equivalente.
const LEGACY = { '🏭': 'factory', '🧴': 'flask', '⚙️': 'cog', '⚙': 'cog', '🛠️': 'tools', '🛠': 'tools', '📦': 'box' }

export default function Icon({ n, size = '1em', strokeWidth = 1.9, className = '', ...rest }) {
  const Cmp = ICONS[LEGACY[n] || n] || ICONS.box
  return <Cmp width={size} height={size} strokeWidth={strokeWidth} className={`ico ${className}`.trim()} aria-hidden="true" focusable="false" {...rest} />
}
