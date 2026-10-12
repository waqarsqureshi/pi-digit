#!/usr/bin/env python3
"""
Raspberry Pi Physical Hardware Daemon (Bidirectional Sync Service)
Responsible for:
1. Hardware-to-UI Synchronization:
   - Polls physical Sense HAT environmental & IMU sensors (HTS221 / LPS25H / LSM9DS1)
   - Captures physical 5-way joystick hardware events
   - Reads physical GPIO pin states
   - Publishes authoritative hardware readings to /tmp/pi_sense_hardware.json
2. UI-to-Hardware Synchronization (Remote Control Panel Mode):
   - Consumes commands from /tmp/pi_hw_commands.jsonl:
     - LED Matrix pixel clicks & patterns -> updates physical Sense HAT LED matrix
     - GPIO toggles from Web UI -> updates physical Raspberry Pi GPIO pins (via pinctrl/sysfs)
     - Joystick injection -> processes joystick inputs
"""
import time
import json
import os
import sys
import subprocess

CMD_FILE = "/tmp/pi_hw_commands.jsonl"
SENSE_FILE = "/tmp/pi_sense_hardware.json"
GPIO_FILE = "/tmp/pi_gpio_hardware.json"

def get_native_sense_hat():
    """Safely loads system sense_hat package, bypassing any local project files."""
    orig_path = list(sys.path)
    clean_path = [p for p in orig_path if p and p != '' and p != '.' and not os.path.exists(os.path.join(p, 'pi_emulator.py'))]
    try:
        sys.path = clean_path
        sys.modules.pop('sense_hat', None)
        import sense_hat
        if hasattr(sense_hat, 'SenseHat') and 'pi_emulator' not in getattr(sense_hat.SenseHat, '__module__', ''):
            return sense_hat.SenseHat()
    except Exception as e:
        pass
    finally:
        sys.path = orig_path
    return None

def get_pwm_alt(channel):
    """Returns correct alternate function for Raspberry Pi hardware PWM."""
    return "a5" if int(channel) in (18, 19) else "a0"

def apply_hardware_pwm(channel, duty, freq, active):
    """
    Directly drives physical Hardware PWM on Raspberry Pi 4 (GPIO 18 / PWM0 · Pin 12).
    Uses Linux kernel sysfs /sys/class/pwm/pwmchip0 and pin muxing via pinctrl (Alt5 for GPIO 18).
    """
    try:
        channel_num = int(channel)
        alt = get_pwm_alt(channel_num)
        if active:
            subprocess.run(f"pinctrl set {channel_num} {alt} 2>/dev/null || raspi-gpio set {channel_num} {alt} 2>/dev/null", shell=True)
        else:
            subprocess.run(f"pinctrl set {channel_num} op dl 2>/dev/null || raspi-gpio set {channel_num} op dl 2>/dev/null", shell=True)

        pwm_chip = "/sys/class/pwm/pwmchip0"
        pwm_sub = "pwm1" if channel_num in (13, 19) else "pwm0"
        pwm_id = "1" if channel_num in (13, 19) else "0"
        pwm_path = f"{pwm_chip}/{pwm_sub}"

        if os.path.exists(pwm_chip):
            if not os.path.exists(pwm_path):
                try:
                    with open(f"{pwm_chip}/export", "w") as f:
                        f.write(f"{pwm_id}\n")
                except Exception:
                    pass
            if os.path.exists(pwm_path) and freq > 0:
                period_ns = int(1_000_000_000 / freq)
                duty_ns = int(period_ns * (max(0.0, min(100.0, duty)) / 100.0))
                try:
                    with open(f"{pwm_path}/duty_cycle", "w") as f:
                        f.write("0\n")
                except Exception:
                    pass
                try:
                    with open(f"{pwm_path}/period", "w") as f:
                        f.write(f"{period_ns}\n")
                    with open(f"{pwm_path}/duty_cycle", "w") as f:
                        f.write(f"{duty_ns}\n")
                    with open(f"{pwm_path}/enable", "w") as f:
                        f.write("1\n" if active else "0\n")
                except Exception:
                    pass
    except Exception as e:
        print(f"[Pi Daemon] Error applying hardware PWM: {e}", file=sys.stderr)

