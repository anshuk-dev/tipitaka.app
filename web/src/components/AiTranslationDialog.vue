<template>
  <Dialog :open="ui.aiTransModal.open" :title="dialogTitle" width="680px" testid="ai-translation-dialog" @close="ui.closeAiTranslation">
    <div class="space-y-4 text-sm">
      <!-- Target Language Bar & Settings Toggle -->
      <div class="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface2/60 p-2 border border-line">
        <div class="flex items-center gap-1.5">
          <span class="text-xs font-semibold text-muted pl-1">अनुवाद भाषा (Target):</span>
          <button
            type="button"
            class="px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            :class="currentLang === 'hi' ? 'bg-primary text-white shadow-xs' : 'bg-surface text-foreground border border-line hover:border-primary'"
            data-testid="ai-lang-hi"
            @click="switchLang('hi')"
          >
            🇮🇳 हिन्दी (HI)
          </button>
          <button
            type="button"
            class="px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            :class="currentLang === 'en' ? 'bg-primary text-white shadow-xs' : 'bg-surface text-foreground border border-line hover:border-primary'"
            data-testid="ai-lang-en"
            @click="switchLang('en')"
          >
            🌐 English (EN)
          </button>
        </div>

        <div class="flex items-center gap-2">
          <!-- Hindi Font Picker (Only when target is Hindi) -->
          <div v-if="currentLang === 'hi'" class="relative">
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary transition-all shadow-2xs cursor-pointer"
              title="हिन्दी फ़ॉन्ट बदलें"
              @click="showFontMenu = !showFontMenu"
            >
              <span class="text-primary font-bold">अ</span>
              <span class="hidden sm:inline">{{ currentTransFont.name }}</span>
            </button>
            <div
              v-if="showFontMenu"
              class="absolute right-0 top-full mt-1.5 z-40 w-48 rounded-xl border border-line bg-surface/98 p-1.5 shadow-xl backdrop-blur"
            >
              <div class="px-2 py-1 text-[0.6875rem] font-semibold text-muted uppercase tracking-wider">फ़ॉन्ट विकल्प</div>
              <button
                v-for="f in TRANS_FONTS"
                :key="f.id"
                type="button"
                class="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left text-xs transition-colors cursor-pointer"
                :class="settings.transFont === f.id ? 'bg-primary text-white font-semibold' : 'text-foreground hover:bg-surface2'"
                :style="{ fontFamily: f.family }"
                @click="settings.transFont = f.id; showFontMenu = false"
              >
                <span>{{ f.hindiName }}</span>
                <span v-if="settings.transFont === f.id">✓</span>
              </button>
            </div>
          </div>

          <!-- Web2API Key / Config toggle button -->
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all cursor-pointer"
            :class="showConfig ? 'border-primary bg-primary-soft text-primary' : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:border-primary'"
            title="Optional: Configure custom Web2API / OpenAI Key"
            @click="showConfig = !showConfig"
          >
            <IconKey class="h-3.5 w-3.5" />
            <span class="text-xs">{{ settings.web2apiKey ? 'Web2API Key ✓' : 'Auto Mode ✓' }}</span>
          </button>
        </div>
      </div>

      <!-- Collapsible Web2API Configuration Section (Optional) -->
      <div v-if="showConfig" class="rounded-xl border border-primary/40 bg-surface2/80 p-3.5 space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5 font-semibold text-xs text-foreground">
            <IconSettings class="h-4 w-4 text-primary" />
            <span>Web2API / OpenAI API Configuration</span>
          </div>
          <span class="text-[0.6875rem] text-muted">Saved locally in browser</span>
        </div>

        <div class="space-y-2.5">
          <!-- API Key Input -->
          <div>
            <label class="block text-xs font-medium text-foreground mb-1">
              Web2API Key <span class="text-red-500">*</span>
            </label>
            <div class="relative flex items-center">
              <input
                v-model="tempApiKey"
                :type="showKey ? 'text' : 'password'"
                placeholder="Enter your Web2API or OpenAI API Key (e.g. sk-...)"
                class="w-full rounded-lg border border-line bg-surface px-3 py-1.5 pr-9 text-xs text-foreground focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                class="absolute right-2 text-muted hover:text-foreground"
                @click="showKey = !showKey"
              >
                <IconEyeOff v-if="showKey" class="h-4 w-4" />
                <IconEye v-else class="h-4 w-4" />
              </button>
            </div>
          </div>

          <!-- Base URL Input with presets -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-medium text-foreground">
                API Base URL (Optional)
              </label>
              <div class="flex items-center gap-1 text-[0.6875rem]">
                <button
                  type="button"
                  class="text-primary hover:underline"
                  @click="tempApiUrl = 'http://localhost:8787/v1'"
                >
                  Local 8787
                </button>
                <span class="text-muted">•</span>
                <button
                  type="button"
                  class="text-primary hover:underline"
                  @click="tempApiUrl = 'https://api.openai.com/v1'"
                >
                  OpenAI Default
                </button>
              </div>
            </div>
            <input
              v-model="tempApiUrl"
              type="text"
              placeholder="e.g. http://localhost:8080/v1 or https://api.openai.com/v1"
              class="w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <!-- Model Input with chips -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-medium text-foreground">
                Model Name
              </label>
              <div class="flex items-center gap-1.5 text-[0.6875rem]">
                <button
                  v-for="m in ['gemini-2.5-flash', 'gpt-4o-mini', 'gpt-4o']"
                  :key="m"
                  type="button"
                  class="rounded bg-surface px-1.5 py-0.5 border border-line text-muted hover:text-primary hover:border-primary transition-all"
                  @click="tempModel = m"
                >
                  {{ m }}
                </button>
              </div>
            </div>
            <input
              v-model="tempModel"
              type="text"
              placeholder="e.g. gemini-2.5-flash or gpt-4o-mini"
              class="w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div class="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              class="btn-primary text-xs py-1.5 px-3"
              @click="saveConfigAndTranslate"
            >
              सहेजें और अनुवाद करें (Save & Translate)
            </button>
          </div>
        </div>
      </div>

      <!-- Original Pāḷi Text Preview -->
      <div class="rounded-xl border border-line bg-surface p-3 space-y-1.5">
        <div class="flex items-center justify-between text-xs text-muted">
          <div class="flex items-center gap-1.5 font-semibold text-foreground">
            <span class="inline-block h-2 w-2 rounded-full bg-primary" />
            <span>पाळि मूल पाठ (Selected Pāḷi Passage)</span>
            <span v-if="ui.aiTransModal.title" class="rounded bg-primary-soft px-1.5 py-0.2 text-[0.6875rem] font-medium text-primary">
              {{ ui.aiTransModal.title }}
            </span>
          </div>
          <button
            type="button"
            class="text-[0.6875rem] text-primary hover:underline cursor-pointer"
            @click="editOriginal = !editOriginal"
          >
            {{ editOriginal ? 'संपादन पूर्ण' : 'पाठ संपादित करें' }}
          </button>
        </div>

        <div v-if="!editOriginal" class="max-h-32 overflow-y-auto font-serif text-[0.9375rem] leading-relaxed text-foreground select-text whitespace-pre-line">
          {{ conv(currentText) }}
        </div>
        <textarea
          v-else
          v-model="currentText"
          rows="3"
          class="w-full rounded-lg border border-line bg-surface2/50 p-2 font-serif text-sm text-foreground focus:border-primary focus:outline-none"
        />
      </div>

      <!-- Translation Output Block -->
      <div class="rounded-xl border border-line bg-surface p-4 space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <IconSparkles class="h-4 w-4 text-primary" />
            <span class="font-semibold text-foreground text-sm">
              {{ currentLang === 'hi' ? 'हिन्दी अनुवाद (VRI शैली)' : 'English Translation' }}
            </span>
            <span v-if="sourceLabel" class="rounded bg-surface2 px-1.5 py-0.5 text-[0.6875rem] text-muted">
              {{ sourceLabel }}
            </span>
          </div>

          <div v-if="translatedText && !loading" class="flex items-center gap-2">
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 text-xs font-medium text-foreground hover:border-primary hover:text-primary transition-all cursor-pointer shadow-2xs"
              @click="copyTranslation"
            >
              <IconCheck v-if="copied" class="h-3.5 w-3.5 text-emerald-600" />
              <IconCopy v-else class="h-3.5 w-3.5" />
              <span>{{ copied ? t('Copied') : t('Copy') }}</span>
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 text-xs font-medium text-foreground hover:border-primary hover:text-primary transition-all cursor-pointer shadow-2xs"
              title="पुनः अनुवाद करें"
              @click="doTranslate"
            >
              <IconRefreshCw class="h-3.5 w-3.5" />
              <span>पुनः करें</span>
            </button>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="py-8 text-center space-y-3" aria-busy="true">
          <div class="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 text-primary animate-spin">
            <IconRefreshCw class="h-6 w-6" />
          </div>
          <p class="text-sm font-medium text-foreground">
            {{ currentLang === 'hi' ? 'पाळि पाठ का हिन्दी अनुवाद हो रहा है...' : 'Translating Pāḷi passage into English...' }}
          </p>
          <p class="text-xs text-muted">
            Theravāda Buddhist terminology is being synthesized...
          </p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-700 dark:text-red-400 space-y-2">
          <div class="font-semibold flex items-center gap-1.5">
            <span>त्रुटि / Error:</span>
          </div>
          <p class="leading-relaxed">{{ error }}</p>
          <div class="flex items-center gap-2 pt-1">
            <button
              v-if="!settings.web2apiKey"
              type="button"
              class="btn-primary text-xs py-1 px-2.5"
              @click="showConfig = true"
            >
              API Key दर्ज करें
            </button>
            <button
              type="button"
              class="btn text-xs py-1 px-2.5 border border-red-400/40"
              @click="doTranslate"
            >
              पुनः प्रयास करें (Retry)
            </button>
          </div>
        </div>

        <!-- Rendered Translation Text -->
        <div
          v-else-if="translatedText"
          class="max-h-[50vh] overflow-y-auto leading-relaxed text-foreground select-text whitespace-pre-line text-[0.9375rem]"
          :style="currentLang === 'hi' ? { fontFamily: 'var(--font-trans)' } : undefined"
          data-testid="ai-translation-result"
        >
          {{ translatedText }}
        </div>

        <!-- Empty State Prompt -->
        <div v-else class="py-6 text-center text-muted space-y-2">
          <p class="text-xs">
            अनुवाद प्रारंभ करने के लिए नीचे क्लिक करें (Click below to translate)
          </p>
          <button
            type="button"
            class="btn-primary text-xs py-1.5 px-3"
            @click="doTranslate"
          >
            <IconSparkles class="h-3.5 w-3.5 mr-1" />
            <span>अभी अनुवाद करें (Translate Now)</span>
          </button>
        </div>
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Dialog from './Dialog.vue'
import IconKey from '~icons/lucide/key'
import IconSettings from '~icons/lucide/settings'
import IconEye from '~icons/lucide/eye'
import IconEyeOff from '~icons/lucide/eye-off'
import IconSparkles from '~icons/lucide/sparkles'
import IconCopy from '~icons/lucide/copy'
import IconCheck from '~icons/lucide/check'
import IconRefreshCw from '~icons/lucide/refresh-cw'
import { useUi } from '@/stores/ui'
import { useSettings, TRANS_FONTS } from '@/stores/settings'
import { useScript } from '@/composables/script'
import { useApi } from '@/data/api'
import { autoTranslateSelection } from '@/composables/aiTranslate'
import { t } from '@/i18n'

