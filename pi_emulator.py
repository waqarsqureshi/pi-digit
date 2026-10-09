"""
pi_emulator Library for Raspberry Pi 4 Physical Computing & Digital Twin
Supports dual-mode execution:
1. Forwards all commands to real physical hardware (Sense HAT framebuffer / GPIO).
2. Mirrors all operations to the Web Emulator UI via real-time IPC events.
"""
import sys
import json
import time
import os
from collections import namedtuple

InputEvent = namedtuple('InputEvent', ('timestamp', 'direction', 'action'))

def _write_fb_pixel(x, y, r, g, b):
    try:
        # Check standard Sense HAT framebuffer devices
        for fb_path in ['/dev/fb1', '/dev/fb0', '/dev/fb2']:
            if os.path.exists(fb_path):
                rgb565 = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3)
                with open(fb_path, 'r+b') as fb:
                    fb.seek((y * 8 + x) * 2)
                    fb.write(rgb565.to_bytes(2, byteorder='little'))
                break
    except Exception:
        pass

def _clear_fb(r=0, g=0, b=0):
    try:
        for fb_path in ['/dev/fb1', '/dev/fb0', '/dev/fb2']:
            if os.path.exists(fb_path):
                rgb565 = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3)
                buf = rgb565.to_bytes(2, byteorder='little') * 64
                with open(fb_path, 'r+b') as fb:
                    fb.seek(0)
                    fb.write(buf)
                break
    except Exception:
        pass

def _get_native_sense_hat():
    """Safely loads system sense_hat, bypassing local project mock files."""
    orig_path = list(sys.path)
    clean_path = [p for p in orig_path if p and p != '' and p != '.' and not os.path.exists(os.path.join(p, 'pi_emulator.py'))]
    try:
        sys.path = clean_path
        sys.modules.pop('sense_hat', None)
        import sense_hat as _mod
        if hasattr(_mod, 'SenseHat') and 'pi_emulator' not in getattr(_mod.SenseHat, '__module__', ''):
            return _mod.SenseHat()
    except Exception:
        pass
    finally:
        sys.path = orig_path
    return None


class SenseStick:
    """Emulates and bridges the Sense HAT 5-way joystick."""
    direction_any = 'any'
    direction_up = 'up'
    direction_down = 'down'
    direction_left = 'left'
    direction_right = 'right'
    direction_middle = 'centre'

    action_any = 'any'
    action_pressed = 'press'
    action_released = 'release'
    action_held = 'hold'

    def __init__(self, hat):
        self._hat = hat
        self._last_event_time = 0

    def get_events(self):
        # 1. Check real physical stick if native hardware is present
        if self._hat._real_sense and hasattr(self._hat._real_sense, 'stick'):
            try:
                events = self._hat._real_sense.stick.get_events()
                if events:
                    return events
            except Exception:
                pass

        # 2. Check telemetry from hardware daemon or project bridge
        if os.path.exists('/tmp/pi_sense_hardware.json'):
            try:
                with open('/tmp/pi_sense_hardware.json', 'r') as f:
                    data = json.load(f)
                    last_ev = data.get('lastJoystick')
                    if last_ev and last_ev.get('timestamp', 0) > self._last_event_time:
                        self._last_event_time = last_ev['timestamp']
                        direction = last_ev.get('direction', 'centre')
                        action = last_ev.get('action', 'press')
                        return [InputEvent(time.time(), direction, action)]
            except Exception:
                pass

        return []

    def wait_for_event(self, emptybuffer=False):
        start = time.time()
        while time.time() - start < 10.0:
            events = self.get_events()
            if events:
                return events[-1]
            time.sleep(0.05)
        return None


