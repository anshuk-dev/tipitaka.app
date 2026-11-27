<template>
  <div class="mx-auto max-w-3xl space-y-6 px-4 pb-20 pt-5">
    <h1 class="text-2xl font-semibold">{{ t('Settings') }}</h1>

    <section>
      <h2 class="section-title">{{ t('Pali script') }}</h2>
      <div data-testid="settings-script"><ScriptPicker /></div>
    </section>

    <section>
      <h2 class="section-title">{{ t('Tabs') }}</h2>
      <div class="flex flex-wrap gap-2">
        <button v-for="v in TAB_VIEWS" :key="v.id" class="chip text-sm" :class="{ on: settings.tabView === v.id }" :data-testid="`tabview-${v.id}`" @click="settings.tabView = v.id">{{ v.label }}</button>
      </div>
      <p class="mt-2 text-xs text-muted">{{ TAB_VIEWS.find(v => v.id === settings.tabView)?.desc }}</p>
      <label class="mt-2 flex items-center gap-2 text-sm"><input v-model="settings.syncScroll" type="checkbox"> {{ t('Scroll linked columns together (mūla / commentary)') }}</label>
    </section>

    <section>
      <h2 class="section-title">{{ t('Select User Interface Language') }}</h2>
      <div class="flex flex-wrap gap-2">
        <button v-for="l in UI_LANGS" :key="l.code" class="chip text-sm" :class="{ on: settings.uiLang === l.code }" @click="settings.uiLang = l.code">{{ l.name }}</button>
      </div>
    </section>

    <section>
      <h2 class="section-title">{{ t('Appearance') }}</h2>
      <div class="mb-4 flex gap-2">
        <button v-for="th in THEMES" :key="th.id" class="flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm"
          :class="settings.theme === th.id ? 'border-primary' : 'border-line'" :style="{ background: th.bg, color: th.fg }" :data-testid="`theme-${th.id}`" @click="settings.theme = th.id">
          {{ th.label }}
        </button>
      </div>
      <div class="card space-y-4">
        <label class="flex items-center gap-3 text-sm"><span class="w-32 shrink-0">{{ t('Text size') }}</span>
          <input v-model.number="settings.textSize" type="range" min="12" max="32" step="1" class="flex-1" data-testid="text-size"><span class="w-10 text-right text-muted">{{ settings.textSize }}</span></label>
        <label class="flex items-center gap-3 text-sm"><span class="w-32 shrink-0">{{ t('Line spacing') }}</span>
          <input v-model.number="settings.leading" type="range" min="1.3" max="2.2" step="0.05" class="flex-1"><span class="w-10 text-right text-muted">{{ settings.leading.toFixed(2) }}</span></label>
        <label class="flex items-center gap-3 text-sm"><span class="w-32 shrink-0">{{ t('Text width') }}</span>
          <input v-model.number="settings.width" type="range" min="520" max="1100" step="20" class="flex-1"><span class="w-10 text-right text-muted">{{ settings.width }}</span></label>
        <div class="reading rounded-lg bg-bg p-3" :data-script="script">
          <p class="para bodytext"><span class="num">1</span>{{ conv('Evaṃ me sutaṃ – ekaṃ samayaṃ bhagavā antarā ca rājagahaṃ antarā ca nāḷandaṃ addhānamaggappaṭipanno hoti mahatā bhikkhusaṅghena saddhiṃ pañcamattehi bhikkhusatehi.') }}</p>
        </div>
      </div>
    </section>

    <section>
      <h2 class="section-title">{{ t('Text') }}</h2>
      <div class="card space-y-3 text-sm">
        <div class="flex flex-wrap items-center gap-2"><span class="w-40">{{ t('Variant readings') }}</span>
          <button v-for="n in NOTES" :key="n.id" class="chip" :class="{ on: settings.notes === n.id }" @click="settings.notes = n.id">{{ n.label }}</button></div>
        <div class="flex flex-wrap items-center gap-2"><span class="w-40">{{ t('Page numbers') }}</span>
          <button v-for="e in EDITIONS" :key="e.id" class="chip" :class="{ on: settings.pageRefs.includes(e.id) }" :title="e.title" @click="toggleEdition(e.id)">{{ e.label }}</button></div>
        <label class="flex items-center gap-2"><input v-model="settings.paraNums" type="checkbox"> {{ t('Paragraph numbers') }}</label>
        <label class="flex items-center gap-2"><input v-model="settings.tapLookup" type="checkbox"> {{ t('Tap a word to look it up in the dictionary') }}</label>
        <label class="flex items-center gap-2"><input v-model="settings.glosses" type="checkbox" data-testid="glosses-setting"> {{ t('Underline the words explained in the commentaries') }}</label>
        <label class="flex items-center gap-2 font-medium text-primary"><input v-model="settings.showTranslation" type="checkbox" data-testid="translation-setting"> {{ t('Hindi translation') }}</label>
      </div>
    </section>

    <section>
      <h2 class="section-title">{{ t('Hindi translation') }} फ़ॉन्ट (Devanagari Font)</h2>
      <div class="card space-y-3">
        <p class="text-xs text-muted">
          हिन्दी अनुवाद (दराज एवं इन-लाइन दृश्य) के लिए ५ विशिष्ट देवनागरी फ़ॉन्ट उपलब्ध हैं। अपनी पसंद के फ़ॉन्ट पर क्लिक करें:
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <button
            v-for="f in TRANS_FONTS"
            :key="f.id"
            type="button"
            class="flex flex-col items-start rounded-xl border p-3.5 text-left transition-all cursor-pointer"
            :class="settings.transFont === f.id ? 'border-primary bg-primary-soft/25 ring-2 ring-primary/40 shadow-xs' : 'border-line hover:border-line-hover bg-surface'"
            :data-testid="`transfont-${f.id}`"
            @click="settings.transFont = f.id"
          >
            <div class="flex w-full items-center justify-between mb-1.5">
              <span class="text-sm font-semibold text-foreground">{{ f.hindiName }}</span>
              <span v-if="settings.transFont === f.id" class="rounded-full bg-primary px-2 py-0.5 text-[0.6875rem] font-bold text-white shadow-2xs">सक्रिय ✓</span>
            </div>
            <div class="text-[0.9375rem] text-foreground leading-relaxed" :style="{ fontFamily: f.family }">
              {{ f.sample }}
            </div>
          </button>
        </div>
      </div>
    </section>

    <!-- Web2API AI Translation Configuration -->
    <section>
      <h2 class="section-title">AI अनुवाद (Auto Mode + Optional Web2API)</h2>
      <div class="card space-y-4">
        <p class="text-xs text-muted leading-relaxed">
          <strong class="text-emerald-600 dark:text-emerald-400">Auto Mode सक्रिय है:</strong> बिना किसी API Key के भी पाठ चुनकर तुरंत हिन्दी या अंग्रेज़ी में अनुवाद प्राप्त किया जा सकता है। यदि आप चाहें, तो नीचे अपनी Web2API / OpenAI / Gemini Key भी जोड़ सकते हैं।
        </p>

        <!-- API Key input -->
        <div class="space-y-1">
          <label class="block text-xs font-semibold text-foreground">
            Web2API Key <span class="text-primary">*</span>
          </label>
          <div class="relative flex items-center">
            <input
              v-model="settings.web2apiKey"
              :type="showKey ? 'text' : 'password'"
              placeholder="e.g. sk-... or your Web2API token"
              class="w-full rounded-lg border border-line bg-surface px-3 py-2 pr-9 text-xs text-foreground focus:border-primary focus:outline-none"
              data-testid="settings-web2api-key"
            />
            <button
              type="button"
              class="absolute right-2.5 text-muted hover:text-foreground cursor-pointer"
              @click="showKey = !showKey"
            >
              <IconEyeOff v-if="showKey" class="h-4 w-4" />
              <IconEye v-else class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- Base URL input with presets -->
        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <label class="block text-xs font-semibold text-foreground">
              API Base URL (Optional)
            </label>
            <div class="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                class="text-primary hover:underline cursor-pointer"
                @click="settings.web2apiUrl = 'http://localhost:8787/v1'"
              >
                Local Web2API (8787)
              </button>
              <span class="text-muted">•</span>
              <button
                type="button"
                class="text-primary hover:underline cursor-pointer"
                @click="settings.web2apiUrl = 'https://api.openai.com/v1'"
              >
                OpenAI Default
              </button>
            </div>
          </div>
          <input
            v-model="settings.web2apiUrl"
            type="text"
            placeholder="e.g. http://localhost:8080/v1 or https://api.openai.com/v1"
            class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            data-testid="settings-web2api-url"
          />
        </div>

        <!-- Model Name input with quick chips -->
        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <label class="block text-xs font-semibold text-foreground">
              Model Name
            </label>
            <div class="flex items-center gap-1 text-xs">
              <button
                v-for="m in ['gemini-2.5-flash', 'gpt-4o-mini', 'gpt-4o', 'claude-3-5-sonnet']"
                :key="m"
                type="button"
                class="rounded bg-surface px-1.5 py-0.5 border border-line text-[0.6875rem] text-muted hover:text-primary hover:border-primary transition-all cursor-pointer"
                @click="settings.web2apiModel = m"
              >
                {{ m }}
              </button>
            </div>
          </div>
          <input
            v-model="settings.web2apiModel"
            type="text"
            placeholder="e.g. gemini-2.5-flash or gpt-4o-mini"
            class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            data-testid="settings-web2api-model"
          />
        </div>

        <!-- Test Connection Button & Status -->
        <div class="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-line/60">
          <button
            type="button"
            class="btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
            :disabled="testingConnection"
            @click="testConnection"
          >
            <IconRefreshCw v-if="testingConnection" class="h-3.5 w-3.5 animate-spin" />
            <IconSparkles v-else class="h-3.5 w-3.5" />
            <span>{{ testingConnection ? 'परीक्षण जारी...' : 'कनेक्शन का परीक्षण करें (Test API)' }}</span>
          </button>
          <div v-if="testResult" class="text-xs" :class="testResult.ok ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'">
            {{ testResult.message }}
          </div>
        </div>
      </div>
    </section>

    <section>
      <h2 class="section-title">{{ t('Dictionaries') }}</h2>
      <div class="card"><DictFilter inline /></div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useHead } from '@unhead/vue'
