<script setup lang="ts">
import { ref } from 'vue'
import LessonShell from '../LessonShell.vue'
import InteractiveFigure from '../InteractiveFigure.vue'
import LiveNetworkStats from './LiveNetworkStats.vue'
import FeeComparisonSlider from './FeeComparisonSlider.vue'
import { slides } from '../../content/lessons/why-solana'

const statsKey = ref(0)
</script>

<template>
  <LessonShell
    lesson-slug="why-solana"
    title="Why Solana?"
    intro="Fast, cheap, always on — and you can watch it work right now."
    :slides="slides"
  >
    <template #sim>
      <FeeComparisonSlider />
      <InteractiveFigure @replay="statsKey += 1">
        <LiveNetworkStats :key="statsKey" />
        <template #caption>Live from the real network, right now. Press Replay to refresh.</template>
      </InteractiveFigure>
    </template>
  </LessonShell>
</template>
