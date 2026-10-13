"""
pi_emulator Library for Raspberry Pi 4 Physical Computing & Digital Twin
Supports dual-mode execution:
1. Forwards all commands to real physical hardware (Sense HAT framebuffer / GPIO).
2. Mirrors all operations to the Web Emulator UI via real-time IPC events.
"""
from collections import namedtuple
import sys
import json
import time
import os

class DirectionStr(str):
    def __eq__(self, other):
        if not isinstance(other, (str, DirectionStr)):
            return False
        s_self = str(self).lower()
        s_other = str(other).lower()
        if s_self in ('middle', 'centre', 'center', 'enter') and s_other in ('middle', 'centre', 'center', 'enter'):
            return True
        return s_self == s_other

class ActionStr(str):
    def __eq__(self, other):
        if not isinstance(other, (str, ActionStr)):
            return False
        norm = {
            'press': 'pressed', 'pressed': 'pressed',
            'release': 'released', 'released': 'released',
            'hold': 'held', 'held': 'held'
        }
        s_self = norm.get(str(self).lower(), str(self).lower())
        s_other = norm.get(str(other).lower(), str(other).lower())
        return s_self == s_other

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
        import sense_hat as _mod
        if hasattr(_mod, 'SenseHat') and 'pi_emulator' not in getattr(_mod.SenseHat, '__module__', ''):
            return _mod.SenseHat()
    except Exception:
        pass
    finally:
        sys.path = orig_path
    return None

FONT_5x7 = {
    ' ': [0x00, 0x00, 0x00, 0x00, 0x00],
    '!': [0x00, 0x00, 0x5F, 0x00, 0x00],
    '"': [0x00, 0x07, 0x00, 0x07, 0x00],
    '#': [0x14, 0x7F, 0x14, 0x7F, 0x14],
    '$': [0x24, 0x2A, 0x7F, 0x2A, 0x12],
    '%': [0x23, 0x13, 0x08, 0x64, 0x62],
    '&': [0x36, 0x49, 0x55, 0x22, 0x50],
    "'": [0x00, 0x05, 0x03, 0x00, 0x00],
    '(': [0x00, 0x1C, 0x22, 0x41, 0x00],
    ')': [0x00, 0x41, 0x22, 0x1C, 0x00],
    '*': [0x14, 0x08, 0x3E, 0x08, 0x14],
    '+': [0x08, 0x08, 0x3E, 0x08, 0x08],
    ',': [0x00, 0x50, 0x30, 0x00, 0x00],
    '-': [0x08, 0x08, 0x08, 0x08, 0x08],
    '.': [0x00, 0x60, 0x60, 0x00, 0x00],
    '/': [0x20, 0x10, 0x08, 0x04, 0x02],
    '0': [0x3E, 0x51, 0x49, 0x45, 0x3E],
    '1': [0x00, 0x42, 0x7F, 0x40, 0x00],
    '2': [0x42, 0x61, 0x51, 0x49, 0x46],
    '3': [0x21, 0x41, 0x45, 0x4B, 0x31],
    '4': [0x18, 0x14, 0x12, 0x7F, 0x10],
    '5': [0x27, 0x45, 0x45, 0x45, 0x39],
    '6': [0x3C, 0x4A, 0x49, 0x49, 0x30],
    '7': [0x01, 0x71, 0x09, 0x05, 0x03],
    '8': [0x36, 0x49, 0x49, 0x49, 0x36],
    '9': [0x06, 0x49, 0x49, 0x29, 0x1E],
    ':': [0x00, 0x36, 0x36, 0x00, 0x00],
    ';': [0x00, 0x56, 0x36, 0x00, 0x00],
    '<': [0x08, 0x14, 0x22, 0x41, 0x00],
    '=': [0x14, 0x14, 0x14, 0x14, 0x14],
    '>': [0x00, 0x41, 0x22, 0x14, 0x08],
    '?': [0x02, 0x01, 0x51, 0x09, 0x06],
    '@': [0x32, 0x49, 0x79, 0x41, 0x3E],
    'A': [0x7E, 0x11, 0x11, 0x11, 0x7E],
    'B': [0x7F, 0x49, 0x49, 0x49, 0x36],
    'C': [0x3E, 0x41, 0x41, 0x41, 0x22],
    'D': [0x7F, 0x41, 0x41, 0x22, 0x1C],
    'E': [0x7F, 0x49, 0x49, 0x49, 0x41],
    'F': [0x7F, 0x09, 0x09, 0x09, 0x01],
    'G': [0x3E, 0x41, 0x49, 0x49, 0x7A],
    'H': [0x7F, 0x08, 0x08, 0x08, 0x7F],
    'I': [0x00, 0x41, 0x7F, 0x41, 0x00],
    'J': [0x20, 0x40, 0x41, 0x3F, 0x01],
    'K': [0x7F, 0x08, 0x14, 0x22, 0x41],
    'L': [0x7F, 0x40, 0x40, 0x40, 0x40],
    'M': [0x7F, 0x02, 0x0C, 0x02, 0x7F],
    'N': [0x7F, 0x04, 0x08, 0x10, 0x7F],
    'O': [0x3E, 0x41, 0x41, 0x41, 0x3E],
    'P': [0x7F, 0x09, 0x09, 0x09, 0x06],
    'Q': [0x3E, 0x41, 0x51, 0x21, 0x5E],
    'R': [0x7F, 0x09, 0x19, 0x29, 0x46],
    'S': [0x46, 0x49, 0x49, 0x49, 0x31],
    'T': [0x01, 0x01, 0x7F, 0x01, 0x01],
    'U': [0x3F, 0x40, 0x40, 0x40, 0x3F],
    'V': [0x1F, 0x20, 0x40, 0x20, 0x1F],
    'W': [0x7F, 0x20, 0x18, 0x20, 0x7F],
    'X': [0x63, 0x14, 0x08, 0x14, 0x63],
    'Y': [0x07, 0x08, 0x70, 0x08, 0x07],
    'Z': [0x61, 0x51, 0x49, 0x45, 0x43],
    '_': [0x80, 0x80, 0x80, 0x80, 0x80],
}


