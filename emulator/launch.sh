#!/usr/bin/env bash
# ==============================================================================
# Raspberry Pi Digital Twin Emulator - Launch Script
# Starts the emulator daemon and optionally opens the browser on the Pi
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

echo "[Pi-Twin] Starting Digital Twin Emulator Daemon on port 3000..."

# Start background server
npm start &
SERVER_PID=$!

# Wait for server to become responsive
echo "[Pi-Twin] Waiting for daemon to initialize..."
for i in {1..20}; do
  if curl -s http://localhost:3000/api/hardware/status >/dev/null 2>&1; then
    echo "[Pi-Twin] Daemon ready!"
    break
  fi
  sleep 0.5
done

# If running with an X11 or Wayland display, open the browser
if [ -n "$DISPLAY" ] || [ -n "$WAYLAND_DISPLAY" ]; then
  if command -v chromium-browser >/dev/null 2>&1; then
    chromium-browser --app=http://localhost:3000/emulator/ &
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open http://localhost:3000/emulator/ &
  fi
fi

# Wait on server process
wait $SERVER_PID
