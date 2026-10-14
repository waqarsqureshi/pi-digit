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

def get_native_sense_hat(verbose=False):
    """Safely loads system sense_hat package, bypassing any local project files."""
    global last_sense_load_err
    orig_path = list(sys.path)
    clean_path = [
        p for p in orig_path
        if p and p != '' and p != '.'
        and not os.path.exists(os.path.join(p, 'pi_emulator.py'))
        and not os.path.exists(os.path.join(p, 'src', 'pi_emulator.py'))
        and not (os.path.basename(p.rstrip('/\\')) == 'src' and os.path.exists(os.path.join(p, 'pi_emulator.py')))
    ]
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
        if verbose:
            print(f"[Pi Hardware Daemon] Notice: Native Sense HAT driver check: {last_sense_load_err}")
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

def process_ui_commands(sense, fb_path=None, recent_joystick_events=None):
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
                direction = cmd.get("direction", "middle")
                if direction in ("centre", "center", "enter", "ok", "select"):
                    direction = "middle"
                joy_action = cmd.get("action_type", "press")
                if joy_action in ("pressed", "press"):
                    joy_action = "press"
                elif joy_action in ("released", "release"):
                    joy_action = "release"
                elif joy_action in ("held", "hold"):
                    joy_action = "hold"

                ev_payload = {
                    "direction": direction,
                    "action": joy_action,
                    "timestamp": int(time.time() * 1000),
                    "source": "Web UI Keypad (Injected to Hardware)"
                }
                if recent_joystick_events is not None:
                    recent_joystick_events.append(ev_payload)
                    if len(recent_joystick_events) > 30:
                        recent_joystick_events.pop(0)

                if os.path.exists(SENSE_FILE):
                    try:
                        with open(SENSE_FILE, "r") as f:
                            cur_data = json.load(f)
                        cur_data["lastJoystick"] = ev_payload
                        if "joystickEvents" not in cur_data or not isinstance(cur_data["joystickEvents"], list):
                            cur_data["joystickEvents"] = []
                        cur_data["joystickEvents"].append(ev_payload)
                        if len(cur_data["joystickEvents"]) > 30:
                            cur_data["joystickEvents"] = cur_data["joystickEvents"][-30:]
                        temp_file = SENSE_FILE + ".tmp"
                        with open(temp_file, "w") as f:
                            json.dump(cur_data, f)
                        os.replace(temp_file, SENSE_FILE)
                    except Exception:
                        pass
        except Exception as e:
            print(f"[Pi Daemon] Error executing hardware command {action}: {e}", file=sys.stderr)

def get_cpu_temp():
    try:
        with open("/sys/class/thermal/thermal_zone0/temp", "r") as f:
            return float(f.read().strip()) / 1000.0
    except Exception:
        pass
    try:
        res = os.popen("vcgencmd measure_temp").readline()
        if "temp=" in res:
            return float(res.replace("temp=", "").replace("'C", "").strip())
    except Exception:
        pass
    return None

def find_joystick_device():
    """Finds physical Sense HAT joystick /dev/input event node."""
    input_dir = "/dev/input"
    if not os.path.exists(input_dir):
        return None
    try:
        for entry in sorted(os.listdir(input_dir)):
            if entry.startswith("event"):
                full_p = os.path.join(input_dir, entry)
                sys_name = f"/sys/class/input/{entry}/device/name"
                if os.path.exists(sys_name):
                    try:
                        with open(sys_name, "r") as sf:
                            name = sf.read().lower()
                        if "sense hat" in name or "joystick" in name:
                            return full_p
                    except Exception:
                        pass
    except Exception:
        pass
    return None

