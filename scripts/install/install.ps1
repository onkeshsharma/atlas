# Atlas Bridge — Windows install script
#
# Usage (one-liner from your Atlas instance):
#   irm https://<your-atlas>/install.ps1 | iex
#
# What this script does:
#   1. Detects your architecture (x64 / arm64)
#   2. Downloads the latest atlas-bridge binary from GitHub Releases
#   3. Installs it to %LOCALAPPDATA%\Atlas\atlas-bridge.exe
#   4. Registers it as a login-item via the HKCU Run key
#   5. Runs `atlas-bridge pair --url <atlas>` so you can approve from the UI
#
# Note: Windows may show a SmartScreen warning. This is expected — the binary
# is not yet code-signed. Click 'More info' then 'Run anyway'.
#
# This script is idempotent — re-running it upgrades the binary in place.
#
# Placeholders replaced at serve-time by the Atlas route handler:
#   ATLAS_ORIGIN       -> the Atlas app URL (e.g. https://atlas.example.com)
#   GITHUB_REPO_SLUG   -> the GitHub repo    (e.g. your-org/atlas-v2)

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$atlasOrigin = 'ATLAS_ORIGIN'
$githubRepo  = 'GITHUB_REPO_SLUG'
$installDir  = Join-Path $env:LOCALAPPDATA 'Atlas'
$exePath     = Join-Path $installDir 'atlas-bridge.exe'
$runKeyName  = 'io.atlas.bridge'
$runKeyPath  = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'

# ── 1. Detect architecture ────────────────────────────────────────────────────
Write-Host "`nAtlas Bridge installer"
Write-Host "  Atlas URL : $atlasOrigin"
Write-Host "  GitHub    : $githubRepo"

$arch = $env:PROCESSOR_ARCHITECTURE
if ($arch -eq 'AMD64') {
    $assetSuffix = 'windows-x64.exe'
} elseif ($arch -eq 'ARM64') {
    $assetSuffix = 'windows-arm64.exe'
} else {
    Write-Error "Unsupported architecture: $arch. Expected AMD64 or ARM64."
    exit 1
}
Write-Host "  Arch      : $arch -> asset suffix: $assetSuffix`n"

# ── 2. Resolve latest release download URL ───────────────────────────────────
Write-Host "Step 1/4 — resolving latest release from GitHub..."
try {
    $releaseApiUrl = "https://api.github.com/repos/$githubRepo/releases/latest"
    $release = Invoke-RestMethod -Uri $releaseApiUrl -Headers @{ 'User-Agent' = 'Atlas-Bridge-Installer/1.0' }
    $asset = $release.assets | Where-Object { $_.name -like "*$assetSuffix" } | Select-Object -First 1
    if (-not $asset) {
        Write-Error "No asset matching '*$assetSuffix' found in the latest release (tag: $($release.tag_name)). Available assets: $($release.assets.name -join ', ')"
        exit 1
    }
    $downloadUrl = $asset.browser_download_url
    Write-Host "  Release   : $($release.tag_name)"
    Write-Host "  Asset     : $($asset.name)"
    Write-Host "  URL       : $downloadUrl"
} catch {
    Write-Error "Failed to fetch release info from GitHub: $_"
    exit 1
}

# ── 3. Download binary ────────────────────────────────────────────────────────
Write-Host "`nStep 2/4 — downloading binary..."
try {
    if (-not (Test-Path $installDir)) {
        New-Item -ItemType Directory -Path $installDir -Force | Out-Null
        Write-Host "  Created   : $installDir"
    }
    $tmpPath = "$exePath.tmp"
    Invoke-WebRequest -Uri $downloadUrl -OutFile $tmpPath -UseBasicParsing
    # Atomic-ish replace: move temp over final (works even if atlas-bridge.exe is
    # not currently running; if it is running, stop it first).
    if (Test-Path $exePath) {
        # Try to stop any running instance before replacing the binary.
        try {
            & $exePath stop 2>&1 | Out-Null
            Start-Sleep -Milliseconds 500
        } catch {
            # Not fatal — the binary may not be running.
        }
        Remove-Item $exePath -Force
    }
    Move-Item $tmpPath $exePath -Force
    Write-Host "  Installed : $exePath"
} catch {
    Write-Error "Failed to download or install binary: $_"
    exit 1
}

# ── 4. Register as login item ─────────────────────────────────────────────────
Write-Host "`nStep 3/4 — registering login item (HKCU Run key)..."
try {
    $startCmd = "`"$exePath`" start"
    Set-ItemProperty -Path $runKeyPath -Name $runKeyName -Value $startCmd -Type String
    Write-Host "  Registry  : $runKeyPath\$runKeyName = $startCmd"
} catch {
    Write-Error "Failed to write HKCU Run registry key: $_"
    exit 1
}

# ── 5. Pair with Atlas ────────────────────────────────────────────────────────
Write-Host "`nStep 4/4 — pairing with Atlas at $atlasOrigin ..."
Write-Host "  A browser window will open — approve the bridge from the Atlas UI."
try {
    & $exePath pair --url $atlasOrigin
} catch {
    Write-Error "Pairing failed: $_`n`nYou can retry manually: atlas-bridge pair --url $atlasOrigin"
    exit 1
}

# ── 6. Start the daemon now (detached/windowless) so install ends CONNECTED ──
Write-Host "`nStep 5/5 — starting the bridge in the background..."
try {
    & $exePath start --detached
    Start-Sleep -Seconds 3
    & $exePath status
} catch {
    Write-Host "  Could not auto-start — run it yourself: & `"$exePath`" start" -ForegroundColor Yellow
}

Write-Host "`nAtlas Bridge installed and connected."
Write-Host "  Binary    : $exePath"
Write-Host "  Running   : in the background (no window) — a tray icon appears near the clock"
Write-Host "  Auto-start: registered (relaunches at every login)"
Write-Host "  To stop   : & `"$exePath`" stop"
Write-Host "  To check  : & `"$exePath`" status"
