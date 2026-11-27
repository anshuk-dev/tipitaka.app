<!--
  Floating selection toolbar: appears above or below highlighted/selected text in the reader.
  Provides instant one-tap AI translation to Hindi or English, and copying.
-->
<template>
  <Teleport to="body">
    <Transition name="toolbar-fade">
      <div
        v-if="visible"
        ref="toolbarEl"
        class="fixed z-50 flex items-center gap-1 -translate-x-1/2 rounded-full border border-line bg-surface/95 px-2 py-1 shadow-2xl backdrop-blur select-none"
        :style="style"
        role="toolbar"
        aria-label="Selection options"
        data-testid="selection-toolbar"
      >
        <div class="flex items-center gap-1 text-xs">
          <!-- AI Translate Hindi -->
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 font-semibold text-primary hover:bg-primary hover:text-white transition-all cursor-pointer shadow-2xs"
            title="Translate selected passage to Hindi (Web2API)"
            data-testid="selection-translate-hi"
            @pointerdown.prevent.stop="translate('hi')"
          >
            <IconSparkles class="h-3.5 w-3.5" />
            <span>हिन्दी (HI)</span>
          </button>

          <!-- AI Translate English -->
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-full bg-surface2 px-2.5 py-1 font-semibold text-foreground hover:bg-primary hover:text-white transition-all cursor-pointer shadow-2xs border border-line/60"
            title="Translate selected passage to English (Web2API)"
            data-testid="selection-translate-en"
            @pointerdown.prevent.stop="translate('en')"
          >
            <IconLanguages class="h-3.5 w-3.5" />
            <span>English (EN)</span>
          </button>

          <!-- Quick Copy -->
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-full p-1.5 text-muted hover:text-foreground hover:bg-surface2 transition-all cursor-pointer"
            title="Copy selected text"
            @pointerdown.prevent.stop="copyText"
          >
            <IconCopy class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import IconSparkles from '~icons/lucide/sparkles'
import IconLanguages from '~icons/lucide/languages'
import IconCopy from '~icons/lucide/copy'
import { useUi } from '@/stores/ui'
import { t } from '@/i18n'

const props = defineProps<{
  container?: HTMLElement | null
}>()

const ui = useUi()
const visible = ref(false)
const selectedText = ref('')
const selectedMeta = ref<{ key?: string; para?: number; paraEnd?: number; title?: string }>({})
const style = ref<{ left: string; top: string }>({ left: '0px', top: '0px' })
const toolbarEl = ref<HTMLElement>()

let debounceTimer: ReturnType<typeof setTimeout> | undefined

function findParaEl(node: Node | null): HTMLElement | null {
  if (!node) return null
  const el = node instanceof Element ? node : node.parentElement
  return (el?.closest('.para') as HTMLElement | null) ?? null
}

function checkSelection() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    if (typeof window === 'undefined') return
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      visible.value = false
      return
    }

    const text = sel.toString().trim()
    if (text.length < 2) {
      visible.value = false
      return
    }

    const range = sel.getRangeAt(0)
    if (props.container && !props.container.contains(range.commonAncestorContainer)) {
      visible.value = false
      return
    }

    const rect = range.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) {
      visible.value = false
      return
    }

    const startPara = findParaEl(range.startContainer)
    const endPara = findParaEl(range.endContainer)
    const key = startPara?.dataset.k || endPara?.dataset.k
    const pStart = startPara?.dataset.i !== undefined ? +startPara.dataset.i : undefined
    const pEnd = endPara?.dataset.i !== undefined ? +endPara.dataset.i : pStart
    const para = pStart !== undefined && pEnd !== undefined ? Math.min(pStart, pEnd) : pStart
    const paraEnd = pStart !== undefined && pEnd !== undefined ? Math.max(pStart, pEnd) : pEnd
    const title = para !== undefined
      ? (paraEnd !== undefined && paraEnd !== para ? `#p${para}–${paraEnd}` : `#p${para}`)
      : ''

    // Determine position: above selection if room, else below
    const vw = window.innerWidth
    const x = Math.max(120, Math.min(vw - 120, rect.left + rect.width / 2))
    const y = rect.top < 60 ? rect.bottom + 8 : rect.top - 46

    style.value = {
      left: `${x}px`,
      top: `${y}px`,
    }
    selectedText.value = text
    selectedMeta.value = { key, para, paraEnd, title }
    visible.value = true
  }, 100)
}

function onScrollOrResize() {
  if (visible.value) {
    visible.value = false
  }
}

function translate(lang: 'hi' | 'en') {
  const txt = selectedText.value
  const meta = selectedMeta.value
  visible.value = false
  if (!txt) return
  ui.openAiTranslation({
    text: txt,
    key: meta.key,
    para: meta.para,
    paraEnd: meta.paraEnd,
    title: meta.title,
    targetLang: lang,
  })
}

async function copyText() {
  const txt = selectedText.value
  visible.value = false
  if (!txt) return
  try {
    await navigator.clipboard.writeText(txt)
    ui.showToast(t('Copied'))
  } catch {
    ui.showToast(txt.slice(0, 50))
  }
}

onMounted(() => {
  document.addEventListener('selectionchange', checkSelection)
  window.addEventListener('scroll', onScrollOrResize, { passive: true })
  window.addEventListener('resize', onScrollOrResize)
})

onBeforeUnmount(() => {
  clearTimeout(debounceTimer)
  document.removeEventListener('selectionchange', checkSelection)
  window.removeEventListener('scroll', onScrollOrResize)
  window.removeEventListener('resize', onScrollOrResize)
})
</script>

<style scoped>
.toolbar-fade-enter-active,
.toolbar-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.toolbar-fade-enter-from,
.toolbar-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 6px);
}
</style>
