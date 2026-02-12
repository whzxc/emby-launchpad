<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { EmbyItem } from '@/services/api/emby';
import { CONFIG } from '@/services/config';
import { nullbrService, type Nullbr115Item, type NullbrMagnetItem } from '@/services/api/nullbr';
import type { LogEntry, TmdbInfo, LogDataWithMeta } from '@/types/ui';

const props = defineProps<{
  title: string;
  logs: LogEntry[];
  embyItem?: EmbyItem | null;
  searchQueries?: string[];
  tmdbInfo?: TmdbInfo;
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

// Nullbr resource state
const nullbrLoading = ref(true);
const nullbrItems115 = ref<Nullbr115Item[]>([]);
const nullbrMagnets = ref<NullbrMagnetItem[]>([]);
const nullbrError = ref(false);

// Text modal state
const showTextModal = ref(false);
const textModalTitle = ref('');
const textModalContent = ref('');

// Computed values
const embyYear = computed(() => props.embyItem?.ProductionYear || '');
const embyRating = computed(() => {
  if (!props.embyItem) return '';
  return props.embyItem.CommunityRating
    ? props.embyItem.CommunityRating.toFixed(1)
    : (props.embyItem.OfficialRating || '');
});

const embyPath = computed(() => {
  if (!props.embyItem) return '';
  return props.embyItem.Path
    || (props.embyItem.MediaSources?.[0]?.Path)
    || 'Path Unknown';
});

const embyImgUrl = computed(() => {
  if (!props.embyItem) return '';
  return `${CONFIG.emby.server}/emby/Items/${props.embyItem.Id}/Images/Primary?maxHeight=300&maxWidth=200&quality=90`;
});

const embyWebUrl = computed(() => {
  if (!props.embyItem) return '';
  return `${CONFIG.emby.server}/web/index.html#!/item?id=${props.embyItem.Id}&serverId=${props.embyItem.ServerId || ''}`;
});

const techInfo = computed(() => {
  if (!props.embyItem?.MediaSources?.length) return [];
  const source = props.embyItem.MediaSources[0];
  const items: string[] = [];

  const sizeBytes = source.Size || 0;
  items.push((sizeBytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB');
  if (source.Container) items.push(source.Container.toUpperCase());

  if (source.MediaStreams) {
    const video = source.MediaStreams.find(s => s.Type === 'Video');
    if (video) {
      if (video.Width && video.Height) items.push(`${video.Width}x${video.Height}`);
      if (video.Codec) items.push(video.Codec.toUpperCase());
      if (video.BitRate) items.push((video.BitRate / 1000000).toFixed(1) + ' Mbps');
      if (video.BitDepth) items.push(`${video.BitDepth}bit`);
    }
  }
  return items;
});

const audioInfo = computed(() => {
  if (!props.embyItem?.MediaSources?.[0]?.MediaStreams) return '';
  const audios = props.embyItem.MediaSources[0].MediaStreams.filter(s => s.Type === 'Audio');
  if (!audios.length) return '';
  return '🔊 ' + audios.map(a => {
    const lang = (a.Language || 'und').toUpperCase();
    const codec = (a.Codec || '').toUpperCase();
    const channels = a.Channels ? (a.Channels === 6 ? '5.1' : (a.Channels === 8 ? '7.1' : '2.0')) : '';
    return `${lang} ${codec} ${channels}`.trim();
  }).join(' / ');
});

const subtitleInfo = computed(() => {
  if (!props.embyItem?.MediaSources?.[0]?.MediaStreams) return '';
  const subs = props.embyItem.MediaSources[0].MediaStreams.filter(s => s.Type === 'Subtitle');
  if (!subs.length) return '';
  return '💬 ' + subs.map(s => {
    const lang = (s.Language || 'und').toUpperCase();
    const codec = (s.Codec || '').toUpperCase();
    const forced = s.IsForced ? '[Forced]' : '';
    return `${lang} ${codec}${forced}`.trim();
  }).join(' / ');
});

const uniqueQueries = computed(() => {
  if (!props.searchQueries) return [];
  return [...new Set(props.searchQueries.filter(q => q?.trim()))];
});

function getStepClass(log: LogEntry): string {
  return (log.step.includes('Error') || log.status === 'error') ? 'error' : 'done';
}

function getLogMeta(log: LogEntry): LogDataWithMeta | null {
  const data = log.data as LogDataWithMeta | undefined;
  return data?.meta ? data : null;
}

function getLogResponse(log: LogEntry): string {
  const data = log.data as LogDataWithMeta | undefined;
  if (!data?.response) return '';
  return typeof data.response === 'string' ? data.response : JSON.stringify(data.response, null, 2);
}

function isLongResponse(resp: string): boolean {
  const lines = resp.split('\n');
  return lines.length > 5 || resp.length > 500;
}

function getShortResponse(resp: string): string {
  const lines = resp.split('\n');
  const isLong = lines.length > 5 || resp.length > 500;
  return lines.slice(0, 5).join('\n') + (isLong ? '\n...' : '');
}

function showFullResponse(resp: string) {
  textModalTitle.value = 'Full Response';
  textModalContent.value = resp;
  showTextModal.value = true;
}

function renderSimpleData(data: unknown): string {
  if (!data) return '';
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) return JSON.stringify(data, null, 2);
  const entries = Object.entries(data as Record<string, unknown>);
  return entries
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join('\n');
}

async function copyMagnet(magnet: string, event: Event) {
  const btn = event.target as HTMLButtonElement;
  try {
    await navigator.clipboard.writeText(magnet);
    btn.textContent = '已复制';
    setTimeout(() => { btn.textContent = '复制'; }, 1500);
  } catch {
    GM_setClipboard(magnet);
    btn.textContent = '已复制';
    setTimeout(() => { btn.textContent = '复制'; }, 1500);
  }
}

function onOverlayClick(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains('us-modal-overlay')) {
    emit('close');
  }
}

onMounted(async () => {
  if (props.tmdbInfo) {
    try {
      const resources = await nullbrService.getAllResources(props.tmdbInfo.id, props.tmdbInfo.mediaType);
      nullbrItems115.value = resources.items115;
      nullbrMagnets.value = resources.magnets;
    } catch {
      nullbrError.value = true;
    } finally {
      nullbrLoading.value = false;
    }
  } else {
    nullbrLoading.value = false;
  }
});
</script>

<template>
  <div v-if="visible" class="us-modal-overlay" @click="onOverlayClick">
    <div class="us-modal">
      <!-- Header -->
      <div class="us-modal-header">
        <div class="us-modal-title">{{ title }}</div>
        <div class="us-modal-close" @click="emit('close')">&times;</div>
      </div>

      <div class="us-modal-body">
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
                    <div class="us-resource-title" :title="item.title">{{ item.title }}</div>
                    <div class="us-resource-meta">
                      <span>{{ item.size }}</span>
                      <span v-if="item.resolution" class="us-resource-tag">{{ item.resolution }}</span>
                      <span v-if="item.quality" class="us-resource-tag">{{ item.quality }}</span>
                      <span v-if="item.season_list" class="us-resource-tag">{{ item.season_list.join(', ') }}</span>
                    </div>
                  </div>
                  <div class="us-resource-actions">
                    <a :href="item.share_link" target="_blank" class="us-resource-btn primary">打开链接</a>
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
                    <div class="us-resource-title" :title="item.name">{{ item.name }}</div>
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

        <!-- Emby Item Detail -->
        <div v-if="embyItem" class="us-emby-section">
          <div class="us-emby-poster">
            <img :src="embyImgUrl" @error="($event.target as HTMLImageElement).style.display = 'none'">
          </div>
          <div class="us-emby-info">
            <div class="us-emby-name">
              {{ embyItem.Name }} <span class="us-emby-year">({{ embyYear }})</span>
            </div>
            <div class="us-emby-tags">
              <span class="us-emby-type-badge">{{ embyItem.Type }}</span>
              <span v-if="embyRating" class="us-emby-rating">★ {{ embyRating }}</span>
            </div>

            <!-- Series seasons -->
            <div v-if="embyItem.Type === 'Series' && embyItem.Seasons?.length" class="us-season-badges">
              <span v-for="s in embyItem.Seasons" :key="s.Id" class="us-season-badge">
                {{ s.Name.replace('Season', 'S').replace('Specials', 'SP') }}: {{ s.ChildCount || s.RecursiveItemCount || 0 }}集
              </span>
            </div>
            <div v-else-if="embyItem.Type === 'Series'" class="us-series-count">
              {{ embyItem.ChildCount || 0 }} Seasons / {{ embyItem.RecursiveItemCount || 0 }} Episodes
            </div>

            <div class="us-emby-path">
              <strong>Path:</strong> <span class="us-path-value">{{ embyPath }}</span>
            </div>
            <div v-if="techInfo.length" class="us-tech-info">{{ techInfo.join(' • ') }}</div>
            <div v-if="audioInfo" class="us-stream-info">{{ audioInfo }}</div>
            <div v-if="subtitleInfo" class="us-stream-info">{{ subtitleInfo }}</div>

            <div class="us-emby-action">
              <a :href="embyWebUrl" target="_blank" class="us-btn us-btn-primary">▶ Play on Emby</a>
            </div>
          </div>
        </div>

        <!-- Not Found Actions -->
        <div v-if="!embyItem && uniqueQueries.length" class="us-actions">
          <div class="us-status-text">Not Found in Library</div>
          <div class="us-actions-links">
            <a v-if="uniqueQueries[0]" :href="`https://www.gyg.si/s/1---1/${encodeURIComponent(uniqueQueries[0])}`" target="_blank" class="us-btn us-btn-search">Search GYG</a>
            <a v-if="uniqueQueries[0]" :href="`https://bt4gprx.com/search?orderby=size&p=1&q=${encodeURIComponent(uniqueQueries[0])}`" target="_blank" class="us-btn us-btn-search">Search BT4G</a>
            <a v-if="uniqueQueries[0]" :href="`https://dmhy.org/topics/list?keyword=${encodeURIComponent(uniqueQueries[0])}&sort_id=2&team_id=0&order=date-desc`" target="_blank" class="us-btn us-btn-search">DMHY 搜全集</a>
          </div>
        </div>

        <!-- Process Log -->
        <div class="us-log-container">
          <div class="us-log-title">Process Log</div>
          <div v-for="(log, index) in logs" :key="index" class="us-step" :class="getStepClass(log)">
            <div class="us-step-icon">{{ index + 1 }}</div>
            <div class="us-step-content">
              <div class="us-step-header">
                <span>{{ log.step }}</span>
                <span class="us-step-time">{{ log.time }}</span>
              </div>
              <div class="us-step-details">
                <!-- API request with meta -->
                <template v-if="getLogMeta(log)">
                  <div class="us-api-url">
                    <span class="us-api-method">{{ (getLogMeta(log)!.meta!.method || 'GET') }}</span>
                    <a :href="getLogMeta(log)!.meta!.url" target="_blank" class="us-api-link">{{ getLogMeta(log)!.meta!.url }}</a>
                  </div>
                  <template v-if="getLogResponse(log)">
                    <div class="us-response-block">
                      <div class="us-response-label">Response:</div>
                      <div class="us-response-content">{{ getShortResponse(getLogResponse(log)) }}</div>
                      <div
                        v-if="isLongResponse(getLogResponse(log))"
                        class="us-toggle-details"
                        @click="showFullResponse(getLogResponse(log))"
                      >Show Full Response</div>
                    </div>
                  </template>
                </template>
                <!-- Simple data -->
                <template v-else-if="log.data">
                  <div class="us-simple-data">{{ renderSimpleData(log.data) }}</div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="us-modal-footer">
        <button class="us-btn us-btn-outline" @click="emit('close')">Close</button>
      </div>
    </div>
  </div>

  <!-- Text Modal (for full response) -->
  <div v-if="showTextModal" class="us-modal-overlay us-text-overlay" @click.self="showTextModal = false">
    <div class="us-modal us-text-modal">
      <div class="us-modal-header">
        <div class="us-modal-title">{{ textModalTitle }}</div>
        <div class="us-modal-close" @click="showTextModal = false">&times;</div>
      </div>
      <div class="us-modal-body" style="padding: 15px;">
        <textarea readonly class="us-textarea">{{ textModalContent }}</textarea>
      </div>
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
  z-index: 10000;
  pointer-events: none;
}