import DictFilter from '@/components/DictFilter.vue'
import ScriptPicker from '@/components/ScriptPicker.vue'
import { computed, ref } from 'vue'
import IconEye from '~icons/lucide/eye'
import IconEyeOff from '~icons/lucide/eye-off'
import IconSparkles from '~icons/lucide/sparkles'
import IconRefreshCw from '~icons/lucide/refresh-cw'
import { testApiConnection } from '@/composables/aiTranslate'
import { useScript } from '@/composables/script'
import { useSettings, TRANS_FONTS, type NotesMode, type TabView, type Theme } from '@/stores/settings'
import { UI_LANGS, t } from '@/i18n'

const settings = useSettings()
const { script, conv } = useScript()
useHead({ title: computed(() => t('Settings')) })
// computed: the labels follow a change of the interface language
const TAB_VIEWS = computed<{ id: TabView; label: string; desc: string }[]>(() => [
  { id: 'single', label: t('Single'), desc: t('Opening a text replaces the current one.') },
  { id: 'tabbed', label: t('Tabs'), desc: t('Every text opens in a new tab.') },
  { id: 'columns', label: t('Columns'), desc: t('Open texts are shown side by side (on wide screens).') },
])
const THEMES = computed<{ id: Theme; label: string; bg: string; fg: string }[]>(() => [
  { id: 'light', label: t('Light'), bg: '#fbf8f3', fg: '#2b2522' }, { id: 'sepia', label: t('Sepia'), bg: '#f4ecd8', fg: '#3b2f22' }, { id: 'dark', label: t('Dark'), bg: '#141211', fg: '#ece6df' },
])
const NOTES = computed<{ id: NotesMode; label: string }[]>(() => [{ id: 'pointer', label: t('Marker') }, { id: 'inline', label: t('Inline') }, { id: 'hidden', label: t('Hidden') }])
const EDITIONS = computed(() => [
  { id: 'M', label: t('Myanmar'), title: t('Myanmar (Chaṭṭha Saṅgāyana) edition') }, { id: 'V', label: 'VRI', title: t('VRI edition') },
  { id: 'P', label: 'PTS', title: t('Pali Text Society edition') }, { id: 'T', label: t('Thai'), title: t('Thai edition') },
])

function toggleEdition(id: string) {
  settings.pageRefs = settings.pageRefs.includes(id) ? settings.pageRefs.replace(id, '') : 'MVPT'.split('').filter(e => e === id || settings.pageRefs.includes(e)).join('')
}

const showKey = ref(false)
const testingConnection = ref(false)
const testResult = ref<{ ok: boolean; message: string } | null>(null)

async function testConnection() {
  if (!settings.web2apiKey) {
    testResult.value = { ok: false, message: 'कृपया पहले अपनी Web2API Key दर्ज करें।' }
    return
  }
  testingConnection.value = true
  testResult.value = null
  try {
    const res = await testApiConnection({
      apiKey: settings.web2apiKey,
      apiUrl: settings.web2apiUrl,
      model: settings.web2apiModel,
    })
    testResult.value = res
  } catch (err: unknown) {
    testResult.value = { ok: false, message: (err as Error).message || String(err) }
  } finally {
    testingConnection.value = false
  }
}
</script>
