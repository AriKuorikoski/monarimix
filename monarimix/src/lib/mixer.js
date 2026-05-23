/**
 * mixer.js — all vanilla mixer state and DOM logic.
 *
 * Module-level variables keep state encapsulated; exported functions let
 * Vue components and reaper.js read or mutate what they need.
 *
 * Calling convention: wwr_onreply is assembled by buildWwrOnReply() and
 * assigned to window.wwr_onreply by reaper.js after the store is ready.
 */

// ── State ────────────────────────────────────────────────────────────────────

let nTrack = 0, nTrackOld = 0;
let trackNameAr = [], trackRcvCntAr = [], trackHwOutCntAr = [];
let receiveIdxAr = [], receiveVolAr = [], receivePanAr = [], receiveMuteAr = [];
let trackColoursAr = [], trackIsMonitorAr = [], trackIsMonitorArOld = [];
let selectChoiceIdx = 0, selectChoiceOld = '';
let mouseDown = 0, sendOutputdB = 0, sendOutputPan = 0, hardVol = 0;

const HORIZ_PAN_CENTER_X = 135;
const HORIZ_PAN_HALF = 109;
const VERT_PAN_CENTER_Y = 110;
const VERT_PAN_HALF = 85;
const VERT_TRAVEL_SVG = 120.2;
const VERT_THUMB_BOTTOM_Y = 195;

let mixerMode = 'mix';  // 'mix' | 'pan'
let modeOverride = 'auto';  // 'auto' | 'v' | 'h'
let isVertMode = false;

let lastTapTime = 0, lastTapKey = '';

// ── Exports: state getters ───────────────────────────────────────────────────

