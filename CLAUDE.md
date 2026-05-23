# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Monarimix** is a phone/tablet/laptop-friendly personal-monitor mixer for REAPER (a digital audio workstation). Performers open a URL, select their monitor track, and dial in their own mix of receives and pans without needing to interact with the FOH engineer.

- **Vue 3 + Vite single-file build.** Source is in `monarimix/src/`. `deploy.ps1` runs `npm run build` (via `vite-plugin-singlefile`) and produces `monarimix/dist/monarimix.html` — one file REAPER can serve with no other assets.
- **Tab bar navigation:** Mixer | Recording | Settings. Track dropdown and VOL/PAN button live inside the Mixer tab only.
- **Three runtime files:** one HTML page (the build artifact), two optional Lua companion scripts for extended functionality beyond REAPER's stock web-remote API.
- **Forked from REAPER's stock `more_me.html`.** Original Cockos mixer code is wrapped in `mixer.js`, not modified, to keep the licensing story simple and make future REAPER updates automatically beneficial.

## Key Architecture Concepts

### Two Rendering Modes: VOL and PAN

- **VOL (Volume):** The default mode. Mixer displays volume levels; dragging adjusts send levels.
- **PAN (Pan):** Global toggle (not per-strip). Mixer displays pan position; dragging adjusts pan. Master strip always stays volume. Double-tap any strip in pan mode to reset its pan to 0.
- A toolbar button cycles VOL ↔ PAN; both layouts read the `mixerMode` global during drag and rendering.
- Toggling wipes mixer divs to force a clean rebuild with the right visualization (center tick on/off, line fill direction, readout format).

### Two Layout Modes: Horizontal and Vertical

- **Horizontal (portrait):** Horizontal pill-shaped sliders, one row, with mute button and dB readout on each. Master fader at top.
- **Vertical (landscape):** Channel strips side-by-side, mixer-console style, with dB above, slider in middle, mute below. Strips wrap to second row if needed.
- **Auto mode:** Flips layout automatically based on device orientation (`@media (orientation: …)` CSS queries).
- **Manual override:** URL hash (`#v`, `#h`, `#auto`), toggle button, and `localStorage` persistence. Precedence on load: **URL hash → localStorage → Auto**.
- Both layouts populate every polling cycle; CSS visibility hides the inactive one (wasteful but keeps original code untouched).

### Communication Protocol with REAPER

**Three communication channels:**

1. **HTTP Web-Remote API (primary):** Path-style commands like `SET/TRACK/idx/SEND/n/VOL/dB`, transported over HTTP POST. All volume and pan adjustments go through here.
   - Release commands end with `e` suffix for undo grouping: `SET/TRACK/idx/SEND/-N/VOL/dBe`.
   - Mute toggles via `-1` argument: `SET/TRACK/idx/SEND/-N/MUTE/-1`.

2. **OSC Bridge (tempo only):** Routed through `Default.ReaperOSC`. Single-slash syntax: `OSC/tempo/raw:<bpm>`.

3. **ExtState side-channel (tempo readback & script discovery):** Project-scoped key-value storage when web-remote API lacks the command.
   - Tempo readback: Optional `monarimix_monitor.lua` writes `Master_GetTempo()` to `ExtState["MoreMe"]["current_tempo"]` on a defer loop. Page polls every 250 ms while Project Settings is open.
   - Time signature: Read live via `BEATPOS` polling (includes `ts_numerator` and `ts_denominator`). Set via page write to `ExtState["MoreMe"]["tsig_num"]` / `["tsig_den"]`, then trigger `monarimix_set_timesig.lua`.
   - Script auto-discovery: `monarimix_set_timesig.lua` self-registers its command ID into `ExtState["MoreMe"]["tsig_action_id"]` so the page finds it automatically.

**Polling & rendering flow:** `wwr_req_recur("NTRACK;TRACK;BEATPOS", 10)` polls every ~100 ms. Original `wwr_onreply` parses `NTRACK`/`TRACK`/`SEND` lines into top-level arrays, renders horizontal layout. A wrapper adds BEATPOS parsing, EXTSTATE polling for tempo/script-ID, and vertical-mixer rendering.

### Volume Math

- Slider position `p` (0..1 over visual travel) → `volRaw = p^4 × 4`.
- Inverse: `p = volRaw^(1/4)` for rendering a known volume to slider position.
- 0 dB lands at ~71% of slider travel (both horizontal and vertical).
- Horizontal master: 274-unit range, 0 dB at `x ≈ 195`.
- Vertical sliders: 170-unit range, 0 dB at `y ≈ 75`.

