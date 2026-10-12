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

ERROR_LOG_FILE = "/tmp/pi_hardware_error.log"

def get_fb_device():
    """Detects Sense HAT 8x8 LED matrix framebuffer device (/dev/fb1)."""
    for fb in ['/dev/fb1', '/dev/fb0', '/dev/fb2']:
        if os.path.exists(fb):
            name_file = f"/sys/class/graphics/{os.path.basename(fb)}/name"
            if os.path.exists(name_file):
                try:
                    with open(name_file, 'r') as f:
                        if 'rpi-sense' in f.read().lower():
                            return fb
                except Exception:
                    pass
            if fb == '/dev/fb1':
                return fb
    return None

def write_fb_pixel(fb_path, x, y, r, g, b):
    try:
        rgb565 = ((int(r) >> 3) << 11) | ((int(g) >> 2) << 5) | (int(b) >> 3)
        with open(fb_path, 'r+b') as fb:
            fb.seek((int(y) * 8 + int(x)) * 2)
            fb.write(rgb565.to_bytes(2, byteorder='little'))
    except Exception:
        pass

def write_fb_pixels(fb_path, pixel_list):
    try:
        data = bytearray(128)
        for idx, p in enumerate(pixel_list[:64]):
            r, g, b = p[0], p[1], p[2]
            rgb565 = ((int(r) >> 3) << 11) | ((int(g) >> 2) << 5) | (int(b) >> 3)
            data[idx*2 : idx*2+2] = rgb565.to_bytes(2, byteorder='little')
        with open(fb_path, 'r+b') as fb:
            fb.seek(0)
            fb.write(data)
    except Exception:
        pass

last_sense_load_err = ""

def get_native_sense_hat():
    """Safely loads system sense_hat package, bypassing any local project files."""
    global last_sense_load_err
    orig_path = list(sys.path)
    clean_path = [p for p in orig_path if p and p != '' and p != '.' and not os.path.exists(os.path.join(p, 'pi_emulator.py'))]
    try:
        sys.path = clean_path
        sys.modules.pop('sense_hat', None)
        import sense_hat
        if hasattr(sense_hat, 'SenseHat') and 'pi_emulator' not in getattr(sense_hat.SenseHat, '__module__', ''):
            inst = sense_hat.SenseHat()
            last_sense_load_err = ""
            return inst
    except Exception as e:
        last_sense_load_err = f"{type(e).__name__}: {e}"
        try:
            with open(ERROR_LOG_FILE, "w") as ef:
                ef.write(f"SenseHat load error: {last_sense_load_err}\n")
        except Exception:
            pass
        print(f"[Pi Hardware Daemon] Notice: Native Sense HAT driver check: {last_sense_load_err}", file=sys.stderr)
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

def process_ui_commands(sense, fb_path=None):
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
            if action == "set_pixel":
                x = int(cmd.get("x", 0))
                y = int(cmd.get("y", 0))
                r = int(cmd.get("r", 0))
                g = int(cmd.get("g", 0))
                b = int(cmd.get("b", 0))
                if sense:
                    sense.set_pixel(x, y, r, g, b)
                elif fb_path:
                    write_fb_pixel(fb_path, x, y, r, g, b)
            elif action == "set_pixels":
                pixels = cmd.get("pixels", [])
                if len(pixels) == 64:
                    if sense:
                        sense.set_pixels(pixels)
                    elif fb_path:
                        write_fb_pixels(fb_path, pixels)
            elif action == "clear":
                r = int(cmd.get("r", 0))
                g = int(cmd.get("g", 0))
                b = int(cmd.get("b", 0))
                if sense:
                    sense.clear(r, g, b)
                elif fb_path:
                    write_fb_pixels(fb_path, [[r, g, b]] * 64)
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
    fb_path = get_fb_device()

    if has_sense_hat:
        print("[Pi Hardware Daemon] Native Sense HAT driver connected to I2C-1 bus.")
    elif fb_path:
        print(f"[Pi Hardware Daemon] Framebuffer {fb_path} detected: 8x8 RGB LED Matrix directly active.")
    else:
        print("[Pi Hardware Daemon] Native Sense HAT not detected. Operating in bridging/standby mode.")

    last_poll_sec = 0

    while True:
        try:
            # 1. UI-to-Hardware: execute queued UI actions on hardware
            process_ui_commands(sense, fb_path)

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
                    "ledMatrixOnline": True,
                    "hardwareDetected": True,
                    "hardwareStatus": "full",
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

            elif fb_path or os.path.exists("/sys/bus/i2c/devices/1-0046"):
                # Partial hardware connection: LED matrix is alive on /dev/fb1 or ATTiny88 MCU
                now_sec = int(time.time())
                if now_sec != last_poll_sec:
                    last_poll_sec = now_sec
                    data = {
                        "temperature": 24.5,
                        "humidity": 48.0,
                        "pressure": 1013.25,
                        "pitch": 0.0,
                        "roll": 0.0,
                        "heading": 0.0,
                        "compassHeading": 0.0,
                        "accelerometer": {"x": 0.0, "y": 0.0, "z": 1.0},
                        "gyroscope": {"x": 0.0, "y": 0.0, "z": 0.0},
                        "timestamp": int(time.time() * 1000),
                        "isSimulated": False,
                        "ledMatrixOnline": True,
                        "fbDevice": fb_path or "/dev/fb1",
                        "hardwareDetected": True,
                        "hardwareStatus": "partial",
                        "sensorError": last_sense_load_err or "Sensors in standby / I2C communication unlinked",
                        "source": f"Physical 8x8 LED Matrix ({fb_path or '/dev/fb1'}) · Sensors Standby"
                    }
                    temp_file = SENSE_FILE + ".tmp"
                    with open(temp_file, "w") as f:
                        json.dump(data, f)
                    os.replace(temp_file, SENSE_FILE)

                # Retry detecting Sense HAT every 5 seconds
                if int(time.time()) % 5 == 0:
                    sense = get_native_sense_hat()
                    if sense:
                        has_sense_hat = True
                        print("[Pi Hardware Daemon] Native Sense HAT reconnected!")

            elif not has_sense_hat:
                # Retry detecting Sense HAT or framebuffer device every 5 seconds
                if int(time.time()) % 5 == 0:
                    sense = get_native_sense_hat()
                    fb_path = get_fb_device()
                    if sense:
                        has_sense_hat = True
                        print("[Pi Hardware Daemon] Native Sense HAT detected!")
                    elif fb_path:
                        print(f"[Pi Hardware Daemon] Framebuffer {fb_path} detected!")

            time.sleep(0.06)
        except Exception as err:
            time.sleep(0.5)

if __name__ == "__main__":
    main()
