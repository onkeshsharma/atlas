#!/usr/bin/env bash
# Atlas Bridge — macOS / Linux install script
#
# Usage (one-liner from your Atlas instance):
#   curl -fsSL https://<your-atlas>/install.sh | bash
#
# What this script does:
#   1. Detects your OS and architecture
#   2. Downloads the latest atlas-bridge binary from GitHub Releases
#   3. Installs it to ~/.local/bin/atlas-bridge (chmod +x)
#   4. Registers it as a login-item:
#        macOS  → ~/Library/LaunchAgents/io.atlas.bridge.plist + launchctl load
#        Linux  → ~/.config/systemd/user/io.atlas.bridge.service + systemctl --user enable+start
#   5. Runs `atlas-bridge pair --url $ATLAS_URL` so you can approve from the UI
#
# Note (macOS): macOS may show a Gatekeeper warning for the unsigned binary.
# Open System Settings → Privacy & Security → scroll to the 'Security' section
# → click 'Open Anyway'.
#
# This script is idempotent — re-running it upgrades the binary in place.
#
# Placeholders replaced at serve-time by the Atlas route handler:
#   ATLAS_ORIGIN       -> the Atlas app URL (e.g. https://atlas.example.com)
#   GITHUB_REPO_SLUG   -> the GitHub repo    (e.g. your-org/atlas-v2)

set -euo pipefail

ATLAS_URL='ATLAS_ORIGIN'
GITHUB_REPO='GITHUB_REPO_SLUG'
INSTALL_DIR="$HOME/.local/bin"
BINARY="$INSTALL_DIR/atlas-bridge"
LAUNCH_AGENT_PLIST="$HOME/Library/LaunchAgents/io.atlas.bridge.plist"
SYSTEMD_UNIT="$HOME/.config/systemd/user/io.atlas.bridge.service"

# ── 1. Detect OS and arch ─────────────────────────────────────────────────────
echo ""
echo "Atlas Bridge installer"
echo "  Atlas URL : $ATLAS_URL"
echo "  GitHub    : $GITHUB_REPO"

OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Darwin)
    case "$ARCH" in
      arm64)  ASSET_NAME="atlas-bridge-darwin-arm64" ;;
      x86_64) ASSET_NAME="atlas-bridge-darwin-x64"  ;;
      *)
        echo "Error: unsupported macOS architecture: $ARCH" >&2
        exit 1
        ;;
    esac
    ;;
  Linux)
    case "$ARCH" in
      x86_64)  ASSET_NAME="atlas-bridge-linux-x64"   ;;
      aarch64) ASSET_NAME="atlas-bridge-linux-arm64"  ;;
      *)
        echo "Error: unsupported Linux architecture: $ARCH" >&2
        exit 1
        ;;
    esac
    ;;
  *)
    echo "Error: unsupported OS: $OS (expected Darwin or Linux)" >&2
    exit 1
    ;;
esac

echo "  OS        : $OS"
echo "  Arch      : $ARCH -> asset: $ASSET_NAME"
echo ""

# ── 2. Resolve latest release download URL ───────────────────────────────────
echo "Step 1/4 — resolving latest release from GitHub..."

RELEASE_API="https://api.github.com/repos/$GITHUB_REPO/releases/latest"

if command -v curl &>/dev/null; then
  RELEASE_JSON="$(curl -fsSL -H 'User-Agent: Atlas-Bridge-Installer/1.0' "$RELEASE_API")"
else
  echo "Error: curl is required but not found." >&2
  exit 1
fi

