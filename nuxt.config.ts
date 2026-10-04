export default defineNuxtConfig({
  ssr: true,
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || '/',
  },
  nitro: {
    prerender: {
      crawlLinks: true,
      failOnError: false,
    },
  },
  css: ['~/assets/css/main.css'],
  modules: [],
  compatibilityDate: '2026-10-04',
})
