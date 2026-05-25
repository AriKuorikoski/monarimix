import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useStore = defineStore('main', () => {
    const activeTab = ref('mixer')
    const recState = ref('idle')  // 'idle' | 'seeking' | 'recording'
    const pollVersion = ref(0)
    const currentTsNum = ref(4)
    const currentTsDen = ref(4)
    const lastSentTempo = ref(120)
    const openProjects = ref([])       // project names from monitor script
    const currentProjectIdx = ref(0)   // index of currently focused project
    const monitorRunning = ref(false)  // true when monarimix_monitor.lua is active

    function handleReply(results) {
        const lines = results.split('\n')
        for (const line of lines) {
            const tok = line.split('\t')

            if (tok[0] === 'BEATPOS' && tok.length >= 8) {
                const playstate = parseInt(tok[1], 10)
                const posSeconds = parseFloat(tok[2])
                const n = parseInt(tok[6], 10)
                const d = parseInt(tok[7], 10)
                if (!isNaN(n)) currentTsNum.value = n
                if (!isNaN(d)) currentTsDen.value = d

                if (recState.value === 'seeking' && !isNaN(posSeconds)) {
                    const startPos = posSeconds + 5
                    window.wwr_req('SET/POS/' + startPos.toFixed(3) + ';1013;40157')
                    recState.value = 'recording'
                }
                if (!isNaN(playstate)) {
                    if (playstate === 5 && recState.value !== 'recording') recState.value = 'recording'
                    if ((playstate === 0 || playstate === 1 || playstate === 2) && recState.value === 'recording') {
                        recState.value = 'idle'
                    }
                }
            }

            if (tok[0] === 'EXTSTATE' && tok.length >= 4 && tok[1] === 'monarimix') {
                if (tok[2] === 'tsig_action_id') {
                    const id = (tok[3] || '').trim()
                    if (id) {
                        try {
                            const existing = localStorage.getItem('monarimixTsigScriptId') || ''
                            if (existing !== id) localStorage.setItem('monarimixTsigScriptId', id)
                        } catch (e) { /* ok */ }
                    }
                }
                if (tok[2] === 'current_tempo') {
                    const bpm = parseFloat(tok[3])
                    if (!isNaN(bpm) && bpm > 0) lastSentTempo.value = Math.round(bpm * 10) / 10
                }
                if (tok[2] === 'monitor_active') {
                    monitorRunning.value = tok[3] === '1'
                }
                if (tok[2] === 'open_projects') {
                    openProjects.value = tok[3] ? tok[3].split('|') : []
                }
                if (tok[2] === 'current_project_idx') {
                    const idx = parseInt(tok[3], 10)
                    if (!isNaN(idx)) currentProjectIdx.value = idx
                }
            }
        }
        pollVersion.value++
    }

    return {
        activeTab,
        recState,
        pollVersion,
        currentTsNum,
        currentTsDen,
        lastSentTempo,
        openProjects,
        currentProjectIdx,
        monitorRunning,
        handleReply,
    }
})