### Key Constants and Globals (in `src/lib/mixer.js`)

| Variable | Purpose |
|----------|---------|
| `HORIZ_PAN_CENTER_X = 135`, `HORIZ_PAN_HALF = 109` | Horizontal-pill pan thumb geometry. Thumb center travels `[26, 244]`. |
| `VERT_PAN_CENTER_Y = 110`, `VERT_PAN_HALF = 85` | Vertical-strip pan drag and readback math. |
| `mixerMode` | Global toggle: `"mix"` or `"pan"`. |
| `modeOverride` | Layout override: `"auto"`, `"v"`, or `"h"`. |
| `isVertMode` | Computed current layout (boolean). |
| `mouseDown` | Flag: suppresses server-state redraw during drag. |
| `trackNameAr`, `receiveVolAr`, `receiveMuteAr`, `hardVol` | Top-level arrays and scalars populated by polling. |

### Pan Readback Calibration (Important!)

The horizontal-pill pan thumb center can travel `cx ∈ [26, 244]` (center 135, half-range 109). Earlier the readback formula incorrectly used `157 ± 131`, causing the thumb to "lurch max-right" on iPhone after touchend (the mismatched constants meant readback moved the thumb further than drag math intended).

**Fix:** Align readback to drag constants. Both now use `HORIZ_PAN_CENTER_X = 135` and `HORIZ_PAN_HALF = 109`. The `.panCenterTick` line in the SVG template was also moved to `x=135` to match.

Vertical-pan had no bug because both drag and render already used the same constants by construction.

## File Structure

```
c:\Users\Ari\source\AKReapack\
├── monarimix/
│   ├── monarimix.html           – Vite HTML entry point (17 lines; references src/main.js + external main.js)
│   ├── monarimix.md             – User-facing feature documentation (deployed to wwwroot)
│   ├── monarimix_set_timesig.lua   – Required companion: reads tsig num/den from ExtState, applies it
│   ├── monarimix_monitor.lua       – Optional companion: writes live tempo to ExtState
│   ├── main.js                  – REFERENCE COPY of REAPER's stock web-remote helper (not deployed)
│   ├── package.json / vite.config.js
│   ├── dist/
│   │   └── monarimix.html       – Build output (single inlined file; deployed by deploy.ps1; gitignored)
│   └── src/
│       ├── main.js              – Vue app entry: creates Pinia, mounts App
│       ├── style.css            – All global CSS (extracted from original monolith)
│       ├── App.vue              – Root: TabBar + tab content (v-show, not v-if)
│       ├── lib/
│       │   ├── mixer.js         – All vanilla mixer logic: drag handlers, renderVertical, stockWwrOnReply,
│       │   │                      buildWwrOnReply factory, mode management, pan helpers
│       │   ├── store.js         – Pinia setup store: activeTab, recState, tsig, pollVersion, handleReply
│       │   └── reaper.js        – initReaper(): wires wwr_onreply via buildWwrOnReply, starts polling
│       ├── components/
│       │   ├── TabBar.vue       – Mixer | Recording | Settings tab bar
│       │   └── TrackSelect.vue  – <select id="trackSelect"> shell; stock code manages options
│       └── tabs/
│           ├── MixerTab.vue     – trackSelectRow (dropdown + VOL/PAN btn), mixer divs, all SVG templates
│           ├── RecordingTab.vue – REC/STOP button, rec state feedback
│           └── SettingsTab.vue  – PROJECT (tempo/tsig) + GENERAL (layout mode) sections
├── deploy.ps1                   – Runs npm run build, then copies files to REAPER runtime folders
├── INSTALL.md                   – User install guide
├── index.xml                    – ReaPack distribution manifest
└── CLAUDE.md                    – This file

Runtime destinations (deployed by deploy.ps1):
- dist/monarimix.html, monarimix.md  → %APPDATA%\REAPER\reaper_www_root\
- monarimix_set_timesig.lua, monarimix_monitor.lua  → %APPDATA%\REAPER\Scripts\

Not deployed (already provided by REAPER):
- main.js (REAPER's copy) → C:\Program Files\REAPER (x64)\Plugins\reaper_www_root\main.js
  The repo copy (monarimix/main.js) is documentation only.
```

## Development Workflow

### Deploy After Editing

```powershell
cd c:\Users\Ari\source\AKReapack
.\deploy.ps1
```

`deploy.ps1` runs `npm run build` inside `monarimix/`, then copies the four runtime files to REAPER's resource folders. Hard-reload the page in the browser (`Ctrl+Shift+R` on desktop) to clear cache.

To iterate quickly without full deploy:

