<template>
  <div class="recording-tab">
    <h2>RECORDING</h2>
    <div>
      <button
        class="recBtn"
        :class="{ recording: recState === 'recording' }"
        :disabled="recState === 'seeking'"
        @click="onRecClick"
      >{{ recLabel }}</button>
    </div>
    <div class="rec-status" :class="{ active: recState !== 'idle' }">
      {{ statusText }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from '../lib/store.js'

const store = useStore()
const recState = computed(() => store.recState)

const recLabel = computed(() => recState.value === 'recording' ? '⏹ STOP' : '⏺ REC')

const statusText = computed(() => {
  if (recState.value === 'seeking') return 'Moving to end of project…'
  if (recState.value === 'recording') return 'Recording'
  return ''
})

function onRecClick() {
  if (store.recState === 'recording') {
    window.wwr_req('40667')  // stop and save all newly recorded media
    store.recState = 'idle'
  } else if (store.recState === 'idle') {
    store.recState = 'seeking'
    window.wwr_req('40043;BEATPOS')  // go to end + request position in one round-trip
  }
}
</script>
