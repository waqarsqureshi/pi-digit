# Run Code in Pi-Digit Code Studio

This guide shows how to run Python or C code in the Pi-Digit workspace.

## 1) Open the interactive workspace

1. Start the server on Raspberry Pi:
   - `cd ~/pi-digit`
   - `npm start`
2. Open the browser:
   - `http://raspberrypi.local:3000/emulator/`
   - or `http://<pi-ip>:3000/emulator/`

## 2) Choose an example or write your own

1. In **Code Studio**, open the example selector.
2. Pick a Python (`.py`) or C (`.c`) template.
3. Edit the filename and code as needed.

## 3) Run and stop programs

1. Click **Run Script**.
2. Watch the **Output** tab for:
   - stdout logs
   - stderr errors
   - exit status
3. If needed, click **Stop** to terminate execution.

## 4) Use the built-in terminal tab

Switch to the terminal tab to run shell commands such as:

- `diagnose`
- `status`
- `blink-test`
- `i2c-check`

These are useful for checking live board/device status before running code.

## 5) Typical troubleshooting

- If Python scripts fail on Pi:
  - install required packages (`python3-sense-hat`, `python3-smbus`, `python3-rpi.gpio`)
- If hardware is not detected:
  - run `diagnose`
  - verify `dtoverlay=rpi-sense`
  - reboot after enabling I2C

## 6) Cloud-hosted frontend note

If deployed in cloud mode with Python disabled, UI and simulation still work, but Python-backed runtime actions are unavailable. Use a Raspberry Pi deployment for full hardware execution.
