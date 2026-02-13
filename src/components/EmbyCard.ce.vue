<script lang="ts" setup>
import { computed, ref } from 'vue';
import type { EmbyItem } from '@/types/emby';
import { CONFIG } from '@/services/config';

const props = defineProps<{
  item: EmbyItem;
  items?: EmbyItem[];
}>();

// Emby selector state (for multi-result)
const selectedIndex = ref(0);

const current = computed(() => {
  if (props.items?.length) {
    return props.items[selectedIndex.value] || props.items[0];
  }
  return props.item;
});

const year = computed(() => current.value?.ProductionYear || '');

const rating = computed(() => {
  if (!current.value) return '';
  return current.value.CommunityRating
    ? current.value.CommunityRating.toFixed(1)
    : (current.value.OfficialRating || '');
});

const path = computed(() => {
  if (!current.value) return '';
  return current.value.Path
    || (current.value.MediaSources?.[0]?.Path)
    || 'Path Unknown';
});

const imgUrl = computed(() => {
  if (!current.value) return '';
  return `${CONFIG.emby.server}/emby/Items/${current.value.Id}/Images/Primary?maxHeight=300&maxWidth=200&quality=90`;
});

const webUrl = computed(() => {
  if (!current.value) return '';
  return `${CONFIG.emby.server}/web/index.html#!/item?id=${current.value.Id}&serverId=${current.value.ServerId || ''}`;
});

const techInfo = computed(() => {
  if (!current.value?.MediaSources?.length) return [];
  const source = current.value.MediaSources[0];
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
  if (!current.value?.MediaSources?.[0]?.MediaStreams) return '';
  const audios = current.value.MediaSources[0].MediaStreams.filter(s => s.Type === 'Audio');
  if (!audios.length) return '';
  return '🔊 ' + audios.map(a => {
    const lang = (a.Language || 'und').toUpperCase();
    const codec = (a.Codec || '').toUpperCase();
    const channels = a.Channels ? (a.Channels === 6 ? '5.1' : (a.Channels === 8 ? '7.1' : '2.0')) : '';
    return `${lang} ${codec} ${channels}`.trim();
  }).join(' / ');
});

const subtitleInfo = computed(() => {
  if (!current.value?.MediaSources?.[0]?.MediaStreams) return '';
  const subs = current.value.MediaSources[0].MediaStreams.filter(s => s.Type === 'Subtitle');
  if (!subs.length) return '';
  return '💬 ' + subs.map(s => {
    const lang = (s.Language || 'und').toUpperCase();
    const codec = (s.Codec || '').toUpperCase();
    const forced = s.IsForced ? '[Forced]' : '';
    return `${lang} ${codec}${forced}`.trim();
  }).join(' / ');
});
</script>

<template>
  <div class="us-emby-section">
    <!-- Emby switcher (for multi-result) -->
    <div v-if="items && items.length > 1" class="us-emby-switcher">
      <select :value="selectedIndex" class="us-emby-select" @change="selectedIndex = Number(($event.target as HTMLSelectElement).value)">
        <option v-for="(it, idx) in items" :key="it.Id" :value="idx">
          {{ it.Name }} ({{ it.ProductionYear || '' }}) - {{ it.Type }}
        </option>
      </select>
    </div>

    <div class="us-emby-detail-row">
      <div class="us-emby-poster">
        <img :src="imgUrl" @error="($event.target as HTMLImageElement).style.display = 'none'">
      </div>
      <div class="us-emby-info">
        <div class="us-emby-name">
          {{ current.Name }} <span class="us-emby-year">({{ year }})</span>
        </div>
        <div class="us-emby-tags">
          <span class="us-emby-type-badge">{{ current.Type }}</span>
          <span v-if="rating" class="us-emby-rating">★ {{ rating }}</span>
        </div>

        <!-- Series seasons -->
        <div v-if="current.Type === 'Series' && current.Seasons?.length" class="us-season-badges">
          <span v-for="s in current.Seasons" :key="s.Id" class="us-season-badge">
            {{ s.Name.replace('Season', 'S').replace('Specials', 'SP') }}: {{ s.ChildCount || s.RecursiveItemCount || 0 }}集
          </span>
        </div>
        <div v-else-if="current.Type === 'Series'" class="us-series-count">
          {{ current.ChildCount || 0 }} Seasons / {{ current.RecursiveItemCount || 0 }} Episodes
        </div>

        <div class="us-emby-path">
          <strong>Path:</strong> <span class="us-path-value">{{ path }}</span>
        </div>
        <div v-if="techInfo.length" class="us-tech-info">{{ techInfo.join(' • ') }}</div>
        <div v-if="audioInfo" class="us-stream-info">{{ audioInfo }}</div>
        <div v-if="subtitleInfo" class="us-stream-info">{{ subtitleInfo }}</div>

        <div class="us-emby-action">
          <a :href="webUrl" class="us-btn us-btn-primary" target="_blank">▶ Play on Emby</a>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.us-emby-section {
  padding: 20px;
  border-bottom: 1px solid #eee;
  background: #fdfdfd;
}

.us-emby-switcher {
  margin-bottom: 12px;
}

.us-emby-select {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 13px;
  color: #333;
  background: white;
  cursor: pointer;
}

.us-emby-detail-row {
  display: flex;
}

.us-emby-poster {
  flex-shrink: 0;
  width: 100px;
  margin-right: 20px;
}

.us-emby-poster img {
  width: 100%;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.us-emby-info {
  flex: 1;
}

.us-emby-name {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.us-emby-year {
  font-weight: normal;
  color: #999;
  font-size: 14px;
}

.us-emby-tags {
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
}

.us-emby-type-badge {
  background: #eee;
  padding: 2px 6px;
  border-radius: 4px;
  margin-right: 6px;
}

.us-emby-rating {
  color: #f5c518;
  font-weight: bold;
}

.us-season-badges {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.us-season-badge {
  background: #e8f5e9;
  color: #2e7d32;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  border: 1px solid #c8e6c9;
}

.us-series-count {
  margin-top: 5px;
  color: #52B54B;
  font-weight: bold;
}

.us-emby-path {
  font-size: 12px;
  color: #555;
  margin-top: 8px;
  line-height: 1.4;
}

.us-path-value {
  font-family: monospace;
  background: #f1f1f1;
  padding: 2px 4px;
  border-radius: 3px;
  word-break: break-all;
}

.us-tech-info {
  font-size: 12px;
  color: #999;
  margin-top: 6px;
}

.us-stream-info {
  font-size: 11px;
  color: #777;
  margin-top: 6px;
  line-height: 1.4;
}

.us-emby-action {
  margin-top: 12px;
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

.us-btn-primary {
  background: #52B54B;
  color: white;
}

.us-btn-primary:hover {
  background: #43943d;
}
</style>