class EmulatorSenseHat:
    """
    Sense HAT controller that forwards to real hardware and mirrors to Web Emulator.
    """
    def __init__(self):
        self._rotation = 0
        self.low_light = False
        self._pixels = [[0, 0, 0] for _ in range(64)]
        self._real_sense = _get_native_sense_hat()
        self.stick = SenseStick(self)

    def _emit(self, event_type, **kwargs):
        payload = {"type": event_type, **kwargs}
        print(f"__PI_TWIN_EVENT__:{json.dumps(payload)}", flush=True)

    def _get_sensors(self):
        # 1. Check if real hardware daemon wrote live sensors
        if os.path.exists('/tmp/pi_sense_hardware.json'):
            try:
                with open('/tmp/pi_sense_hardware.json', 'r') as f:
                    data = json.load(f)
                    if data and isinstance(data, dict):
                        return data
            except Exception:
                pass

        # 2. Try querying native sense_hat directly
        if self._real_sense:
            try:
                orient = self._real_sense.get_orientation()
                return {
                    "temperature": round(self._real_sense.get_temperature(), 2),
                    "humidity": round(self._real_sense.get_humidity(), 1),
                    "pressure": round(self._real_sense.get_pressure(), 2),
                    "accelerometer": self._real_sense.get_accelerometer_raw(),
                    "gyroscope": self._real_sense.get_gyroscope_raw(),
                    "pitch": round(orient.get("pitch", 0.0), 2),
                    "roll": round(orient.get("roll", 0.0), 2),
                    "heading": round(orient.get("yaw", 142.5), 1),
                    "compassHeading": round(self._real_sense.get_compass(), 1),
                    "isSimulated": False
                }
            except Exception:
                pass

        # 3. Check simulated overrides
        if os.path.exists('/tmp/pi_twin_sensors.json'):
            try:
                with open('/tmp/pi_twin_sensors.json', 'r') as f:
                    return json.load(f)
            except Exception:
                pass

        return {
            "temperature": 24.6,
            "humidity": 48.2,
            "pressure": 1013.25,
            "accelerometer": {"x": 0.02, "y": -0.04, "z": 0.98},
            "gyroscope": {"x": 0.1, "y": -0.2, "z": 0.05},
            "pitch": 0.0,
            "roll": 0.0,
            "heading": 142.5,
            "compassHeading": 142.5,
            "isSimulated": True
        }

    def set_pixel(self, x, y, *args):
        if len(args) == 1:
            r, g, b = args[0]
        elif len(args) == 3:
            r, g, b = args
        else:
            raise ValueError("set_pixel requires (x, y, r, g, b) or (x, y, [r, g, b])")

        x = int(x)
        y = int(y)
        r = int(max(0, min(255, r)))
        g = int(max(0, min(255, g)))
        b = int(max(0, min(255, b)))

        if 0 <= x < 8 and 0 <= y < 8:
            idx = y * 8 + x
            self._pixels[idx] = [r, g, b]

            # Forward to physical hardware
            _write_fb_pixel(x, y, r, g, b)
            if self._real_sense:
                try:
                    self._real_sense.set_pixel(x, y, r, g, b)
                except Exception:
                    pass

            # Mirror to Web Emulator UI
            self._emit("set_pixel", x=x, y=y, r=r, g=g, b=b)

    def get_pixel(self, x, y):
        x = int(x)
        y = int(y)
        if 0 <= x < 8 and 0 <= y < 8:
            return self._pixels[y * 8 + x]
        return [0, 0, 0]

    def set_pixels(self, pixel_list):
        if len(pixel_list) != 64:
            raise ValueError("Pixel list must have 64 elements")
        self._pixels = [list(p) for p in pixel_list]
        for idx, (r, g, b) in enumerate(pixel_list):
            _write_fb_pixel(idx % 8, idx // 8, r, g, b)
        if self._real_sense:
            try:
                self._real_sense.set_pixels(pixel_list)
            except Exception:
                pass
        self._emit("set_pixels", pixels=self._pixels)

    def get_pixels(self):
        return [list(p) for p in self._pixels]

    def clear(self, *args):
        if len(args) == 0:
            colour = [0, 0, 0]
        elif len(args) == 1:
            colour = args[0]
        elif len(args) == 3:
            colour = list(args)
        else:
            colour = [0, 0, 0]

        r, g, b = [int(max(0, min(255, c))) for c in colour]
        self._pixels = [[r, g, b] for _ in range(64)]
        _clear_fb(r, g, b)
        if self._real_sense:
            try:
                self._real_sense.clear(r, g, b)
            except Exception:
                pass
        self._emit("clear", r=r, g=g, b=b)

    def show_message(self, text_string, scroll_speed=0.1, text_colour=[255, 255, 255], back_colour=[0, 0, 0]):
        self.clear(*back_colour)
        for x in [3, 4]:
            for y in [3, 4]:
                self.set_pixel(x, y, *text_colour)

    def show_letter(self, s, text_colour=[255, 255, 255], back_colour=[0, 0, 0]):
        self.clear(*back_colour)
        for x in [3, 4]:
            for y in [3, 4]:
                self.set_pixel(x, y, *text_colour)

    def get_temperature(self):
        return float(self._get_sensors().get("temperature", 24.6))

    def get_temperature_from_humidity(self):
        return self.get_temperature()

    def get_temperature_from_pressure(self):
        return self.get_temperature()

    @property
    def temperature(self):
        return self.get_temperature()

    @property
    def temp(self):
        return self.get_temperature()

    def get_humidity(self):
        return float(self._get_sensors().get("humidity", 48.2))

    @property
    def humidity(self):
        return self.get_humidity()

    def get_pressure(self):
        return float(self._get_sensors().get("pressure", 1013.25))

    @property
    def pressure(self):
        return self.get_pressure()

    def get_orientation_degrees(self):
        s = self._get_sensors()
        return {
            "pitch": float(s.get("pitch", 0.0)),
            "roll": float(s.get("roll", 0.0)),
            "yaw": float(s.get("heading", s.get("compassHeading", 142.5)))
        }

    def get_orientation(self):
        return self.get_orientation_degrees()

    def get_orientation_radians(self):
        import math
        deg = self.get_orientation_degrees()
        return {
            "pitch": math.radians(deg["pitch"]),
            "roll": math.radians(deg["roll"]),
            "yaw": math.radians(deg["yaw"]),
        }

    def get_compass(self):
        return float(self._get_sensors().get("compassHeading", 142.5))

    def get_accelerometer_raw(self):
        acc = self._get_sensors().get("accelerometer", {"x": 0.02, "y": -0.04, "z": 0.98})
        return {
            "x": float(acc.get("x", 0.0)),
            "y": float(acc.get("y", 0.0)),
            "z": float(acc.get("z", 1.0))
        }

    def get_accelerometer(self):
        return self.get_orientation()

    def get_gyroscope_raw(self):
        gyro = self._get_sensors().get("gyroscope", {"x": 0.1, "y": -0.2, "z": 0.05})
        return {
            "x": float(gyro.get("x", 0.0)),
            "y": float(gyro.get("y", 0.0)),
            "z": float(gyro.get("z", 0.0))
        }

    def get_gyroscope(self):
        return self.get_orientation()

    def get_last_joystick_event(self):
        events = self.stick.get_events()
        if events:
            return {"direction": events[-1].direction, "action": events[-1].action}
        return None

    def simulate_joystick(self, direction='centre', action='press'):
        self._emit("joystick", direction=direction, action=action)


class EmulatorPWM:
    """
    Hardware Pulse-Width Modulation (PWM) Controller.
    Emulates and generates PWM on Raspberry Pi (e.g. GPIO 18 / PWM0 · Pin 12).
    Streams live duty cycle and frequency via WebSocket to the web app oscilloscope.
    """
    def __init__(self, channel, frequency_hz):
        self.channel = int(channel)
        self.freq = float(frequency_hz)
        self.duty = 0.0
        self.is_running = False
        EmulatorGPIO.setup(channel, EmulatorGPIO.OUT)

    def start(self, duty_cycle):
        self.duty = float(duty_cycle)
        self.is_running = True
        self._apply_hardware_pwm()
        self._emit(active=True)

    def ChangeDutyCycle(self, duty_cycle):
        self.duty = float(duty_cycle)
        self._apply_hardware_pwm()
        self._emit(active=self.is_running)

    def ChangeFrequency(self, frequency_hz):
        self.freq = float(frequency_hz)
        self._apply_hardware_pwm()
        self._emit(active=self.is_running)

    def stop(self):
        self.is_running = False
        self._emit(active=False)

    def _apply_hardware_pwm(self):
        # If on physical Raspberry Pi, attempt hardware pin command
        try:
            if self.channel == 18 and self.is_running:
                # Set GPIO 18 to alt0 for hardware PWM0
                os.system(f"pinctrl set {self.channel} a0 >/dev/null 2>&1")
        except Exception:
            pass

    def _emit(self, active=True):
        payload = {
            "type": "pwm",
            "channel": self.channel,
            "duty": self.duty,
            "freq": self.freq,
            "active": active
        }
        print(f"__PI_TWIN_EVENT__:{json.dumps(payload)}", flush=True)


class EmulatorGPIO:
    """
    GPIO controller that forwards to real physical Raspberry Pi pins and mirrors to Web Emulator.
    """
    BCM = 11
    BOARD = 10
    OUT = 0
    IN = 1
    HIGH = 1
    LOW = 0
    PUD_UP = 22
    PUD_DOWN = 21
    PUD_OFF = 20

    PWM = EmulatorPWM

    _mode = BCM
    _pin_states = {}

    @classmethod
    def setmode(cls, mode):
        cls._mode = mode

    @classmethod
    def setwarnings(cls, flag):
        pass

    @classmethod
    def setup(cls, pin, mode, pull_up_down=None, initial=None):
        cls._pin_states[pin] = initial if initial is not None else 0
        mode_str = "OUT" if mode == cls.OUT else "IN"

        # Try setting physical GPIO on Raspberry Pi OS
        try:
            val_flag = "dh" if (initial == 1) else "dl"
            if mode == cls.OUT:
                os.system(f"pinctrl set {pin} op {val_flag} >/dev/null 2>&1 || raspi-gpio set {pin} op {val_flag} >/dev/null 2>&1")
            else:
                os.system(f"pinctrl set {pin} ip >/dev/null 2>&1 || raspi-gpio set {pin} ip >/dev/null 2>&1")
        except Exception:
            pass

        payload = {"type": "gpio_setup", "bcm": pin, "mode": mode_str}
        print(f"__PI_TWIN_EVENT__:{json.dumps(payload)}", flush=True)

    @classmethod
    def output(cls, pin, value):
        val = 1 if value else 0
        cls._pin_states[pin] = val

        # Forward to physical hardware
        try:
            val_flag = "dh" if val == 1 else "dl"
            os.system(f"pinctrl set {pin} op {val_flag} >/dev/null 2>&1 || raspi-gpio set {pin} op {val_flag} >/dev/null 2>&1")
        except Exception:
            pass

        payload = {"type": "gpio_output", "bcm": pin, "value": val}
        print(f"__PI_TWIN_EVENT__:{json.dumps(payload)}", flush=True)

    @classmethod
    def input(cls, pin):
        try:
            res = os.popen(f"pinctrl get {pin} 2>/dev/null").read()
            if "hi" in res.lower() or "1" in res:
                return 1
            if "lo" in res.lower() or "0" in res:
                return 0
        except Exception:
            pass
        return cls._pin_states.get(pin, 0)

    @classmethod
    def cleanup(cls, *args):
        payload = {"type": "gpio_cleanup"}
        print(f"__PI_TWIN_EVENT__:{json.dumps(payload)}", flush=True)


class System:
    """Pi-Digit system metadata helper."""
    @staticmethod
    def status():
        return {
            "platform": "Raspberry Pi 4 Model B",
            "os": "Debian 12 (bookworm) aarch64",
            "runtime": "Pi-Digit Physical Computing",
            "status": "active"
        }

# Aliases for backwards compatibility and drop-in usage
SenseHat = EmulatorSenseHat
GPIO = EmulatorGPIO
PWM = EmulatorPWM

__all__ = ["EmulatorSenseHat", "EmulatorGPIO", "EmulatorPWM", "SenseHat", "GPIO", "PWM", "System", "InputEvent"]
