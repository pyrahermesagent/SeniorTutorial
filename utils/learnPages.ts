import type { Component } from 'vue'
import WhatIsMoney from '../components/learn/WhatIsMoney.vue'
import SharedNotebook from '../components/learn/SharedNotebook.vue'

/** Registry mapping lesson slug → its content component. Later lesson tasks add entries here. */
export const LEARN_PAGES: Record<string, Component> = {
  'what-is-money': WhatIsMoney,
  'shared-notebook': SharedNotebook,
}
