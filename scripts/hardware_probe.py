#!/usr/bin/env python3
"""
Hardware Diagnostic & Probe Utility for Raspberry Pi 4 & Sense HAT.
Runs deep inspections across all hardware buses (Framebuffer, I2C, GPIO, PWM, Joystick)
and outputs structured JSON or human-readable terminal reports.
"""
import os
import sys
import json
import glob
import subprocess

def inspect_hardware():
    results = {
        "timestamp": int(os.path.getmtime("/proc") if os.path.exists("/proc") else 0),
        "platform": {},
        "framebuffer": {},
        "i2c": {},
        "python_libraries": {},
        "joystick": {},
        "gpio_pwm": {},
        "overall_status": "ok",
        "warnings": [],
        "errors": [],
        "recommendations": []
    }

    # 1. Platform Detection
    model = "Unknown Device"
    is_pi = False
    for p in ["/sys/firmware/devicetree/base/model", "/proc/device-tree/model"]:
        if os.path.exists(p):
            try:
                with open(p, "r") as f:
                    model = f.read().strip().replace("\x00", "")
                    if "raspberry pi" in model.lower():
                        is_pi = True
                break
            except Exception:
                pass

    if not is_pi and os.path.exists("/proc/cpuinfo"):
        try:
            with open("/proc/cpuinfo", "r") as f:
                content = f.read()
                if "Raspberry Pi" in content or "BCM2" in content:
                    is_pi = True
                    for line in content.splitlines():
                        if "Model" in line:
                            model = line.split(":", 1)[1].strip()
        except Exception:
            pass

    results["platform"] = {
        "is_raspberry_pi": is_pi,
        "model": model,
        "kernel": os.uname().release if hasattr(os, "uname") else "unknown"
    }

    # 2. Framebuffer (Sense HAT 8x8 RGB LED Matrix)
    fb_path = None
    fb_name = "Unknown"
    for candidate in ["/dev/fb1", "/dev/fb0", "/dev/fb2"]:
        if os.path.exists(candidate):
            name_file = f"/sys/class/graphics/{os.path.basename(candidate)}/name"
            if os.path.exists(name_file):
                try:
                    with open(name_file, "r") as f:
                        c_name = f.read().strip()
                        if "rpi-sense" in c_name.lower():
                            fb_path = candidate
                            fb_name = c_name
                            break
                        elif not fb_path and candidate == "/dev/fb1":
                            fb_path = candidate
                            fb_name = c_name
                except Exception:
                    pass
            elif not fb_path:
                fb_path = candidate

    results["framebuffer"] = {
        "detected": fb_path is not None,
        "device": fb_path,
        "driver_name": fb_name,
        "status": "connected" if fb_path else "missing"
    }

    if not fb_path:
        results["warnings"].append("Sense HAT framebuffer (/dev/fb1) not detected. The 8x8 LED matrix requires rpi-sense-fb kernel driver.")

    # 3. I2C Bus & Chip Detection
    i2c_bus = os.path.exists("/dev/i2c-1")
    chips_found = []
    for addr, chip_name in [("1-0046", "Attiny88 MCU"), ("1-005c", "LPS25H Pressure"), ("1-005f", "HTS221 Humidity/Temp"), ("1-006a", "LSM9DS1 IMU")]:
        if os.path.exists(f"/sys/bus/i2c/devices/{addr}"):
            chips_found.append({"address": addr, "name": chip_name})

    results["i2c"] = {
        "bus_active": i2c_bus,
        "device": "/dev/i2c-1" if i2c_bus else None,
        "chips_detected": chips_found,
        "status": "connected" if (i2c_bus and len(chips_found) > 0) else ("bus_only" if i2c_bus else "missing")
    }

    if not i2c_bus:
        results["errors"].append("I2C-1 bus (/dev/i2c-1) is disabled. Sense HAT sensors cannot communicate without I2C.")
        results["recommendations"].append("Enable I2C interface: run 'sudo raspi-config nonint do_i2c 0'")
    elif len(chips_found) == 0:
        results["warnings"].append("I2C-1 is enabled but Sense HAT I2C chips (0x46, 0x5c, 0x6a) are not responding. Check physical GPIO header seating.")

    # 4. Sense HAT Python Library Inspection
    sense_lib_ok = False
    sense_lib_error = None
    try:
        clean_sys_path = [
            p for p in sys.path
            if p and p != "" and p != "."
            and not os.path.exists(os.path.join(p, "pi_emulator.py"))
            and not os.path.exists(os.path.join(p, "src", "pi_emulator.py"))
            and not (os.path.basename(p.rstrip("/\\")) == "src" and os.path.exists(os.path.join(p, "pi_emulator.py")))
        ]
        orig = list(sys.path)
        sys.path = clean_sys_path
        sys.modules.pop("sense_hat", None)
        import sense_hat
        if hasattr(sense_hat, "SenseHat") and "pi_emulator" not in getattr(sense_hat.SenseHat, "__module__", ""):
            s = sense_hat.SenseHat()
            sense_lib_ok = True
        sys.path = orig
    except Exception as e:
        sense_lib_error = str(e)
    finally:
        sys.path = orig

    results["python_libraries"]["sense_hat"] = {
        "installed": sense_lib_ok,
        "error": sense_lib_error,
        "status": "ok" if sense_lib_ok else "error"
    }

    if not sense_lib_ok:
        # Check if Digital Twin library is present
        try:
            for p_cand in [os.path.join(os.path.dirname(__file__), '..'), os.path.join(os.path.dirname(__file__), '..', 'src'), '/app/applet/src']:
                if os.path.exists(p_cand) and p_cand not in sys.path:
                    sys.path.insert(0, p_cand)
            import sense_hat
            if hasattr(sense_hat, 'SenseHat'):
                results["python_libraries"]["sense_hat"] = {
                    "installed": True,
                    "error": None,
                    "status": "virtual_twin",
                    "mode": "Digital Twin Emulation"
                }
        except Exception:
            pass

    if not results["python_libraries"]["sense_hat"]["installed"]:
        if sense_lib_error and "No module named" in sense_lib_error:
            results["errors"].append("python3-sense-hat package is not installed on the system.")
            results["recommendations"].append("Install official library: 'sudo apt install -y python3-sense-hat'")
        else:
            results["warnings"].append(f"SenseHat python driver failed to initialize: {sense_lib_error or 'Module not loaded'}")
    elif results["python_libraries"]["sense_hat"].get("mode") == "Digital Twin Emulation":
        results["warnings"].append("Sense HAT operating in Digital Twin virtual mode (Physical Raspberry Pi hardware unlinked).")

    # 5. Joystick Hardware Detection
    joy_dev = None
    for ev in glob.glob("/dev/input/event*"):
        name_path = f"/sys/class/input/{os.path.basename(ev)}/device/name"
        if os.path.exists(name_path):
            try:
                with open(name_path, "r") as f:
                    if "sense hat" in f.read().lower():
                        joy_dev = ev
                        break
            except Exception:
                pass

    results["joystick"] = {
        "detected": joy_dev is not None,
        "device": joy_dev,
        "status": "connected" if joy_dev else "standby"
    }

    # 6. GPIO and PWM Controller
    gpiomem = os.path.exists("/dev/gpiomem")
    pwm_chip = os.path.exists("/sys/class/pwm/pwmchip0")
    results["gpio_pwm"] = {
        "gpiomem": gpiomem,
        "pwm_chip": pwm_chip,
        "pwm_channel": "/sys/class/pwm/pwmchip0/pwm0" if os.path.exists("/sys/class/pwm/pwmchip0/pwm0") else None,
        "status": "ok" if gpiomem else "warning"
    }

    # Determine overall status
    if fb_path and i2c_bus and sense_lib_ok:
        results["overall_status"] = "fully_connected"
    elif fb_path or i2c_bus or is_pi:
        results["overall_status"] = "partially_connected"
    else:
        results["overall_status"] = "disconnected"

    return results

