<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { CONFIG, configService } from '@/services/config';
import { cache } from '@/services/cache';

const props = defineProps<{
  visible: boolean;
  mode: 'settings' | 'cache';
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

// Settings form values
const tmdbApiKey = ref('');
const embyServer = ref('');
const embyApiKey = ref('');
const bangumiToken = ref('');
const dotPosition = ref('auto');
const saved = ref(false);

// Cache info
const cacheKeys = ref<string[]>([]);
const cacheCount = computed(() => cacheKeys.value.length);

const dotPositionOptions = [
  { value: 'auto', label: '自动 / Auto' },
  { value: 'poster_tl', label: '海报左上 / Poster Top-Left' },
  { value: 'poster_tr', label: '海报右上 / Poster Top-Right' },
  { value: 'poster_bl', label: '海报左下 / Poster Bottom-Left' },
  { value: 'poster_br', label: '海报右下 / Poster Bottom-Right' },
  { value: 'title_left', label: '标题左侧 / Title Left' },
  { value: 'title_right', label: '标题右侧 / Title Right' },
];

onMounted(() => {
  tmdbApiKey.value = (CONFIG.tmdb.apiKey as string) || '';
  embyServer.value = (CONFIG.emby.server as string) || '';
  embyApiKey.value = (CONFIG.emby.apiKey as string) || '';
  bangumiToken.value = (CONFIG.bangumi.apiKey as string) || '';
  dotPosition.value = (CONFIG.state.dotPosition as string) || 'auto';
  refreshCacheKeys();
});

function refreshCacheKeys() {
  cacheKeys.value = cache.listKeys();
}

function saveSettings() {
  configService.update('tmdb', { apiKey: tmdbApiKey.value });
  configService.update('emby', { server: embyServer.value, apiKey: embyApiKey.value });
  configService.update('bangumi', { apiKey: bangumiToken.value });
  configService.update('state', { dotPosition: dotPosition.value });

  saved.value = true;
  setTimeout(() => { saved.value = false; }, 2000);
}

function clearCache(filter?: string) {
  if (filter) {
    cache.clear([filter]);
  } else {
    cache.clear();
  }
  refreshCacheKeys();
}

function onOverlayClick(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains('us-settings-overlay')) {
    emit('close');
  }
}
</script>

<template>
  <div v-if="visible" class="us-settings-overlay" @click="onOverlayClick">
    <div class="us-settings-modal">
      <!-- Settings Mode -->
      <template v-if="mode === 'settings'">
        <h3 class="us-settings-title">脚本设置 / Settings</h3>

        <div class="us-settings-row">
          <label class="us-settings-label">TMDB API Key</label>
          <input v-model="tmdbApiKey" class="us-settings-input" type="text" placeholder="Enter TMDB API Key">
        </div>

        <div class="us-settings-row">
          <label class="us-settings-label">Emby Server URL</label>
          <input v-model="embyServer" class="us-settings-input" type="text" placeholder="http://your-emby-server:8096">
        </div>

        <div class="us-settings-row">
          <label class="us-settings-label">Emby API Key</label>
          <input v-model="embyApiKey" class="us-settings-input" type="text" placeholder="Enter Emby API Key">
        </div>

        <div class="us-settings-row">
          <label class="us-settings-label">Bangumi Token</label>
          <input v-model="bangumiToken" class="us-settings-input" type="text" placeholder="Enter Bangumi Token">
        </div>

        <div class="us-settings-row">
          <label class="us-settings-label">圆点位置 / Dot Position</label>
          <select v-model="dotPosition" class="us-settings-input">
            <option v-for="opt in dotPositionOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <div class="us-settings-actions">
          <button class="us-button us-button-secondary" @click="emit('close')">取消 / Cancel</button>
          <button class="us-button us-button-primary" @click="saveSettings">
            {{ saved ? '✓ 已保存' : '保存 / Save' }}
          </button>
        </div>
      </template>

      <!-- Cache Mode -->
      <template v-else>
        <h3 class="us-settings-title">缓存管理 / Cache</h3>

        <div class="us-cache-info">
          <span>当前缓存数量: {{ cacheCount }}</span>
        </div>

        <div class="us-cache-stats" v-if="cacheCount > 0">
          <div class="us-cache-stat-row" v-for="key in cacheKeys.slice(0, 20)" :key="key">
            <span class="us-cache-key">{{ key }}</span>
          </div>
          <div v-if="cacheKeys.length > 20" class="us-cache-more">
            ... and {{ cacheKeys.length - 20 }} more
          </div>
        </div>

        <div class="us-settings-actions">
          <button class="us-button us-button-secondary" @click="emit('close')">关闭 / Close</button>
          <button class="us-button us-button-danger" @click="clearCache('tmdb')">清除 TMDB</button>
          <button class="us-button us-button-danger" @click="clearCache('emby')">清除 Emby</button>
          <button class="us-button us-button-danger" @click="clearCache()">清除全部</button>
        </div>
      </template>
    </div>
  </div>
</template>

<style>
:host {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  pointer-events: none;
}

:host([visible]) {
  pointer-events: auto;
}

* { box-sizing: border-box; }

.us-settings-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.5); z-index: 9999;
  display: flex; justify-content: center; align-items: center;
  pointer-events: auto;
}

.us-settings-modal {
  background: white; padding: 20px; border-radius: 8px;
  width: 400px; max-width: 90%;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.us-settings-title {
  margin-top: 0; margin-bottom: 20px;
  font-size: 18px; color: #333;
}

.us-settings-row {
  margin-bottom: 15px;
}

.us-settings-label {
  display: block; font-weight: bold;
  margin-bottom: 5px; color: #333; font-size: 13px;
}

.us-settings-input {
  width: 100%; padding: 8px; border: 1px solid #ccc;
  border-radius: 4px; box-sizing: border-box;
  font-size: 13px; font-family: inherit;
}

.us-settings-input:focus {
  outline: none; border-color: #01b4e4; box-shadow: 0 0 0 2px rgba(1, 180, 228, 0.2);
}

.us-settings-actions {
  display: flex; justify-content: flex-end;
  gap: 10px; margin-top: 20px;
}

.us-button {
  padding: 8px 16px; border-radius: 4px;
  cursor: pointer; border: none; font-weight: bold;
  font-size: 13px; transition: opacity 0.2s;
}
.us-button:hover { opacity: 0.85; }
.us-button-primary { background: #01b4e4; color: white; }
.us-button-secondary { background: #eee; color: #333; }
.us-button-danger { background: #dc3545; color: white; }

.us-cache-info {
  font-size: 14px; color: #666; margin-bottom: 12px;
  padding: 10px; background: #f8f9fa; border-radius: 4px;
}

.us-cache-stats {
  max-height: 200px; overflow-y: auto;
  border: 1px solid #eee; border-radius: 4px;
  margin-bottom: 12px;
}

.us-cache-stat-row {
  padding: 6px 10px; border-bottom: 1px solid #f0f0f0; font-size: 12px;
}
.us-cache-stat-row:last-child { border-bottom: none; }
.us-cache-key { font-family: monospace; color: #555; word-break: break-all; }
.us-cache-more { padding: 8px 10px; color: #999; font-size: 12px; text-align: center; }
</style>
