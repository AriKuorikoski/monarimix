# Project context — MoreMe 2

A handoff note. Read this first when picking up the project after a break or when starting a new Claude Code session. Most factual feature/install info lives in `more_me_2.md` and `INSTALL.md`; this file covers history, decisions, current state, and what's pending.

## What this is

A phone/tablet/laptop-friendly personal monitor mixer for REAPER, plus a small Project Settings sub-view for live tempo and time-signature changes. Performers open a URL, pick their monitor track, dial in their own send levels without bothering the FOH engineer.

It runs on REAPER's built-in web server (the "Web Browser Interface"). No external services, no Node, no build step. The page is plain HTML/CSS/JS with inline SVG. The two companion `.lua` scripts (one required, one optional) extend functionality beyond what REAPER's stock web-remote API exposes.

The page started life as a fork of `more_me.html`, the personal-monitor page Cockos ships with REAPER. We kept the original SVG templates, drag handlers, and polling/parsing logic; substantial new code was layered on top. See `.git_initial_commit_msg.txt` for the detailed list of what changed.

## File inventory

All paths are inside `C:\Users\Ari\source\moreme\`.

| File | Purpose | Runtime destination |
|---|---|---|
| `more_me_2.html` | The page itself. ~1200 lines. | `%APPDATA%\REAPER\reaper_www_root\` |
| `more_me_2.md` | Feature documentation for users. | Same folder as the HTML (optional). |
| `moreme_set_timesig.lua` | Required ReaScript. Applies time signature from project ExtState. Self-registers its command ID. | `%APPDATA%\REAPER\Scripts\` |
| `moreme_monitor.lua` | Optional ReaScript. Defer-loop that writes current tempo to ExtState so the page can show live tempo updates. | `%APPDATA%\REAPER\Scripts\` |
| `INSTALL.md` | End-user install guide. | Repo only — not deployed. |
| `index.xml` | ReaPack distribution manifest. Source URLs are `YOUR-USERNAME/YOUR-REPO` placeholders. | Hosting only — not deployed. |
| `deploy.ps1` | Copies the four runtime files into their REAPER folders. Run after each edit. | Repo only. |
| `CONTEXT.md` | This file. | Repo only. |
| `.git_initial_commit_msg.txt` | Prepared message for the (still-pending) initial git commit. | Repo only — delete after first commit. |

`main.js` (the REAPER web-remote helper that the page requires) is **not** included in the repo. It already ships with REAPER. REAPER's web server overlays the user's `reaper_www_root` over the install copy in `C:\Program Files\REAPER (x64)\Plugins\reaper_www_root\`, so `<script src="main.js">` resolves transparently to Cockos's stock file.

## Architecture cheatsheet

**Page ⇄ REAPER protocol:** the page uses Cockos's `wwr_*` helpers (in `main.js`) to long-poll REAPER. Commands are tab/semicolon-joined text — see `main.js` itself for the vocabulary. Replies come back via a wrapped `wwr_onreply` callback.

**Mixer rendering:** the original `wwr_onreply` (still intact, unchanged) parses `NTRACK`/`TRACK`/`SEND` lines into top-level arrays (`trackNameAr`, `receiveVolAr`, etc.), then renders the horizontal-pill layout into `.trackRow2` and `#receives`. A wrapper around `wwr_onreply` adds: BEATPOS parsing, EXTSTATE parsing, dropdown Settings option, vertical-mixer rendering. Both layouts are populated every cycle; CSS hides whichever isn't active. This is wasteful but harmless and keeps the original code untouched.

**Tempo:** set via the OSC bridge (`OSC/tempo/raw:<bpm>` — single slash, not double). Read live via the optional `moreme_monitor.lua` companion which writes `Master_GetTempo()` to `ExtState["MoreMe"]["current_tempo"]` on a defer loop. Page polls that slot every 250 ms while Project Settings is open.

**Time signature:** read live via `BEATPOS` polling (it includes `ts_numerator` and `ts_denominator`). Set via `moreme_set_timesig.lua` — the page writes desired num/den to project ExtState then triggers the script. The script also self-registers its own command ID into ExtState so the page can auto-discover it; manual paste remains as a fallback.

**Orientation switching:** CSS `@media (orientation: …)` queries drive auto mode. JS `body.force-vert` / `body.force-horiz` classes drive the manual override and beat the media queries on specificity. Mode preference persists in localStorage. URL hash (`#v` / `#h` / `#auto`) takes precedence over localStorage on load.

**Body class overlays:** `body.in-settings` hides the mixer and shows the Project Settings panel. Uses `!important` (only place in the file that does) because it has to win against both orientation media queries *and* the force-mode classes.

## Decisions made along the way

