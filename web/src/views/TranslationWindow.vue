<!--
  Standalone Window for Sentence-by-Sentence Parallel Translations.
  Opened in a separate browser window or tab via window.open() for dual-screen or side-by-side reading.
-->
<template>
  <div class="min-h-screen bg-bg text-foreground">
    <!-- Sticky Top Header -->
    <header class="sticky top-0 z-30 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur shadow-xs">
      <div class="mx-auto flex max-w-4xl items-center justify-between gap-3">
        <!-- Title & Subtitle -->
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="rounded bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary uppercase tracking-wide">
              {{ currentLang === 'en' ? 'English Translation' : 'हिन्दी अनुवाद' }}
            </span>
            <span v-if="filteredTranslations.length" class="text-xs text-muted">
              {{ filteredTranslations.length }} {{ currentLang === 'en' ? 'paragraphs' : 'परिच्छेद' }}
            </span>
          </div>
          <h1 class="truncate font-serif text-lg font-bold text-foreground sm:text-xl">
            {{ displayTitle }}
          </h1>
        </div>

        <!-- Controls Toolbar -->
        <div class="flex items-center gap-2">
          <!-- Language Toggle -->
          <div class="inline-flex items-center rounded-lg border border-line bg-surface p-0.5 text-xs shadow-xs">
            <button
              type="button"
              class="px-2.5 py-1 rounded font-semibold transition-all cursor-pointer"
              :class="currentLang === 'en' ? 'bg-primary text-white shadow-xs' : 'text-muted hover:text-foreground'"
              @click="setLang('en')"
            >
              EN
            </button>
            <button
              type="button"
              class="px-2.5 py-1 rounded font-semibold transition-all cursor-pointer"
              :class="currentLang === 'hi' ? 'bg-primary text-white shadow-xs' : 'text-muted hover:text-foreground'"
              @click="setLang('hi')"
            >
              HI
            </button>
          </div>

          <!-- Font Size Adjustment -->
          <div class="hidden sm:inline-flex items-center rounded-lg border border-line bg-surface p-0.5 text-xs">
            <button
              type="button"
              class="px-2 py-1 text-muted hover:text-foreground font-semibold cursor-pointer"
              title="Decrease font size"
              @click="adjustFontSize(-1)"
            >
              A-
            </button>
            <span class="px-1.5 text-[0.7rem] text-muted font-mono">{{ fontSize }}px</span>
            <button
              type="button"
              class="px-2 py-1 text-muted hover:text-foreground font-semibold cursor-pointer"
              title="Increase font size"
              @click="adjustFontSize(1)"
            >
              A+
            </button>
          </div>

          <!-- Print Button -->
          <button
            type="button"
            class="hidden sm:inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary hover:text-primary transition-all cursor-pointer"
            title="Print Translation"
            @click="printWindow"
          >
            <IconPrinter class="h-3.5 w-3.5" />
            <span>Print</span>
          </button>

          <!-- Close Window Button -->
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-muted hover:bg-surface2 hover:text-foreground transition-all cursor-pointer"
            title="Close this window"
            @click="closeWindow"
          >
            <IconX class="h-4 w-4" />
            <span class="hidden sm:inline">Close</span>
          </button>
        </div>
      </div>

      <!-- Quick Search Bar inside header -->
      <div class="mx-auto mt-2 max-w-4xl">
        <div class="relative">
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Search translation text / अनुवाद में खोजें..."
            class="w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
          />
          <span v-if="searchQuery" class="absolute right-2.5 top-2 text-[0.7rem] text-muted">
            {{ filteredTranslations.length }} matches
          </span>
        </div>
      </div>
    </header>

    <!-- Main Translation Body -->
    <main class="mx-auto max-w-4xl px-4 py-6" :style="{ fontSize: `${fontSize}px` }">
      <!-- Loading State -->
      <div v-if="loading" class="space-y-4 py-12" aria-busy="true">
        <div v-for="i in 6" :key="i" class="h-6 animate-pulse rounded bg-surface2" :style="{ width: `${75 + (i * 17) % 20}%` }" />
      </div>

      <!-- Error State -->
      <div v-else-if="err" class="rounded-xl border border-line bg-surface p-8 text-center text-muted">
        <p class="text-base text-foreground mb-2">{{ err }}</p>
        <button type="button" class="btn-primary mt-2 cursor-pointer" @click="load">
          Retry
        </button>
      </div>

      <!-- Empty State -->
      <div v-else-if="!translations.length" class="rounded-xl border border-line bg-surface p-12 text-center text-muted">
        <p class="text-base font-medium text-foreground">No translations found for this section.</p>
        <p class="text-xs text-muted mt-1">अनुवाद उपलब्ध नहीं है।</p>
      </div>

      <!-- Translation List -->
      <div v-else class="space-y-5">
        <article
          v-for="tr in filteredTranslations"
          :key="tr.i"
          :id="`p${tr.i}`"
          class="scroll-mt-32 rounded-2xl border border-line/70 bg-surface p-4 transition-all duration-200 hover:border-line hover:shadow-xs"
          :class="{ 'ring-2 ring-primary/40 bg-primary-soft/10': targetPara === tr.i }"
        >
          <!-- Paragraph Meta Banner -->
          <div class="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-line/40 pb-2 text-xs font-sans">
            <div class="flex items-center gap-2">
              <span
                v-if="tr.title"
                class="rounded-md bg-primary-soft px-2 py-0.5 font-semibold text-primary"
              >
                {{ tr.title }}
              </span>
              <a :href="`#p${tr.i}`" class="font-mono text-muted hover:text-primary transition-colors">
                #p{{ tr.i }}
              </a>
            </div>
            <div class="flex items-center gap-2 text-muted text-[0.7rem]">
              <span>{{ tr.translator }}</span>
              <span>·</span>
              <span class="capitalize">{{ tr.source }}</span>
            </div>
          </div>

          <!-- Poetic Verse / Gāthā (Padyārtha) if available -->
          <div
            v-if="tr.v"
            class="my-3 rounded-xl border-l-4 border-primary bg-surface2/60 p-3.5 font-serif text-[0.95em] leading-relaxed italic text-foreground whitespace-pre-line"
          >
            <div class="text-[0.7rem] font-sans font-bold uppercase tracking-wider text-primary mb-1 not-italic">
              {{ currentLang === 'en' ? 'Poetic Verse (Gāthā)' : 'पद्यानुवाद (छंद / दोहा)' }}
            </div>
            {{ tr.v }}
          </div>

          <!-- Sentence-by-Sentence Full Prose Translation (Gadyārtha) -->
          <div class="font-serif leading-relaxed text-foreground/95 whitespace-pre-line">
            {{ tr.t }}
          </div>
        </article>
      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-line bg-surface py-6 text-center text-xs text-muted">
      <p>Tipiṭaka App — Sentence-by-Sentence Parallel Translation</p>
      <p class="mt-1">Chaṭṭha Saṅgāyana Tipiṭaka · All 216 paragraphs verified without omission</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'
