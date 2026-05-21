# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MoreMe 2** is a phone/tablet/laptop-friendly personal-monitor mixer for REAPER (a digital audio workstation). Performers open a URL, select their monitor track, and dial in their own mix of receives and pans without needing to interact with the FOH engineer.

- **No external services, no build step.** The page is plain HTML/CSS/JS with inline SVG, served from REAPER's built-in web server.
- **Three runtime files:** one HTML page, two optional Lua companion scripts for extended functionality beyond REAPER's stock web-remote API.
- **Forked from REAPER's stock `more_me.html`.** Original Cockos code is wrapped, not modified, to keep the licensing story simple and make future REAPER updates automatically beneficial.

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

- **Long polling:** Page polls REAPER every ~100 ms via `wwr_req_recur()` (stock REAPER web-remote helper in `main.js`).
- **Commands:** Path-style text (`SET/TRACK/idx/SEND/n/VOL/dB`), HTTP-transported, not OSC (despite the naming).
  - Release commands end with `e` suffix for undo grouping: `SET/TRACK/idx/SEND/-N/VOL/dBe`.
  - Mute toggles via `-1` argument: `SET/TRACK/idx/SEND/-N/MUTE/-1`.
- **ExtState side-channel:** REAPER's web-remote API has no commands for tempo query or time-sig set. The page uses project `ExtState` (key-value storage) as a side channel:
  - Tempo: Read from `ExtState["MoreMe"]["current_tempo"]` (written by optional `moreme_monitor.lua` on a defer loop).
  - Time signature: Write to `ExtState["MoreMe"]["tsig_num"]` and `["tsig_den"]`, then trigger `moreme_set_timesig.lua` to apply.
  - Script auto-discovery: `moreme_set_timesig.lua` self-registers its command ID into `ExtState["MoreMe"]["tsig_action_id"]` so the page can find it automatically.

### Volume Math

- Slider position `p` (0..1 over visual travel) → `volRaw = p^4 × 4`.
- Inverse: `p = volRaw^(1/4)` for rendering a known volume to slider position.
- 0 dB lands at ~71% of slider travel (both horizontal and vertical).
- Horizontal master: 274-unit range, 0 dB at `x ≈ 195`.
- Vertical sliders: 170-unit range, 0 dB at `y ≈ 75`.

### Key Constants and Globals (in more_me_2.html)

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
│   ├── more_me_2.html           (~1680 lines) – The page itself
│   ├── more_me_2.md             – Feature documentation (outdated; needs refresh for pan mode, VOL/PAN button, double-tap)
│   ├── monarimix_set_timesig.lua   – Required companion: reads tsig num/den from ExtState, applies it
│   └── monarimix_monitor.lua       – Optional companion: writes live tempo to ExtState
├── deploy.ps1                   – PowerShell script to copy files to REAPER runtime folders
├── CONTEXT.md                   – Handoff notes, decisions, loose ends
├── INSTALL.md                   – User install guide
├── index.xml                    – ReaPack distribution manifest (placeholders: YOUR-USERNAME/YOUR-REPO)
└── CLAUDE.md                    – This file