# Parse the browser_download_url for our asset using grep/sed (no jq dependency).
DOWNLOAD_URL="$(echo "$RELEASE_JSON" \
  | grep -o '"browser_download_url": *"[^"]*'"$ASSET_NAME"'[^"]*"' \
  | head -1 \
  | sed 's/.*"browser_download_url": *"\([^"]*\)".*/\1/')"

if [ -z "$DOWNLOAD_URL" ]; then
  RELEASE_TAG="$(echo "$RELEASE_JSON" | grep -o '"tag_name": *"[^"]*"' | head -1 | sed 's/.*: *"\([^"]*\)".*/\1/')"
  echo "Error: no asset matching '$ASSET_NAME' found in release '$RELEASE_TAG'." >&2
  echo "  Check that the GitHub Actions release workflow has run for this tag." >&2
  exit 1
fi

echo "  Asset URL : $DOWNLOAD_URL"

# ── 3. Download and install binary ───────────────────────────────────────────
echo ""
echo "Step 2/4 — downloading binary..."

mkdir -p "$INSTALL_DIR"

TMP_BIN="$(mktemp)"
curl -fsSL -o "$TMP_BIN" "$DOWNLOAD_URL"
chmod +x "$TMP_BIN"

# If bridge is running, stop it before replacing the binary.
if [ -x "$BINARY" ]; then
  "$BINARY" stop 2>/dev/null || true
  sleep 0.3
fi

mv "$TMP_BIN" "$BINARY"
echo "  Installed : $BINARY"

# Ensure ~/.local/bin is in PATH for this session (in case it wasn't already).
export PATH="$INSTALL_DIR:$PATH"

# ── 4. Register as login item ─────────────────────────────────────────────────
echo ""
echo "Step 3/4 — registering login item..."

if [ "$OS" = "Darwin" ]; then
  # macOS — LaunchAgents plist
  mkdir -p "$(dirname "$LAUNCH_AGENT_PLIST")"

  # Unload any previous version before rewriting the plist.
  if [ -f "$LAUNCH_AGENT_PLIST" ]; then
    launchctl unload "$LAUNCH_AGENT_PLIST" 2>/dev/null || true
  fi

  cat > "$LAUNCH_AGENT_PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>io.atlas.bridge</string>
  <key>ProgramArguments</key>
  <array>
    <string>$BINARY</string>
    <string>start</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <false/>
  <key>StandardOutPath</key>
  <string>$HOME/Library/Logs/atlas-bridge.log</string>
  <key>StandardErrorPath</key>
  <string>$HOME/Library/Logs/atlas-bridge-err.log</string>
</dict>
</plist>
PLIST

  launchctl load "$LAUNCH_AGENT_PLIST"
  echo "  LaunchAgent: $LAUNCH_AGENT_PLIST (loaded)"

else
  # Linux — systemd user unit
  mkdir -p "$(dirname "$SYSTEMD_UNIT")"

  cat > "$SYSTEMD_UNIT" <<UNIT
[Unit]
Description=Atlas Bridge daemon
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=$BINARY start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=default.target
UNIT

  systemctl --user daemon-reload
  systemctl --user enable io.atlas.bridge
  systemctl --user start  io.atlas.bridge
  echo "  systemd unit: $SYSTEMD_UNIT (enabled + started)"
fi

# ── 5. Pair with Atlas ────────────────────────────────────────────────────────
echo ""
echo "Step 4/4 — pairing with Atlas at $ATLAS_URL ..."
echo "  A browser window will open — approve the bridge from the Atlas UI."

if ! atlas-bridge pair --url "$ATLAS_URL"; then
  echo "" >&2
  echo "Error: pairing failed. You can retry manually:" >&2
  echo "  atlas-bridge pair --url $ATLAS_URL" >&2
  exit 1
fi

# ── 6. Start the daemon now (detached) so install ends CONNECTED ──
echo ""
echo "Step 5/5 — starting the bridge in the background..."
if "$BINARY" start --detached; then
  sleep 3
  "$BINARY" status || true
else
  echo "  Could not auto-start — run it yourself: $BINARY start" >&2
fi

echo ""
echo "Atlas Bridge installed and connected."
echo "  Binary       : $BINARY"
echo "  Running      : in the background — a tray/menu-bar icon appears"
echo "  Auto-start   : registered (relaunches at every login)"
echo "  To stop      : $BINARY stop"
echo "  To check     : $BINARY status"
