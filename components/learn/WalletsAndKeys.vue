<script setup lang="ts">
import LessonShell from '../LessonShell.vue'
import InteractiveFigure from '../InteractiveFigure.vue'
import GlossaryTerm from '../GlossaryTerm.vue'
import KeypairDemo from './KeypairDemo.vue'
import { ref } from 'vue'

const demoKey = ref(0)
</script>

<template>
  <LessonShell
    lesson-slug="wallets-and-keys"
    title="Your wallet and your keys"
    intro="A wallet looks after two very different things for you: an address you can share with anyone, and a secret you must share with no one. Here is the difference."
  >
    <section>
      <h2>Your money lives in the notebook</h2>
      <p>
        A <GlossaryTerm term="wallet">wallet</GlossaryTerm> sounds like a purse that holds
        your coins, but it works differently. Your money is written in the shared notebook
        from lesson 2 — it never sits inside the app. What the wallet app holds is the proof
        that those notebook entries belong to you.
      </p>
      <p>
        Think of a mailbox at the post office. The mail itself sits in the box, and the box
        has two things: an address written on the front, and a key that opens it. A wallet
        looks after exactly those two things for you.
      </p>
    </section>

    <section>
      <h2>The address on the front — safe to share</h2>
      <p>
        Your <GlossaryTerm term="public-key">public address</GlossaryTerm> is like the
        address on the mailbox. It is a long string of letters and numbers, and it is safe
        to share with anyone. When a friend wants to send you money, your address is all
        they need — just like they need your home address to mail you a birthday card.
      </p>
      <p>
        Sharing it cannot hurt you. The worst a stranger can do with your address is send
        you something. Try making a practice address below — it takes one tap, and nothing
        leaves your device.
      </p>
    </section>

    <section>
      <h2>The only key to the mailbox — share with no one</h2>
      <p>
        Your <GlossaryTerm term="recovery-phrase">recovery phrase</GlossaryTerm> is the key
        to the mailbox. It is a short list of ordinary words the wallet shows you once, when
        you first set it up. Whoever holds those words can open the mailbox and take
        everything inside — there is no manager to call and no way to take the money back.
      </p>
      <p>
        So the rule is absolute: never share your recovery phrase. Not with the app, which
        will never ask for it again. Not with "support" — anyone who asks is a thief. Not
        even with family. Write it on paper, keep it somewhere safe at home, and let it
        stay your secret alone.
      </p>
    </section>

    <template #sim>
      <InteractiveFigure @replay="demoKey += 1">
        <KeypairDemo :key="demoKey" />
        <template #caption>
          Make a practice address and try copying it — the secret part is thrown away the
          moment you leave this page.
        </template>
      </InteractiveFigure>
    </template>
  </LessonShell>
</template>
