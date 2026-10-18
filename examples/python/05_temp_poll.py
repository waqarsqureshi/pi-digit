# 05. Sensor Telemetry Logger
# Polls Sense HAT temperature, humidity, and pressure.
import os
import sys
import time

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC_DIR = os.path.join(PROJECT_ROOT, 'src')
for p in (SRC_DIR, PROJECT_ROOT):
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from sense_hat import SenseHat  # type: ignore
    source_label = "sense_hat (hardware)"
except Exception:
    try:
        from py_twin import SenseHat  # type: ignore
        source_label = "py_twin (emulator bridge)"
    except Exception:
        from pi_twin import SenseHat  # type: ignore
        source_label = "pi_twin fallback"


def main() -> None:
    sense = SenseHat()
    print("=== Sense HAT Live Telemetry Polling ===", flush=True)
    print(f"Source: {source_label}", flush=True)
    print("Sample | Temp (°C) | Humidity (%) | Pressure (hPa)", flush=True)
    print("-" * 52, flush=True)

    for i in range(1, 11):
        t = float(sense.get_temperature())
        h = float(sense.get_humidity())
        p = float(sense.get_pressure())
        print(f"{i:>4}   | {t:>8.2f} | {h:>11.2f} | {p:>14.2f}", flush=True)
        time.sleep(0.5)

    print("Telemetry collection nominal.", flush=True)


if __name__ == "__main__":
    main()
