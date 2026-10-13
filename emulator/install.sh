#!/usr/bin/env bash
# ==============================================================================
# Raspberry Pi Digital Twin Emulator - Automated Installer
# Supported: Raspberry Pi OS (Debian 12 Bookworm & Debian 11 Bullseye, 64-bit/32-bit)
# ==============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}   Raspberry Pi Digital Twin Emulator - System Installer       ${NC}"
echo -e "${BLUE}================================================================${NC}"

# 1. Check if running on Linux
if [[ "$OSTYPE" != "linux"* ]]; then
  echo -e "${YELLOW}Warning: Non-Linux host detected ($OSTYPE). Continuing in simulation fallback mode.${NC}"
fi

# 2. Check for root or sudo
SUDO=""
if [ "$EUID" -ne 0 ]; then
  if command -v sudo >/dev/null 2>&1; then
    SUDO="sudo"
  else
    echo -e "${RED}Error: Root access or sudo required for hardware overlay configuration.${NC}"
    exit 1
  fi
fi

# 3. Update repositories and install required system packages
echo -e "\n${GREEN}[1/5] Installing core dependencies and hardware drivers...${NC}"
$SUDO apt-get update -y
$SUDO apt-get install -y --no-install-recommends \
  python3 \
  python3-pip \
  python3-dev \
  python3-setuptools \
  python3-sense-hat \
  python3-smbus \
  i2c-tools \
  gpiod \
  build-essential \
  curl \
  git

# 4. Check for Node.js (v18+)
echo -e "\n${GREEN}[2/5] Checking Node.js runtime environment...${NC}"
if ! command -v node >/dev/null 2>&1; then
  echo -e "${YELLOW}Node.js not found. Installing Node.js 20 LTS via NodeSource...${NC}"
  curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO -E bash -
  $SUDO apt-get install -y nodejs
else
  NODE_VER=$(node -v)
  echo -e "Found existing Node.js: ${NODE_VER}"
fi

# 5. Add user to hardware groups
echo -e "\n${GREEN}[3/5] Configuring user permissions for I2C, GPIO, Framebuffer, and Input...${NC}"
CURRENT_USER=${SUDO_USER:-$USER}
if [ -n "$CURRENT_USER" ] && [ "$CURRENT_USER" != "root" ]; then
  $SUDO usermod -a -G i2c,gpio,input,video "$CURRENT_USER" || true
  echo -e "User ${BLUE}${CURRENT_USER}${NC} added to groups: i2c, gpio, input, video"
fi

# 6. Enable I2C and Sense HAT kernel overlay in boot configuration
echo -e "\n${GREEN}[4/5] Checking Raspberry Pi device tree boot configuration...${NC}"
BOOT_CONFIG=""
if [ -f "/boot/firmware/config.txt" ]; then
  BOOT_CONFIG="/boot/firmware/config.txt"
elif [ -f "/boot/config.txt" ]; then
  BOOT_CONFIG="/boot/config.txt"
fi

REBOOT_REQUIRED=false
if [ -n "$BOOT_CONFIG" ]; then
  echo -e "Inspecting boot configuration: ${BOOT_CONFIG}"
  
  if ! grep -q "^dtparam=i2c_arm=on" "$BOOT_CONFIG"; then
    echo "dtparam=i2c_arm=on" | $SUDO tee -a "$BOOT_CONFIG" >/dev/null
    echo -e "  + Enabled I2C bus: dtparam=i2c_arm=on"
    REBOOT_REQUIRED=true
  fi

  if ! grep -q "^dtoverlay=rpi-sense" "$BOOT_CONFIG"; then
    echo "dtoverlay=rpi-sense" | $SUDO tee -a "$BOOT_CONFIG" >/dev/null
    echo -e "  + Enabled Sense HAT overlay: dtoverlay=rpi-sense"
    REBOOT_REQUIRED=true
  fi
else
  echo -e "${YELLOW}Boot config not found (running in container or non-Pi). Skipping overlay edit.${NC}"
fi

# 7. Install project dependencies and build
echo -e "\n${GREEN}[5/5] Installing project packages and compiling applet...${NC}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"
npm install --legacy-peer-deps

echo -e "\n${BLUE}================================================================${NC}"
echo -e "${GREEN}   Raspberry Pi Digital Twin Emulator Installed Successfully!   ${NC}"
echo -e "${BLUE}================================================================${NC}"

if [ "$REBOOT_REQUIRED" = true ]; then
  echo -e "\n${YELLOW}NOTICE: Kernel overlays were enabled. Please reboot your Pi:${NC}"
  echo -e "  sudo reboot"
else
  echo -e "\nTo start the emulator now, run:"
  echo -e "  ${GREEN}npm start${NC}"
  echo -e "\nThen open in your browser:"
  echo -e "  ${BLUE}http://localhost:3000/emulator/${NC}"
fi
echo -e "\nWiki and documentation available at:"
echo -e "  ${BLUE}http://localhost:3000/wiki.html${NC}\n"
