<script setup lang="ts">
import LessonShell from '../LessonShell.vue'
import InteractiveFigure from '../InteractiveFigure.vue'
import GlossaryTerm from '../GlossaryTerm.vue'
import LedgerSim from './LedgerSim.vue'
import { ref } from 'vue'

const ledgerKey = ref(0)
</script>

<template>
  <LessonShell
    lesson-slug="shared-notebook"
    title="The shared notebook"
    intro="Solana keeps its records in a notebook that thousands of computers share — and that is exactly why no one can secretly change it."
  >
    <section>
      <h2>One notebook, thousands of keepers</h2>
      <p>
        In lesson 1, the bank kept the one official record of who owns what. Solana does it
        differently: the record book is shared. Thousands of independent computers each hold
        an identical copy of the same notebook, and every new line — "Anna pays Marco
        2 SOL" — is written into all of them at the same time.
      </p>
      <p>
        This shared notebook is called a
        <GlossaryTerm term="blockchain">blockchain</GlossaryTerm>, and the computers that
        keep the copies honest are called
        <GlossaryTerm term="validator">validators</GlossaryTerm>.
      </p>
    </section>

    <section>
      <h2>Why cheating is pointless</h2>
      <p>
        Suppose you secretly changed a line in your own copy — 2 SOL becomes 200 SOL. The
        moment the copies are compared, yours is the odd one out. The other notebooks vote
        against it, and your copy is corrected to match. One altered copy accomplishes
        nothing.
      </p>
      <p>
        To actually cheat, you would have to rewrite most of the thousands of copies at the
        very same moment, without anyone noticing. That is what keeps the shared notebook
        honest: not one guard you have to trust, but thousands of copies checking each other.
      </p>
    </section>

    <section>
      <h2>What this means for you</h2>
      <p>
        When you receive money on Solana, you do not have to take anyone's word for it.
        Anyone — including you — can open the shared notebook and see the line written there,
        matching thousands of identical copies. Trust comes from agreement, not from a
        promise.
      </p>
    </section>

    <template #sim>
      <InteractiveFigure @replay="ledgerKey += 1">
        <LedgerSim :key="ledgerKey" />
        <template #caption>
          Add a line and watch it land in every copy — then try to cheat one notebook and
          see the others vote it back into line.
        </template>
      </InteractiveFigure>
    </template>
  </LessonShell>
</template>
