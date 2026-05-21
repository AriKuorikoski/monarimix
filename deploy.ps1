# deploy.ps1
#
# Copies MoreMe 2 source files from this repo folder to the locations
# REAPER actually reads them from at runtime. Run after each edit.
#
# Usage (in PowerShell):
#   cd C:\Users\Ari\source\AKReapack
#   .\deploy.ps1
#
# Or right-click the file -> Run with PowerShell.
#
# Adjust the target paths at the top if your REAPER lives elsewhere or
# you want the .lua deployed to Scripts/ instead of reaper_www_root/.

$ErrorActionPreference = "Stop"

$src         = $PSScriptRoot
$reaperRoot  = Join-Path $env:APPDATA "REAPER"
$wwwRoot     = Join-Path $reaperRoot  "reaper_www_root"
$scriptsRoot = Join-Path $reaperRoot  "Scripts"

# Where to deploy the .lua. Scripts/ is REAPER's canonical location for
# ReaScripts. If you originally registered the action from a different
# path, you'll need to re-register it once from this new path. With
# auto-discovery in place, the page will pick up the new command ID on
# the next time you run the script from REAPER's Action List.
$luaTarget = $scriptsRoot

# --- Ensure target folders exist ----------------------------------------
New-Item -ItemType Directory -Force -Path $wwwRoot     | Out-Null
New-Item -ItemType Directory -Force -Path $scriptsRoot | Out-Null

# --- Copy files ---------------------------------------------------------
Copy-Item -Force -Path (Join-Path $src "monarimix\more_me_2.html")         -Destination $wwwRoot
Copy-Item -Force -Path (Join-Path $src "monarimix\more_me_2.md")           -Destination $wwwRoot
Copy-Item -Force -Path (Join-Path $src "monarimix\monarimix_set_timesig.lua") -Destination $luaTarget
Copy-Item -Force -Path (Join-Path $src "monarimix\monarimix_monitor.lua")     -Destination $luaTarget

Write-Host ""
Write-Host "Deployed:" -ForegroundColor Green
Write-Host "  $(Join-Path $wwwRoot 'more_me_2.html')"
Write-Host "  $(Join-Path $wwwRoot 'more_me_2.md')"
Write-Host "  $(Join-Path $luaTarget 'monarimix_set_timesig.lua')"
Write-Host "  $(Join-Path $luaTarget 'monarimix_monitor.lua')"
Write-Host ""
Write-Host "Note: INSTALL.md and index.xml are NOT deployed - they're"
Write-Host "distribution artifacts that belong only in the source repo."
