# Monarimix — Personal Monitor Mixer

A modified version of REAPER's stock `more_me.html` web remote page, providing per-performer in-ear / headphone monitor mixing from a phone, tablet, or laptop browser.

This page is served from REAPER's built-in web server (the "Web Browser Interface", configured under **Preferences → Control/OSC/web**). Despite the name, it does **not** use OSC; it uses REAPER's HTTP-based web-remote API (`wwr_*` JavaScript calls in `main.js`). The path-style commands look OSC-like (`SET/TRACK/x/SEND/y/VOL/z`) but are transported over HTTP, not UDP.

## File location

REAPER serves files from two paths, with the user resource folder taking precedence:

- Install default: `C:\Program Files\REAPER (x64)\Plugins\reaper_www_root\` (read-only without admin).
- User resources: `C:\Users\<you>\AppData\Roaming\REAPER\reaper_www_root\` ← this copy lives here.

Both files are required:

- `monarimix.html` — the page.
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

## Navigation

The page has three tabs at the top:

- **Mixer** — the main mixing view with your channel strips. Track selection and the VOL/PAN button are here.
- **Recording** — record a take directly from the page.
- **Settings** — project tempo/time signature and layout preferences.

## Using the Mixer tab

### Selecting your monitor track

The dropdown at the top of the Mixer tab lists every monitor track in the project. Pick yours. The mixer below populates with your master fader and one channel per receive.

Note: every performer sees every monitor track in the dropdown. If that's a problem, give each performer their own copy of the file with a hard-coded track name — not currently a UI option.

### Two visual layouts

Both switch automatically based on screen orientation:

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

Both layouts use the same volume curve as REAPER's mixer faders (4th-power taper, with 0 dB landing at ~71% of slider travel).

### VOL / PAN mode

The **VOL/PAN button** (next to the track dropdown) cycles between two global modes:

- **VOL:** Drag sliders to adjust send levels. This is the default.
- **PAN:** Drag sliders to adjust pan position for each send. The master strip always stays in volume mode. A center tick mark appears on each strip to show the center position.

**Double-tap any strip in PAN mode** to reset that strip's pan to center.

### Mute behaviour

The mute button toggles via `SET/TRACK/<monitor>/SEND/-N/MUTE/-1` (the `-1` argument asks REAPER to toggle the current state rather than set an absolute value). When muted, the button turns red.

## Layout mode override

By default the layout follows device orientation. You can override that per-device.

### Three modes

- **Auto** — Follow device orientation. Landscape shows vertical strips; portrait shows horizontal sliders. Rotating the device flips the layout live.
- **Vertical** — Force vertical channel strips regardless of orientation. A portrait phone gets channel strips.
- **Horizontal** — Force horizontal pill sliders regardless of orientation. A landscape phone keeps horizontal sliders.

### Toggle button

The icon button (top right in General Settings) cycles modes:

```
Auto → Vertical → Horizontal → Auto → …
```

### URL hash

The hash takes precedence over any other setting on load:

- `monarimix.html#v` → forces Vertical.
- `monarimix.html#h` → forces Horizontal.
- `monarimix.html#auto` (or no hash) → Auto.

Useful for bookmarking. Give one performer a `#v` link and another the same URL with `#h`.

### Persistence

The layout choice is saved to `localStorage` under the key `monarimixMode`. Closing the browser and reopening (without a URL hash) restores the choice.

Precedence on load: **URL hash → localStorage → Auto**.

## Using the Recording tab

The Recording tab provides a one-tap record action:

- **REC button:** Seeks to 5 seconds past the end of existing content, then starts recording. This gives performers a run-in before the take begins.
- **STOP button (shown while recording):** Stops recording and saves the project immediately, without showing any dialogs.

## Using the Settings tab

### Project Settings

Shows the current project tempo and time signature. (Editing is reserved for the project engineer.)

### General Settings

Contains the layout mode toggle (Auto / Vertical / Horizontal) for the mixer view.

## Behind the scenes

### Polling

The page polls REAPER every ~10 ticks (roughly 100 ms) via `wwr_req_recur("NTRACK;TRACK;BEATPOS", 10)`. Each tick the page asks for the track count, per-track info, and beat position (which carries the current time signature).

### Commands sent to REAPER

| Action | Command |
|---|---|
| Drag master fader | `SET/TRACK/<idx>/SEND/0/VOL/<dB>` |
| Release receive slider | `SET/TRACK/<idx>/SEND/-N/VOL/<dB>e` |
| Drag receive slider | `SET/TRACK/<idx>/SEND/-N/VOL/<dB>` |
| Drag pan slider | `SET/TRACK/<idx>/SEND/-N/PAN/<pan>` |
| Release pan slider | `SET/TRACK/<idx>/SEND/-N/PAN/<pan>e` |
| Tap mute | `SET/TRACK/<idx>/SEND/-N/MUTE/-1` |
| REC: seek to end | `40043;BEATPOS` |
| REC: start recording | `SET/POS/<t+5>;1013;40157` |
| STOP & save | `40667` |

### Volume math

The slider's normalized position `p` (0..1 over its visible travel) maps to a REAPER volume value:

```
volRaw = p^4 × 4
```

- `p = 0` → `volRaw = 0` (silent).
- `p ≈ 0.71` → `volRaw ≈ 1.0` (unity / 0 dB).
- `p = 1.0` → `volRaw = 4.0` (≈ +12 dB).

## Known limitations / quirks

- Every monitor track in the project is visible to every performer. There is no per-user filtering.
- The page polls every ~100 ms and applies server values to slider positions when not dragging. Very brief contention between local drag intent and server-state update is suppressed via a `mouseDown` flag.
- The Google Fonts `<link>` requires internet access; if offline, the page still works but falls back to the system sans-serif font.
