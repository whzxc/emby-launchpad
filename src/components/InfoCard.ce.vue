<script lang="ts" setup>
import { computed } from 'vue';
import type { EmbyItem } from '@/types/emby';
import type { TmdbInfo } from '@/types/ui';
import type { TmdbSearchItem } from '@/services/media-service';
import EmbyCard from './EmbyCard.ce.vue';
import TmdbCard from './TmdbCard.ce.vue';
import ResourceCard from './ResourceCard.ce.vue';

const props = defineProps<{
  title: string;
  embyItem?: EmbyItem | null;
  embyItems?: EmbyItem[];
  searchQueries?: string[];
  tmdbInfo?: TmdbInfo;
  tmdbResults?: TmdbSearchItem[];
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const hasEmby = computed(() => !!(props.embyItems?.length || props.embyItem));
const firstEmbyItem = computed(() => props.embyItems?.[0] || props.embyItem || null);

// Determine effective tmdbInfo for ResourceCard:
// 1. From pipeline props (when TMDB was searched)
// 2. From first TMDB search result
// 3. From Emby item's ProviderIds (when found via name search)
const effectiveTmdbInfo = computed((): TmdbInfo | null => {
  if (props.tmdbInfo) return props.tmdbInfo;
  if (props.tmdbResults?.length) {
    const first = props.tmdbResults[0];
    return { id: first.id, mediaType: first.mediaType };
  }
  // Try to extract from Emby item's ProviderIds
  const emby = firstEmbyItem.value;
  if (emby) {
    const providerIds = (emby as any).ProviderIds;
    const tmdbId = providerIds?.Tmdb || providerIds?.tmdb;
    if (tmdbId) {
      const mediaType = emby.Type === 'Series' ? 'tv' : 'movie';
      return { id: Number(tmdbId), mediaType };
    }
  }
  return null;
});

function onOverlayClick(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains('us-modal-overlay')) {
    emit('close');
  }
}
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
        <!-- Emby Item Detail -->
        <EmbyCard v-if="firstEmbyItem" :item="firstEmbyItem" :items="embyItems" />

        <!-- TMDB Info Panel (when not found in Emby) -->
        <TmdbCard v-if="!hasEmby" :results="tmdbResults || []" :title="title" />

        <!-- Nullbr Resources + Search Actions (always visible) -->
        <ResourceCard :search-queries="searchQueries" :tmdb-info="effectiveTmdbInfo" />
      </div>

      <!-- Footer -->
      <div class="us-modal-footer">
        <button class="us-btn us-btn-outline" @click="emit('close')">Close</button>
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

* {
  box-sizing: border-box;
}

.us-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  z-index: 10000;
  display: flex;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(2px);
  pointer-events: auto;
}

.us-modal {
  background: white;
  width: 500px;
  max-width: 90%;
  max-height: 85vh;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  overflow: hidden;
}

.us-modal-header {
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8f9fa;
}

.us-modal-title {
  font-weight: bold;
  font-size: 16px;
  color: #333;
}

.us-modal-close {
  cursor: pointer;
  font-size: 20px;
  color: #999;
  line-height: 1;
}

.us-modal-close:hover {
  color: #333;
}

.us-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.us-modal-footer {
  padding: 15px;
  background: #f8f9fa;
  text-align: right;
  border-top: 1px solid #eee;
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

.us-btn-outline {
  background: white;
  color: #333;
  border: 1px solid #ddd;
}

.us-btn-outline:hover {
  background: #f5f5f5;
}
</style>
