<script lang="ts" setup>
import { computed, ref } from 'vue';
import { type Nullbr115Item, type NullbrMagnetItem, nullbrService } from '@/services/api/nullbr';
import type { TmdbInfo } from '@/types/ui';

const props = defineProps<{
  tmdbInfo?: TmdbInfo | null;
  searchQueries?: string[];
}>();

// Nullbr resource state
const nullbrLoading = ref(true);
const nullbrItems115 = ref<Nullbr115Item[]>([]);
const nullbrMagnets = ref<NullbrMagnetItem[]>([]);
const nullbrError = ref(false);

const uniqueQueries = computed(() => {
  if (!props.searchQueries) return [];
  return [...new Set(props.searchQueries.filter(q => q?.trim()))];
});

async function copyMagnet(magnet: string, event: Event) {
  const btn = event.target as HTMLButtonElement;
  try {
    await navigator.clipboard.writeText(magnet);
    btn.textContent = '已复制';
    setTimeout(() => {
      btn.textContent = '复制';
    }, 1500);
  } catch {
    GM.setClipboard(magnet);
    btn.textContent = '已复制';
    setTimeout(() => {
      btn.textContent = '复制';
    }, 1500);
  }
}

// Load Nullbr resources
async function loadNullbrResources() {
  if (!props.tmdbInfo) {
    nullbrLoading.value = false;
    return;
  }

  try {
    const resources = await nullbrService.getAllResources(props.tmdbInfo.id, props.tmdbInfo.mediaType);
    nullbrItems115.value = resources.items115;
    nullbrMagnets.value = resources.magnets;
  } catch {
    nullbrError.value = true;
  } finally {
    nullbrLoading.value = false;
  }
}

loadNullbrResources();
</script>

<template>
  <!-- Nullbr Resources -->
  <div v-if="tmdbInfo" class="us-nullbr-section">
    <div class="us-nullbr-header">
      <span>🔗 网盘 &amp; 磁力资源</span>
      <span class="us-nullbr-badge">Nullbr</span>
    </div>

    <div v-if="nullbrLoading" class="us-nullbr-loading">正在搜索资源...</div>

    <div v-else-if="nullbrError" class="us-nullbr-empty">加载资源失败</div>

    <div v-else-if="!nullbrItems115.length && !nullbrMagnets.length" class="us-nullbr-empty">
      暂无可用资源
    </div>

    <div v-else>
      <!-- 115 Resources -->
      <div v-if="nullbrItems115.length" style="margin-bottom: 12px;">
        <div class="us-section-label">📁 115 网盘分享 ({{ nullbrItems115.length }})</div>
        <div class="us-resource-list">
          <div v-for="item in nullbrItems115.slice(0, 5)" :key="item.share_link" class="us-resource-item">
            <div class="us-resource-info">
              <div :title="item.title" class="us-resource-title">{{ item.title }}</div>
              <div class="us-resource-meta">
                <span>{{ item.size }}</span>
                <span v-if="item.resolution" class="us-resource-tag">{{ item.resolution }}</span>
                <span v-if="item.quality" class="us-resource-tag">{{ item.quality }}</span>
                <span v-if="item.season_list" class="us-resource-tag">{{ item.season_list.join(', ') }}</span>
              </div>
            </div>
            <div class="us-resource-actions">
              <a :href="item.share_link" class="us-resource-btn primary" target="_blank">打开链接</a>
            </div>
          </div>
        </div>
      </div>

      <!-- Magnet Resources -->
      <div v-if="nullbrMagnets.length">
        <div class="us-section-label">🧲 磁力链接 ({{ nullbrMagnets.length }})</div>
        <div class="us-resource-list">
          <div v-for="item in nullbrMagnets.slice(0, 5)" :key="item.magnet" class="us-resource-item">
            <div class="us-resource-info">
              <div :title="item.name" class="us-resource-title">{{ item.name }}</div>
              <div class="us-resource-meta">
                <span>{{ item.size }}</span>
                <span v-if="item.resolution" class="us-resource-tag">{{ item.resolution }}</span>
                <span v-if="item.source" class="us-resource-tag">{{ item.source }}</span>
                <span v-if="item.zh_sub" class="us-resource-tag zh-sub">中字</span>
              </div>
            </div>
            <div class="us-resource-actions">
              <a :href="item.magnet" class="us-resource-btn primary" style="text-decoration:none;">打开</a>
              <button class="us-resource-btn secondary" @click="copyMagnet(item.magnet, $event)">复制</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Search Actions -->
  <div v-if="uniqueQueries.length" class="us-actions">
    <a v-if="!tmdbInfo" :href="`https://www.themoviedb.org/search?query=${encodeURIComponent(uniqueQueries[0])}`" class="us-status-text">
      Not Found in TMDB
    </a>
    <div class="us-actions-links">
      <a :href="`https://www.gyg.si/s/1---1/${encodeURIComponent(uniqueQueries[0])}`" class="us-btn us-btn-search" target="_blank">GYG</a>
      <a :href="`https://bt4gprx.com/search?orderby=size&p=1&q=${encodeURIComponent(uniqueQueries[0])}`" class="us-btn us-btn-search" target="_blank">BT4G</a>
      <a :href="`https://dmhy.org/topics/list?keyword=${encodeURIComponent(uniqueQueries[0])}&sort_id=2&team_id=0&order=date-desc`" class="us-btn us-btn-search" target="_blank">DMHY</a>
      <a :href="`https://dmhy.org/topics/list?keyword=${encodeURIComponent(uniqueQueries[0])}&sort_id=31&team_id=0&order=date-desc`" class="us-btn us-btn-search" target="_blank">DMHY 全集</a>
    </div>
  </div>
