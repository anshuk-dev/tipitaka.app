<!-- Translation view in the study panel: authentic VRI-style Hindi translation -->
<template>
  <div class="text-sm space-y-4" data-testid="translation-view">
    <div v-if="loading" class="space-y-3 py-4" aria-busy="true">
      <div v-for="i in 3" :key="i" class="h-4 animate-pulse rounded bg-surface2" />
    </div>

    <div v-else-if="err" class="py-6 text-center text-muted">
      {{ err }}
    </div>

    <div v-else-if="!translations.length" class="py-8 text-center text-muted space-y-2">
      <div class="text-base font-medium text-foreground">इस परिच्छेद का हिन्दी अनुवाद तैयार हो रहा है</div>
      <p class="text-xs text-muted max-w-xs mx-auto">
        विपश्यना विशोधन विन्यास (VRI) शैली में प्रामाणिक हिन्दी अनुवाद पाइपलाइन प्रगति पर है।
      </p>
    </div>

    <div v-else class="space-y-6">
      <div v-for="tr in translations" :key="tr.i" class="space-y-2.5 pb-4 border-b border-line last:border-0">
        <!-- Title / Gatha number -->
        <div v-if="tr.title" class="flex items-center gap-2">
          <span class="inline-block rounded bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
            {{ tr.title }}
          </span>
          <span class="text-xs text-muted">#p{{ tr.i }}</span>
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
import { ref, watch, onMounted } from 'vue'
import { useApi } from '@/data/api'
import { useUi } from '@/stores/ui'
import type { Translation } from '@/data/types'

const api = useApi()
const ui = useUi()

const loading = ref(false)
const err = ref('')
const translations = ref<Translation[]>([])

async function load() {
  const t = ui.translationTarget ?? ui.linkTarget
  if (!t) {
    translations.value = []
    return
  }
  loading.value = true
  err.value = ''
  try {
    const res = await api.translation(t.key, t.para, 4, 'hi')
    translations.value = res.translations
  } catch (e) {
    err.value = (e as Error).message || 'अनुवाद लोड करने में त्रुटि'
  } finally {
    loading.value = false
  }
}

watch(() => [ui.translationTarget?.key, ui.translationTarget?.para, ui.linkTarget?.key, ui.linkTarget?.para], load)
onMounted(load)
</script>
