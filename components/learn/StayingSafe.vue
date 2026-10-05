<script setup lang="ts">
import LessonShell from '../LessonShell.vue'
import AppNotice from '../AppNotice.vue'
import GlossaryTerm from '../GlossaryTerm.vue'
import QuizBlock from '../QuizBlock.vue'
import { useLessonProgress } from '../../composables/useLessonProgress'
import { useProgress } from '../../composables/useProgress'
import { SAFETY_QUESTIONS } from '../../content/lessons/staying-safe'
import { ref } from 'vue'

const { markLessonDone } = useLessonProgress()
const { saveQuizScore } = useProgress()

/*
 * Passing the quiz is the substantive completion gate for this lesson: it
 * marks the lesson done and records the score. LessonShell's footer button
 * still marks done too — it stays as the navigation path onward.
 */
const quizPassed = ref(false)

function onQuizPassed(score: number, total: number) {
  markLessonDone('staying-safe')
  saveQuizScore('staying-safe', score, total)
  quizPassed.value = true
}
</script>

<template>
  <LessonShell
    lesson-slug="staying-safe"
    title="Staying safe"
    intro="A few simple habits protect everything you have learned so far. Here is how to keep your money and your information safe — with a short quiz at the end to prove to yourself that you have got it."
  >
    <section>
      <h2>The one rule that protects everything</h2>
      <p>
        Everything in this lesson comes down to a single rule: never share your
        <GlossaryTerm term="recovery-phrase">recovery phrase</GlossaryTerm> with anyone.
        It is the only key to your money, and whoever holds it can take everything —
        with no way to get it back.
      </p>
      <p>
        Here is a helpful way to remember it. The bank will never call you asking for
        your password — and no real
        <GlossaryTerm term="wallet">wallet</GlossaryTerm> support will ever ask for your
        recovery phrase. Not by phone, not by email, not by text message. Anyone who
        asks is a thief, no matter how friendly or official they sound.
      </p>
    </section>

    <section>
      <h2>The tricks you might meet</h2>
      <p>
        Most tricks look the same once you know them. Someone calls or writes claiming
        to be from "wallet support" and says there is a problem with your account.
        Someone promises a prize, a gift, or a wonderful investment — if you send a
        little money first. Someone sends an urgent message asking you to "verify" your
        wallet by typing in your recovery phrase.
      </p>
      <p>
        The giveaway is always the same: they rush you, and they ask for something
        secret. Real companies never work this way. If a message makes you feel hurried
        or worried, that is your cue to stop. Hang up, delete the message, and take a
        breath. You are in charge — nobody can hurry you into a decision about your
        own money.
      </p>
    </section>

    <section>
      <h2>Careful habits when sending</h2>
      <p>
        Sending money on Solana is quick and final — there is no "undo" button and no
        manager who can reverse it. Two small habits make it safe. First, check the
        recipient's address carefully: make sure the first and last few characters match
        exactly what they gave you. Second, when you are trying something new, start
        with a small amount you could afford to lose — you can always send more once
        the first payment arrives safely.
      </p>
      <p>
        These habits take seconds, and soon they will feel as natural as counting your
        change.
      </p>
    </section>

    <section>
      <h2>Check your instincts</h2>
      <p>
        Four quick questions, just for you. There is no failing here — a wrong answer
        simply lets you try again, and finishing the quiz marks this lesson complete.
      </p>
      <QuizBlock :questions="SAFETY_QUESTIONS" @passed="onQuizPassed" />
      <AppNotice v-if="quizPassed" kind="success" class="staying-safe__passed">
        Well done — you passed the safety quiz, and this lesson is now marked complete.
      </AppNotice>
    </section>
  </LessonShell>
</template>