```powershell
cd monarimix
npm run build
# then manually copy dist/monarimix.html to %APPDATA%\REAPER\reaper_www_root\
```

### Key Development Commands

- **Hard-reload page:** `Ctrl+Shift+R` (desktop) or close-reopen tab (mobile) to flush browser cache.
- **REAPER resource folder:** Options → Show REAPER resource path in explorer/finder.
- **Action List:** Shift+/ or Actions menu → Show action list. Use to run/register ReaScripts.
- **Web-remote API reference:** See [monarimix/main.js](monarimix/main.js) in the repo — a reference copy of REAPER's stock helper with full command documentation and `wwr_*` function signatures. Also available at [ReaTeam/Doc on GitHub](https://github.com/ReaTeam/Doc/blob/master/web_interface_modding.md).

### Testing

1. **Locally in REAPER:** Run `.\deploy.ps1`, open REAPER, navigate to the page via the URL shown in Preferences → Control/OSC/web.
2. **Network device:** Navigate to `http://<reaper-host>:<port>/monarimix.html` from a phone/tablet on the same LAN.
3. **Layout modes:** Toggle between Auto/Vertical/Horizontal via the button or URL hash to verify rendering.
4. **Pan mode:** Use VOL/PAN toolbar button to switch; verify double-tap-to-center works on each strip.
5. **Recording tab:** REC → seeks to end+5s → records; STOP saves without dialog.

### Code Map (modular structure)

| File | What it does |
|---------|---|
| `src/style.css` | All global CSS. `@media (orientation: …)` for auto mode; `body.force-vert`/`force-horiz` for overrides. |
| `src/lib/mixer.js` | Module-level mixer state vars; all drag handlers; `renderVertical()`; `stockWwrOnReply()`; `buildWwrOnReply(store)` factory; mode management; pan helpers. |
| `src/lib/store.js` | Pinia store: `activeTab`, `recState`, `currentTsNum/Den`, `pollVersion`, `handleReply()` (BEATPOS + EXTSTATE parser). |
| `src/lib/reaper.js` | `initReaper()`: wires `window.wwr_onreply` via `buildWwrOnReply`, starts orientation listener, starts polling. |
| `src/App.vue` | Root: `<TabBar>` then three tab wrappers with `v-show` (not `v-if` — ensures DOM elements always exist for stock code). |
| `src/tabs/MixerTab.vue` | `#trackSelectRow` (dropdown + VOL/PAN btn); `.trackRow2`, `#receives`, `#vertMixer`; `#backLoad` with all 4 SVG templates. |
| `src/tabs/RecordingTab.vue` | REC/STOP button; drives `store.recState`; sends wwr_req commands. |
| `src/tabs/SettingsTab.vue` | Project (tempo/tsig display) + General (layout mode toggle) sub-sections. |
| `#backLoad` div (in MixerTab) | Hidden SVG/HTML templates cloned at runtime. `trackRow2Svg`, `trackSendSvg` (horizontal); `trackRow2SvgVert`, `trackSendSvgVert` (vertical). |

### Key Architectural Decisions & Lessons Learned

1. **Wrap, don't modify, stock code.** Original `wwr_onreply` stays intact and unchanged. A wrapper around it adds BEATPOS parsing, EXTSTATE parsing, dropdown Settings option, and vertical-mixer rendering. This reduces licensing friction, keeps the licensing story simple, and makes future REAPER updates to `main.js` automatically beneficial.

2. **Settings is a dedicated tab, not a dropdown item.** Tab bar (Mixer | Recording | Settings) replaced the original dropdown-driven settings approach. The Settings tab contains Project (tempo/tsig) and General (layout mode) sub-sections. This eliminated the `body.in-settings` / `body.in-gen-settings` class manipulation that previously used `!important` overrides.

3. **OSC syntax is single-slash.** `OSC/tempo/raw:120`, not `OSC//tempo/raw:120`. The earlier double-slash attempt didn't work and was the source of one debugging round-trip.

4. **Time signature requires a ReaScript.** No built-in OSC alias exists for it. Adding `TIMESIG_NUMERATOR` to `Default.ReaperOSC` doesn't help — the action descriptions in that file must be REAPER-recognized; you can't invent custom names. Solution: page writes desired num/den to project ExtState, then triggers the script.

5. **Self-registration removes copy-paste friction.** `monarimix_set_timesig.lua` learns its own command ID via `reaper.get_action_context()` + `reaper.ReverseNamedCommandLookup()` and writes it to `ExtState["MoreMe"]["tsig_action_id"]`. Page picks it up automatically; manual paste stays as a fallback for edge cases.

