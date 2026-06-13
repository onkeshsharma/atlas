# Atlas Bridge — Windows one-liner install script
# BP5: pairs, registers HKCU Run auto-start, and launches the daemon detached.
#
# Usage (run as current user — no admin required):
#   iex (iwr https://your-release-url/install.ps1 -UseBasicParsing).Content
#
# Or locally during development:
#   .\scripts\install\install.ps1 -AtlasUrl https://your-atlas-instance.com
#
# Idempotent: safe to re-run to upgrade the binary or re-pair.

[CmdletBinding()]
param(
    # Atlas URL (required if not already configured in ~/.atlas-bridge/config.json)
    [string]$AtlasUrl = $env:ATLAS_URL,

    # Release download URL for atlas-bridge.exe (override for dev/testing)
    [string]$DownloadUrl = "",

    # Install directory (default: %LOCALAPPDATA%\Atlas)
    [string]$InstallDir = (Join-Path $env:LOCALAPPDATA "Atlas"),

    # Skip the browser-based pair flow (useful for headless/testing)
    [switch]$SkipPair,

    # Skip launching the daemon after install (useful for testing the install
    # steps without actually spawning a daemon)
    [switch]$SkipLaunch
)

$ErrorActionPreference = "Stop"

$ExeName = "atlas-bridge.exe"
$ExePath  = Join-Path $InstallDir $ExeName
$Label    = "io.atlas.bridge"
$RegKey   = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"

Write-Host ""
Write-Host "Atlas Bridge — Windows Installer" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Download binary ────────────────────────────────────────────────────────
New-Item -ItemType Directory -Force $InstallDir | Out-Null

if ($DownloadUrl) {
    Write-Host "Downloading atlas-bridge.exe from $DownloadUrl ..." -ForegroundColor White
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $ExePath -UseBasicParsing
    Write-Host "  Downloaded to $ExePath" -ForegroundColor Green
} elseif (-not (Test-Path $ExePath)) {
    Write-Host "[warn] No binary at $ExePath and no -DownloadUrl provided." -ForegroundColor Yellow
    Write-Host "       Place atlas-bridge.exe at $ExePath and re-run, or pass -DownloadUrl." -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "Binary already present at $ExePath (re-run install — skipping download)" -ForegroundColor Green
}

# ── 2. Stop any running daemon (idempotent upgrade path) ──────────────────────
Write-Host ""
Write-Host "Stopping any existing daemon ..." -ForegroundColor White
try {
    & $ExePath stop 2>$null | Out-Null
    Start-Sleep -Milliseconds 800
    Write-Host "  Stopped." -ForegroundColor Green
} catch {
    Write-Host "  No daemon running (OK)." -ForegroundColor DarkGray
}

# ── 3. Register HKCU Run auto-start (with --detached so no console at login) ──
Write-Host ""
Write-Host "Registering auto-start at login ..." -ForegroundColor White
$RunValue = "`"$ExePath`" start --detached"
Set-ItemProperty -Path $RegKey -Name $Label -Value $RunValue -Type String
Write-Host "  Registered: $Label" -ForegroundColor Green
Write-Host "  Command: $RunValue" -ForegroundColor DarkGray

# ── 4. Pair with Atlas ────────────────────────────────────────────────────────
if (-not $SkipPair) {
    Write-Host ""
    Write-Host "Opening browser to pair with Atlas ..." -ForegroundColor White
    if ($AtlasUrl) {
        & $ExePath pair --url $AtlasUrl
    } else {
        & $ExePath pair
    }
    Write-Host "  Paired successfully." -ForegroundColor Green
}

# ── 5. Launch the daemon now (detached — no console window) ───────────────────
if (-not $SkipLaunch) {
    Write-Host ""
    Write-Host "Starting Bridge daemon (background) ..." -ForegroundColor White
    # Use Start-Process so the daemon is truly detached from this console.
    Start-Process -FilePath $ExePath -ArgumentList "start","--detached" `
        -WindowStyle Hidden -PassThru | Out-Null
    # Give it a moment to write its PID lock.
    Start-Sleep -Seconds 1

    # Verify it is up.
    $statusOut = & $ExePath status 2>&1
    Write-Host "  $statusOut" -ForegroundColor DarkGray

    if ($statusOut -match "running") {
        Write-Host "  Daemon is running." -ForegroundColor Green
    } else {
        Write-Host "  [warn] Daemon may not have started — check the log at $InstallDir\bridge.log" -ForegroundColor Yellow
    }
}

# ── Done ──────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "Atlas Bridge installed and connected!" -ForegroundColor Green
Write-Host ""
Write-Host "  Tray icon:  Look for the Atlas icon in your system tray (bottom-right taskbar)."
Write-Host "  Stop:       atlas-bridge stop"
Write-Host "  Status:     atlas-bridge status"
Write-Host "  Re-pair:    atlas-bridge pair"
Write-Host "  Uninstall:  Remove-ItemProperty -Path '$RegKey' -Name '$Label'"
Write-Host "              Then: atlas-bridge stop"
Write-Host ""
