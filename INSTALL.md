# MoreMe 2 — Install Guide

This bundle adds a phone/tablet/laptop-friendly personal-monitor mixer to REAPER, plus a small Project Settings panel for live tempo and time-signature changes.

It runs on REAPER's built-in web server. No additional software, no external services. After install, performers open a URL on their device and dial in their own monitor mix without bothering the engineer.

## What's in this bundle

| File | What it is | Where it goes |
|---|---|---|
| `monarimix.html` | The web page itself | REAPER's `reaper_www_root` folder |
| `monarimix.md` | Feature documentation | Same folder as the HTML (optional but tidy) |
| `monarimix_set_timesig.lua` | Companion ReaScript for time-signature changes | REAPER's `Scripts` folder (or anywhere REAPER can read) |
| `monarimix_monitor.lua` | **Optional** — background script that pushes live tempo updates to the page | REAPER's `Scripts` folder |
| `INSTALL.md` | This file | Anywhere — for your reference |

The `main.js` helper required by the page already ships with REAPER. You don't need to copy it.

## Prerequisites

- REAPER 6.0 or newer (any platform).
- All performers' devices must be able to reach the machine running REAPER over the network — same LAN, same Wi-Fi, etc.

## Step 1 — Find your REAPER resource folder

In REAPER, choose **Options → Show REAPER resource path in explorer/finder**. A file browser opens at your personal REAPER folder. Typical paths:

- **Windows**: `C:\Users\<you>\AppData\Roaming\REAPER\`
- **macOS**: `~/Library/Application Support/REAPER/`
- **Linux**: `~/.config/REAPER/`

Inside that folder you'll see (or create) two sub-folders that matter:

- `reaper_www_root/` — files served by REAPER's web server. The user version of this folder **overrides** the install-default copy, so you never need admin rights or to touch `Program Files`.
- `Scripts/` — where ReaScripts live (you can technically load scripts from anywhere, but this is the conventional spot).

## Step 2 — Copy the files

Drop the files into place:

- `monarimix.html` → `<resource-folder>/reaper_www_root/`
- `monarimix.md` → `<resource-folder>/reaper_www_root/` (optional)
- `monarimix_set_timesig.lua` → `<resource-folder>/Scripts/`

If `reaper_www_root/` doesn't exist yet, create it.

## Step 3 — Enable REAPER's web server

In REAPER, open **Preferences → Control/OSC/web** and click **Add**, then **Web browser interface**:

- Give it a name (e.g. *MoreMe 2*).
- Note the **port** number REAPER picks (default is usually `8080`).
- Note the **URL** REAPER displays — that's what performers will open.
- Leave default user/password fields empty unless you want authentication on local network.

Click **OK**. The web server is now running.

## Step 4 — Register the ReaScript

This is the one-time step that lets the page change the project's time signature.

1. In REAPER, open the **Actions menu → Show action list** (shortcut: `?` or `Shift+/`).
2. Click **New action…** at the bottom-right, then **Load ReaScript…**.
3. Navigate to `<resource-folder>/Scripts/` and pick **`monarimix_set_timesig.lua`**.
4. The action now appears in the list as **Script: monarimix_set_timesig.lua**.
5. **Run it once** — double-click it, or highlight it and click **Run**.

The first run does nothing visible, but behind the scenes the script writes its own command ID into REAPER's `ExtState` storage so the web page can auto-discover it without you copy-pasting anything.

## Step 5 — Open the page

On any device on the same network, open a browser and go to:

```
http://<reaper-host>:<port>/monarimix.html
```

- `<reaper-host>` is the IP address or `.local` name of the computer running REAPER.
- `<port>` is the number you noted in Step 3.

You'll see the track-select dropdown. If you've configured at least one monitor track (see *Setup in REAPER* in `monarimix.md`), it appears in the dropdown alongside an **⚙ Project Settings** option at the bottom.

## Step 6 — Verify time-signature setting works

1. Pick **⚙ Project Settings** from the dropdown.
2. Look at the small status line under the time-signature inputs. It should say **✓ Script configured** (with the script's ID truncated for display).
3. Change the numerator or denominator. REAPER's project time signature should update within a poll cycle (~100 ms).

If the status still says **⚠ Setup required**, the page hasn't picked up the script's ID yet. Re-run the script once from REAPER's Action List, then refresh the web page.

## Step 7 (optional) — Live tempo readback

By default the page can *set* the tempo but can't *read* it back live — REAPER's web-remote API gives us no way to query current BPM. The page just shows the last value the user typed.

If you want the tempo field to reflect tempo changes made *inside REAPER* (e.g. dragging a tempo envelope, or another performer changing tempo), install the optional monitor script:

1. In REAPER's Action List, click **New action… → Load ReaScript…** and pick **`monarimix_monitor.lua`** from the same place you put the timesig script.
2. Run it once to start the background loop. The action toggles — running it again stops the loop.
3. (Recommended) Add it to REAPER's startup so it's always running:
   - In REAPER's Action List, locate **Script: monarimix_monitor.lua**, right-click it → **Copy selected action command ID**.
   - Open or create `__startup.lua` in REAPER's resource folder root.
   - Add this line (replace `_RS…` with the ID you copied):
     ```lua
     reaper.Main_OnCommand(reaper.NamedCommandLookup("_RS..."), 0)
     ```

With the monitor running, the tempo field in the Project Settings panel updates within ~250 ms of any tempo change. Without it, the tempo display only reflects what was last typed into the page.

The monitor script doesn't do anything else — no time-signature reads (that's already live via `BEATPOS` polling), no transport tracking. Adding more parameters here is straightforward if you ever need them.

## Troubleshooting

**The page loads but nothing populates the track dropdown.**
You haven't created monitor tracks yet, or no track has both at least one receive *and* a hardware send. See *Setup in REAPER* in `more_me_2.md`.

**Tempo changes don't reach REAPER.**
Hard-reload the page (`Ctrl+Shift+R` on desktop; close-and-reopen the tab on mobile) in case the browser is serving a cached older version.

**The tempo field doesn't update when I change tempo in REAPER directly.**
That's expected unless you installed and started `monarimix_monitor.lua` (Step 7). The page can only send tempo, not read it, without the monitor running.

**Time signature still won't change after running the script.**
Open the Project Settings panel, expand *Time-sig setup & help*, and use the fallback: right-click the script in REAPER's Action List → *Copy selected action command ID* → paste the resulting `_RS…` string into the field at the bottom of the setup section.

**Performers can reach the page but their monitor track isn't in the dropdown.**
A track only appears as a "monitor track" if it has receives *and* a hardware send. Check that you didn't disable the wrong thing.

**The page works on phone but layout looks wrong on a tablet (or vice versa).**
The layout auto-flips on viewport orientation. Use the toggle button beside the dropdown to override — Auto → Vertical → Horizontal cycle. The choice persists per-device in `localStorage`.

## Updating later

To update to a newer version: replace `monarimix.html`, `monarimix_set_timesig.lua`, and (if installed) `monarimix_monitor.lua` with the new files. Hard-reload the page to flush the browser cache. ReaScript command IDs stay stable across updates as long as the file path doesn't change, so no re-registration needed.

## Uninstalling

Delete the three files. Optionally clear browser `localStorage` for the page's origin if you want to forget mode-toggle preferences and the last-set tempo value.