const api = useApi()
const ui = useUi()
const settings = useSettings()
const { conv } = useScript()

const showConfig = ref(false)
const showKey = ref(false)
const showFontMenu = ref(false)
const editOriginal = ref(false)
const loading = ref(false)
const error = ref('')
const copied = ref(false)

const currentTransFont = computed(() => TRANS_FONTS.find(f => f.id === settings.transFont) || TRANS_FONTS[0])

const currentLang = ref<'hi' | 'en'>('hi')
const currentText = ref('')
const translatedText = ref('')
const sourceLabel = ref('')

const tempApiKey = ref('')
const tempApiUrl = ref('')
const tempModel = ref('')

const dialogTitle = computed(() => {
  return currentLang.value === 'hi' ? 'तुरंत अनुवाद • Auto + Web2API' : 'Instant Translation • Auto + Web2API'
})

watch(() => ui.aiTransModal.open, open => {
  if (open) {
    currentText.value = ui.aiTransModal.text || ''
    currentLang.value = ui.aiTransModal.targetLang || 'hi'
    translatedText.value = ''
    sourceLabel.value = ''
    error.value = ''
    editOriginal.value = false
    copied.value = false

    // Initialize temp config fields with saved settings
    tempApiKey.value = settings.web2apiKey || ''
    tempApiUrl.value = settings.web2apiUrl || ''
    tempModel.value = settings.web2apiModel || 'gemini-2.5-flash'

    showConfig.value = false

    if (currentText.value) {
      doTranslate()
    }
  }
})

