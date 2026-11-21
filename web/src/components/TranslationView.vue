<!-- Translation view in the study panel: authentic VRI-style Hindi translation -->
<template>
  <div class="text-sm space-y-4" data-testid="translation-view">
    <!-- Section Header Sticky Banner -->
    <div v-if="sectionTitle || translations.length" class="sticky -top-3 z-10 -mx-3 -mt-3 mb-2 border-b border-line bg-surface/95 px-3 py-2.5 backdrop-blur">
      <div class="flex items-center justify-between gap-2">
        <div class="min-w-0">
          <div class="text-[0.6875rem] font-semibold text-primary uppercase tracking-wide">
            सम्पूर्ण अनुभाग अनुवाद (Full Section)
          </div>
          <div v-if="sectionTitle" class="truncate font-serif text-sm font-semibold text-foreground">
            {{ conv(sectionTitle) }}
          </div>
        </div>
        <span class="shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">
          {{ translations.length }} परिच्छेद
        </span>
      </div>
    </div>

    <div v-if="loading" class="space-y-3 py-4" aria-busy="true">
      <div v-for="i in 3" :key="i" class="h-4 animate-pulse rounded bg-surface2" />
    </div>

    <div v-else-if="err" class="py-6 text-center text-muted">
      {{ err }}
    </div>

    <div v-else-if="!translations.length" class="py-8 text-center text-muted space-y-2">
      <div class="text-base font-medium text-foreground">इस अनुभाग का हिन्दी अनुवाद तैयार हो रहा है</div>
      <p class="text-xs text-muted max-w-xs mx-auto">
        विपश्यना विशोधन विन्यास (VRI) शैली में प्रामाणिक हिन्दी अनुवाद पाइपलाइन प्रगति पर है।
      </p>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="tr in translations"
        :key="tr.i"
        :id="`tr-p${tr.i}`"
        class="scroll-mt-16 space-y-2.5 rounded-xl border p-3.5 transition-all duration-300"
        :class="tr.i === activePara ? 'border-primary bg-primary-soft/20 shadow-sm' : 'border-line/60 hover:border-line bg-surface'"
      >
        <!-- Title / Gatha number -->
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span
              v-if="tr.title"
              class="inline-block rounded px-2 py-0.5 text-xs font-semibold"
              :class="tr.i === activePara ? 'bg-primary text-white' : 'bg-primary-soft text-primary'"
            >
              {{ tr.title }}
            </span>
            <span class="text-xs text-muted">#p{{ tr.i }}</span>
          </div>
          <span v-if="tr.i === activePara" class="rounded bg-primary/10 px-1.5 py-0.5 text-[0.6875rem] font-medium text-primary">
            चयनित गाथा
          </span>
        </div>

        <!-- Rhythmic Verse / Doha (Padyārtha) if present -->
        <div v-if="tr.v" class="rounded-lg bg-surface2 p-3 font-serif text-sm leading-relaxed border-l-2 border-primary">
          <div class="text-xs font-sans font-medium text-muted mb-1">पद्यानुवाद (छंद / दोहा):</div>
          <div class="whitespace-pre-line text-foreground font-medium">{{ tr.v }}</div>
        </div>

        <!-- Prose Meaning (Gadyārtha) -->
        <div class="text-foreground leading-relaxed text-[0.9375rem]">
          <div v-if="tr.v" class="text-xs font-sans font-medium text-muted mb-1">गद्यार्थ:</div>
          <p>{{ tr.t }}</p>
        </div>

        <!-- Attribution & Source -->
        <div class="flex items-center justify-between pt-1 text-[0.75rem] text-muted">
          <span>{{ tr.translator }}</span>
          <span class="capitalize">{{ tr.source }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '@/data/api'
import { useUi } from '@/stores/ui'
import { useTabs } from '@/stores/tabs'
import { useScript } from '@/composables/script'
import type { Translation, NodeInfo } from '@/data/types'

const api = useApi()
const ui = useUi()
const tabs = useTabs()
const route = useRoute()
const { conv } = useScript()

const loading = ref(false)
const err = ref('')
const translations = ref<Translation[]>([])
const sectionNode = ref<NodeInfo | null>(null)

const targetKey = computed(() => {
  return ui.translationTarget?.key || ui.linkTarget?.key || tabs.active?.current || tabs.active?.key || (route.params.key as string) || ''
})

const activePara = computed(() => {
  return ui.translationTarget?.para ?? ui.linkTarget?.para ?? null
})

const sectionTitle = computed(() => {
  if (sectionNode.value?.title) return sectionNode.value.title
  if (translations.value.length && translations.value[0].title) {
    return translations.value[0].title.split('#')[0].trim()
  }
  return ''
})

let lastLoadedKey = ''

async function load() {
  const key = targetKey.value
  if (!key) {
    translations.value = []
    sectionNode.value = null
    lastLoadedKey = ''
    return
  }

  // If already loaded for this section, just scroll to the active paragraph
  if (lastLoadedKey === key && translations.value.length > 0) {
    scrollToActivePara()
    return
  }

  loading.value = true
  err.value = ''
  try {
    // Request whole section translations (undefined from/count)
    const [transRes, nodeRes] = await Promise.all([
      api.translation(key, undefined, undefined, 'hi'),
      api.node(key).catch(() => null),
    ])
    translations.value = transRes.translations || []
    sectionNode.value = nodeRes
    lastLoadedKey = key

    await scrollToActivePara()
  } catch (e) {
    err.value = (e as Error).message || 'अनुवाद लोड करने में त्रुटि'
  } finally {
    loading.value = false
  }
}

async function scrollToActivePara() {
  if (activePara.value === null) return
  await nextTick()
  const el = document.getElementById(`tr-p${activePara.value}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

watch(targetKey, load)
watch(activePara, scrollToActivePara)
onMounted(load)
</script>
