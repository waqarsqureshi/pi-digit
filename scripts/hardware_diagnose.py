#!/usr/bin/env python3
"""
Raspberry Pi & Sense HAT Hardware Diagnostic Tool
Exhaustively checks hardware subsystems, permissions, drivers, I2C addresses,
and Python libraries. Outputs formatted terminal reports and JSON.
"""
import sys
import os
import json
import platform
import subprocess
import traceback

def check_group_membership(group_name):
    try:
        import grp
        user = os.environ.get('USER', 'root')
        groups = [g.gr_name for g in grp.getgrall() if user in g.gr_mem]
        primary_gid = os.getgid()
        try:
            primary_group = grp.getgrgid(primary_gid).gr_name
            groups.append(primary_group)
        except Exception:
            pass
        return group_name in groups or os.geteuid() == 0
    except Exception:
        return os.geteuid() == 0

def run_diagnostics():
    report = {
        "timestamp": int(__import__('time').time() * 1000),
        "overallStatus": "ok",
        "isPhysicalPi": False,
        "piModel": "Unknown / Virtualized",
        "system": {},
        "ledMatrix": {"ok": False, "message": "Not detected", "detail": "", "error": ""},
        "sensors": {"ok": False, "message": "Not detected", "detail": "", "error": ""},
        "joystick": {"ok": False, "message": "Not detected", "detail": "", "error": ""},
        "i2c": {"ok": False, "message": "Not detected", "detail": "", "addresses": []},
        "gpio": {"ok": False, "message": "Not detected", "detail": ""},
        "pwm": {"ok": False, "message": "Not detected", "detail": ""},
        "recommendations": [],
        "terminalLog": ""
    }

    log_lines = []
    def log(msg):
        log_lines.append(msg)

    log("=" * 64)
    log("  RASPBERRY PI & SENSE HAT HARDWARE DIAGNOSTIC SUITE")
    log("=" * 64)

    # 1. Host Architecture & Model
    is_pi = False
    model_str = ""
    try:
        if os.path.exists("/sys/firmware/devicetree/base/model"):
            with open("/sys/firmware/devicetree/base/model", "r", errors="ignore") as f:
                model_str = f.read().strip('\x00').strip()
                if "raspberry pi" in model_str.lower():
                    is_pi = True
        elif os.path.exists("/proc/cpuinfo"):
            with open("/proc/cpuinfo", "r") as f:
                content = f.read()
                if "BCM" in content or "Raspberry" in content:
                    is_pi = True
                    for line in content.splitlines():
                        if line.startswith("Model"):
                            model_str = line.split(":", 1)[1].strip()
    except Exception as e:
        model_str = f"Error reading model: {e}"

    report["isPhysicalPi"] = is_pi
    report["piModel"] = model_str if model_str else ("Raspberry Pi (Emulated/Container)" if not is_pi else "Raspberry Pi 4")
    report["system"] = {
        "os": f"{platform.system()} {platform.release()}",
        "architecture": platform.machine(),
        "pythonVersion": platform.python_version(),
        "user": os.environ.get("USER", "root"),
        "uid": os.geteuid(),
        "isRoot": os.geteuid() == 0,
    }

    log(f"[*] Target Host: {report['piModel']}")
    log(f"[*] OS & Kernel: {report['system']['os']} ({report['system']['architecture']})")
    log(f"[*] User Account: {report['system']['user']} (UID {report['system']['uid']})")

    # Check linux permissions
    in_i2c = check_group_membership('i2c')
    in_input = check_group_membership('input')
    in_gpio = check_group_membership('gpio')
    in_video = check_group_membership('video')

    perm_status = f"i2c: {'✓' if in_i2c else '✗'}, input: {'✓' if in_input else '✗'}, gpio: {'✓' if in_gpio else '✗'}, video: {'✓' if in_video else '✗'}"
    log(f"[*] Group Privileges: {perm_status}")
    if not (in_i2c and in_input and in_gpio):
        report["recommendations"].append(
            f"Add user '{report['system']['user']}' to hardware groups: sudo usermod -a -G i2c,input,gpio,video {report['system']['user']}"
        )

    log("-" * 64)

    # 2. 8x8 RGB LED Matrix Check
    log("[1/5] Checking Sense HAT 8x8 RGB LED Matrix Subsystem...")
    fb_found = None
    fb_candidates = ['/dev/fb1', '/dev/fb0', '/dev/fb2']
    for fb in fb_candidates:
        if os.path.exists(fb):
            name_file = f"/sys/class/graphics/{os.path.basename(fb)}/name"
            fb_name = ""
            if os.path.exists(name_file):
                try:
                    with open(name_file, "r") as nf:
                        fb_name = nf.read().strip()
                except Exception:
                    pass
            if "rpi-sense" in fb_name.lower() or fb == '/dev/fb1':
                fb_found = fb
                break
            elif not fb_found and fb == '/dev/fb1':
                fb_found = fb

    if fb_found:
        can_rw = os.access(fb_found, os.R_OK | os.W_OK)
        report["ledMatrix"]["ok"] = True
        report["ledMatrix"]["path"] = fb_found
        report["ledMatrix"]["message"] = f"Online on {fb_found} (Hardware framebuffer active)"
        report["ledMatrix"]["detail"] = f"Device node {fb_found} is present. Read/Write permission: {'YES' if can_rw else 'NO (Requires video group or sudo)'}"
        log(f"  ✓ LED Matrix: FOUND at {fb_found} (Permissions: {'R/W OK' if can_rw else 'Permission Denied'})")
        if not can_rw:
            report["recommendations"].append(f"Grant video group access for framebuffer: sudo chmod 666 {fb_found}")
    else:
        # Check if MCU is present at address 0x46 on I2C
        mcu_dev = "/sys/bus/i2c/devices/1-0046"
        if os.path.exists(mcu_dev):
            report["ledMatrix"]["ok"] = True
            report["ledMatrix"]["path"] = "I2C 0x46 (ATTiny88)"
            report["ledMatrix"]["message"] = "Online via I2C ATTiny88 MCU (@ 0x46)"
            report["ledMatrix"]["detail"] = "Sense HAT ATTiny88 driver present in sysfs."
            log("  ✓ LED Matrix: FOUND via I2C ATTiny88 microcontroller (0x46)")
        else:
            report["ledMatrix"]["ok"] = False
            report["ledMatrix"]["message"] = "Framebuffer /dev/fb1 not found"
            report["ledMatrix"]["detail"] = "Linux kernel module rpi-sense-fb is not loaded, or board is unattached."
            report["ledMatrix"]["error"] = "Missing /dev/fb1 device node"
            log("  ✗ LED Matrix: NOT DETECTED (No /dev/fb1 or ATTiny88 sysfs entry)")
            report["recommendations"].append(
                "Ensure Sense HAT is seated firmly on the 40-pin header and 'dtoverlay=rpi-sense' is enabled in /boot/firmware/config.txt"
            )

    log("-" * 64)

    # 3. I2C Bus & Sensor Subsystems (HTS221 / LPS25H / LSM9DS1)
    log("[2/5] Checking I2C Bus & Environmental/IMU Sensors...")
    i2c_bus_path = "/dev/i2c-1"
    has_i2c_dev = os.path.exists(i2c_bus_path)

    detected_addrs = []
    if has_i2c_dev:
        can_i2c = os.access(i2c_bus_path, os.R_OK | os.W_OK)
        report["i2c"]["ok"] = True
        report["i2c"]["message"] = f"I2C-1 bus active at {i2c_bus_path}"
        report["i2c"]["detail"] = f"R/W Access: {'Granted' if can_i2c else 'Denied (Requires i2c group)'}"
        log(f"  ✓ I2C Bus: {i2c_bus_path} present (R/W: {'OK' if can_i2c else 'DENIED'})")

        # Check sysfs i2c device entries
        for addr_hex in ["0046", "005c", "005f", "006a", "001c", "0027"]:
            sysfs_dev = f"/sys/bus/i2c/devices/1-{addr_hex}"
            if os.path.exists(sysfs_dev):
                detected_addrs.append("0x" + addr_hex[2:])

        report["i2c"]["addresses"] = detected_addrs
        if detected_addrs:
            log(f"  ✓ Detected I2C slave devices in sysfs: {', '.join(detected_addrs)}")
    else:
        report["i2c"]["ok"] = False
        report["i2c"]["message"] = "/dev/i2c-1 not present"
        report["i2c"]["detail"] = "I2C driver module i2c-dev is not loaded or I2C interface is disabled."
        log("  ✗ I2C Bus: /dev/i2c-1 NOT DETECTED")
        report["recommendations"].append(
            "Enable I2C interface: sudo raspi-config nonint do_i2c 0 && sudo modprobe i2c-dev"
        )

    # Test Python sense_hat library initialization
    log("[3/5] Testing Sense HAT Python Library & Direct Sensor Readout...")
    sense_lib_ok = False
    sense_err_detail = ""

    # Attempt to load real system sense_hat
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
            sense_inst = sense_hat.SenseHat()
            t = sense_inst.get_temperature()
            h = sense_inst.get_humidity()
            p = sense_inst.get_pressure()
            sense_lib_ok = True
            report["sensors"]["ok"] = True
            report["sensors"]["message"] = "All Sensors Online (HTS221 / LPS25H / LSM9DS1)"
            report["sensors"]["detail"] = f"Live Readout -> Temp: {t:.1f}°C, Hum: {h:.1f}%, Press: {p:.1f}hPa"
            log(f"  ✓ Sensors: LIVE SENSE HAT READINGS ACTIVE (Temp={t:.1f}°C, Hum={h:.1f}%, Press={p:.1f}hPa)")
        else:
            sense_err_detail = "Found local emulator wrapper instead of system python3-sense-hat"
    except Exception as ex:
        ex_type = type(ex).__name__
        ex_msg = str(ex)
        sense_err_detail = f"{ex_type}: {ex_msg}"
        log(f"  ✗ Native sense_hat initialization failed: {sense_err_detail}")
    finally:
        sys.path = orig_path

    if not sense_lib_ok:
        report["sensors"]["ok"] = False
        report["sensors"]["message"] = "Environmental & IMU Sensors Standby"
        report["sensors"]["error"] = sense_err_detail or "python3-sense-hat library failed to read I2C sensors"
        report["sensors"]["detail"] = (
            f"The 8x8 LED matrix may be working via /dev/fb1, but sensor reading encountered: {sense_err_detail}."
        )
        if "No module named" in sense_err_detail:
            report["recommendations"].append(
                "Install system Sense HAT package: sudo apt update && sudo apt install -y python3-sense-hat python3-smbus"
            )
        elif "Remote I/O error" in sense_err_detail or "121" in sense_err_detail:
            report["recommendations"].append(
                "I2C Remote I/O Error: Ensure Sense HAT header pins are firmly seated without loose connections."
            )
        elif "Permission denied" in sense_err_detail:
            report["recommendations"].append(
                f"Grant permissions to user: sudo usermod -a -G i2c,input,video {report['system']['user']}"
            )

    log("-" * 64)

    # 4. Sense HAT 5-Way Joystick Check
    log("[4/5] Checking Sense HAT 5-Way Joystick (evdev)...")
    joy_found = False
    joy_dev = None

    input_dir = "/dev/input"
    if os.path.exists(input_dir):
        try:
            for entry in os.listdir(input_dir):
                if entry.startswith("event"):
                    full_p = os.path.join(input_dir, entry)
                    sys_name = f"/sys/class/input/{entry}/device/name"
                    dev_name = ""
                    if os.path.exists(sys_name):
                        try:
                            with open(sys_name, "r") as sf:
                                dev_name = sf.read().strip()
                        except Exception:
                            pass
                    if "sense hat" in dev_name.lower() or "joystick" in dev_name.lower():
                        joy_found = True
                        joy_dev = full_p
                        break
        except Exception as e:
            log(f"  ! Warning checking input dir: {e}")

    if joy_found:
        can_joy = os.access(joy_dev, os.R_OK)
        report["joystick"]["ok"] = True
        report["joystick"]["path"] = joy_dev
        report["joystick"]["message"] = f"Online on {joy_dev}"
        report["joystick"]["detail"] = f"Event device {joy_dev} active. Read permission: {'Granted' if can_joy else 'Denied (Requires input group)'}"
        log(f"  ✓ Joystick: FOUND at {joy_dev} (Permission: {'OK' if can_joy else 'DENIED'})")
        if not can_joy:
            report["recommendations"].append(f"Grant input group permissions: sudo usermod -a -G input {report['system']['user']}")
    else:
        report["joystick"]["ok"] = False
        report["joystick"]["message"] = "Physical joystick event device not found in /dev/input"
        report["joystick"]["detail"] = "Virtual twin keypad emulation will be used as interactive fallback."
        log("  ○ Joystick: Standby / Virtual Twin Fallback Active")

    log("-" * 64)

    # 5. GPIO Memory & Pin Multiplexing (/dev/gpiomem)
    log("[5/5] Checking 40-Pin GPIO Memory Map & Hardware PWM...")
    if os.path.exists("/dev/gpiomem"):
        can_gpio = os.access("/dev/gpiomem", os.R_OK | os.W_OK)
        report["gpio"]["ok"] = True
        report["gpio"]["message"] = "Direct BCM register access available via /dev/gpiomem"
        report["gpio"]["detail"] = f"R/W Access: {'Granted' if can_gpio else 'Denied (Requires gpio group)'}"
        log(f"  ✓ GPIO: /dev/gpiomem present (R/W: {'OK' if can_gpio else 'DENIED'})")
    else:
        report["gpio"]["ok"] = False
        report["gpio"]["message"] = "/dev/gpiomem not detected (Standard on desktop Linux containers)"
        report["gpio"]["detail"] = "Emulated GPIO pins active."
        log("  ○ GPIO: /dev/gpiomem not found (Virtual twin simulation active)")

    if os.path.exists("/sys/class/pwm/pwmchip0"):
        report["pwm"]["ok"] = True
        report["pwm"]["message"] = "Hardware PWMchip0 active (GPIO 18 / PWM0 supported)"
        log("  ✓ Hardware PWM: /sys/class/pwm/pwmchip0 active")
    else:
        report["pwm"]["ok"] = False
        report["pwm"]["message"] = "Kernel pwmchip0 not enabled (Software PWM fallback active)"
        log("  ○ Hardware PWM: pwmchip0 not loaded (Software thread fallback active)")

    log("=" * 64)

    # Determine overall status
    if report["ledMatrix"]["ok"] and report["sensors"]["ok"]:
        report["overallStatus"] = "ok"
        log(">> OVERALL DIAGNOSTIC RESULT: [HEALTHY - FULL HARDWARE LINK]")
    elif report["ledMatrix"]["ok"] or report["sensors"]["ok"] or report["gpio"]["ok"]:
        report["overallStatus"] = "partial"
        log(">> OVERALL DIAGNOSTIC RESULT: [PARTIAL HARDWARE LINK]")
        log("   Note: 8x8 LED Matrix or GPIO is ACTIVE, but some sensor subsystems need configuration.")
    else:
        report["overallStatus"] = "simulated" if not is_pi else "error"
        log(">> OVERALL DIAGNOSTIC RESULT: [VIRTUAL SIMULATION / HARDWARE UNLINKED]")

    if report["recommendations"]:
        log("\nRECOMMENDED ACTIONS TO RESOLVE HARDWARE ISSUES:")
        for idx, rec in enumerate(report["recommendations"], 1):
            log(f"  {idx}. {rec}")

    log("=" * 64)

    report["terminalLog"] = "\n".join(log_lines)
    return report

def main():
    report = run_diagnostics()
    if "--json" in sys.argv:
        print(json.dumps(report, indent=2))
    else:
        print(report["terminalLog"])

if __name__ == "__main__":
    main()
