# Monarimix — Personal Monitor Mixer for REAPER

A phone/tablet/laptop-friendly personal monitor mixer for [REAPER](https://www.reaper.fm/) (a digital audio workstation). Each performer opens a URL, selects their monitor track, and dials in their own mix of receives and pans—without needing to bother the FOH engineer.

## Features

- **Responsive design:** Automatically flips between horizontal sliders (portrait) and vertical channel strips (landscape). Pin a layout if you prefer.
- **Two mixer modes:**
  - **VOL:** Adjust send levels (default).
  - **PAN:** Adjust pan position for each send. Double-tap any strip to reset to center.
- **Live tempo & time signature:** Project Settings panel lets performers see and adjust the project's tempo and time signature in real time.
- **Mute control:** Mute individual receives without leaving the page.
- **No external services:** Runs on REAPER's built-in web server. No Node, no build step, no internet required.

## Quick Start

### 1. Install Files

Download the [latest release](https://github.com/AriKuorikoski/monarimix/releases) or clone this repo.

Copy these files to your REAPER resource folder:
- `monarimix.html` and `monarimix.md` → `%APPDATA%\REAPER\reaper_www_root\`
- `monarimix_set_timesig.lua` and `monarimix_monitor.lua` → `%APPDATA%\REAPER\Scripts\`

**Windows example:**
```
C:\Users\{YOU}\AppData\Roaming\REAPER\reaper_www_root\
C:\Users\{YOU}\AppData\Roaming\REAPER\Scripts\
```

Or use [ReaPack](https://reapack.com/): add this repository URL to your ReaPack manager (once published).

### 2. Set Up in REAPER

For each performer, create a **monitor track**:

1. Create a new track named for the performer (e.g., "MON - Drums").
2. Add **receives** from every source track the performer should hear.
3. Add a **hardware send** in send slot 1, routed to their headphones / in-ears.
4. **Disable Master Send** on the monitor track (prevents bleed into main output).

A track qualifies as a monitor track when it has **both** receives and a hardware send. Tracks without both are invisible to the page.

**Tip:** Build one prototype monitor track, duplicate it (`Ctrl+D`) per performer, then change only the hardware send destination and track name per duplicate.

### 3. Register the Time Signature Script

1. Open REAPER's Action List (Shift+/ or Actions menu).
2. Click "New action..." → "Load ReaScript..." and select `monarimix_set_timesig.lua`.
3. Run the action once to self-register it.
4. Open the Monarimix page in a browser. Time-sig controls now work.

### 4. Open the Page

Navigate to the URL shown in **REAPER Preferences → Control/OSC/web**:

```
http://localhost:8080/monarimix.html
```

(Adjust host/port for your network.)

On the same LAN from a phone/tablet:

```
http://<reaper-host>:8080/monarimix.html
```

## Using the App

### Select Your Monitor Track

The dropdown at the top lists all monitor tracks. Pick yours. The mixer populates below.

### Adjust Levels

- **Horizontal layout (portrait):** Drag pill-shaped sliders left/right.
- **Vertical layout (landscape):** Channel strips with vertical sliders, mixer-console style.

Both layouts use the same volume curve as REAPER's mixer faders (4th-power taper; 0 dB at ~71% of slider travel).

### Mute, Pan & Double-Tap

- **M button:** Mutes that receive.
- **VOL/PAN button (top right):** Cycles between volume and pan mode.
- **In pan mode, double-tap any strip:** Resets that strip's pan to center.

### Layout Modes

The circle-A button (top right) cycles through:

- **Auto:** Follow device orientation (flip on rotate).
- **Vertical:** Force channel strips (even on portrait phones).
- **Horizontal:** Force pill sliders (even on landscape phones).

Choice is saved in browser storage; URL hash (`#v`, `#h`, `#auto`) takes precedence on load.

### Project Settings

Tap the dropdown → **Project Settings** to see and adjust:
- **Tempo:** Live BPM display; set new tempo via text input.
- **Time Signature:** Live num/den display; set new signature via two text inputs.

### General Settings

Tap the dropdown → **General Settings** to change layout mode or see app version.

## Architecture & Development

See [CLAUDE.md](CLAUDE.md) for:
- Detailed architecture and design decisions
- Communication protocol (HTTP web-remote, OSC, ExtState)
- Code map and key functions
- How to deploy after editing

## License

To be determined (MIT or GPL-3). See [#future-work](#future-work).

## Technical Notes

- **No build step.** Plain HTML/CSS/JavaScript with inline SVG.
- **Forked from REAPER's stock `more_me.html`.** Original Cockos code is wrapped, not modified.
- **Requires `main.js`** from REAPER's install; automatically overlaid by REAPER's web server.
- **Tested on:** Chrome, Safari, Firefox (desktop & mobile).
- **Offline fallback:** Uses system sans-serif if Google Fonts cannot load.

## Future Work

- Choose and apply a license (MIT or GPL-3).
- Refresh `monarimix.md` feature documentation.
- Clean up stale copies of scripts in REAPER folders if they exist.

## Contributing

This is a personal project. Feel free to fork, modify, and distribute according to the license once chosen.

## Questions?

- **REAPER web-remote API:** See [ReaTeam/Doc](https://github.com/ReaTeam/Doc/blob/master/web_interface_modding.md) or [monarimix/main.js](monarimix/main.js) (reference copy in repo).
- **Issues or ideas:** Open an issue or discussion on GitHub.

---

**Made with ❤️ for live sound engineers and performers who want to mix their own monitors.**
