# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Monarimix** is a phone/tablet/laptop-friendly personal-monitor mixer for REAPER (a digital audio workstation). Performers open a URL, select their monitor track, and dial in their own mix of receives and pans without needing to interact with the FOH engineer.

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

### Key Constants and Globals (in monarimix.html)

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
│   ├── monarimix.html           (~1680 lines) – The page itself
│   ├── monarimix.md             – Feature documentation (outdated; needs refresh for pan mode, VOL/PAN button, double-tap)
│   ├── monarimix_set_timesig.lua   – Required companion: reads tsig num/den from ExtState, applies it
│   ├── monarimix_monitor.lua       – Optional companion: writes live tempo to ExtState
│   └── main.js                  – REFERENCE COPY of REAPER's stock web-remote helper (not deployed; see note below)
├── deploy.ps1                   – PowerShell script to copy files to REAPER runtime folders
├── CONTEXT.md                   – Handoff notes, decisions, loose ends
├── INSTALL.md                   – User install guide
├── index.xml                    – ReaPack distribution manifest (placeholders: YOUR-USERNAME/YOUR-REPO)
└── CLAUDE.md                    – This file

Runtime destinations (deployed by deploy.ps1):
- monarimix.html, monarimix.md  → %APPDATA%\REAPER\reaper_www_root\
- monarimix_set_timesig.lua, monarimix_monitor.lua  → %APPDATA%\REAPER\Scripts\

Not deployed (already provided by REAPER):
- main.js  → Shipped with REAPER at C:\Program Files\REAPER (x64)\Plugins\reaper_www_root\main.js
             REAPER's web server overlays user reaper_www_root over install copy, so monarimix.html finds it at <script src="main.js">
             The repo copy (monarimix/main.js) is documentation only — shows available wwr_* functions and command syntax.
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
- **Web-remote API reference:** See [monarimix/main.js](monarimix/main.js) in the repo — a reference copy of REAPER's stock helper with full command documentation and `wwr_*` function signatures. Also available at [ReaTeam/Doc on GitHub](https://github.com/ReaTeam/Doc/blob/master/web_interface_modding.md).

### Testing

1. **Locally in REAPER:** Run `.\deploy.ps1`, open REAPER, navigate to the page via the URL shown in Preferences → Control/OSC/web.
2. **Network device:** Navigate to `http://<reaper-host>:<port>/monarimix.html` from a phone/tablet on the same LAN.
3. **Layout modes:** Toggle between Auto/Vertical/Horizontal via the button or URL hash to verify rendering.
4. **Pan mode:** Use VOL/PAN toolbar button to switch; verify double-tap-to-center works on each strip.
5. **Tempo/time-sig:** Test in Project Settings panel; ensure live updates and changes apply.

### Code Map Inside monarimix.html

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

### Key Architectural Decisions & Lessons Learned

1. **Wrap, don't modify, stock code.** Original `wwr_onreply` stays intact and unchanged. A wrapper around it adds BEATPOS parsing, EXTSTATE parsing, dropdown Settings option, and vertical-mixer rendering. This reduces licensing friction, keeps the licensing story simple, and makes future REAPER updates to `main.js` automatically beneficial.

2. **Settings split into Project and General.** `body.in-settings` shows Project Settings (REAPER project state: tempo, time signature); `body.in-gen-settings` shows General Settings (user preference: layout mode). Both hide the mixer and use `!important` (only place in the file) to win against both orientation media queries and force-mode classes.

3. **OSC syntax is single-slash.** `OSC/tempo/raw:120`, not `OSC//tempo/raw:120`. The earlier double-slash attempt didn't work and was the source of one debugging round-trip.

4. **Time signature requires a ReaScript.** No built-in OSC alias exists for it. Adding `TIMESIG_NUMERATOR` to `Default.ReaperOSC` doesn't help — the action descriptions in that file must be REAPER-recognized; you can't invent custom names. Solution: page writes desired num/den to project ExtState, then triggers the script.

