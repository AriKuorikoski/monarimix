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
local FLAG_SECTION = "monarimix"
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
        reaper.DeleteExtState(FLAG_SECTION, "open_projects", false)
        reaper.DeleteExtState(FLAG_SECTION, "current_project_idx", false)
        return
    end

    -- Handle project-switch request from web page.
    -- Clear the key BEFORE switching so the post-switch project context is clean.
    local cur_proj = reaper.EnumProjects(-1, "")
    local retval_sw, switch_to = reaper.GetProjExtState(cur_proj, "monarimix", "switch_to_project")
    if retval_sw == 1 and switch_to ~= "" then
        reaper.SetProjExtState(cur_proj, "monarimix", "switch_to_project", "")
        local idx = tonumber(switch_to)
        if idx then
            local target = reaper.EnumProjects(idx, "")
            if target then reaper.SelectProjectInstance(target) end
        end
    end

    -- Write list of open project names (pipe-delimited) and current project index.
    local names = {}
    local cur_idx = 0
    local i = 0
    cur_proj = reaper.EnumProjects(-1, "")
    while true do
        local proj, path = reaper.EnumProjects(i, 2048)
        if proj == nil then break end
        -- Derive display name from filename; fall back to index for unsaved projects.
        local pname = (path ~= "" and path:match("([^/\\]+)%.%a+$")) or ("project " .. (i + 1))
        table.insert(names, pname)
        if proj == cur_proj then cur_idx = i end
        i = i + 1
    end
    reaper.SetExtState(FLAG_SECTION, "open_projects", table.concat(names, "|"), false)
    reaper.SetExtState(FLAG_SECTION, "current_project_idx", tostring(cur_idx), false)

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