def print_cli_report(data):
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    CYAN = "\033[96m"
    BOLD = "\033[1m"
    RESET = "\033[0m"

    print(f"\n{BOLD}{CYAN}======================================================================{RESET}")
    print(f"{BOLD}{CYAN}    Pi-Digit Hardware Doctor & Diagnostic Probe (Raspberry Pi 4)     {RESET}")
    print(f"{BOLD}{CYAN}======================================================================{RESET}\n")

    p = data["platform"]
    p_color = GREEN if p["is_raspberry_pi"] else YELLOW
    print(f"Platform:       {p_color}{p['model']}{RESET} (Kernel: {p['kernel']})")

    # Framebuffer
    fb = data["framebuffer"]
    fb_color = GREEN if fb["detected"] else RED
    print(f"8x8 RGB Matrix: {fb_color}{'CONNECTED (' + (fb['device'] or '') + ')' if fb['detected'] else 'NOT DETECTED'}{RESET} - {fb['driver_name']}")

    # I2C
    i2c = data["i2c"]
    i2c_color = GREEN if (i2c["bus_active"] and len(i2c["chips_detected"]) > 0) else (YELLOW if i2c["bus_active"] else RED)
    chips_str = ", ".join([c["name"] for c in i2c["chips_detected"]]) if i2c["chips_detected"] else "None responding"
    print(f"I2C Sensor Bus: {i2c_color}{'/dev/i2c-1 ACTIVE' if i2c['bus_active'] else 'DISABLED'}{RESET} (Chips: {chips_str})")

    # Python Library
    py = data["python_libraries"]["sense_hat"]
    if py.get("mode") == "Digital Twin Emulation":
        print(f"python3-sense:  {CYAN}DIGITAL TWIN (Active){RESET}")
    else:
        py_color = GREEN if py["installed"] else RED
        print(f"python3-sense:  {py_color}{'LOADED & READY' if py['installed'] else 'FAILED: ' + str(py['error'])}{RESET}")

    # Joystick
    joy = data["joystick"]
    joy_color = GREEN if joy["detected"] else YELLOW
    print(f"5-Way Joystick: {joy_color}{'CONNECTED (' + (joy['device'] or '') + ')' if joy['detected'] else 'STANDBY / EMULATED'}{RESET}")

    # GPIO & PWM
    gp = data["gpio_pwm"]
    print(f"GPIO & PWM:     {GREEN if gp['gpiomem'] else YELLOW}/dev/gpiomem {'OK' if gp['gpiomem'] else 'NOT FOUND'}{RESET} | PWM Chip: {'/sys/class/pwm/pwmchip0' if gp['pwm_chip'] else 'Software/Pinctrl mode'}")

    print(f"\n{BOLD}Diagnostic Summary:{RESET} {GREEN if data['overall_status'] == 'fully_connected' else (YELLOW if data['overall_status'] == 'partially_connected' else RED)}{data['overall_status'].upper()}{RESET}")

    if data["warnings"]:
        print(f"\n{BOLD}{YELLOW}⚠ Warnings:{RESET}")
        for w in data["warnings"]:
            print(f"  • {w}")

    if data["errors"]:
        print(f"\n{BOLD}{RED}✖ Errors:{RESET}")
        for e in data["errors"]:
            print(f"  • {e}")

    if data["recommendations"]:
        print(f"\n{BOLD}{CYAN}🔧 Recommended Fix Steps (Run in Pi Terminal):{RESET}")
        for r in data["recommendations"]:
            print(f"  {BOLD}➜ {r}{RESET}")

    print(f"\n{CYAN}----------------------------------------------------------------------{RESET}\n")

if __name__ == "__main__":
    data = inspect_hardware()
    if "--json" in sys.argv:
        print(json.dumps(data, indent=2))
    else:
        print_cli_report(data)