- **OSC syntax is single slash.** `OSC/tempo/raw:120`, not `OSC//tempo/raw:120`. The earlier double-slash attempt didn't work and was the source of one debugging round-trip.
- **Time signature requires a ReaScript.** No built-in OSC alias exists for it. Adding `TIMESIG_NUMERATOR` to `Default.ReaperOSC` doesn't help — the action descriptions in that file have to be REAPER-recognised, you can't invent your own.
- **Self-registration was added to remove copy-paste friction.** The script learns its own command ID via `reaper.get_action_context()` + `reaper.ReverseNamedCommandLookup()` and writes it to ExtState. Page picks it up automatically. Manual paste stays as a fallback for edge cases.
- **Source repo is separate from runtime.** Files live in `C:\Users\Ari\source\moreme\`. `deploy.ps1` copies them into REAPER's folders. The user's `reaper_www_root\old\` subfolder contains stale copies of the originals and should be deleted when convenient (URL paths like `/old/more_me_2.html` still resolve and would serve stale code).
- **Debug strip was removed.** Earlier we had a "last sent / last reply" panel inside Project Settings for diagnosing OSC issues. It served its purpose and was cleaned up.
- **Original Cockos code is left untouched.** We wrap `wwr_onreply` rather than modifying it. The stock `_results` element check on line ~427 is still there as a null-checked no-op. This keeps the licensing story simpler and makes future REAPER updates to `main.js` automatically beneficial.

## Pending decisions

- **License.** Will be either MIT (permissive, no obligations on downstream) or GPL-3 (copyleft). Need to add a `LICENSE` file and update `index.xml`'s metadata once chosen.
- **Folder/project name.** "moreme" is a placeholder. Candidates discussed: descriptive (`reaper-monitor-mixer`, `reaper-iem-mixer`, `more-me-2`), stage-flavored (`bandmix`, `stagemix`, `wedge`, `monitorbus`), punny (`moremix`, `inear-engineer`), acronym (`mm2`, `rmm`). Pick one before pushing to GitHub.
- **Initial git commit.** Still pending — bash sandbox couldn't init due to mount permissions. Hand off to Claude Code in VS Code; see the handoff steps below.

## Immediate next steps for Claude Code

1. **Clean up the broken `.git/` folder** left by the bash sandbox: `Remove-Item -Recurse -Force .git` in PowerShell.
2. **Initialise the repo:** `git init -b main`, set `user.name` and `user.email`.
3. **Commit:** `git add .` then `git commit -F .git_initial_commit_msg.txt`.
4. **Remove the message-handoff file:** `git rm .git_initial_commit_msg.txt && git commit -m "Remove temporary commit-message handoff"` (or git-ignore it).
5. **Verify** that `more_me_2.html` works: run `deploy.ps1`, hard-reload the page, pick Project Settings, change tempo and time signature, confirm REAPER updates.
6. **Test the realtime-tempo path** by running `moreme_monitor.lua` once from REAPER's Action List (toggles on), changing tempo *inside* REAPER, and watching the tempo field in the page update within ~250 ms.

## Loose ends to clean up eventually

- Decide license, add `LICENSE` file, update `index.xml`.
- Rename project folder if "moreme" isn't the final name.
- Delete `C:\Users\Ari\AppData\Roaming\REAPER\reaper_www_root\old\` — contains stale copies from before the source move.
- After moving `moreme_set_timesig.lua` to `Scripts/` via `deploy.ps1`, remove the stale copy still sitting in `reaper_www_root/`, and re-register the action in REAPER's Action List from the new path (auto-discovery will pick up the new command ID).
- Replace `YOUR-USERNAME/YOUR-REPO` placeholders in `index.xml` once a GitHub repo exists.
- Consider posting a thread on the REAPER forum mentioning the project and asking about derivative-work conventions, for extra peace of mind on licensing.

## Conversation history summary

This project was built across one extended conversation (Claude Sonnet, Cowork mode) where each step was driven by the user (Ari). Order of work, roughly:

1. Read and explained REAPER's stock `more_me.html` to understand how it works.
2. Copied to user `reaper_www_root` as `more_me_2.html` to avoid `Program Files` admin issues.
3. Added centered/responsive container; iterated on layout with the user.
4. Added vertical mixer-console mode for landscape orientation; iterated on the slider design, drag math, and styling.
5. Added the layout-mode toggle (Auto/Vertical/Horizontal) with URL hash + button + localStorage persistence.
6. Added the Project Settings panel: tempo via OSC, time signature via the OSC-then-ReaScript fallback path.
7. Diagnosed OSC failures: discovered single-slash syntax, then that REAPER has no built-in TIMESIG OSC alias.
8. Wrote `moreme_set_timesig.lua`; iterated on the install/setup UX; added self-registration via ExtState.
9. Discussed shipping/distribution: zip, GitHub, ReaPack. Wrote `INSTALL.md` and `index.xml`.
10. Moved source repo to `C:\Users\Ari\source\moreme\`. Wrote `deploy.ps1`.
11. Added live tempo readback via `moreme_monitor.lua`.
12. Removed debug instrumentation.
13. Discussed licensing — settled on "attribute and pick MIT or GPL-3 later", leaving stock code untouched.
14. (You are here) Preparing the initial git commit. Bash git failed due to mount permissions; handoff to Claude Code in VS Code.