:host([visible]) {
  pointer-events: auto;
}

* { box-sizing: border-box; }

.us-modal-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.6); z-index: 10000;
  display: flex; justify-content: center; align-items: center;
  backdrop-filter: blur(2px);
  pointer-events: auto;
}

.us-text-overlay {
  z-index: 10001;
}

.us-modal {
  background: white; width: 500px; max-width: 90%; max-height: 85vh;
  border-radius: 12px; display: flex; flex-direction: column;
  box-shadow: 0 10px 25px rgba(0,0,0,0.3);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  overflow: hidden;
}

.us-text-modal { width: 600px; }

.us-modal-header {
  padding: 15px 20px; border-bottom: 1px solid #eee;
  display: flex; justify-content: space-between; align-items: center;
  background: #f8f9fa;
}
.us-modal-title { font-weight: bold; font-size: 16px; color: #333; }
.us-modal-close { cursor: pointer; font-size: 20px; color: #999; line-height: 1; }
.us-modal-close:hover { color: #333; }
.us-modal-body { flex: 1; overflow-y: auto; padding: 0; }
.us-modal-footer {
  padding: 15px; background: #f8f9fa; text-align: right; border-top: 1px solid #eee;
}

.us-textarea {
  width: 100%; height: 400px; font-family: monospace; font-size: 12px;
  border: 1px solid #ddd; padding: 10px; resize: vertical;
}

/* Nullbr Section */
.us-nullbr-section {
  padding: 15px 20px; border-bottom: 1px solid #eee;
  background: linear-gradient(135deg, #667eea0a 0%, #764ba20a 100%);
}
.us-nullbr-header {
  display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
  font-weight: bold; color: #333;
}
.us-nullbr-badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px;
}
.us-nullbr-loading { text-align: center; color: #999; padding: 20px; }
.us-nullbr-empty { text-align: center; color: #999; padding: 15px; font-size: 13px; }

.us-section-label { font-size: 12px; font-weight: bold; color: #666; margin-bottom: 8px; }

.us-resource-list { display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto; }
.us-resource-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; background: white; border-radius: 6px;
  border: 1px solid #e0e0e0; font-size: 12px; transition: all 0.2s;
}
.us-resource-item:hover { border-color: #667eea; box-shadow: 0 2px 6px rgba(102, 126, 234, 0.15); }
.us-resource-info { flex: 1; min-width: 0; }
.us-resource-title { font-weight: 500; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px; }
.us-resource-meta { display: flex; gap: 8px; margin-top: 3px; color: #888; font-size: 11px; }
.us-resource-tag { background: #f0f0f0; padding: 1px 5px; border-radius: 3px; }
.us-resource-tag.zh-sub { background: #e8f5e9; color: #388e3c; }
.us-resource-actions { display: flex; gap: 6px; }
.us-resource-btn {
  padding: 4px 10px; border-radius: 4px; border: none; cursor: pointer;
  font-size: 11px; transition: all 0.2s; text-decoration: none;
}
.us-resource-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;
}
.us-resource-btn.primary:hover { opacity: 0.9; }
.us-resource-btn.secondary { background: #f5f5f5; color: #666; }
.us-resource-btn.secondary:hover { background: #e0e0e0; }

/* Emby Section */
.us-emby-section {
  display: flex; padding: 20px; border-bottom: 1px solid #eee; background: #fdfdfd;
}
.us-emby-poster { flex-shrink: 0; width: 100px; margin-right: 20px; }
.us-emby-poster img { width: 100%; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.us-emby-info { flex: 1; }
.us-emby-name { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 4px; }
.us-emby-year { font-weight: normal; color: #999; font-size: 14px; }
.us-emby-tags { font-size: 13px; color: #666; margin-bottom: 8px; }
.us-emby-type-badge { background: #eee; padding: 2px 6px; border-radius: 4px; margin-right: 6px; }
.us-emby-rating { color: #f5c518; font-weight: bold; }
.us-season-badges { margin-top: 6px; display: flex; flex-wrap: wrap; gap: 4px; }
.us-season-badge {
  background: #e8f5e9; color: #2e7d32; padding: 2px 6px; border-radius: 4px;
  font-size: 11px; border: 1px solid #c8e6c9;
}
.us-series-count { margin-top: 5px; color: #52B54B; font-weight: bold; }
.us-emby-path { font-size: 12px; color: #555; margin-top: 8px; line-height: 1.4; }
.us-path-value { font-family: monospace; background: #f1f1f1; padding: 2px 4px; border-radius: 3px; word-break: break-all; }
.us-tech-info { font-size: 12px; color: #999; margin-top: 6px; }
.us-stream-info { font-size: 11px; color: #777; margin-top: 6px; line-height: 1.4; }
.us-emby-action { margin-top: 12px; }

/* Actions (Not Found) */
.us-actions { padding: 20px; border-bottom: 1px solid #eee; text-align: center; }
.us-status-text { font-size: 16px; font-weight: bold; margin-bottom: 15px; color: #9e9e9e; }
.us-actions-links { display: flex; gap: 10px; flex-wrap: wrap; }

/* Buttons */
.us-btn {
  display: inline-block; padding: 4px 8px; border-radius: 6px;
  text-decoration: none; font-size: 14px; font-weight: 500;
  cursor: pointer; border: none; transition: background 0.2s;
}
.us-btn-primary { background: #52B54B; color: white; }
.us-btn-primary:hover { background: #43943d; }
.us-btn-outline { background: white; color: #333; border: 1px solid #ddd; }
.us-btn-outline:hover { background: #f5f5f5; }
.us-btn-search { background: #eef9fd; color: #01b4e4; border: 1px solid #b3e5fc; }
.us-btn-search:hover { background: #e1f5fe; color: #008dba; }

/* Log Container */
.us-log-container { padding: 15px 20px; background: #fafafa; }
.us-log-title {
  font-size: 13px; font-weight: bold; color: #666; margin-bottom: 15px;
  text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #eee; padding-bottom: 5px;
}
.us-step { display: flex; margin-bottom: 0; position: relative; padding-bottom: 15px; }
.us-step:last-child { padding-bottom: 0; }
.us-step::before {
  content: ''; position: absolute; left: 9px; top: 22px; bottom: 0;
  width: 2px; background: #e0e0e0; display: block; z-index: 1;
}
.us-step:last-child::before { display: none; }
.us-step-icon {
  width: 20px; height: 20px; border-radius: 50%; background: #e0e0e0; color: white;
  font-size: 10px; display: flex; justify-content: center; align-items: center;
  z-index: 2; margin-right: 12px; flex-shrink: 0; margin-top: 2px;
}
.us-step.done .us-step-icon { background: #52B54B; }
.us-step.error .us-step-icon { background: #dc3545; }
.us-step-content { flex: 1; min-width: 0; }
.us-step-header { font-size: 13px; font-weight: 600; color: #333; display: flex; justify-content: space-between; }
.us-step-time { font-size: 11px; color: #999; font-weight: normal; }
.us-step-details { font-size: 12px; color: #666; margin-top: 4px; overflow-wrap: break-word; }
.us-api-url { font-family: monospace; font-size: 11px; color: #01b4e4; margin-bottom: 4px; word-break: break-all; }
.us-api-method { font-weight: bold; }
.us-api-link { color: #01b4e4; text-decoration: none; }
.us-response-block { margin-top: 4px; border-left: 2px solid #ddd; padding-left: 8px; }
.us-response-label { font-size: 11px; color: #28a745; font-weight: bold; }
.us-response-content { font-family: monospace; font-size: 11px; color: #555; white-space: pre-wrap; word-break: break-all; }
.us-simple-data { font-family: monospace; font-size: 12px; margin-top: 4px; white-space: pre-wrap; }
.us-toggle-details { font-size: 11px; color: #01b4e4; cursor: pointer; margin-top: 4px; text-decoration: underline; }
</style>
