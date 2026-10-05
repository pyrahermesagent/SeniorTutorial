<script setup lang="ts">
import { ref } from 'vue'
import LessonShell from '../LessonShell.vue'
import InteractiveFigure from '../InteractiveFigure.vue'
import LedgerSim from './LedgerSim.vue'
import { slides } from '../../content/lessons/shared-notebook'

const ledgerKey = ref(0)
</script>

<template>
  <LessonShell
    lesson-slug="shared-notebook"
    title="The shared notebook"
    intro="A notebook everyone can read — and no one can secretly change."
    :slides="slides"
  >
    <template #sim>
      <InteractiveFigure @replay="ledgerKey += 1">
        <LedgerSim :key="ledgerKey" />
        <template #caption>
          Add a line, then cheat one copy — the others vote it back into line.
        </template>
      </InteractiveFigure>
    </template>
  </LessonShell>
</template>