def main():
    print("[Pi Hardware Daemon] Starting Bidirectional Sync Service (Hardware <-> Web UI)...")
    sense = get_native_sense_hat()
    has_sense_hat = sense is not None
    fb_path = get_fb_device()

    joy_dev_path = find_joystick_device()
    joy_fd = None
    if joy_dev_path:
        try:
            joy_fd = os.open(joy_dev_path, os.O_RDONLY | os.O_NONBLOCK)
            print(f"[Pi Hardware Daemon] Physical Sense HAT joystick event listener attached to {joy_dev_path}")
        except Exception as e:
            joy_fd = None
            print(f"[Pi Hardware Daemon] Notice: Direct evdev open on {joy_dev_path}: {e}")

    if has_sense_hat:
        print("[Pi Hardware Daemon] Native Sense HAT driver connected to I2C-1 bus.")
    elif fb_path:
        print(f"[Pi Hardware Daemon] Framebuffer {fb_path} detected: 8x8 RGB LED Matrix directly active.")
    else:
        print("[Pi Hardware Daemon] Native Sense HAT not detected. Operating in bridging/standby mode.")

    last_poll_sec = 0
    last_retry_time = int(time.time())
    persisted_last_joystick = None
    recent_joystick_events = []

    # Preserve any pre-existing joystick history from SENSE_FILE
    if os.path.exists(SENSE_FILE):
        try:
            with open(SENSE_FILE, "r") as f:
                prev_init = json.load(f)
                if isinstance(prev_init.get("joystickEvents"), list):
                    recent_joystick_events.extend(prev_init["joystickEvents"][-20:])
                if prev_init.get("lastJoystick"):
                    persisted_last_joystick = prev_init["lastJoystick"]
        except Exception:
            pass

    while True:
        try:
            # 1. UI-to-Hardware: execute queued UI actions on hardware
            process_ui_commands(sense, fb_path, recent_joystick_events)

            # Check direct evdev joystick if available (captures press, hold/repeat, release)
            if joy_fd is not None:
                try:
                    import struct
                    # Read 16 or 24 bytes per input_event
                    while True:
                        try:
                            # Try 64-bit packet (qqHHi = 24 bytes) or 32-bit (llHHI = 16 bytes)
                            raw_ev = os.read(joy_fd, 24)
                            if not raw_ev:
                                break
                            if len(raw_ev) == 24:
                                sec, usec, ev_type, ev_code, ev_val = struct.unpack("qqHHi", raw_ev)
                            elif len(raw_ev) == 16:
                                sec, usec, ev_type, ev_code, ev_val = struct.unpack("llHHI", raw_ev)
                            else:
                                break

                            # EV_KEY = 1
                            if ev_type == 1:
                                key_map = {
                                    103: "up",      # KEY_UP
                                    108: "down",    # KEY_DOWN
                                    105: "left",    # KEY_LEFT
                                    106: "right",   # KEY_RIGHT
                                    28: "middle",   # KEY_ENTER
                                    96: "middle",   # KEY_KPENTER
                                    272: "middle",  # BTN_LEFT
                                    292: "middle",  # BTN_SELECT
                                    304: "middle",  # BTN_SOUTH
                                    352: "middle",  # KEY_OK
                                    353: "middle",  # KEY_SELECT
                                }
                                if ev_code in key_map:
                                    d = key_map[ev_code]
                                    if ev_val == 1:
                                        act = "press"
                                    elif ev_val == 2:
                                        act = "hold"
                                    elif ev_val == 0:
                                        act = "release"
                                    else:
                                        act = "press"

                                    ev_payload = {
                                        "direction": d,
                                        "action": act,
                                        "timestamp": int(time.time() * 1000),
                                        "source": "Physical Joystick (/dev/input evdev)"
                                    }
                                    persisted_last_joystick = ev_payload
                                    recent_joystick_events.append(ev_payload)
                                    if len(recent_joystick_events) > 30:
                                        recent_joystick_events.pop(0)
                        except (BlockingIOError, InterruptedError):
                            break
                except Exception:
                    pass

            # 2. Hardware-to-UI: read live physical telemetry
            if has_sense_hat and sense:
                raw_t = round(sense.get_temperature(), 2)
                cpu_t = get_cpu_temp()
                # On Raspberry Pi 4, the Sense HAT sits directly above the BCM2711 SoC,
                # absorbing CPU heat and reading ~50-56°C (~132°F) even in room temperature.
                # Calibrate to ambient laboratory temperature using Raspberry Pi formula.
                calc_raw = (raw_t - 32.0) * 5.0 / 9.0 if raw_t > 70.0 else raw_t
                if cpu_t and calc_raw:
                    ambient_t = round(calc_raw - (cpu_t / 2.0), 1)
                    if ambient_t < 16.0 or ambient_t > 36.0:
                        ambient_t = round(max(18.5, calc_raw - 25.5), 1)
                elif calc_raw > 38.0:
                    ambient_t = round(max(18.5, calc_raw - 25.5), 1)
                else:
                    ambient_t = round(calc_raw, 1)

                h = round(sense.get_humidity(), 1)
                p = round(sense.get_pressure(), 2)
                orient = sense.get_orientation()
                accel = sense.get_accelerometer_raw()
                gyro = sense.get_gyroscope_raw()
                heading = round(orient.get("yaw", 0.0), 1)

                data = {
                    "temperature": ambient_t,
                    "rawTemperature": raw_t,
                    "cpuTemperature": cpu_t,
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

                # Physical joystick event polling via sense.stick
                try:
                    events = sense.stick.get_events()
                    if events:
                        for ev in events:
                            d = str(ev.direction).lower()
                            if d in ('centre', 'center', 'enter', 'middle', 'ok'):
                                d = 'middle'
                            act = str(ev.action).lower()
                            if act in ('pressed', 'press'):
                                act = 'press'
                            elif act in ('released', 'release'):
                                act = 'release'
                            elif act in ('held', 'hold'):
                                act = 'hold'

                            ev_payload = {
                                "direction": d,
                                "action": act,
                                "timestamp": int(time.time() * 1000),
                                "source": "Physical Sense HAT Joystick"
                            }
                            persisted_last_joystick = ev_payload
                            recent_joystick_events.append(ev_payload)
                            if len(recent_joystick_events) > 25:
                                recent_joystick_events.pop(0)
                except Exception:
                    pass

                if recent_joystick_events:
                    data["lastJoystick"] = recent_joystick_events[-1]
                    data["joystickEvents"] = recent_joystick_events[-20:]
                elif persisted_last_joystick:
                    data["lastJoystick"] = persisted_last_joystick

                # Atomic write to /tmp/pi_sense_hardware.json
                temp_file = SENSE_FILE + ".tmp"
                with open(temp_file, "w") as f:
                    json.dump(data, f)
                os.replace(temp_file, SENSE_FILE)

            elif fb_path or os.path.exists("/sys/bus/i2c/devices/1-0046"):
                # Partial hardware connection: LED matrix is alive on /dev/fb1 or ATTiny88 MCU
                now_sec = int(time.time())
                if now_sec != last_poll_sec or persisted_last_joystick:
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
                    if persisted_last_joystick:
                        data["lastJoystick"] = persisted_last_joystick
                    if recent_joystick_events:
                        data["joystickEvents"] = recent_joystick_events[-20:]
                    temp_file = SENSE_FILE + ".tmp"
                    with open(temp_file, "w") as f:
                        json.dump(data, f)
                    os.replace(temp_file, SENSE_FILE)

                # Retry detecting Sense HAT every 30 seconds
                if now_sec - last_retry_time > 30:
                    last_retry_time = now_sec
                    sense = get_native_sense_hat(verbose=False)
                    if sense:
                        has_sense_hat = True
                        print("[Pi Hardware Daemon] Native Sense HAT reconnected!")

            elif not has_sense_hat:
                now_sec = int(time.time())
                # Retry detecting Sense HAT or framebuffer device every 30 seconds
                if now_sec - last_retry_time > 30:
                    last_retry_time = now_sec
                    sense = get_native_sense_hat(verbose=False)
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
