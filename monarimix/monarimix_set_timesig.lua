-- monarimix_set_timesig.lua
--
-- Companion ReaScript for monarimix.html. Does two jobs:
--
--   1. Self-registers its own command ID into a persistent ExtState slot
--      so the web page can auto-discover it (no copy-pasting of "_RS..."
--      strings required).
--
--   2. Reads project extstate ("MoreMe" / "tsig_num" + "tsig_den") and
--      applies that pair as the project's initial time signature.
--
-- Install:
--   1. In REAPER, open the Action List (Shift+/ or Actions menu).
--   2. Click "New action..." -> "Load ReaScript..." and pick this file.
--   3. Run the action once from the Action List. This populates the
--      ExtState slot that the web page reads for auto-discovery.
--   4. Refresh the monarimix web page. Time-sig controls now work.
--
-- The script is also invoked automatically by the web page every time the
-- user changes the time signature from there.

-- ---------- 1. Self-register own command ID ----------
-- get_action_context() returns:
--   is_new_value, filename, sectionID, cmdID, mode, resolution, val
local _, _, _, cmdID = reaper.get_action_context()
if cmdID and cmdID ~= 0 then
    -- ReverseNamedCommandLookup returns the script's stable hex name
    -- WITHOUT the leading underscore. The web remote needs the "_" prefix
    -- to recognise it as a named (non-numeric) command.
    local named = reaper.ReverseNamedCommandLookup(cmdID)
    if named and named ~= "" then
        local full = "_" .. named
        local existing = reaper.GetExtState("MoreMe", "tsig_action_id")
        if existing ~= full then
            reaper.SetExtState("MoreMe", "tsig_action_id", full, true)
        end
    end
end

-- ---------- 2. Apply the time signature ----------
local proj = 0  -- current project

local _, num_str = reaper.GetProjExtState(proj, "MoreMe", "tsig_num")
local _, den_str = reaper.GetProjExtState(proj, "MoreMe", "tsig_den")
local num = tonumber(num_str)
local den = tonumber(den_str)

-- If no num/den is set yet (e.g. the user just ran the script manually
-- right after installing it for self-registration), we still want to exit
-- cleanly without changing anything.
if not num or not den or num < 1 or den < 1 then return end

reaper.Undo_BeginBlock()

-- Find an existing tempo/timesig marker at time 0, if there is one.
local marker_count = reaper.CountTempoTimeSigMarkers(proj)
local found_idx = -1
for i = 0, marker_count - 1 do
    local retval, timepos = reaper.GetTempoTimeSigMarker(proj, i)
    if retval and timepos == 0 then
        found_idx = i
        break
    end
end

-- Preserve current tempo when adding/modifying the marker.
local current_bpm = reaper.Master_GetTempo()

-- SetTempoTimeSigMarker(proj, ptidx, timepos, measurepos, beatpos,
--                       bpm, timesig_num, timesig_denom, lineartempo)
-- ptidx = -1 inserts a new marker; otherwise modifies the existing one.
reaper.SetTempoTimeSigMarker(proj, found_idx, 0, -1, -1,
                             current_bpm, num, den, false)

reaper.Undo_EndBlock("MoreMe: set time signature", -1)
reaper.UpdateTimeline()
