#!/usr/bin/env bash
# Atlas Bridge — macOS / Linux one-liner install script
# BP5: downloads, pairs, registers the login service, and launches detached.
#
# Usage:
#   curl -fsSL https://your-release-url/install.sh | bash
#   # or with flags:
#   bash install.sh --atlas-url https://your-atlas.com --download-url https://...
#
# Idempotent: safe to re-run to upgrade the binary or re-pair.
#
# On macOS: registers a launchd LaunchAgent (auto-start at login, runs headless).
# On Linux: registers a systemd --user unit (auto-start at login).

set -euo pipefail

ATLAS_URL="${ATLAS_URL:-}"
DOWNLOAD_URL="${DOWNLOAD_URL:-}"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.local/bin}"
LABEL="io.atlas.bridge"
BIN_NAME="atlas-bridge"
SKIP_PAIR="${SKIP_PAIR:-}"
SKIP_LAUNCH="${SKIP_LAUNCH:-}"

# Parse flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    --atlas-url)      ATLAS_URL="$2"; shift 2 ;;
    --download-url)   DOWNLOAD_URL="$2"; shift 2 ;;
    --install-dir)    INSTALL_DIR="$2"; shift 2 ;;
    --skip-pair)      SKIP_PAIR=1; shift ;;
    --skip-launch)    SKIP_LAUNCH=1; shift ;;
    *) echo "[warn] Unknown flag: $1" >&2; shift ;;
  esac
done

platform="$(uname -s)"
BIN_PATH="$INSTALL_DIR/$BIN_NAME"

echo ""
echo "Atlas Bridge — Installer"
echo "========================"
echo ""

# ── 1. Download binary ─────────────────────────────────────────────────────────
mkdir -p "$INSTALL_DIR"

if [[ -n "$DOWNLOAD_URL" ]]; then
  echo "Downloading atlas-bridge from $DOWNLOAD_URL ..."
  if command -v curl &>/dev/null; then
    curl -fsSL "$DOWNLOAD_URL" -o "$BIN_PATH"
  else
    wget -qO "$BIN_PATH" "$DOWNLOAD_URL"
  fi
  chmod +x "$BIN_PATH"
  echo "  Downloaded to $BIN_PATH"
elif [[ ! -f "$BIN_PATH" ]]; then
  echo "[error] No binary at $BIN_PATH and no --download-url provided." >&2
  echo "        Place atlas-bridge at $BIN_PATH and re-run, or pass --download-url." >&2
  exit 1
else
  echo "Binary already present at $BIN_PATH (re-run install — skipping download)"
fi

# ── 2. Stop any running daemon (idempotent upgrade path) ───────────────────────
echo ""
echo "Stopping any existing daemon ..."
"$BIN_PATH" stop 2>/dev/null || true
sleep 0.5
echo "  Done."

# ── 3. Register login service ──────────────────────────────────────────────────
echo ""
echo "Registering auto-start at login ..."

if [[ "$platform" == "Darwin" ]]; then
  # macOS: launchd LaunchAgent
  PLIST_DIR="$HOME/Library/LaunchAgents"
  PLIST_PATH="$PLIST_DIR/$LABEL.plist"
  mkdir -p "$PLIST_DIR"
  cat > "$PLIST_PATH" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$BIN_PATH</string>
    <string>start</string>
    <string>--foreground</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <false/>
  <key>StandardOutPath</key>
  <string>$HOME/.atlas-bridge/bridge.log</string>
  <key>StandardErrorPath</key>
  <string>$HOME/.atlas-bridge/bridge.log</string>
</dict>
</plist>
PLIST
  # Unload old plist silently (may not exist yet), then load fresh.
  launchctl unload "$PLIST_PATH" 2>/dev/null || true
  echo "  Registered launchd agent: $PLIST_PATH"

else
  # Linux: systemd --user unit
  UNIT_DIR="$HOME/.config/systemd/user"
  UNIT_PATH="$UNIT_DIR/$LABEL.service"
  mkdir -p "$UNIT_DIR"
  cat > "$UNIT_PATH" <<UNIT
[Unit]
Description=Atlas Bridge daemon
After=network.target

[Service]
ExecStart=$BIN_PATH start --foreground
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
UNIT
  systemctl --user daemon-reload
  systemctl --user enable "$LABEL.service" 2>/dev/null || true
  echo "  Registered systemd unit: $UNIT_PATH"
fi

# ── 4. Pair with Atlas ─────────────────────────────────────────────────────────
if [[ -z "$SKIP_PAIR" ]]; then
  echo ""
  echo "Opening browser to pair with Atlas ..."
  if [[ -n "$ATLAS_URL" ]]; then
    "$BIN_PATH" pair --url "$ATLAS_URL"
  else
    "$BIN_PATH" pair
  fi
  echo "  Paired successfully."
fi

# ── 5. Launch the daemon now ───────────────────────────────────────────────────
if [[ -z "$SKIP_LAUNCH" ]]; then
  echo ""
  echo "Starting Bridge daemon (background) ..."

  if [[ "$platform" == "Darwin" ]]; then
    # Load the launchd agent — this starts the daemon under launchd control.
    launchctl load "$PLIST_PATH" 2>/dev/null || true
  else
    # Start via systemd.
    systemctl --user start "$LABEL.service" 2>/dev/null || \
      nohup "$BIN_PATH" start --foreground \
        >> "$HOME/.atlas-bridge/bridge.log" 2>&1 &
  fi

  # Give the daemon a moment to start.
  sleep 1

  status_out=$("$BIN_PATH" status 2>&1 || true)
  echo "  $status_out"

  if echo "$status_out" | grep -q "running"; then
    echo "  Daemon is running."
  else
    echo "[warn] Daemon may not have started — check $HOME/.atlas-bridge/bridge.log"
  fi
fi

# ── Done ───────────────────────────────────────────────────────────────────────
echo ""
echo "Atlas Bridge installed and connected!"
echo ""
echo "  Tray icon:  Look for the Atlas icon in your menu bar."
echo "  Stop:       atlas-bridge stop"
echo "  Status:     atlas-bridge status"
echo "  Re-pair:    atlas-bridge pair"
if [[ "$platform" == "Darwin" ]]; then
  echo "  Uninstall:  launchctl unload ~/Library/LaunchAgents/$LABEL.plist"
  echo "              rm ~/Library/LaunchAgents/$LABEL.plist"
else
  echo "  Uninstall:  systemctl --user disable --now $LABEL.service"
  echo "              rm ~/.config/systemd/user/$LABEL.service"
fi
echo ""
