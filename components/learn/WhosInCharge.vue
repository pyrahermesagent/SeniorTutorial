<script setup lang="ts">
import { ref } from 'vue'
import LessonShell from '../LessonShell.vue'
import InteractiveFigure from '../InteractiveFigure.vue'
import NodeNetworkSim from './NodeNetworkSim.vue'
import { slides } from '../../content/lessons/whos-in-charge'

const networkKey = ref(0)
</script>

<template>
  <LessonShell
    lesson-slug="whos-in-charge"
    title="Who's in charge here?"
    intro="With a bank, the bank is. With Solana — that's the point."
    :slides="slides"
  >
    <template #sim>
      <InteractiveFigure @replay="networkKey += 1">
        <NodeNetworkSim :key="networkKey" />
        <template #caption>
          Unplug the one server on the left — then try to switch off the right.
        </template>
      </InteractiveFigure>
    </template>
  </LessonShell>
</template>