Runtime destinations (not in repo):
- more_me_2.html, more_me_2.md  → %APPDATA%\REAPER\reaper_www_root\
- monarimix_set_timesig.lua, monarimix_monitor.lua  → %APPDATA%\REAPER\Scripts\
- main.js (REAPER's stock helper)  → Already ships with REAPER; overlaid from Program Files
```

## Development Workflow

### Deploy After Editing

```powershell
cd c:\Users\Ari\source\AKReapack
.\deploy.ps1
```

This copies the four runtime files to REAPER's resource folders. Hard-reload the page in the browser (`Ctrl+Shift+R` on desktop) to clear cache.

### Key Development Commands

- **Hard-reload page:** `Ctrl+Shift+R` (desktop) or close-reopen tab (mobile) to flush browser cache.
- **REAPER resource folder:** Options → Show REAPER resource path in explorer/finder.
- **Action List:** Shift+/ or Actions menu → Show action list. Use to run/register ReaScripts.
- **Web-remote API:** Consult [REAPER documentation](https://reaper.fm/sdk/js/wwr_start.html) or the stock `main.js` in REAPER's install for the full command vocabulary.

### Testing

1. **Locally in REAPER:** Run `.\deploy.ps1`, open REAPER, navigate to the page via the URL shown in Preferences → Control/OSC/web.
2. **Network device:** Navigate to `http://<reaper-host>:<port>/more_me_2.html` from a phone/tablet on the same LAN.
3. **Layout modes:** Toggle between Auto/Vertical/Horizontal via the button or URL hash to verify rendering.
4. **Pan mode:** Use VOL/PAN toolbar button to switch; verify double-tap-to-center works on each strip.
5. **Tempo/time-sig:** Test in Project Settings panel; ensure live updates and changes apply.

### Code Map Inside more_me_2.html

| Section | What it does |
|---------|---|
| `<style>` block | All CSS. `@media (orientation: …)` for auto mode; `body.force-vert`, `body.force-horiz` classes for overrides. |
| Top-level `var` | Globals: `trackNameAr`, `receiveVolAr`, `selectChoiceIdx`, `mixerMode`, `modeOverride`, etc. |
| Mode override functions | `loadModePreference()`, `getEffectiveMode()`, `applyMode()`, `cycleMode()`, `updateModeToggleIcon()`. |
| Horizontal handlers | `mouseMoveHandler`, `sendMouseMoveHandler`, `sendMouseUpHandler`, `volFaderConnect`, `sendConnect`. Original Cockos code. |
| Vertical handlers | `vertMouseMoveHandler`, `vertMouseUpHandler`, `vertConnect`. Y-axis drag; reads `isVertMode` for pan/vol branching. |
| `renderVertical(drawnReceives)` | Populates `#vertMixer` with channel strips. Reconciles strip count vs receive count; renders pan center-tick or not based on `mixerMode`. |
| `wwr_onreply` wrapper | Calls original (renders horizontal layout), then conditionally calls `renderVertical()`. Both layouts populate each cycle; CSS hides inactive. |
| `#backLoad` div | Hidden SVG/HTML templates cloned at runtime. `trackRow2Svg`, `trackSendSvg` (horizontal); `trackRow2SvgVert`, `trackSendSvgVert` (vertical). |
| Double-tap helper | `detectPanDoubleTap()`. 350 ms window, per-strip key so different strips don't combine. |

### Key Architectural Decisions

1. **Wrap, don't modify, stock code.** Reduces licensing friction, makes future REAPER updates beneficial.
2. **OSC syntax is single-slash.** `OSC/tempo/raw:120`, not double-slash. Double-slash attempts didn't work.
3. **Time signature requires a ReaScript.** No built-in OSC alias exists; you can't invent custom action names in `Default.ReaperOSC`.
4. **Self-registration removes copy-paste friction.** Script learns its command ID via `get_action_context()` + `ReverseNamedCommandLookup()` and writes to ExtState.
5. **Global VOL/PAN toggle, not per-strip.** Earlier per-strip tap-on-name was unreliable on mobile (SVG text target inside slider drag area). Current design: one toolbar button, one `mixerMode` global.
6. **Pan readback formulas must match drag math exactly.** Discovered via iPhone "lurch" bug; calibrated constants now consistent.
7. **Double-tap target is the whole strip, not just the center line.** Center line is too thin for reliable touch targeting.

## Pending Decisions & Loose Ends

See [CONTEXT.md](CONTEXT.md) for full details. Quick summary:

- **License:** Choose MIT (permissive) or GPL-3 (copyleft), add `LICENSE` file, update `index.xml`.
- **Folder/project name:** "moreme" is a placeholder. Rename before pushing to GitHub.
- **Clean up stale copies:** Delete `reaper_www_root/old/` folder and old script registrations if they exist.
- **Update `more_me_2.md`:** Document pan mode, VOL/PAN button, double-tap-to-center, Project/General Settings split.
- **Replace GitHub placeholders:** Update `YOUR-USERNAME/YOUR-REPO` in `index.xml` once a repo exists.

## Notes for Future Work

- The page uses Google Fonts; offline devices fall back to system sans-serif.
- The stock `init()` function is never called — harmless artefact from original code.
- The stock code checks `_results` element with a null-check no-op on line ~427 — left untouched.
- Master strip in horizontal mode uses `-this.id` as an unparseable value so REAPER treats it as index 0 (the hardware send); vertical mode uses explicit `data-send-idx="0"`.
