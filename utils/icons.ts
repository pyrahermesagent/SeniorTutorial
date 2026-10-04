import type { FunctionalComponent } from 'vue'
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleCheck,
  Copy,
  ExternalLink,
  GraduationCap,
  Info,
  LoaderCircle,
  LogOut,
  Menu,
  Rocket,
  TriangleAlert,
  Trophy,
  Wallet,
  X,
} from 'lucide-vue-next'

/*
 * Curated icon set — the only lucide icons bundled into the app.
 * Keys are kebab-case lucide names; add new icons here as tasks need them.
 */
export const iconMap: Record<string, FunctionalComponent> = {
  wallet: Wallet,
  'graduation-cap': GraduationCap,
  'arrow-right': ArrowRight,
  check: Check,
  info: Info,
  'triangle-alert': TriangleAlert,
  'circle-check': CircleCheck,
  'loader-circle': LoaderCircle,
  menu: Menu,
  x: X,
  copy: Copy,
  'log-out': LogOut,
  'chevron-down': ChevronDown,
  'external-link': ExternalLink,
  rocket: Rocket,
  trophy: Trophy,
  'book-open': BookOpen,
}