function switchLang(lang: 'hi' | 'en') {
  if (currentLang.value === lang && translatedText.value) return
  currentLang.value = lang
  doTranslate()
}

function saveConfigAndTranslate() {
  settings.web2apiKey = tempApiKey.value.trim()
  settings.web2apiUrl = tempApiUrl.value.trim()
  settings.web2apiModel = tempModel.value.trim() || 'gemini-2.5-flash'
  showConfig.value = false
  ui.showToast('API सेटिंग्स सहेजी गईं')
  doTranslate()
}

async function doTranslate() {
  if (!currentText.value.trim()) {
    error.value = 'अनुवाद के लिए पाठ रिक्त है।'
    return
  }

  loading.value = true
  error.value = ''
  try {
    const res = await autoTranslateSelection({
      text: currentText.value,
      targetLang: currentLang.value,
      key: ui.aiTransModal.key,
      para: ui.aiTransModal.para,
      paraEnd: ui.aiTransModal.paraEnd,
      api,
      web2apiConfig: settings.web2apiKey
        ? {
            apiKey: settings.web2apiKey,
            apiUrl: settings.web2apiUrl,
            model: settings.web2apiModel,
          }
        : undefined,
    })
    translatedText.value = res.text
    sourceLabel.value = res.sourceLabel
  } catch (err: unknown) {
    error.value = (err as Error).message || String(err)
  } finally {
    loading.value = false
  }
}

async function copyTranslation() {
  if (!translatedText.value) return
  try {
    await navigator.clipboard.writeText(translatedText.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
    ui.showToast(t('Copied'))
  } catch {
    ui.showToast('कॉपी करने में असमर्थ')
  }
}
</script>
