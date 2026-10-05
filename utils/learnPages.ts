import type { Component } from 'vue'
import WhatIsMoney from '../components/learn/WhatIsMoney.vue'
import SharedNotebook from '../components/learn/SharedNotebook.vue'
import WhosInCharge from '../components/learn/WhosInCharge.vue'
import WhySolana from '../components/learn/WhySolana.vue'
import WalletsAndKeys from '../components/learn/WalletsAndKeys.vue'
import StayingSafe from '../components/learn/StayingSafe.vue'

/** Registry mapping lesson slug → its content component. Later lesson tasks add entries here. */
export const LEARN_PAGES: Record<string, Component> = {
  'what-is-money': WhatIsMoney,
  'shared-notebook': SharedNotebook,
  'whos-in-charge': WhosInCharge,
  'why-solana': WhySolana,
  'wallets-and-keys': WalletsAndKeys,
  'staying-safe': StayingSafe,
}
