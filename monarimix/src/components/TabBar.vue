<template>
  <nav class="tab-bar">
    <button
      class="tab-btn"
      :class="{ active: activeTab === 'mixer' }"
      @click="store.activeTab = 'mixer'"
    >Mixer</button>
    <button
      class="tab-btn"
      :class="{ active: activeTab === 'recording' }"
      @click="store.activeTab = 'recording'"
    >Recording</button>
    <button
      class="tab-btn"
      :class="{ active: activeTab === 'settings' }"
      @click="store.activeTab = 'settings'"
    >Settings</button>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from '../lib/store.js'

const store = useStore()
const activeTab = computed(() => store.activeTab)
</script>
