<template>
  <div>
    <el-card shadow="never" class="page-card">
      <template #header>
        <div class="card-header">
          <span>{{ title }}</span>
          <div class="header-actions">
            <el-button v-if="fallbackMode" size="small" @click="retryEmbed">重新内嵌</el-button>
            <el-button size="small" @click="openStandalone">新窗口打开</el-button>
          </div>
        </div>
      </template>

      <el-alert
        v-if="fallbackMode"
        type="warning"
        :closable="false"
        show-icon
        title="该旧扩展页面在内嵌模式下运行异常，已切换为独立兼容模式。"
      />
      <el-alert
        v-else
        type="info"
        :closable="false"
        show-icon
        title="该扩展提供的是模块原生页面，已在当前界面内加载。"
      />

      <div v-if="fallbackMode" class="legacy-standalone mt-3">
        <el-button type="primary" @click="openStandalone">打开独立页面</el-button>
        <div class="standalone-tip">
          这些旧 Razor/Blazor 模块页面比较复杂，内嵌 iframe 时可能触发 Blazor Server 渲染错误。
          独立页面仍在当前系统和登录态内运行。
        </div>
      </div>
      <div v-else class="generic-module-frame-wrap mt-3">
        <iframe :key="frameKey" class="generic-module-frame" :src="nativePageUrl" />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const moduleId = computed(() => String(route.params.moduleId || ''))
const pageKey = computed(() => String(route.params.pageKey || ''))
const title = computed(() => (route.meta.title as string) || '扩展模块')
const nativePageUrl = computed(() => `/ext/${encodeURIComponent(moduleId.value)}/${encodeURIComponent(pageKey.value)}?legacy=1&embed=1`)
const standalonePageUrl = computed(() => `/ext/${encodeURIComponent(moduleId.value)}/${encodeURIComponent(pageKey.value)}?legacy=1`)
const fallbackMode = ref(false)
const frameKey = ref(0)

function openStandalone() {
  window.open(standalonePageUrl.value, '_blank', 'noopener,noreferrer')
}

function retryEmbed() {
  fallbackMode.value = false
  frameKey.value += 1
}

async function redirectStandaloneIfNeeded() {
  if (!fallbackMode.value) return
  await nextTick()
  window.location.replace(standalonePageUrl.value)
}

function onLegacyModuleMessage(event: MessageEvent) {
  if (event.origin !== window.location.origin) return
  const data = event.data
  if (!data || data.source !== 'telegram-panel' || data.type !== 'legacy-module-event') return
  if (data.kind !== 'blazor-error') return
  fallbackMode.value = true
}

watch([moduleId, pageKey], () => {
  fallbackMode.value = false
  frameKey.value += 1
})

onMounted(() => {
  window.addEventListener('message', onLegacyModuleMessage)
})
onUnmounted(() => window.removeEventListener('message', onLegacyModuleMessage))
</script>

<style scoped>
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.header-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.generic-module-frame-wrap {
  border: 1px solid var(--tp-border);
  border-radius: 4px;
  overflow: hidden;
  background: var(--tp-bg);
}

.generic-module-frame {
  display: block;
  width: 100%;
  min-height: calc(100vh - 230px);
  border: 0;
  background: var(--tp-bg);
}

.legacy-standalone {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px;
  border: 1px solid var(--tp-border);
  border-radius: 4px;
  background: var(--tp-bg-soft);
}

.standalone-tip {
  color: var(--tp-muted);
  line-height: 1.6;
}
</style>
