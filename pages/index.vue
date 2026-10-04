<script setup lang="ts">
const appConfig = useAppConfig()
</script>

<template>
  <main>
    <h1>{{ appConfig.brand }}</h1>
    <p>Lessons and practice challenges are on their way.</p>
  </main>
</template>