export const getters = {
    get selectChoiceIdx() { return selectChoiceIdx; },
    get isVertMode() { return isVertMode; },
    get mixerMode() { return mixerMode; },
    get modeOverride() { return modeOverride; },
    get trackRcvCntAr() { return trackRcvCntAr; },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

export function panToStr(pan) {
    const p = Math.max(-1, Math.min(1, pan || 0));
    if (Math.abs(p) < 0.01) return 'CTR';
    return (p < 0 ? 'L' : 'R') + Math.round(Math.abs(p) * 100);
}

function detectPanDoubleTap(stripKey, sendIdx, onCenter) {
    if (mixerMode !== 'pan') { lastTapTime = 0; lastTapKey = ''; return; }
    if (sendIdx === 0 || sendIdx === '0') return;
    const now = Date.now();
    if (lastTapKey === stripKey && (now - lastTapTime) < 350) {
        sendOutputPan = 0;
        window.wwr_req('SET/TRACK/' + selectChoiceIdx + '/SEND/' + sendIdx + '/PAN/0');
        if (typeof onCenter === 'function') onCenter();
        lastTapTime = 0;
        lastTapKey = '';
    } else {
        lastTapTime = now;
        lastTapKey = stripKey;
    }
}

function mouseDownEventHandler(msg) {
    return function (e) {
        if (typeof e === 'undefined') e = event;
        if (e.preventDefault) e.preventDefault();
        window.wwr_req(msg);
        return false;
    };
}

function mouseUpHandler() { mouseDown = 0; }
function mouseDownHandler() { mouseDown = 1; }
function mouseLeaveHandler() { mouseDown = 0; }

// ── Horizontal master fader drag ─────────────────────────────────────────────

function mouseMoveHandler(event) {
    if (mouseDown !== 1) return;
    const volTrackWidth = this.getBoundingClientRect().width;
    const volThumbWidth = volTrackWidth * 0.14375;
    const volThumbTrackWidth = volTrackWidth - volThumbWidth;
    const volThumbTrackLEdge = this.getBoundingClientRect().left;
    let offsetX = event.pageX - volThumbTrackLEdge - (volThumbWidth / 2);
    if (event.changedTouches) offsetX = event.changedTouches[0].pageX - volThumbTrackLEdge - (volThumbWidth / 2);
    offsetX = Math.max(0, Math.min(volThumbTrackWidth, offsetX));
    const volThumb = this.getElementsByClassName('fader')[0];
    const offsetX320 = offsetX * (320 / volTrackWidth);
    volThumb.setAttributeNS(null, 'transform', 'translate(' + offsetX320 + ' 0)');
    const volOutputdB = Math.pow(offsetX / volThumbTrackWidth, 4) * 4;
    window.wwr_req('SET/TRACK/' + selectChoiceIdx + '/SEND/' + (-this.id) + '/VOL/' + volOutputdB);
}

// ── Horizontal receive strip drag ────────────────────────────────────────────

function sendMouseMoveHandler(event) {
    if (mouseDown !== 1) return;
    const sendBg = this.getElementsByClassName('sendBg')[0];
    const sendTrackWidth = sendBg.getBoundingClientRect().width;
    const sendThumbWidth = sendBg.getBoundingClientRect().height;
    const sendThumbTrackWidth = sendTrackWidth - sendThumbWidth;
    const sendThumbTrackLEdge = sendBg.getBoundingClientRect().left;
    let offsetX = event.pageX - sendThumbTrackLEdge - (sendThumbWidth / 2);
    if (event.changedTouches) offsetX = event.changedTouches[0].pageX - sendThumbTrackLEdge - (sendThumbWidth / 2);
    offsetX = Math.max(0, Math.min(sendThumbTrackWidth, offsetX));
    const offsetX262 = offsetX * (262 / sendTrackWidth) + 26;
    const sendThumb = this.getElementsByClassName('sendThumb')[0];
    sendThumb.setAttributeNS(null, 'cx', offsetX262);
    const sendLine = this.getElementsByClassName('sendLine')[0];
    if (mixerMode === 'pan') {
        sendOutputPan = Math.max(-1, Math.min(1, (offsetX / sendThumbTrackWidth) * 2 - 1));
        sendLine.setAttributeNS(null, 'x1', String(HORIZ_PAN_CENTER_X));
        sendLine.setAttributeNS(null, 'x2', String(offsetX262));
        window.wwr_req('SET/TRACK/' + selectChoiceIdx + '/SEND/' + (-this.id) + '/PAN/' + sendOutputPan);
    } else {
        sendOutputdB = Math.pow(offsetX / sendThumbTrackWidth, 4) * 4;
        sendLine.setAttributeNS(null, 'x2', String(offsetX262));
        window.wwr_req('SET/TRACK/' + selectChoiceIdx + '/SEND/' + (-this.id) + '/VOL/' + sendOutputdB);
    }
}

function sendMouseUpHandler() {
    if (mouseDown !== 1) { mouseDown = 0; return; }
    if (mixerMode === 'pan') {
        window.wwr_req('SET/TRACK/' + selectChoiceIdx + '/SEND/' + (-this.id) + '/PAN/' + sendOutputPan);
    } else {
        window.wwr_req('SET/TRACK/' + selectChoiceIdx + '/SEND/' + (-this.id) + '/VOL/' + sendOutputdB + 'e');
    }
    mouseDown = 0;
}

function volFaderConect(content, thumb) {
    content.addEventListener('mousemove', mouseMoveHandler, false);
    content.addEventListener('touchmove', mouseMoveHandler, false);
    content.addEventListener('mouseleave', mouseLeaveHandler, false);
    content.addEventListener('mouseup', mouseUpHandler, false);
    content.addEventListener('touchend', mouseUpHandler, false);
    thumb.addEventListener('mousedown', function (e) { mouseDownHandler(e, e.srcElement); }, false);
    thumb.addEventListener('touchstart', function (e) {
        if (e.touches.length > 0) mouseDownHandler(e, e.srcElement);
        e.preventDefault();
    }, false);
}

function sendConect(content, thumb) {
    content.addEventListener('mousemove', sendMouseMoveHandler, false);
    content.addEventListener('touchmove', sendMouseMoveHandler, false);
    content.addEventListener('mouseleave', mouseLeaveHandler, false);
    content.addEventListener('mouseup', sendMouseUpHandler, false);
    content.addEventListener('touchend', sendMouseUpHandler, false);
    thumb.addEventListener('mousedown', function (e) { mouseDownHandler(e, e.srcElement); }, false);
    thumb.addEventListener('touchstart', function (e) {
        if (e.touches.length > 0) mouseDownHandler(e, e.srcElement);
        e.preventDefault();
    }, false);
    if (!content._dblTapWired) {
        content._dblTapWired = true;
        const dblTapH = function () {
            detectPanDoubleTap('h' + content.id, -content.id, function () {
                const thumbEl = content.getElementsByClassName('sendThumb')[0];
                const lineEl = content.getElementsByClassName('sendLine')[0];
                const dbEl = content.getElementsByClassName('sDbText')[0];
                if (thumbEl) thumbEl.setAttributeNS(null, 'cx', String(HORIZ_PAN_CENTER_X));
                if (lineEl) {
                    lineEl.setAttributeNS(null, 'x1', String(HORIZ_PAN_CENTER_X));
                    lineEl.setAttributeNS(null, 'x2', String(HORIZ_PAN_CENTER_X));
                }
                if (dbEl) dbEl.textContent = panToStr(0);
            });
        };
        content.addEventListener('touchstart', dblTapH, false);
        content.addEventListener('mousedown', dblTapH, false);
    }
}

// ── Stock wwr_onreply (horizontal mixer renderer — original Cockos code) ─────

function stockWwrOnReply(results) {
    const resultsDisplay = document.getElementById('_results');
    if (resultsDisplay) resultsDisplay.innerHTML = results;

    const ar = results.split('\n');
    let x, idx, i;
    for (x = 0; x < ar.length; x++) {
        const tok = ar[x].split('\t');
        if (tok.length > 0) switch (tok[0]) {
            case 'NTRACK':
                if (tok.length > 1) {
                    nTrack = parseInt(tok[1]) + 1;
                    if (nTrack !== nTrackOld) { trackRcvCntAr = []; nTrackOld = nTrack; }
                }
                break;
            case 'TRACK':
                idx = parseInt(tok[1]);
                if (tok[2].trim() !== trackNameAr[idx]) trackNameAr[idx] = tok[2].trim();
                if (tok[11] !== trackRcvCntAr[idx]) trackRcvCntAr[idx] = tok[11];
                if (tok[12] !== trackHwOutCntAr[idx]) trackHwOutCntAr[idx] = tok[12];
                if (tok[13] > 0 && tok[13] !== trackColoursAr[idx]) trackColoursAr[idx] = tok[13];
                break;
            case 'SEND':
                if (tok.length > 3) {
                    const f = -tok[2] - 1;
                    receiveIdxAr[f] = tok[6];
                    receiveVolAr[f] = tok[4];
                    if (tok[6] !== -1) receivePanAr[f] = parseFloat(tok[5]) || 0;
                    if (tok[6] == -1) hardVol = tok[4];
                    receiveMuteAr[f] = (tok[3] & 8) ? 1 : 0;
                }
                break;
        }
    }

    for (x = 0; x < nTrack; x++) {
        trackIsMonitorAr[x] = (trackHwOutCntAr[x] > 0 && trackRcvCntAr[x] > 0) ? 1 : 0;
    }

    const trackSelect = document.getElementById('trackSelect');
    if (!trackSelect) return;

    if (trackIsMonitorAr.length > (nTrack + 1)) {
        trackIsMonitorAr.pop();
        for (i = trackSelect.options.length; i >= 1; i--) trackSelect.remove(i);
    }
    if (trackIsMonitorArOld.length > nTrack) trackIsMonitorArOld.pop();
    for (x = 0; x < trackIsMonitorArOld.length; x++) {
        if (trackIsMonitorArOld[x] === undefined) trackIsMonitorArOld[x] = 0;
    }

    function getSum(total, num) { return total + num; }
    const trackIsMonitorArSum = trackIsMonitorAr.reduce(getSum, 0);
    let trackIsMonitorArOldSum = 0;
    if (trackIsMonitorArOld.length > 0) trackIsMonitorArOldSum = trackIsMonitorArOld.reduce(getSum, 0);

    if (trackIsMonitorArSum !== trackIsMonitorArOldSum) {
        for (i = trackSelect.options.length; i >= 1; i--) trackSelect.remove(i);
    }

    if (trackSelect.options.length === 1) {
        for (x = 0; x < nTrack; x++) {
            if (trackIsMonitorAr[x] === 1) {
                const option = document.createElement('option');
                option.text = trackNameAr[x];
                trackSelect.add(option);
            }
            trackIsMonitorArOld[x] = trackIsMonitorAr[x];
        }
    }

    const selectChoice = trackSelect.value;
    if (selectChoice !== selectChoiceOld) {
        selectChoiceIdx = trackNameAr.indexOf(selectChoice);
        selectChoiceOld = selectChoice;
    }

    for (let y = 1; y < (parseInt(trackRcvCntAr[selectChoiceIdx]) + 1); y++) {
        window.wwr_req('GET/TRACK/' + selectChoiceIdx + '/SEND/' + (-y));
    }
    window.wwr_req('GET/TRACK/' + selectChoiceIdx + '/SEND/0');

    const faderContent = document.getElementsByClassName('trackRow2')[0];
    const receivesContent = document.getElementById('receives');
    const instructions = document.getElementById('instructions');
    const cloneFader = document.getElementById('trackRow2Svg') && document.getElementById('trackRow2Svg').cloneNode(true);
    const cloneTrackSend = document.getElementById('trackSendSvg') && document.getElementById('trackSendSvg').cloneNode(true);
    const drawnReceives = trackRcvCntAr[selectChoiceIdx];
    const drawnReceivesDone = receivesContent ? receivesContent.childNodes.length : 0;

    if (receivesContent) {
        if (drawnReceives < drawnReceivesDone || drawnReceives == null) {
            if (receivesContent.lastChild) receivesContent.removeChild(receivesContent.lastChild);
        }
        if (drawnReceives > drawnReceivesDone && cloneTrackSend) {
            const sendDiv = document.createElement('div');
            sendDiv.className = 'sendDiv';
            receivesContent.appendChild(sendDiv);
            sendDiv.appendChild(cloneTrackSend);
        }
    }

    if (faderContent && instructions) {
        if (drawnReceives == null && faderContent.innerHTML) {
            faderContent.innerHTML = '';
            instructions.style.display = 'block';
        }
        if (drawnReceives >= 1 && faderContent.innerHTML === '' && cloneFader) {
            faderContent.appendChild(cloneFader);
            instructions.style.display = 'none';
        }
    }

    const _mmBtn = document.getElementById('mixerModeBtn');
    if (_mmBtn) _mmBtn.style.display = (drawnReceives != null) ? '' : 'none';

    const trackRow2Content = document.getElementById('trackRow2Svg');
    if (trackRow2Content) {
        const volThumb = trackRow2Content.getElementsByClassName('fader')[0];
        volFaderConect(trackRow2Content, volThumb);
        volThumb.volSetting = Math.pow(hardVol, 1 / 4) * 194.68;
        if (volThumb.volSetting && mouseDown !== 1) {
            volThumb.setAttributeNS(null, 'transform', 'translate(' + volThumb.volSetting + ' 0)');
        }
    }

    if (!receivesContent) return;
    const currentDrawn = receivesContent.childNodes.length;
    for (x = 0; x < currentDrawn; x++) {
        const thisChild = receivesContent.childNodes[x];
        if (thisChild && receiveIdxAr[x] && receiveVolAr[x]) {
            thisChild.id = x + 1;
            const thisName = trackNameAr[receiveIdxAr[x]];
            const thisVol = window.mkvolstr(receiveVolAr[x]);
            const thisCol = '#' + (trackColoursAr[receiveIdxAr[x]] | 0x1000000).toString(16).substr(-6);

            const sendTitleText = thisChild.getElementsByClassName('sendTitleText')[0];
            const sDbText = thisChild.getElementsByClassName('sDbText')[0];
            if (sendTitleText && sendTitleText.textContent !== thisName) sendTitleText.textContent = thisName;

            const sendLine = thisChild.getElementsByClassName('sendLine')[0];
            const sendThumb = thisChild.getElementsByClassName('sendThumb')[0];
            const panTick = thisChild.querySelector('.panCenterTick');
            const inPanMode = (mixerMode === 'pan');

            if (inPanMode) {
                const pan = receivePanAr[x] || 0;
                const panX = HORIZ_PAN_CENTER_X + pan * HORIZ_PAN_HALF;
                if (mouseDown !== 1) {
                    sendThumb.setAttributeNS(null, 'cx', String(panX));
                    sendLine.setAttributeNS(null, 'x1', String(HORIZ_PAN_CENTER_X));
                    sendLine.setAttributeNS(null, 'x2', String(panX));
                }
                if (sDbText) sDbText.textContent = panToStr(pan);
                if (panTick) panTick.style.display = '';
            } else {
                const sSetting = Math.pow(receiveVolAr[x], 1 / 4) * 154 + 27;
                if (mouseDown !== 1) {
                    sendThumb.setAttributeNS(null, 'cx', sSetting);
                    sendLine.setAttributeNS(null, 'x1', '27');
                    sendLine.setAttributeNS(null, 'x2', sSetting);
                }
                if (sDbText && sDbText.textContent !== thisVol) sDbText.textContent = thisVol;
                if (panTick) panTick.style.display = 'none';
            }

            sendConect(thisChild, sendThumb);

            if (thisCol !== '#000000') {
                sendThumb.setAttributeNS(null, 'fill', thisCol);
                if (sendTitleText) sendTitleText.setAttributeNS(null, 'fill', thisCol);
            } else {
                sendThumb.setAttributeNS(null, 'fill', '#808080');
                if (sendTitleText) sendTitleText.setAttributeNS(null, 'fill', '#A3A3A3');
            }

            const sendMuteButton = thisChild.getElementsByClassName('send_mute')[0];
            if (sendMuteButton) {
                sendMuteButton.onmousedown = mouseDownEventHandler(
                    'SET/TRACK/' + selectChoiceIdx + '/SEND/' + (-x - 1) + '/MUTE/-1'
                );
            }
            const sendMuteOff = thisChild.getElementsByClassName('send_mute_off')[0];
            const sendMuteOn = thisChild.getElementsByClassName('send_mute_on')[0];
            if (receiveMuteAr[x] === 1) {
                if (sendMuteOff) sendMuteOff.style.visibility = 'hidden';
                if (sendMuteOn) sendMuteOn.style.visibility = 'visible';
            } else {
                if (sendMuteOff) sendMuteOff.style.visibility = 'visible';
                if (sendMuteOn) sendMuteOn.style.visibility = 'hidden';
            }
        }
    }
}

// ── Vertical (landscape) drag handlers ───────────────────────────────────────

function vertMouseMoveHandler(event) {
    if (mouseDown !== 1) return;
    const sliderSvg = this;
    const rect = sliderSvg.getBoundingClientRect();
    const trackH = rect.height;
    if (trackH <= 0) return;
    const thumbH = trackH * 0.14375;
    const trackEffH = trackH - thumbH;
    const bottomEdge = rect.bottom;
    let pageY = event.pageY;
    if (event.changedTouches) pageY = event.changedTouches[0].pageY;
    let offsetY = bottomEdge - pageY - (thumbH / 2);
    offsetY = Math.max(0, Math.min(trackEffH, offsetY));

    const thumbEl = sliderSvg.getElementsByClassName('sendThumb')[0];
    const lineEl = sliderSvg.getElementsByClassName('sendLine')[0];
    const faderEl = sliderSvg.getElementsByClassName('fader')[0];
    const sendIdx = sliderSvg.dataset.sendIdx;
    const inPanMode = (mixerMode === 'pan') && sendIdx !== '0';

    if (inPanMode) {
        sendOutputPan = Math.max(-1, Math.min(1, (offsetY / trackEffH) * 2 - 1));
        const panSvgY = VERT_PAN_CENTER_Y - sendOutputPan * VERT_PAN_HALF;
        if (thumbEl) thumbEl.setAttributeNS(null, 'cy', String(panSvgY));
        if (lineEl) {
            lineEl.setAttributeNS(null, 'y1', String(VERT_PAN_CENTER_Y));
            lineEl.setAttributeNS(null, 'y2', String(panSvgY));
        }
        window.wwr_req('SET/TRACK/' + selectChoiceIdx + '/SEND/' + sendIdx + '/PAN/' + sendOutputPan);
    } else {
        const volOutput = offsetY / trackEffH;
        sendOutputdB = Math.pow(volOutput, 4) * 4;
        const svgOffset = Math.pow(sendOutputdB, 1 / 4) * VERT_TRAVEL_SVG;
        const svgY = VERT_THUMB_BOTTOM_Y - svgOffset;
        if (thumbEl) thumbEl.setAttributeNS(null, 'cy', svgY);
        if (lineEl) lineEl.setAttributeNS(null, 'y2', svgY);
        if (faderEl) faderEl.setAttributeNS(null, 'transform', 'translate(0 ' + (-svgOffset) + ')');
        window.wwr_req('SET/TRACK/' + selectChoiceIdx + '/SEND/' + sendIdx + '/VOL/' + sendOutputdB);
    }
}

function vertMouseUpHandler() {
    const sliderSvg = this;
    if (mouseDown !== 1) { mouseDown = 0; return; }
    const sendIdx = sliderSvg.dataset.sendIdx;
    const inPanMode = (mixerMode === 'pan') && sendIdx !== '0';
    if (inPanMode) {
        window.wwr_req('SET/TRACK/' + selectChoiceIdx + '/SEND/' + sendIdx + '/PAN/' + sendOutputPan);
    } else if (sendIdx !== '0') {
        window.wwr_req('SET/TRACK/' + selectChoiceIdx + '/SEND/' + sendIdx + '/VOL/' + sendOutputdB + 'e');
    }
    mouseDown = 0;
}

function vertConnect(svgElement, thumbElement) {
    if (svgElement._vertConnected) return;
    svgElement._vertConnected = true;
    svgElement.addEventListener('mousemove', vertMouseMoveHandler, false);
    svgElement.addEventListener('touchmove', vertMouseMoveHandler, false);
    svgElement.addEventListener('mouseleave', mouseLeaveHandler, false);
    svgElement.addEventListener('mouseup', vertMouseUpHandler, false);
    svgElement.addEventListener('touchend', vertMouseUpHandler, false);
    const grab = function (e) {
        mouseDownHandler(e, e.srcElement);
        vertMouseMoveHandler.call(svgElement, e);
    };
    svgElement.addEventListener('mousedown', grab, false);
    svgElement.addEventListener('touchstart', function (e) {
        if (e.touches.length > 0) grab(e);
        e.preventDefault();
    }, false);
    if (thumbElement) {
        thumbElement.addEventListener('mousedown', function (e) { mouseDownHandler(e, e.srcElement); }, false);
        thumbElement.addEventListener('touchstart', function (e) {
            if (e.touches.length > 0) mouseDownHandler(e, e.srcElement);
            e.preventDefault();
        }, false);
    }
    const dblTapV = function () {
        const sendIdx = svgElement.dataset.sendIdx;
        detectPanDoubleTap('v' + sendIdx, sendIdx, function () {
            const thumbEl = svgElement.getElementsByClassName('sendThumb')[0];
            const lineEl = svgElement.getElementsByClassName('sendLine')[0];
            const chanEl = svgElement.parentElement;
            const dbEl = chanEl ? chanEl.querySelector('.vertDb') : null;
            if (thumbEl) thumbEl.setAttributeNS(null, 'cy', String(VERT_PAN_CENTER_Y));
            if (lineEl) {
                lineEl.setAttributeNS(null, 'y1', String(VERT_PAN_CENTER_Y));
                lineEl.setAttributeNS(null, 'y2', String(VERT_PAN_CENTER_Y));
            }
            if (dbEl) dbEl.textContent = panToStr(0);
        });
    };
    svgElement.addEventListener('touchstart', dblTapV, false);
    svgElement.addEventListener('mousedown', dblTapV, false);
}

// ── Vertical mixer renderer ───────────────────────────────────────────────────

export function renderVertical(drawnReceives) {
    const vertMixer = document.getElementById('vertMixer');
    const instructions = document.getElementById('instructions');
    if (!vertMixer) return;

    if (drawnReceives == null) {
        if (vertMixer.innerHTML) vertMixer.innerHTML = '';
        if (instructions) instructions.style.display = 'block';
        return;
    }
    if (instructions) instructions.style.display = 'none';

    if (vertMixer.children.length === 0 || !vertMixer.firstElementChild.classList.contains('vertMain')) {
        vertMixer.innerHTML = '';
        const faderT = document.getElementById('trackRow2SvgVert');
        if (faderT) {
            const clone = faderT.cloneNode(true);
            while (clone.firstElementChild) vertMixer.appendChild(clone.firstElementChild);
        }
    }

    while (vertMixer.children.length - 1 > drawnReceives) {
        vertMixer.removeChild(vertMixer.lastElementChild);
    }
    while (vertMixer.children.length - 1 < drawnReceives) {
        const sendT = document.getElementById('trackSendSvgVert');
        if (sendT) {
            const clone = sendT.cloneNode(true);
            while (clone.firstElementChild) vertMixer.appendChild(clone.firstElementChild);
        }
    }

    const masterChan = vertMixer.firstElementChild;
    if (masterChan) {
        const masterSvg = masterChan.querySelector('.vertSlider');
        const masterThumb = masterChan.querySelector('.vertMainThumb');
        const masterDb = masterChan.querySelector('.vertDb');
        if (masterSvg) {
            masterSvg.dataset.sendIdx = '0';
            vertConnect(masterSvg, masterThumb);
            if (mouseDown !== 1) {
                const svgOff = Math.pow(hardVol, 1 / 4) * VERT_TRAVEL_SVG;
                const fader = masterChan.querySelector('.fader');
                if (fader) fader.setAttributeNS(null, 'transform', 'translate(0 ' + (-svgOff) + ')');
                if (masterDb) masterDb.textContent = window.mkvolstr(hardVol);
            }
        }
    }

    for (let x = 0; x < drawnReceives; x++) {
        const chanEl = vertMixer.children[x + 1];
        if (!chanEl) continue;
        if (receiveIdxAr[x] === undefined || receiveVolAr[x] === undefined) continue;

        const sliderSvg = chanEl.querySelector('.vertSlider');
        const thumbEl = chanEl.querySelector('.sendThumb');
        const lineEl = chanEl.querySelector('.sendLine');
        const titleEl = chanEl.querySelector('.vertTitle');
        const dbEl = chanEl.querySelector('.vertDb');
        const muteEl = chanEl.querySelector('.vertMute');

        if (sliderSvg) {
            sliderSvg.dataset.sendIdx = String(-(x + 1));
            vertConnect(sliderSvg, thumbEl);
        }

        const thisName = trackNameAr[receiveIdxAr[x]];
        const thisVol = window.mkvolstr(receiveVolAr[x]);
        const thisCol = '#' + (trackColoursAr[receiveIdxAr[x]] | 0x1000000).toString(16).substr(-6);

        if (titleEl && titleEl.textContent !== thisName) titleEl.textContent = thisName;
        if (thisCol !== '#000000') {
            if (thumbEl) thumbEl.setAttributeNS(null, 'fill', thisCol);
            if (titleEl) titleEl.style.color = thisCol;
        } else {
            if (thumbEl) thumbEl.setAttributeNS(null, 'fill', '#808080');
            if (titleEl) titleEl.style.color = '#A3A3A3';
        }

        const inPanMode = (mixerMode === 'pan');
        const panTick = sliderSvg ? sliderSvg.querySelector('.panCenterTick') : null;
        const svgOff = Math.pow(receiveVolAr[x], 1 / 4) * VERT_TRAVEL_SVG;
        const svgY = VERT_THUMB_BOTTOM_Y - svgOff;

        if (inPanMode) {
            const pan = receivePanAr[x] || 0;
            const panSvgY = VERT_PAN_CENTER_Y - pan * VERT_PAN_HALF;
            if (mouseDown !== 1) {
                if (thumbEl) thumbEl.setAttributeNS(null, 'cy', String(panSvgY));
                if (lineEl) {
                    lineEl.setAttributeNS(null, 'y1', String(VERT_PAN_CENTER_Y));
                    lineEl.setAttributeNS(null, 'y2', String(panSvgY));
                }
            }
            if (dbEl) dbEl.textContent = panToStr(pan);
            if (panTick) panTick.style.display = '';
        } else {
            if (mouseDown !== 1) {
                if (thumbEl) thumbEl.setAttributeNS(null, 'cy', svgY);
                if (lineEl) {
                    lineEl.setAttributeNS(null, 'y1', String(VERT_THUMB_BOTTOM_Y));
                    lineEl.setAttributeNS(null, 'y2', svgY);
                }
            }
            if (dbEl && dbEl.textContent !== thisVol) dbEl.textContent = thisVol;
            if (panTick) panTick.style.display = 'none';
        }

        if (muteEl) {
            muteEl.onclick = (function (idx) {
                return function () {
                    window.wwr_req('SET/TRACK/' + selectChoiceIdx + '/SEND/' + (-idx) + '/MUTE/-1');
                };
            })(x + 1);
            if (receiveMuteAr[x] === 1) muteEl.classList.add('muted');
            else muteEl.classList.remove('muted');
        }
    }
}

// ── Layout mode ───────────────────────────────────────────────────────────────

const MODE_ICONS = {
    auto: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 16l3.5-9 3.5 9M9.8 13.2h4.4"/></svg>',
    v: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><rect x="5" y="4" width="3" height="16" rx="1"/><rect x="10.5" y="4" width="3" height="16" rx="1"/><rect x="16" y="4" width="3" height="16" rx="1"/></svg>',
    h: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><rect x="4" y="5" width="16" height="3" rx="1"/><rect x="4" y="10.5" width="16" height="3" rx="1"/><rect x="4" y="16" width="16" height="3" rx="1"/></svg>',
};
const MODE_LABELS = { auto: 'Auto', v: 'Vertical', h: 'Horizontal' };

export function getModeLabel() { return MODE_LABELS[modeOverride] || 'Auto'; }
export function getModeIcon() { return MODE_ICONS[modeOverride] || MODE_ICONS.auto; }

const vertModeMQ = window.matchMedia('(orientation: landscape)');

export function loadModePreference() {
    const hash = (window.location.hash || '').toLowerCase();
    if (hash === '#v') { modeOverride = 'v'; return; }
    if (hash === '#h') { modeOverride = 'h'; return; }
    if (hash === '#auto' || hash === '#a') { modeOverride = 'auto'; return; }
    try {
        const stored = localStorage.getItem('monarimixMode');
        if (stored === 'v' || stored === 'h' || stored === 'auto') modeOverride = stored;
    } catch (e) { /* ok */ }
}

function getEffectiveMode() {
    if (modeOverride === 'v') return true;
    if (modeOverride === 'h') return false;
    return vertModeMQ.matches;
}

export function applyMode(onModeChange) {
    isVertMode = getEffectiveMode();
    document.body.classList.remove('force-vert', 'force-horiz');
    if (modeOverride === 'v') document.body.classList.add('force-vert');
    else if (modeOverride === 'h') document.body.classList.add('force-horiz');
    const trackRow2 = document.getElementsByClassName('trackRow2')[0];
    const receivesEl = document.getElementById('receives');
    const vertMixerEl = document.getElementById('vertMixer');
    if (trackRow2) trackRow2.innerHTML = '';
    if (receivesEl) receivesEl.innerHTML = '';
    if (vertMixerEl) vertMixerEl.innerHTML = '';
    if (onModeChange) onModeChange(modeOverride);
}

export function cycleMode(onModeChange) {
    modeOverride = modeOverride === 'auto' ? 'v' : modeOverride === 'v' ? 'h' : 'auto';
    try { localStorage.setItem('monarimixMode', modeOverride); } catch (e) { /* ok */ }
    applyMode(onModeChange);
}

function onOrientationChange(onModeChange) {
    if (modeOverride !== 'auto') return;
    applyMode(onModeChange);
}

export function listenOrientation(onModeChange) {
    const handler = () => onOrientationChange(onModeChange);
    if (vertModeMQ.addEventListener) vertModeMQ.addEventListener('change', handler);
    else if (vertModeMQ.addListener) vertModeMQ.addListener(handler);
}

// ── Mixer mode (VOL / PAN) ────────────────────────────────────────────────────

export function getMixerMode() { return mixerMode; }

export function cycleMixerMode(onModeChange) {
    mixerMode = mixerMode === 'mix' ? 'pan' : 'mix';
    const receivesEl = document.getElementById('receives');
    const vertMixerEl = document.getElementById('vertMixer');
    if (receivesEl) receivesEl.innerHTML = '';
    if (vertMixerEl) vertMixerEl.innerHTML = '';
    if (onModeChange) onModeChange(mixerMode);
}

// ── Full wwr_onreply factory ──────────────────────────────────────────────────

export function buildWwrOnReply(store) {
    return function (results) {
        stockWwrOnReply(results);
        store.handleReply(results);
        if (isVertMode) renderVertical(trackRcvCntAr[selectChoiceIdx]);
    };
}

// ── Initialise on import ──────────────────────────────────────────────────────

loadModePreference();
isVertMode = getEffectiveMode();
