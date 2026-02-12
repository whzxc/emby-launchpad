<script setup lang="ts">
import { computed } from 'vue';

export type DotStatus = 'loading' | 'found' | 'not-found' | 'error';

const props = defineProps<{
  status: DotStatus;
  title?: string;
}>();

const emit = defineEmits<{
  (e: 'dotClick'): void;
}>();

const statusClass = computed(() => {
  switch (props.status) {
    case 'loading': return 'dot-loading';
    case 'found': return 'found';
    case 'not-found': return 'not-found';
    case 'error': return 'error';
    default: return 'dot-loading';
  }
});

const dotTitle = computed(() => {
  if (props.title) return props.title;
  switch (props.status) {
    case 'loading': return 'Checking...';
    case 'found': return 'Found in Emby';
    case 'not-found': return 'Not found';
    case 'error': return 'Error';
    default: return '';
  }
});
</script>

<template>
  <div class="us-dot" :class="statusClass" :title="dotTitle" @click="emit('dotClick')" />
</template>

<style>
:host {
  display: inline-block;
}

.us-dot {
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.5);
  border: 2px solid white;
  transition: transform 0.2s ease, opacity 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

.us-dot:hover {
  transform: scale(1.15);
}

.us-dot.dot-loading {
  background-color: #01b4e4;
  animation: us-pulse 1.5s infinite;
  opacity: 0.8;
  border-color: rgba(255, 255, 255, 0.8);
}

.us-dot.found {
  background-color: #52B54B;
  box-shadow: 0 0 10px rgba(82, 181, 75, 0.8);
}

.us-dot.not-found,
.us-dot.error {
  background-color: #9e9e9e;
  opacity: 0.7;
}

@keyframes us-pulse {
  0% {
    transform: scale(0.95);
    opacity: 0.7;
  }

  50% {
    transform: scale(1.05);
    opacity: 1;
  }

  100% {
    transform: scale(0.95);
    opacity: 0.7;
  }
}
</style>