import IconX from '~icons/lucide/x'
import IconPrinter from '~icons/lucide/printer'
import { useApi } from '@/data/api'
import type { Translation, NodeInfo } from '@/data/types'

const route = useRoute()
const router = useRouter()
const api = useApi()

const key = computed(() => String(route.params.key || ''))
const currentLang = ref<'en' | 'hi'>((route.query.lang as 'en' | 'hi') || 'en')
const fontSize = ref(17)
const searchQuery = ref('')
const loading = ref(false)
const err = ref('')
const translations = ref<Translation[]>([])
const nodeInfo = ref<NodeInfo | null>(null)

const targetPara = computed(() => {
  const m = /^#?p?(\d+)$/.exec(route.hash)
  return m ? +m[1] : null
})

const displayTitle = computed(() => {
  if (nodeInfo.value?.title) return nodeInfo.value.title
  if (translations.value.length && translations.value[0].title) {
    return translations.value[0].title
  }
  return key.value
})

useHead({
  title: computed(() => `${displayTitle.value} — Translation (${currentLang.value.toUpperCase()})`)
})

function adjustFontSize(delta: number) {
  fontSize.value = Math.max(14, Math.min(26, fontSize.value + delta))
}

function setLang(lang: 'en' | 'hi') {
  if (currentLang.value === lang) return
  currentLang.value = lang
  router.replace({ query: { ...route.query, lang } })
  load()
}

function printWindow() {
  window.print()
}

function closeWindow() {
  if (window.opener) {
    window.close()
  } else {
    router.back()
  }
}

const filteredTranslations = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return translations.value
  return translations.value.filter(tr =>
    (tr.t && tr.t.toLowerCase().includes(q)) ||
    (tr.title && tr.title.toLowerCase().includes(q)) ||
    (tr.v && tr.v.toLowerCase().includes(q)) ||
    `p${tr.i}`.includes(q)
  )
})

async function load() {
  if (!key.value) return
  loading.value = true
  err.value = ''
  try {
    const [transRes, nodeRes] = await Promise.all([
      api.translation(key.value, undefined, undefined, currentLang.value),
      api.node(key.value).catch(() => null)
    ])
    translations.value = transRes.translations || []
    nodeInfo.value = nodeRes
    await scrollToTarget()
  } catch (e) {
    err.value = (e as Error).message || 'Failed to load translations'
  } finally {
    loading.value = false
  }
}

async function scrollToTarget() {
  if (targetPara.value === null) return
  await nextTick()
  const el = document.getElementById(`p${targetPara.value}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

watch(() => route.hash, scrollToTarget)
watch(key, load)

onMounted(load)
</script>
