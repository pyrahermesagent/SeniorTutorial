<script setup lang="ts">
import { computed } from 'vue'
import { iconMap } from '../utils/icons'

const props = withDefaults(
  defineProps<{
    name: string
    size?: number
  }>(),
  { size: 24 },
)

const icon = computed(() => {
  const component = iconMap[props.name]
  if (!component && import.meta.dev) {
    console.warn(`[AppIcon] Unknown icon name: "${props.name}". Add it to utils/icons.ts.`)
  }
  return component
})
</script>

<template>
  <component
    :is="icon"
    v-if="icon"
    :size="size"
    :stroke-width="2"
    aria-hidden="true"
    class="app-icon"
  />
</template>
