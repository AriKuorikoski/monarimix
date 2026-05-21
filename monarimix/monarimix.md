# MoreMe 2 — Personal Monitor Mixer

A modified version of REAPER's stock `more_me.html` web remote page, providing per-performer in-ear / headphone monitor mixing from a phone, tablet, or laptop browser.

This page is served from REAPER's built-in web server (the "Web Browser Interface", configured under **Preferences → Control/OSC/web**). Despite the name, it does **not** use OSC; it uses REAPER's HTTP-based web-remote API (`wwr_*` JavaScript calls in `main.js`). The path-style commands look OSC-like (`SET/TRACK/x/SEND/y/VOL/z`) but are transported over HTTP, not UDP.

## File location

REAPER serves files from two paths, with the user resource folder taking precedence:

- Install default: `C:\Program Files\REAPER (x64)\Plugins\reaper_www_root\` (read-only without admin).
- User resources: `C:\Users\<you>\AppData\Roaming\REAPER\reaper_www_root\` ← this copy lives here.

Both files are required:

- `monarimix.html` — the page (this document describes its behaviour).
- `main.js` — provides `wwr_req`, `wwr_start`, `wwr_req_recur`, `wwr_onreply`, `mkvolstr`. The page will not function without it.

Open in a browser at `http://<reaper-host>:<port>/monarimix.html`.

## Setup in REAPER

Each performer needs their own monitor track:

1. Create a new track named for the performer (e.g. "MON - Drums").
2. Add **receives** from every source track the performer wants to hear (vocals, drums, click, etc.).
3. Add a **hardware send** in send slot 1, routed to the physical output feeding their headphones / in-ears.
4. Disable **Master Send** on the monitor track (otherwise the monitor mix bleeds into FOH).

A track is recognised as a "monitor track" and offered in the dropdown when it has at least one receive **and** at least one hardware send. Tracks without both are invisible to the page.

Tip: build one prototype monitor track, then duplicate it (Ctrl+D) per performer. Duplicating preserves receives, FX, and Master-Send-disabled state. Per duplicate, change only the hardware send destination and the track name.

## Using the app

### Selecting your monitor track

The dropdown at the top lists every monitor track in the project. Pick yours. The mixer below populates with your master fader and one channel per receive.

Note: every performer sees every monitor track in the dropdown. If that's a problem (curious performer fiddling with someone else's mix), give each performer their own copy of the file with a hard-coded track name — not currently a UI option.

### The mixer

Two visual layouts switch automatically based on screen orientation:

**Horizontal layout** (portrait — phones held upright)

- A horizontal master fader at the top controls the volume going to the performer's hardware output.
- Each receive is a horizontal pill below it. Drag the thumb left/right to adjust. The "M" button mutes that receive.
- Source track color carries over to the thumb and label.
- The dB value of each receive shows on the right end of the pill.

**Vertical layout** (landscape — phones held sideways, tablets/laptops in landscape)

- Channel strips side-by-side, mixer-console style.
- Leftmost strip ("MAIN") is the master output fader with a chrome-gradient rectangular cap.
- Each subsequent strip is a receive: dB readout above the slider, a colored circular thumb on a vertical track, an "M" mute button below, and the source track name at the bottom.
- Strips wrap to a second row if too many to fit on one line.

Both layouts use the same volume curve as REAPER's mixer faders (4th-power taper, with 0 dB landing at ~71% of slider travel). Dragging is finger-friendly on touch devices and works equally with mouse on desktop.

### Mute behaviour

The mute button toggles via `SET/TRACK/<monitor>/SEND/-N/MUTE/-1` (the `-1` argument asks REAPER to toggle the current state rather than set an absolute value). When muted, the button turns red.

## Layout mode override

By default the layout follows device orientation. You can override that per-device.

### Three modes

