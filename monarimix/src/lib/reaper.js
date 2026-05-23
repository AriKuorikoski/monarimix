import { buildWwrOnReply, listenOrientation, applyMode, getModeLabel, getModeIcon } from './mixer.js'
import { useStore } from './store.js'

export function initReaper(onModeChange) {
    const store = useStore()

    window.wwr_onreply = buildWwrOnReply(store)

    listenOrientation(onModeChange)

    window.wwr_req_recur('NTRACK;TRACK;BEATPOS', 10)
    window.wwr_start()
}
