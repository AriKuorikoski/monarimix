-- monarimix_monitor.lua
--
-- Optional companion script for monarimix.html. Runs continuously in the
-- background and writes the project's current tempo into ExtState so the
-- web page can show live updates (REAPER's web-remote API has no command
-- to query tempo directly, so we go through ExtState as a side channel).
--
-- Time signature is NOT written by this script -- the page already gets
-- it live via the BEATPOS polling reply.
--
-- Install:
--   1. In REAPER, open the Action List (Shift+/ or Actions menu).
--   2. Click "New action..." -> "Load ReaScript..." and pick this file.
--   3. Run the action once to start the monitor loop.
--
-- To stop: re-run the action (acts as a toggle), or just exit REAPER.
--
-- To start automatically on REAPER launch, add this line to your
-- __startup.lua in REAPER's resource folder:
--   reaper.Main_OnCommand(reaper.NamedCommandLookup("_RS..."), 0)
-- (replacing _RS... with this script's command ID from the Action List).

-- ---------- Single-instance guard ----------
-- Use a non-persistent ExtState slot as a "monitor running" flag. If it
-- already says "1", a previous invocation is already looping -- we treat
-- a second invocation as a "stop" request.
local FLAG_SECTION = "MoreMe"
local FLAG_KEY     = "monitor_active"

if reaper.GetExtState(FLAG_SECTION, FLAG_KEY) == "1" then
    -- Already running. Toggle off.
    reaper.SetExtState(FLAG_SECTION, FLAG_KEY, "0", false)
    return
end

reaper.SetExtState(FLAG_SECTION, FLAG_KEY, "1", false)

-- ---------- Loop ----------
-- Write tempo whenever it changes, plus once on startup so the web page
-- has a value to show even if tempo hasn't moved in a while.
local last_tempo = nil

local function tick()
    -- Honour the toggle-off signal.
    if reaper.GetExtState(FLAG_SECTION, FLAG_KEY) ~= "1" then
        reaper.DeleteExtState(FLAG_SECTION, "current_tempo", false)
        return
    end

    local tempo = reaper.Master_GetTempo()
    if not last_tempo or math.abs(tempo - last_tempo) > 0.001 then
        reaper.SetExtState(FLAG_SECTION, "current_tempo",
                           string.format("%.2f", tempo), false)
        last_tempo = tempo
    end

    reaper.defer(tick)
end

-- Make sure the flag clears if REAPER closes or the script is removed
-- mid-loop, so a subsequent start doesn't immediately self-terminate.
reaper.atexit(function()
    reaper.SetExtState(FLAG_SECTION, FLAG_KEY, "0", false)
end)

tick()
