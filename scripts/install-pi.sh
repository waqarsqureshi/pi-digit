#!/usr/bin/env bash
# ==============================================================================
# Pi-Digit / Pi-Local Digital Twin - Turnkey Installer for Raspberry Pi 4 / 3 / 5
# ==============================================================================

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "  ____  _       ____  _       _ _        _   "
echo " |  _ \(_)     |  _ \(_)     (_) |      | |  "
echo " | |_) |_ _____| | | |_  __ _ _| |_ __ _| |  "
echo " |  __/| |_____| |_| | |/ _\` | | __/ _\` | |  "
echo " | |   | |     | |/ /| | (_| | | || (_| |_|  "
echo " |_|   |_|     |___/ |_|\__, |_|\__\__,_(_)  "
echo "                         |___/               "
echo -e "${NC}"
echo -e "${GREEN}==> Installing Pi-Local Digital Twin on Raspberry Pi...${NC}"

# Check for root / sudo
if [ "$EUID" -ne 0 ]; then
  echo -e "${YELLOW}[!] Warning: Some operations (apt, systemd, raspi-config) require sudo.${NC}"
  SUDO="sudo"
else
  SUDO=""
fi

# 1. Update and install prerequisite packages
echo -e "\n${CYAN}[1/5] Updating system packages & installing hardware dependencies...${NC}"
$SUDO apt-get update -y
$SUDO apt-get install -y \
  curl \
  wget \
  git \
  gcc \
  build-essential \
  python3 \
  python3-pip \
  python3-dev \
  i2c-tools

# Attempt installing Raspberry Pi specific hardware libraries if available
echo -e "${CYAN}[*] Installing Sense HAT and GPIO libraries...${NC}"
$SUDO apt-get install -y sense-hat python3-sense-hat python3-rpi.gpio || {
  echo -e "${YELLOW}[*] Pi-specific packages not in repo, attempting pip installation...${NC}"
  pip3 install --break-system-packages sense-hat RPi.GPIO || true
}

# 2. Check Node.js and npm (require Node 18+)
echo -e "\n${CYAN}[2/5] Checking Node.js runtime...${NC}"
if ! command -v node &> /dev/null || [ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 18 ]; then
  echo -e "${YELLOW}[*] Installing modern Node.js (v20 LTS)...${NC}"
  curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO -E bash -
  $SUDO apt-get install -y nodejs
fi

echo -e "${GREEN}[✓] Node.js version: $(node -v)${NC}"
echo -e "${GREEN}[✓] npm version: $(npm -v)${NC}"

# 3. Enable I2C interface on Raspberry Pi
echo -e "\n${CYAN}[3/5] Enabling I2C hardware bus for Sense HAT...${NC}"
if command -v raspi-config &> /dev/null; then
  $SUDO raspi-config nonint do_i2c 0
  echo -e "${GREEN}[✓] I2C bus enabled via raspi-config.${NC}"
else
  echo -e "${YELLOW}[i] raspi-config not found, ensure I2C is enabled in /boot/config.txt.${NC}"
fi

# 4. Install Node dependencies and build production assets
echo -e "\n${CYAN}[4/5] Installing app dependencies and building bundle...${NC}"
npm install
npm run build

# 5. Configure systemd service for auto-start
INSTALL_DIR=$(pwd)
CURRENT_USER=$(logname 2>/dev/null || echo $USER)

echo -e "\n${CYAN}[5/5] Setting up systemd auto-start service...${NC}"
SERVICE_FILE="/etc/systemd/system/pi-digit.service"

$SUDO bash -c "cat > $SERVICE_FILE" <<EOF
[Unit]
Description=Pi-Digit Raspberry Pi Digital Twin & Hardware Daemon
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$INSTALL_DIR
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=$(which npx) tsx server.ts
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

$SUDO systemctl daemon-reload
$SUDO systemctl enable pi-digit.service
$SUDO systemctl restart pi-digit.service

# Get IP address
PI_IP=$(hostname -I | awk '{print $1}')
[ -z "$PI_IP" ] && PI_IP="raspberrypi.local"

echo -e "\n${GREEN}======================================================================${NC}"
echo -e "${GREEN}  ✓ Pi-Digit Digital Twin Successfully Installed and Running!        ${NC}"
echo -e "${GREEN}======================================================================${NC}"
echo -e "Access the web studio and twin dashboard from any device on your LAN:"
echo -e "  ➜ Local Pi:     ${CYAN}http://localhost:3000${NC}"
echo -e "  ➜ Network:      ${CYAN}http://${PI_IP}:3000${NC}"
echo -e "  ➜ mDNS:         ${CYAN}http://raspberrypi.local:3000${NC}"
echo ""
echo -e "Service Commands:"
echo -e "  • Check status: ${YELLOW}sudo systemctl status pi-digit${NC}"
echo -e "  • View logs:    ${YELLOW}sudo journalctl -u pi-digit -f${NC}"
echo -e "  • Restart:      ${YELLOW}sudo systemctl restart pi-digit${NC}"
echo ""
echo -e "Kiosk Mode (Optional for Pi HDMI touchscreens):"
echo -e "  ${YELLOW}chromium-browser --kiosk --incognito http://localhost:3000${NC}"
echo -e "${GREEN}======================================================================${NC}"
