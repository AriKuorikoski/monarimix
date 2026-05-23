<template>
  <div>
    <!-- Track selector row — only shown on this tab -->
    <div id="trackSelectRow">
      <TrackSelect />
      <button
        id="mixerModeBtn"
        type="button"
        aria-label="Mixer mode"
        title="Mixer mode: Volume"
        :class="{ 'pan-active': isPan }"
        @click="onCycleMixerMode"
      >{{ isPan ? 'PAN' : 'VOL' }}</button>
    </div>


    <div id="instructions">
      Each performer requires their own monitor track to be created in REAPER.<br><br>
      Set it to receive sends from all the tracks you want to monitor.<br><br>
      Give it a hardware send to the performer's output in its first send slot.<br><br>
      Don't forget — you'll probably want to disable its Master Send.<br><br>
    </div>

    <!-- Horizontal layout (portrait) -->
    <div class="trackRow2"></div>
    <div id="receives"></div>

    <!-- Vertical layout (landscape) — populated by renderVertical() -->
    <div id="vertMixer"></div>

    <!-- Hidden SVG/HTML templates cloned at runtime by the stock mixer code -->
    <div id="backLoad" style="display:none">

      <element id="trackRow2Svg">
        <svg version="1.1" class="faderSvg" display="block" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="100%" height="100%" viewBox="0 1 320 47" xml:space="preserve">
        <rect x="0" fill="#333333" width="320" height="36"/>
        <rect id="fader_track" x="23" y="16.7" transform="matrix(-1 -1.224647e-16 1.224647e-16 -1 320 37.3333)" opacity="0.5" fill="#1A1A1A" width="274" height="4"/>
        <g class="fader">
            <g>
                <linearGradient id="fGrad1" gradientUnits="userSpaceOnUse" x1="245.0833" y1="-114.0833" x2="245.0833" y2="-106.0833" gradientTransform="matrix(6.123234e-17 -1 -1 -6.123234e-17 -68.0833 263.0833)">
                    <stop offset="0" style="stop-color:#212121"/>
                    <stop offset="1" style="stop-color:#949494"/>
                </linearGradient>
                <rect x="38" y="0.5" fill="url(#fGrad1)" width="8" height="35"/>
                <linearGradient id="fGrad2" gradientUnits="userSpaceOnUse" x1="245.0833" y1="-106.0833" x2="245.0833" y2="-92.0833" gradientTransform="matrix(6.123234e-17 -1 -1 -6.123234e-17 -68.0833 263.0833)">
                    <stop offset="0" style="stop-color:#FFFFFF"/>
                    <stop offset="0.9991" style="stop-color:#7A7A7A"/>
                </linearGradient>
                <path fill="url(#fGrad2)" d="M26,0.5h12v35H26c-1.1,0-2-0.9-2-2v-31C24,1.4,24.9,0.5,26,0.5z"/>
                <linearGradient id="fGrad3" gradientUnits="userSpaceOnUse" x1="245.0833" y1="-91.0833" x2="245.0833" y2="-77.0833" gradientTransform="matrix(6.123234e-17 -1 -1 -6.123234e-17 -68.0833 263.0833)">
                    <stop offset="0" style="stop-color:#9C9C9C"/>
                    <stop offset="1" style="stop-color:#4D4D4D"/>
                </linearGradient>
                <path fill="url(#fGrad3)" d="M21,35.5c1.1,0,2-0.9,2-2v-31c0-1.1-0.9-2-2-2H9v35H21z"/>
                <linearGradient id="fGrad4" gradientUnits="userSpaceOnUse" x1="245.0833" y1="-77.0833" x2="245.0833" y2="-69.0833" gradientTransform="matrix(6.123234e-17 -1 -1 -6.123234e-17 -68.0833 263.0833)">
                    <stop offset="0" style="stop-color:#FFFFFF"/>
                    <stop offset="0.1231" style="stop-color:#F2F2F2"/>
                    <stop offset="0.3517" style="stop-color:#CFCFCF"/>
                    <stop offset="0.6607" style="stop-color:#979797"/>
                    <stop offset="1" style="stop-color:#525252"/>
                </linearGradient>
                <rect x="1" y="0.5" fill="url(#fGrad4)" width="8" height="35"/>
            </g>
            <path id="outline_1_" d="M1,0.5h20c1.1,0,2,0.9,2,2v31c0,1.1-0.9,2-2,2H1V0.5 M24,2.5c0-1.1,0.9-2,2-2h20v35H26c-1.1,0-2-0.9-2-2V2.5 M0.5,0v36H21c1.4,0,2.5-1.1,2.5-2.5c0,1.4,1.1,2.5,2.5,2.5h20.5V0H26c-1.4,0-2.5,1.1-2.5,2.5C23.5,1.1,22.4,0,21,0H0.5L0.5,0z"/>
            <path opacity="0.1" fill="#FFFFFF" d="M2,1.5h19c0.6,0,1,0.4,1,1v31c0,0.6-0.4,1-1,1H2V1.5 M25,2.5c0-0.6,0.4-1,1-1h19v33H26c-0.6,0-1-0.4-1-1V2.5 M1,0.5v35h20c1.1,0,2-0.9,2-2v-31c0-1.1-0.9-2-2-2H1L1,0.5z M24,2.5v31c0,1.1,0.9,2,2,2h20v-35H26C24.9,0.5,24,1.4,24,2.5L24,2.5z"/>
            <linearGradient id="fGrad5" gradientUnits="userSpaceOnUse" x1="245.0833" y1="-1061.0476" x2="245.0833" y2="-1058.0729" gradientTransform="matrix(6.123234e-17 -1 -1 -6.123234e-17 -1034.0834 263.0833)">
                <stop offset="0" style="stop-color:#FFFFFF;stop-opacity:0"/>
                <stop offset="0.5" style="stop-color:#FFFFFF"/>
            </linearGradient>
            <path opacity="0.33" fill="url(#fGrad5)" d="M26,35.5h1v-1h-1c-0.6,0-1-0.4-1-1v-31c0-0.6,0.4-1,1-1h1v-1h-1c-1,0-1.8,0.7-2,1.6v31.8C24.2,34.8,25,35.5,26,35.5z"/>
        </g>
        </svg>
      </element>

      <element id="trackSendSvg">
        <svg version="1.1" display="block" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="100%" height="100%" viewBox="0 0 320 48" xml:space="preserve">
        <rect class="sendPanelBg" fill="#333333" width="320" height="49"/>
        <path class="sendBg" fill="#262626" d="M244,0c-0.3,0-0.7,0-1,0v0H142h-17H27v0c-0.3,0-0.7,0-1,0C13.8,0,4,9.8,4,22s9.8,22,22,22c0.3,0,0.7,0,1,0v0h98h17h101v0c0.3,0,0.7,0,1,0c12.2,0,22-9.8,22-22S256.2,0,244,0z"/>
        <line class="sendLine" style="pointer-events:none" fill="none" opacity="0.5" stroke="#404040" stroke-width="38" stroke-linecap="round" stroke-miterlimit="10" x1="27" y1="22" x2="130" y2="22"/>
        <line class="panCenterTick" style="display:none;pointer-events:none" x1="135" y1="6" x2="135" y2="38" stroke="#909090" stroke-width="1.5" stroke-linecap="round"/>
        <text class="sendTitleText" style="pointer-events:none" transform="matrix(1 0 0 1 25 29)" fill="#A3A3A3" font-family="'Open Sans'" font-size="19px">Target Name</text>
        <text class="sDbText" style="pointer-events:none" text-anchor="end" transform="matrix(1 0 0 1 250 27)" fill="#A3A3A3" font-family="'Open Sans'" font-size="12px">xx dB</text>
        <circle class="sendThumb" opacity="0.5" fill="#808080" stroke="#262626" stroke-width="2" stroke-miterlimit="10" cx="26" cy="22" r="19"/>
        <g class="send_mute button">
            <g class="send_mute_off" visibility="visible">
                <path class="shadow" opacity="0.15" d="M314.4,45.2c0,1-0.8,1.8-1.8,1.8h-39c-1,0-1.8-0.8-1.8-1.8v-4.6h42.7v4.6H314.4z"/>
                <linearGradient id="smoGrad" gradientUnits="userSpaceOnUse" x1="1720.0585" y1="-785.3847" x2="1720.0585" y2="-828.6583" gradientTransform="matrix(1 0 0 -1 -1427 -785)">
                    <stop offset="0" style="stop-color:#404040"/>
                    <stop offset="1" style="stop-color:#333333"/>
                </linearGradient>
                <path fill="url(#smoGrad)" d="M273.6,43.6c-1.2,0-2.1-1-2.1-2.1v-39c0-1.2,1-2.1,2.1-2.1h39c1.2,0,2.1,1,2.1,2.1v39c0,1.2-1,2.1-2.1,2.1H273.6z"/>
                <g><path fill="#805240" d="M293.1,25.9L293.1,25.9l4.2-10h2.2v12.3h-1.8V19h-0.1l-3.9,9.1h-1.2l-4-9.5h-0.1v9.5h-1.8V15.9h2.3L293.1,25.9z"/></g>
                <path class="mouseover" visibility="hidden" opacity="0.05" fill="#FFFFFF" d="M273.6,43.6c-1.2,0-2.1-1-2.1-2.1v-39c0-1.2,1-2.1,2.1-2.1h39c1.2,0,2.1,1,2.1,2.1v39c0,1.2-1,2.1-2.1,2.1H273.6z"/>
            </g>
            <g class="send_mute_on" visibility="hidden">
                <path display="inline" fill="#F13F24" d="M273.6,43.6c-1.2,0-2.1-1-2.1-2.1v-39c0-1.2,1-2.1,2.1-2.1h39c1.2,0,2.1,1,2.1,2.1v39c0,1.2-1,2.1-2.1,2.1H273.6z"/>
                <g display="inline"><path fill="#FFFFFF" d="M293.1,25.9L293.1,25.9l4.2-10h2.2v12.3h-1.8V19h-0.1l-3.9,9.1h-1.2l-4-9.5h-0.1v9.5h-1.8V15.9h2.3L293.1,25.9z"/></g>
                <path class="mouseover" visibility="hidden" opacity="0" fill="#FFFFFF" d="M273.6,43.6c-1.2,0-2.1-1-2.1-2.1v-39c0-1.2,1-2.1,2.1-2.1h39c1.2,0,2.1,1,2.1,2.1v39c0,1.2-1,2.1-2.1,2.1H273.6z"/>
            </g>
            <path fill="#1A1A1A" d="M312.6,0.7c1,0,1.8,0.8,1.8,1.8v39c0,1-0.8,1.8-1.8,1.8h-39c-1,0-1.8-0.8-1.8-1.8v-39c0-1,0.8-1.8,1.8-1.8H312.6 M312.6,0.1h-39c-1.3,0-2.4,1.1-2.4,2.4v39c0,1.3,1.1,2.4,2.4,2.4h39c1.3,0,2.4-1.1,2.4-2.4v-39C315,1.2,313.9,0.1,312.6,0.1L312.6,0.1z"/>
        </g>
        </svg>
      </element>

      <!-- Vertical (landscape) templates -->
      <element id="trackRow2SvgVert">
        <div class="vertChan vertMain">
          <div class="vertDb">&mdash; dB</div>
          <svg version="1.1" class="vertSlider faderSvgVert" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 240" preserveAspectRatio="none">
            <rect fill="#1A1A1A" x="27" y="22" width="6" height="196" rx="2"/>
            <g class="fader">
              <linearGradient id="vfg_cap" gradientUnits="userSpaceOnUse" x1="6" y1="0" x2="54" y2="0">
                <stop offset="0" style="stop-color:#525252"/>
                <stop offset="0.5" style="stop-color:#E0E0E0"/>
                <stop offset="1" style="stop-color:#525252"/>
              </linearGradient>
              <rect class="vertMainThumb" x="8" y="195" width="44" height="30" rx="3" fill="url(#vfg_cap)" stroke="#1A1A1A" stroke-width="1"/>
              <line x1="14" y1="210" x2="46" y2="210" stroke="#262626" stroke-width="2"/>
            </g>
          </svg>
          <div class="vertControls" style="visibility:hidden">
            <button class="vertMute">M</button>
          </div>
          <div class="vertTitle">MAIN</div>
        </div>
      </element>

      <element id="trackSendSvgVert">
        <div class="vertChan">
          <div class="vertDb">&mdash; dB</div>
          <svg version="1.1" class="vertSlider sendSvgVert" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 220" preserveAspectRatio="none">
            <rect class="sendBg" fill="#262626" x="2" y="2" width="46" height="216" rx="23"/>
            <line class="sendLine" style="pointer-events:none" fill="none" opacity="0.5" stroke="#404040" stroke-width="36" stroke-linecap="round" stroke-miterlimit="10" x1="25" y1="195" x2="25" y2="195"/>
            <line class="panCenterTick" style="display:none;pointer-events:none" x1="8" y1="110" x2="42" y2="110" stroke="#909090" stroke-width="1.5" stroke-linecap="round"/>
            <circle class="sendThumb" opacity="0.6" fill="#808080" stroke="#262626" stroke-width="2" stroke-miterlimit="10" cx="25" cy="195" r="18"/>
          </svg>
          <div class="vertControls">
            <button class="vertMute">M</button>
          </div>
          <div class="vertTitle">Target Name</div>
        </div>
      </element>

    </div><!-- /#backLoad -->
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { cycleMixerMode, getMixerMode } from '../lib/mixer.js'
import TrackSelect from '../components/TrackSelect.vue'

const isPan = ref(getMixerMode() === 'pan')

function onCycleMixerMode() {
  cycleMixerMode((newMode) => { isPan.value = newMode === 'pan' })
}
</script>