5. **Self-registration removes copy-paste friction.** `monarimix_set_timesig.lua` learns its own command ID via `reaper.get_action_context()` + `reaper.ReverseNamedCommandLookup()` and writes it to `ExtState["MoreMe"]["tsig_action_id"]`. Page picks it up automatically; manual paste stays as a fallback for edge cases.

6. **Global VOL/PAN toggle, not per-strip.** Earlier iteration: each strip's track-name label toggled pan mode for that strip. Abandoned because the SVG text target was unreliable on mobile (text node inside slider's drag area causes mis-targeting). Current design: one toolbar button (`VOL` ↔ `PAN`), one global `mixerMode` flag, both layouts read it during drag and rendering. Both modes share the same code paths; the difference is a few conditional branches.

7. **Pan readback formulas must match drag math exactly.** Discovered via iPhone "lurches max-right" bug in horizontal-pill pan: the readback formula incorrectly used `157 ± 131` for thumb center, but drag math constrains the thumb to `cx ∈ [26, 244]` (center 135, half-range 109). The mismatch meant readback moved the thumb further than the drag action intended. Fix: aligned readback to drag constants; both now use `HORIZ_PAN_CENTER_X = 135` and `HORIZ_PAN_HALF = 109`. Vertical-pan had no bug because both drag and render already used the same constants by construction.

8. **Double-tap target is the whole strip, not just the center line.** The center line is too thin to be a reliable touch target. The line stays as a visual indicator; the gesture target is the whole strip. `detectPanDoubleTap` uses a 350 ms window and gates on a per-strip key so taps on different strips don't combine.

9. **Both layouts populate every poll cycle; CSS hides the inactive one.** Wasteful but harmless. Keeps original code untouched and avoids complex reconciliation logic during mode switches.

10. **Debug instrumentation was removed.** Earlier: a "last sent / last reply" panel inside Project Settings for diagnosing OSC issues. It served its purpose and was cleaned up when the feature matured.

## Pending Decisions & Loose Ends

- **License:** Choose MIT (permissive) or GPL-3 (copyleft), add `LICENSE` file, update `index.xml` metadata.
- **GitHub repo:** ✅ Created at [AriKuorikoski/monarimix](https://github.com/AriKuorikoski/monarimix).
- **Clean up stale copies:** Delete `%APPDATA%\REAPER\reaper_www_root\old\` folder (contains pre-rename versions). Delete `%APPDATA%\REAPER\reaper_www_root\monarimix_set_timesig.lua` if present (old copy from before `deploy.ps1` targeted `Scripts/` folder). After deleting, re-register the script in REAPER's Action List from the new `Scripts/` path.
- **Update `monarimix.md`:** Document pan mode, VOL/PAN button, double-tap-to-center, Project/General Settings split (currently marked as outdated).

## Repository vs. Runtime Structure

**Source repo:** `c:\Users\Ari\source\AKReapack\monarimix\` — where you edit files.

**Runtime destinations** (deployed by `deploy.ps1`):
- `monarimix.html`, `monarimix.md` → `%APPDATA%\REAPER\reaper_www_root\`
- `monarimix_set_timesig.lua`, `monarimix_monitor.lua` → `%APPDATA%\REAPER\Scripts\`

**Not deployed** (already provided by REAPER):
- `main.js` — REAPER ships this at `C:\Program Files\REAPER (x64)\Plugins\reaper_www_root\main.js`. REAPER's web server overlays the user folder over the install folder, so `<script src="main.js">` in monarimix.html resolves transparently to Cockos's stock file.

## Notes for Future Work & Implementation Details

- The page uses Google Fonts; offline devices fall back to system sans-serif.
- The stock `init()` function is never called — harmless artefact from original code.
- The stock `_results` element check on line ~427 — null-checked no-op, left untouched.
- Master strip in horizontal mode uses `-this.id` as an unparseable value so REAPER treats it as index 0 (hardware send); vertical mode uses explicit `data-send-idx="0"`.
- Body class `body.in-settings` and `body.in-gen-settings` use `!important` declarations — only place in the file that does — to override both orientation media queries and force-mode classes.
- Mixer div wipe on mode toggle forces clean rebuild with correct visualizations (center tick on/off, line fill direction, readout format changes).