class SenseStick:
    """Emulates and bridges the Sense HAT 5-way joystick."""
    direction_any = DirectionStr('any')
    direction_up = DirectionStr('up')
    direction_down = DirectionStr('down')
    direction_left = DirectionStr('left')
    direction_right = DirectionStr('right')
    direction_middle = DirectionStr('middle')
    direction_centre = DirectionStr('middle')
    direction_enter = DirectionStr('middle')

    action_any = ActionStr('any')
    action_pressed = ActionStr('pressed')
    action_released = ActionStr('released')
    action_held = ActionStr('held')
    action_press = ActionStr('pressed')
    action_release = ActionStr('released')
    action_hold = ActionStr('held')

    def __init__(self, hat):
        self._hat = hat
        self._last_event_time = 0

    def get_events(self):
        collected = []
        # 1. Check real physical stick if native hardware is present
        if self._hat._real_sense and hasattr(self._hat._real_sense, 'stick'):
            try:
                events = self._hat._real_sense.stick.get_events()
                if events:
                    for ev in events:
                        d_str = str(ev.direction).lower()
                        if d_str in ('centre', 'center', 'enter', 'middle'):
                            d_str = 'middle'
                        act_str = str(ev.action).lower()
                        if act_str in ('press', 'pressed'): act_norm = 'pressed'
                        elif act_str in ('release', 'released'): act_norm = 'released'
                        elif act_str in ('hold', 'held'): act_norm = 'held'
                        else: act_norm = act_str
                        collected.append(InputEvent(
                            getattr(ev, 'timestamp', time.time()),
                            DirectionStr(d_str),
                            ActionStr(act_norm)
                        ))
                    if collected:
                        return collected
            except Exception:
                pass

        # 2. Check telemetry from hardware daemon or project bridge
        if os.path.exists('/tmp/pi_sense_hardware.json'):
            try:
                with open('/tmp/pi_sense_hardware.json', 'r') as f:
                    data = json.load(f)

                    # Check recent events array
                    recent = data.get('joystickEvents', [])
                    if isinstance(recent, list) and recent:
                        for ev_item in recent:
                            ts = ev_item.get('timestamp', 0)
                            if ts > self._last_event_time:
                                self._last_event_time = ts
                                raw_dir = ev_item.get('direction', 'middle')
                                if raw_dir in ('centre', 'center', 'enter'):
                                    raw_dir = 'middle'
                                raw_act = ev_item.get('action', 'press')
                                if raw_act in ('press', 'pressed'): act_norm = 'pressed'
                                elif raw_act in ('release', 'released'): act_norm = 'released'
                                elif raw_act in ('hold', 'held'): act_norm = 'held'
                                else: act_norm = raw_act
                                collected.append(InputEvent(time.time(), DirectionStr(raw_dir), ActionStr(act_norm)))
                        if collected:
                            return collected

                    # Fallback to single lastJoystick
                    last_ev = data.get('lastJoystick')
                    if last_ev and last_ev.get('timestamp', 0) > self._last_event_time:
                        self._last_event_time = last_ev['timestamp']
                        raw_dir = last_ev.get('direction', 'middle')
                        if raw_dir in ('centre', 'center', 'enter'):
                            raw_dir = 'middle'
                        raw_act = last_ev.get('action', 'press')
                        if raw_act in ('press', 'pressed'): act_norm = 'pressed'
                        elif raw_act in ('release', 'released'): act_norm = 'released'
                        elif raw_act in ('hold', 'held'): act_norm = 'held'
                        else: act_norm = raw_act
                        return [InputEvent(time.time(), DirectionStr(raw_dir), ActionStr(act_norm))]
            except Exception:
                pass

        return []

    def wait_for_event(self, emptybuffer=False):
        start = time.time()
        while time.time() - start < 10.0:
            events = self.get_events()
            if events:
                return events[-1]
            time.sleep(0.04)
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
                        t = float(data.get("temperature", 24.6))
                        # If temperature arrives in Fahrenheit (e.g. ~132°F), convert to Celsius
                        if t > 70.0:
                            t = (t - 32.0) * 5.0 / 9.0
                        # Calibrate Raspberry Pi 4 CPU radiant heat
                        if t > 38.0:
                            t = round(max(18.5, t - 25.5), 1)
                        data["temperature"] = t
                        return data
            except Exception:
                pass

        # 2. Try querying native sense_hat directly
        if self._real_sense:
            try:
                orient = self._real_sense.get_orientation()
                raw_t = round(self._real_sense.get_temperature(), 2)
                calc_raw = (raw_t - 32.0) * 5.0 / 9.0 if raw_t > 70.0 else raw_t
                ambient_t = round(max(18.5, calc_raw - 25.5), 1) if calc_raw > 38.0 else round(calc_raw, 1)
                return {
                    "temperature": ambient_t,
                    "rawTemperature": raw_t,
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

    def show_message(self, text_string, scroll_speed=0.07, text_colour=[255, 255, 255], back_colour=[0, 0, 0]):
        """
        Scrolls text horizontally across the 8x8 RGB LED matrix display in a moving marquee format.
        Updates physical hardware (framebuffer / Sense HAT) and digital twin in real time.
        """
        text_string = str(text_string)
        tc = [int(max(0, min(255, c))) for c in text_colour]
        bc = [int(max(0, min(255, c))) for c in back_colour]

        # 1. Forward to physical hardware if native driver is attached
        if self._real_sense and hasattr(self._real_sense, 'show_message'):
            try:
                self._real_sense.show_message(text_string, scroll_speed=scroll_speed, text_colour=tc, back_colour=bc)
                return
            except Exception:
                pass

        # 2. Build full horizontal column strip with 8 empty lead-in and lead-out columns
        columns = [0] * 8
        for ch in text_string:
            ch_cols = FONT_5x7.get(ch.upper(), [0, 0, 0, 0, 0])
            columns.extend(ch_cols)
            columns.append(0)  # 1-column spacing between letters
        columns.extend([0] * 8)

        total_frames = len(columns) - 8
        for offset in range(total_frames):
            frame_pixels = []
            for y in range(8):
                for x in range(8):
                    col_val = columns[offset + x]
                    is_lit = bool((col_val >> y) & 1)
                    frame_pixels.append(tc if is_lit else bc)
            self.set_pixels(frame_pixels)
            time.sleep(max(0.015, float(scroll_speed)))

        self.clear(*bc)

    def show_letter(self, s, text_colour=[255, 255, 255], back_colour=[0, 0, 0]):
        """Displays a single character centered on the 8x8 RGB LED matrix."""
        if not s:
            self.clear(*back_colour)
            return
        tc = [int(max(0, min(255, c))) for c in text_colour]
        bc = [int(max(0, min(255, c))) for c in back_colour]

        if self._real_sense and hasattr(self._real_sense, 'show_letter'):
            try:
                self._real_sense.show_letter(s, text_colour=tc, back_colour=bc)
                return
            except Exception:
                pass

        char = str(s)[0].upper()
        ch_cols = FONT_5x7.get(char, [0, 0, 0, 0, 0])
        frame_pixels = []
        for y in range(8):
            for x in range(8):
                if 1 <= x <= 5:
                    col_val = ch_cols[x - 1]
                    is_lit = bool((col_val >> y) & 1)
                    frame_pixels.append(tc if is_lit else bc)
                else:
                    frame_pixels.append(bc)
        self.set_pixels(frame_pixels)

    def get_temperature(self):
        t = float(self._get_sensors().get("temperature", 24.6))
        if t > 70.0:
            t = (t - 32.0) * 5.0 / 9.0
        if t > 38.0:
            t = round(max(18.5, t - 25.5), 1)
        return round(t, 2)

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
        if os.path.exists('/tmp/pi_sense_hardware.json'):
            try:
                with open('/tmp/pi_sense_hardware.json', 'r') as f:
                    data = json.load(f)
                    last_ev = data.get('lastJoystick')
                    if last_ev:
                        raw_dir = last_ev.get('direction', 'middle')
                        if raw_dir in ('centre', 'center', 'enter'):
                            raw_dir = 'middle'
                        raw_act = last_ev.get('action', 'press')
                        if raw_act in ('press', 'pressed'): act_norm = 'pressed'
                        elif raw_act in ('release', 'released'): act_norm = 'released'
                        elif raw_act in ('hold', 'held'): act_norm = 'held'
                        else: act_norm = raw_act
                        return {"direction": DirectionStr(raw_dir), "action": ActionStr(act_norm)}
            except Exception:
                pass
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
        self._apply_hardware_pwm()
        self._emit(active=False)

    def _apply_hardware_pwm(self):
        # 1. Drive physical pin muxing via pinctrl / raspi-gpio
        # On Raspberry Pi 4 (BCM2711): GPIO 18 & 19 use Alt5 (a5) for hardware PWM.
        # GPIO 12 & 13 use Alt0 (a0) for hardware PWM.
        alt_func = "a5" if self.channel in (18, 19) else "a0"
        try:
            if self.is_running:
                os.system(f"pinctrl set {self.channel} {alt_func} >/dev/null 2>&1 || raspi-gpio set {self.channel} {alt_func} >/dev/null 2>&1")
            else:
                os.system(f"pinctrl set {self.channel} op dl >/dev/null 2>&1 || raspi-gpio set {self.channel} op dl >/dev/null 2>&1")
        except Exception:
            pass

        # 2. Drive Linux hardware PWM kernel interface (/sys/class/pwm/pwmchip0)
        try:
            pwm_chip = "/sys/class/pwm/pwmchip0"
            pwm_sub = "pwm1" if self.channel in (13, 19) else "pwm0"
            pwm_id = "1" if self.channel in (13, 19) else "0"
            pwm_path = f"{pwm_chip}/{pwm_sub}"

            if os.path.exists(pwm_chip):
                if not os.path.exists(pwm_path):
                    with open(f"{pwm_chip}/export", "w") as f:
                        f.write(f"{pwm_id}\n")
                if os.path.exists(pwm_path) and self.freq > 0:
                    period_ns = int(1_000_000_000 / self.freq)
                    duty_ns = int(period_ns * (max(0.0, min(100.0, self.duty)) / 100.0))
                    try:
                        with open(f"{pwm_path}/duty_cycle", "w") as f:
                            f.write("0\n")
                    except Exception:
                        pass
                    with open(f"{pwm_path}/period", "w") as f:
                        f.write(f"{period_ns}\n")
                    with open(f"{pwm_path}/duty_cycle", "w") as f:
                        f.write(f"{duty_ns}\n")
                    with open(f"{pwm_path}/enable", "w") as f:
                        f.write("1\n" if self.is_running else "0\n")
        except Exception:
            pass

        # 3. Queue command for background supervisor daemon
        try:
            with open("/tmp/pi_hw_commands.jsonl", "a") as f:
                f.write(json.dumps({
                    "action": "pwm",
                    "channel": self.channel,
                    "duty": self.duty,
                    "freq": self.freq,
                    "active": self.is_running,
                    "timestamp": int(time.time() * 1000)
                }) + "\n")
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