- **Auto** — Follow device orientation. Landscape shows vertical strips; portrait shows horizontal sliders. Rotating the device flips the layout live.
- **Vertical** — Force vertical channel strips regardless of orientation. A portrait phone gets channel strips.
- **Horizontal** — Force horizontal pill sliders regardless of orientation. A landscape phone keeps horizontal sliders.

### Toggle button

The pill-shaped icon button to the right of the track dropdown cycles modes:

```
Auto → Vertical → Horizontal → Auto → …
```

The icon glyph reflects the current state:

- "A" inside a circle = Auto
- Three vertical bars = Vertical forced
- Three horizontal bars = Horizontal forced

Hover (desktop) or long-press (touch) shows the current mode as a tooltip.

### URL hash

The hash takes precedence over any other setting on load:

- `monarimix.html#v` → forces Vertical.
- `monarimix.html#h` → forces Horizontal.
- `monarimix.html#auto` (or no hash) → Auto.

Useful for bookmarking. Give one performer a `#v` link and another the same URL with `#h`, and each gets the layout they want without touching the toggle.

### Persistence

Tapping the toggle saves the choice to `localStorage` under the key `monarimixMode`. Closing the browser and reopening (without a URL hash) restores the choice. Clearing browser storage resets to Auto.

Precedence on load: **URL hash → localStorage → Auto**.

## Behind the scenes

### Polling

The page polls REAPER every ~10 ticks (roughly 100 ms) via `wwr_req_recur("NTRACK;TRACK", 10)`. Each tick the page asks for the track count and per-track info, then requests the receive and hardware-send values for the currently-selected monitor track.

### Commands sent to REAPER

- `SET/TRACK/<idx>/SEND/0/VOL/<dB>` — set hardware send level (the master fader / hardware output).
- `SET/TRACK/<idx>/SEND/-N/VOL/<dB>` — set the level of the Nth receive into this track. REAPER uses negative indices for receives.
- `SET/TRACK/<idx>/SEND/-N/VOL/<dB>e` — same as above with `e` suffix, sent on touch/click release; tells REAPER to commit the change for undo grouping.
- `SET/TRACK/<idx>/SEND/-N/MUTE/-1` — toggle receive mute (-1 = toggle).
- `GET/TRACK/<idx>/SEND/<n>` — request a send/receive's current state. Replies arrive in subsequent polling cycles as `SEND <fields…>` lines parsed by `wwr_onreply`.

### Volume math

The slider's normalized position `p` (0..1 over its visible travel) maps to a REAPER volume value:

```
volRaw = p^4 × 4
```

- `p = 0` → `volRaw = 0` (silent).
- `p ≈ 0.71` → `volRaw ≈ 1.0` (unity / 0 dB).
- `p = 1.0` → `volRaw = 4.0` (≈ +12 dB).

The inverse (rendering a known volume to a slider position) uses `p = volRaw^(1/4)`. The horizontal master fader has a 274-unit visual range with 0 dB at SVG x ≈ 195; the vertical sliders have a 170-unit range with 0 dB at SVG y ≈ 75. The `~71%` calibration is preserved across both layouts.

### Source code map

Sections worth knowing inside `monarimix.html`:

| Section | What it does |
|---|---|
| `<style>` block | All page CSS. Includes `@media (orientation: …)` queries for auto mode and `body.force-vert` / `body.force-horiz` overrides driven by JS. |
| Top-level `var` declarations | Globals shared across all functions: `trackNameAr`, `receiveVolAr`, `hardVol`, `selectChoiceIdx`, `modeOverride`, etc. |
| Mode override block | `loadModePreference()`, `getEffectiveMode()`, `applyMode()`, `cycleMode()`, `updateModeToggleIcon()`. |
| Horizontal handlers | `mouseMoveHandler`, `sendMouseMoveHandler`, `sendMouseUpHandler`, `volFaderConect`, `sendConect`. Unchanged from stock `more_me.html`. |
| Vertical handlers | `vertMouseMoveHandler`, `vertMouseUpHandler`, `vertConnect`. Y-axis drag math, same volume curve as horizontal. |
| `renderVertical(drawnReceives)` | Populates `#vertMixer` with channel strips. Reconciles strip count against receive count. |
| `wwr_onreply` wrapper | Calls the original (which renders horizontal layout into `.trackRow2` and `#receives`), then if `isVertMode` is true, calls `renderVertical()`. Both layouts populate every cycle; CSS hides whichever isn't active. |
| `#backLoad` div | Hidden SVG/HTML templates cloned at runtime. `trackRow2Svg` + `trackSendSvg` for horizontal; `trackRow2SvgVert` + `trackSendSvgVert` for vertical. |

