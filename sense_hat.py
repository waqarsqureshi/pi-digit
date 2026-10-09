"""
Sense HAT Python Library for Pi-Digit Digital Twin and Physical Computing.
Seamlessly bridges simulated student code and physical hardware.
"""
import sys
import json
import time
import os

class SenseHat:
    def __init__(self):
        self._rotation = 0
        self.low_light = False
        self._pixels = [[0, 0, 0] for _ in range(64)]

    def _emit(self, event_type, **kwargs):
        payload = {"type": event_type, **kwargs}
        print(f"__PI_TWIN_EVENT__:{json.dumps(payload)}", flush=True)

    def _get_sensors(self):
        try:
            if os.path.exists('/tmp/pi_twin_sensors.json'):
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
            "compassHeading": 142.5
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
            self._emit("set_pixel", x=x, y=y, r=r, g=g, b=b)

    def get_pixel(self, x, y):
        x = int(x)
        y = int(y)
        if 0 <= x < 8 and 0 <= y < 8:
            return self._pixels[y * 8 + x]
        return [0, 0, 0]

    def set_pixels(self, pixel_list):
        if len(pixel_list) != 64:
            raise ValueError("set_pixels requires a list of exactly 64 RGB tuples or lists")
        formatted = []
        for p in pixel_list:
            formatted.append([int(p[0]), int(p[1]), int(p[2])])
        self._pixels = formatted
        self._emit("set_pixels", pixels=formatted)

    def get_pixels(self):
        return [list(p) for p in self._pixels]

    def clear(self, *args):
        if len(args) == 0:
            r, g, b = 0, 0, 0
        elif len(args) == 1:
            r, g, b = args[0]
        elif len(args) == 3:
            r, g, b = args
        else:
            raise ValueError("clear takes 0, 1, or 3 arguments")
        r = int(r)
        g = int(g)
        b = int(b)
        self._pixels = [[r, g, b] for _ in range(64)]
        self._emit("clear", r=r, g=g, b=b)

    def show_message(self, text, scroll_speed=0.1, text_colour=[255, 255, 255], back_colour=[0, 0, 0]):
        print(f"[Sense HAT Matrix Message]: {text}", flush=True)
        # Visual blink to indicate activity
        self.clear(*back_colour)
        time.sleep(scroll_speed)
        self.clear(*text_colour)
        time.sleep(scroll_speed * 1.5)
        self.clear(*back_colour)

    def show_letter(self, char, text_colour=[255, 255, 255], back_colour=[0, 0, 0]):
        print(f"[Sense HAT Letter]: {char}", flush=True)
        self.clear(*back_colour)
        # Light up center 4 pixels for visual representation
        for x in [3, 4]:
            for y in [3, 4]:
                self.set_pixel(x, y, *text_colour)

    def get_temperature(self):
        return self._get_sensors().get("temperature", 24.6)

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
        return self._get_sensors().get("humidity", 48.2)

    @property
    def humidity(self):
        return self.get_humidity()

    def get_pressure(self):
        return self._get_sensors().get("pressure", 1013.25)

    @property
    def pressure(self):
        return self.get_pressure()

    def get_orientation_degrees(self):
        sensors = self._get_sensors()
        return {
            "pitch": 0.0,
            "roll": 0.0,
            "yaw": sensors.get("compassHeading", 142.5)
        }

    def get_orientation_radians(self):
        import math
        deg = self.get_orientation_degrees()
        return {k: math.radians(v) for k, v in deg.items()}

    def get_compass(self):
        return self._get_sensors().get("compassHeading", 142.5)

    def get_accelerometer(self):
        return self.get_orientation_degrees()

    def get_accelerometer_raw(self):
        return self._get_sensors().get("accelerometer", {"x": 0.0, "y": 0.0, "z": 1.0})

    def get_gyroscope_raw(self):
        return self._get_sensors().get("gyroscope", {"x": 0.0, "y": 0.0, "z": 0.0})

    def set_rotation(self, r):
        self._rotation = r

    def get_last_joystick_event(self):
        return {"direction": "centre", "action": "press"}

    def simulate_joystick(self, direction, action="press"):
        self._emit("joystick", direction=direction, action=action)
