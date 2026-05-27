<template>
  <div class="settings-panel">
  

    <div class="settingField" v-if="store.openProjects.length > 0">
      <H2>Active project</H2>
      <select class="settingSelect" :value="store.currentProjectIdx" @change="onSwitchProject">
        <option v-for="(name, idx) in store.openProjects" :key="idx" :value="idx">
          {{ name || '(untitled)' }}
        </option>
      </select>
    </div>
    <div class="settingField" v-else style="opacity:0.4">
      <span class="settingLabel">Active project</span>
      <span style="font-size:0.85em;color:#A9ABAB">{{ store.monitorRunning ? 'Loading…' : 'Start monarimix_monitor.lua' }}</span>
    </div>

    <h2 style="margin-top:32px">PROJECT SETTINGS</h2>

    <div class="settingField" style="opacity:0.4;pointer-events:none">
      <span class="settingLabel">Tempo (BPM)</span>
      <div class="tempoCtrl">
        <!-- <button class="tempoBtn" type="button">&minus;1</button>
        <button class="tempoBtn" type="button">&minus;0.1</button> -->
        <input id="tempoInput" type="number" step="0.1" min="20" max="500" :value="store.lastSentTempo" disabled />
        <!-- <button class="tempoBtn" type="button">+0.1</button>
        <button class="tempoBtn" type="button">+1</button> -->
      </div>
    </div>

    <div class="settingField" style="opacity:0.4;pointer-events:none">
      <span class="settingLabel">Time Signature</span>
      <div class="tsigCtrl">
        <input id="tsigNum" type="number" min="1" max="32" :value="store.currentTsNum" disabled />
        <span class="tsigSep">/</span>
        <select id="tsigDen" disabled>
          <option v-for="d in [1,2,4,8,16,32]" :key="d" :value="d" :selected="d === store.currentTsDen">{{ d }}</option>
        </select>
      </div>
    </div>

    <h2 style="margin-top:32px">GENERAL SETTINGS</h2>

    <div class="settingField">
      <span class="settingLabel">Layout</span>
      <div id="layoutToggleRow">
        <span id="layoutModeLabel" style="color:#A9ABAB;font-size:0.85em">{{ modeLabel }}</span>
        <button
          id="modeToggle"
          type="button"
          aria-label="Layout mode"
          :title="'Layout: ' + modeLabel"
          v-html="modeIcon"
          @click="onCycleMode"
        ></button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useStore } from '../lib/store.js'
import { cycleMode, getModeLabel, getModeIcon } from '../lib/mixer.js'

const store = useStore()

const modeLabel = ref(getModeLabel())
const modeIcon = ref(getModeIcon())

function onCycleMode() {
  cycleMode(() => {
    modeLabel.value = getModeLabel()
    modeIcon.value = getModeIcon()
  })
}

function onSwitchProject(e) {
  const idx = parseInt(e.target.value, 10)
  store.currentProjectIdx = idx  // optimistic update — prevents flicker back to old value
  window.wwr_req(`SET/PROJEXTSTATE/monarimix/switch_to_project/${idx}`)
}
</script>