</template>

<style>
.us-nullbr-section {
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  background: linear-gradient(135deg, #667eea0a 0%, #764ba20a 100%);
}

.us-nullbr-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: bold;
  color: #333;
}

.us-nullbr-badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
}

.us-nullbr-loading {
  text-align: center;
  color: #999;
  padding: 20px;
}

.us-nullbr-empty {
  text-align: center;
  color: #999;
  padding: 15px;
  font-size: 13px;
}

.us-section-label {
  font-size: 12px;
  font-weight: bold;
  color: #666;
  margin-bottom: 8px;
}

.us-resource-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.us-resource-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
  font-size: 12px;
  transition: all 0.2s;
}

.us-resource-item:hover {
  border-color: #667eea;
  box-shadow: 0 2px 6px rgba(102, 126, 234, 0.15);
}

.us-resource-info {
  flex: 1;
  min-width: 0;
}

.us-resource-title {
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 280px;
}

.us-resource-meta {
  display: flex;
  gap: 8px;
  margin-top: 3px;
  color: #888;
  font-size: 11px;
}

.us-resource-tag {
  background: #f0f0f0;
  padding: 1px 5px;
  border-radius: 3px;
}

.us-resource-tag.zh-sub {
  background: #e8f5e9;
  color: #388e3c;
}

.us-resource-actions {
  display: flex;
  gap: 6px;
}

.us-resource-btn {
  padding: 4px 10px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
  text-decoration: none;
}

.us-resource-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.us-resource-btn.primary:hover {
  opacity: 0.9;
}

.us-resource-btn.secondary {
  background: #f5f5f5;
  color: #666;
}

.us-resource-btn.secondary:hover {
  background: #e0e0e0;
}

/* Actions */
.us-actions {
  padding: 20px;
  border-bottom: 1px solid #eee;
  text-align: center;
}

.us-status-text {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 15px;
  color: #9e9e9e;
}

.us-actions-links {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.us-btn {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 6px;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: background 0.2s;
}

.us-btn-search {
  background: #eef9fd;
  color: #01b4e4;
  border: 1px solid #b3e5fc;
}

.us-btn-search:hover {
  background: #e1f5fe;
  color: #008dba;
}
</style>