6. **Global VOL/PAN toggle, not per-strip.** Earlier iteration: each strip's track-name label toggled pan mode for that strip. Abandoned because the SVG text target was unreliable on mobile (text node inside slider's drag area causes mis-targeting). Current design: one toolbar button (`VOL` ↔ `PAN`), one global `mixerMode` flag, both layouts read it during drag and rendering. Both modes share the same code paths; the difference is a few conditional branches.

7. **Pan readback formulas must match drag math exactly.** Discovered via iPhone "lurches max-right" bug in horizontal-pill pan: the readback formula incorrectly used `157 ± 131` for thumb center, but drag math constrains the thumb to `cx ∈ [26, 244]` (center 135, half-range 109). The mismatch meant readback moved the thumb further than the drag action intended. Fix: aligned readback to drag constants; both now use `HORIZ_PAN_CENTER_X = 135` and `HORIZ_PAN_HALF = 109`. Vertical-pan had no bug because both drag and render already used the same constants by construction.

8. **Double-tap target is the whole strip, not just the center line.** The center line is too thin to be a reliable touch target. The line stays as a visual indicator; the gesture target is the whole strip. `detectPanDoubleTap` uses a 350 ms window and gates on a per-strip key so taps on different strips don't combine.

9. **Both layouts populate every poll cycle; CSS hides the inactive one.** Wasteful but harmless. Keeps original code untouched and avoids complex reconciliation logic during mode switches.

10. **Debug instrumentation was removed.** Earlier: a "last sent / last reply" panel inside Project Settings for diagnosing OSC issues. It served its purpose and was cleaned up when the feature matured.

11. **Vue 3 + Vite wrap-not-rewrite migration.** The ~800 lines of mixer JS (drag handlers, renderVertical, stockWwrOnReply) moved verbatim into `mixer.js` as module-level functions — not Vue-reactive. Vue components provide the required DOM containers (`#receives`, `#vertMixer`, etc.); stock code manipulates them via `getElementById`. `v-show` (not `v-if`) is used for tab containers so DOM elements always exist. `buildWwrOnReply(store)` is a factory that composes `stockWwrOnReply` → `store.handleReply` → `renderVertical` as `window.wwr_onreply`. Pinia store holds only what Vue components need reactively (`activeTab`, `recState`, tsig, `pollVersion`); mixer arrays stay as module-level JS variables.

## Pending Decisions & Loose Ends

- **License:** Choose MIT (permissive) or GPL-3 (copyleft), add `LICENSE` file, update `index.xml` metadata.
- **GitHub repo:** ✅ Created at [AriKuorikoski/monarimix](https://github.com/AriKuorikoski/monarimix).
- **Clean up stale copies:** Delete `%APPDATA%\REAPER\reaper_www_root\old\` folder (contains pre-rename versions). Delete `%APPDATA%\REAPER\reaper_www_root\monarimix_set_timesig.lua` if present (old copy from before `deploy.ps1` targeted `Scripts/` folder). After deleting, re-register the script in REAPER's Action List from the new `Scripts/` path.

## Repository vs. Runtime Structure

**Source repo:** `c:\Users\Ari\source\AKReapack\monarimix\src\` — where you edit Vue/JS files.

**Build output:** `monarimix/dist/monarimix.html` — gitignored; produced by `npm run build`.

**Runtime destinations** (deployed by `deploy.ps1`):
- `dist/monarimix.html`, `monarimix.md` → `%APPDATA%\REAPER\reaper_www_root\`
- `monarimix_set_timesig.lua`, `monarimix_monitor.lua` → `%APPDATA%\REAPER\Scripts\`

**Not deployed** (already provided by REAPER):
- `main.js` — REAPER ships this at `C:\Program Files\REAPER (x64)\Plugins\reaper_www_root\main.js`. REAPER's web server overlays the user folder over the install folder, so `<script src="main.js">` in monarimix.html resolves transparently to Cockos's stock file. The repo copy (`monarimix/main.js`) is documentation only.

## Notes for Future Work & Implementation Details

- The page uses Google Fonts; offline devices fall back to system sans-serif.
- The stock `init()` function is never called — harmless artefact from original code.
- Master strip in horizontal mode uses `-this.id` as an unparseable value so REAPER treats it as index 0 (hardware send); vertical mode uses explicit `data-send-idx="0"`.
- Mixer div wipe on mode toggle forces clean rebuild with correct visualizations (center tick on/off, line fill direction, readout format changes).
- `window.wwr_onreply`, `window.wwr_req`, `window.mkvolstr` are the only true window globals. All mixer state lives as module-level `let` variables in `mixer.js`.
