<script setup lang="ts">
import { ref } from 'vue'
import LessonShell from '../LessonShell.vue'
import InteractiveFigure from '../InteractiveFigure.vue'
import TransferRaceSim from './TransferRaceSim.vue'
import { slides } from '../../content/lessons/what-is-money'

const raceKey = ref(0)
</script>

<template>
  <LessonShell
    lesson-slug="what-is-money"
    title="What is money, anyway?"
    intro="See why a newer kind of money is worth a closer look."
    :slides="slides"
  >
    <template #sim>
      <InteractiveFigure @replay="raceKey += 1">
        <TransferRaceSim :key="raceKey" />
        <template #caption>Watch $50 travel two ways: bank vs. Solana.</template>
      </InteractiveFigure>
    </template>
  </LessonShell>
</template>