def process_ui_commands(sense):
    """Processes commands sent from the Web UI / Emulator to the physical hardware."""
    if not os.path.exists(CMD_FILE):
        return

    commands = []
    try:
        with open(CMD_FILE, "r") as f:
            lines = f.readlines()
        with open(CMD_FILE, "w") as f:
            f.truncate(0)

        for line in lines:
            line = line.strip()
            if line:
                try:
                    commands.append(json.loads(line))
                except Exception:
                    pass
    except Exception:
        return

    for cmd in commands:
        action = cmd.get("action")
        try:
            if action == "set_pixel" and sense:
                x = int(cmd.get("x", 0))
                y = int(cmd.get("y", 0))
                r = int(cmd.get("r", 0))
                g = int(cmd.get("g", 0))
                b = int(cmd.get("b", 0))
                sense.set_pixel(x, y, r, g, b)
            elif action == "set_pixels" and sense:
                pixels = cmd.get("pixels", [])
                if len(pixels) == 64:
                    sense.set_pixels(pixels)
            elif action == "clear" and sense:
                r = int(cmd.get("r", 0))
                g = int(cmd.get("g", 0))
                b = int(cmd.get("b", 0))
                sense.clear(r, g, b)
            elif action == "gpio_output":
                bcm = cmd.get("bcm")
                val = 1 if cmd.get("value") else 0
                val_flag = "dh" if val == 1 else "dl"
                if bcm is not None:
                    subprocess.run(
                        f"pinctrl set {bcm} op {val_flag} 2>/dev/null || raspi-gpio set {bcm} op {val_flag} 2>/dev/null",
                        shell=True
                    )
            elif action == "pwm":
                channel = int(cmd.get("channel", 18))
                duty = float(cmd.get("duty", 50.0))
                freq = float(cmd.get("freq", 1000.0))
                active = bool(cmd.get("active", True))
                apply_hardware_pwm(channel, duty, freq, active)
            elif action == "joystick":
                direction = cmd.get("direction", "centre")
                joy_action = cmd.get("action_type", "press")
                if os.path.exists(SENSE_FILE):
                    try:
                        with open(SENSE_FILE, "r") as f:
                            cur_data = json.load(f)
                        cur_data["lastJoystick"] = {
                            "direction": direction,
                            "action": joy_action,
                            "timestamp": int(time.time() * 1000),
                            "source": "Web UI Keypad (Injected to Hardware)"
                        }
                        temp_file = SENSE_FILE + ".tmp"
                        with open(temp_file, "w") as f:
                            json.dump(cur_data, f)
                        os.replace(temp_file, SENSE_FILE)
                    except Exception:
                        pass
        except Exception as e:
            print(f"[Pi Daemon] Error executing hardware command {action}: {e}", file=sys.stderr)

def main():
    print("[Pi Hardware Daemon] Starting Bidirectional Sync Service (Hardware <-> Web UI)...")
    sense = get_native_sense_hat()
    has_sense_hat = sense is not None

    if has_sense_hat:
        print("[Pi Hardware Daemon] Native Sense HAT driver connected to I2C-1 bus.")
    else:
        print("[Pi Hardware Daemon] Native Sense HAT not detected. Operating in bridging/standby mode.")

    while True:
        try:
            # 1. UI-to-Hardware: execute queued UI actions on hardware
            process_ui_commands(sense)

            # 2. Hardware-to-UI: read live physical telemetry
            if has_sense_hat and sense:
                t = round(sense.get_temperature(), 2)
                h = round(sense.get_humidity(), 1)
                p = round(sense.get_pressure(), 2)
                orient = sense.get_orientation()
                accel = sense.get_accelerometer_raw()
                gyro = sense.get_gyroscope_raw()
                heading = round(orient.get("yaw", 0.0), 1)

                data = {
                    "temperature": t,
                    "humidity": h,
                    "pressure": p,
                    "pitch": round(orient.get("pitch", 0.0), 2),
                    "roll": round(orient.get("roll", 0.0), 2),
                    "heading": heading,
                    "compassHeading": heading,
                    "accelerometer": {
                        "x": round(accel.get("x", 0.0), 3),
                        "y": round(accel.get("y", 0.0), 3),
                        "z": round(accel.get("z", 0.0), 3)
                    },
                    "gyroscope": {
                        "x": round(gyro.get("x", 0.0), 2),
                        "y": round(gyro.get("y", 0.0), 2),
                        "z": round(gyro.get("z", 0.0), 2)
                    },
                    "timestamp": int(time.time() * 1000),
                    "isSimulated": False,
                    "source": "Physical Sense HAT (HTS221 / LPS25H / LSM9DS1)"
                }

                # Physical joystick event polling
                try:
                    events = sense.stick.get_events()
                    if events:
                        last_ev = events[-1]
                        data["lastJoystick"] = {
                            "direction": last_ev.direction,
                            "action": last_ev.action,
                            "timestamp": int(time.time() * 1000)
                        }
                except Exception:
                    pass

                # Atomic write to /tmp/pi_sense_hardware.json
                temp_file = SENSE_FILE + ".tmp"
                with open(temp_file, "w") as f:
                    json.dump(data, f)
                os.replace(temp_file, SENSE_FILE)

            elif not has_sense_hat:
                # Retry detecting Sense HAT every few seconds if it was attached after boot
                if int(time.time()) % 5 == 0:
                    sense = get_native_sense_hat()
                    if sense:
                        has_sense_hat = True
                        print("[Pi Hardware Daemon] Native Sense HAT reconnected!")

            time.sleep(0.06)
        except Exception as err:
            time.sleep(0.5)

if __name__ == "__main__":
    main()
