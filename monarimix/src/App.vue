<template>
  <div id="appContainer">
    <TabBar />
    <div v-show="activeTab === 'mixer'">
      <MixerTab />
    </div>
    <div v-show="activeTab === 'recording'">
      <RecordingTab />
    </div>
    <div v-show="activeTab === 'settings'">
      <SettingsTab />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useStore } from './lib/store.js'
import { initReaper } from './lib/reaper.js'
import { applyMode, getModeLabel, getModeIcon } from './lib/mixer.js'
import TabBar from './components/TabBar.vue'
import MixerTab from './tabs/MixerTab.vue'
import RecordingTab from './tabs/RecordingTab.vue'
import SettingsTab from './tabs/SettingsTab.vue'

const store = useStore()
const activeTab = computed(() => store.activeTab)

onMounted(() => {
  initReaper((newMode) => {
    // Orientation or mode changed — nothing extra needed, CSS handles visibility
  })
})
</script>
