<script setup lang="ts">
import { ref } from 'vue'
import LessonShell from '../LessonShell.vue'
import InteractiveFigure from '../InteractiveFigure.vue'
import KeypairDemo from './KeypairDemo.vue'
import { slides } from '../../content/lessons/wallets-and-keys'

const demoKey = ref(0)
</script>

<template>
  <LessonShell
    lesson-slug="wallets-and-keys"
    title="Your wallet and your keys"
    intro="Two things: one to share, one to guard."
    :slides="slides"
  >
    <template #sim>
      <InteractiveFigure @replay="demoKey += 1">
        <KeypairDemo :key="demoKey" />
        <template #caption>Make a practice address — it never leaves your device.</template>
      </InteractiveFigure>
    </template>
  </LessonShell>
</template>