### Key globals

| Variable | Purpose |
|---|---|
| `nTrack` | Total track count in the project. |
| `trackNameAr[i]` | Track name by index. |
| `trackRcvCntAr[i]` | Receive count for track `i`. |
| `trackHwOutCntAr[i]` | Hardware output count for track `i`. |
| `trackColoursAr[i]` | RGB integer color of track `i`. |
| `trackIsMonitorAr[i]` | 1 if track qualifies as a monitor (receives + hwOut), else 0. |
| `selectChoiceIdx` | Index of the currently-selected monitor track. |
| `receiveIdxAr[x]` | Source track index of the xth receive into the selected monitor. |
| `receiveVolAr[x]` | Raw volume of the xth receive (0..4). |
| `receiveMuteAr[x]` | 1 if muted, 0 otherwise. |
| `hardVol` | Raw volume of the hardware send (master fader value). |
| `mouseDown` | 1 while user is dragging a slider; suppresses redraw-from-server during drag. |
| `isVertMode` | Resolved current layout (true = vertical). Computed from `modeOverride` and orientation. |
| `modeOverride` | User's pin: `"auto"`, `"v"`, or `"h"`. |

## Differences from stock `more_me.html`

- Centred, width-capped container so the page doesn't stretch absurdly wide on desktop monitors.
- Orientation-based responsive layout: vertical channel strips in landscape, horizontal sliders in portrait.
- Manual mode override (URL hash + button + localStorage), so a user can pin a layout regardless of device orientation.
- `hardVol` is a top-level global (was function-scoped) so the vertical renderer can read it.
- `touch-action: none` on vertical sliders prevents page scroll while dragging on touchscreens.
- Vertical-mode drag listeners attach once per SVG element (guarded by a `_vertConnected` flag) rather than every poll cycle.

## Known limitations / quirks

- Every monitor track in the project is visible to every performer. There is no per-user filtering.
- The page polls every ~100 ms and applies server values to slider positions when not dragging. Very brief contention between local drag intent and server-state update is suppressed via the `mouseDown` flag.
- The stock master-fader command path relies on `-this.id` evaluating to `NaN` (the SVG has id `trackRow2Svg`); REAPER's server treats unparseable indices as 0 (the hardware send), so it works coincidentally. The vertical-mode equivalent uses an explicit `data-send-idx="0"`.
- The `init()` function in the source is defined but never called — a stock-page artefact, harmless.
- The Google Fonts `<link>` requires the device to have internet access; if offline, the page still works but falls back to the system sans-serif font.

## Quick reference

| Action | Command sent |
|---|---|
| Drag master fader | `SET/TRACK/<idx>/SEND/0/VOL/<dB>` |
| Release master fader | (no commit message; live-only) |
| Drag receive slider | `SET/TRACK/<idx>/SEND/-N/VOL/<dB>` |
| Release receive slider | `SET/TRACK/<idx>/SEND/-N/VOL/<dB>e` |
| Tap mute on receive | `SET/TRACK/<idx>/SEND/-N/MUTE/-1` |

| URL | Effect |
|---|---|
| `monarimix.html` | Auto layout, or last saved preference. |
| `monarimix.html#v` | Forces vertical. |
| `monarimix.html#h` | Forces horizontal. |
| `monarimix.html#auto` | Forces auto. |

| Tap-cycle on toggle button | Auto → Vertical → Horizontal → Auto |
