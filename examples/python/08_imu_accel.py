# 08. Motion / IMU telemetry stream
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
    print("=== 9-DOF IMU Motion Stream ===", flush=True)
    print(f"Source: {source_label}", flush=True)
    print("Sample | Accel X  Accel Y  Accel Z | Yaw", flush=True)
    print("-" * 52, flush=True)

    for i in range(1, 16):
        accel = sense.get_accelerometer_raw()
        try:
            yaw = float(sense.get_compass())
        except Exception:
            orient = sense.get_orientation()
            yaw = float(orient.get('yaw', 0.0))

        print(
            f"{i:>4}   | {accel['x']:>7.3f}  {accel['y']:>7.3f}  {accel['z']:>7.3f} | {yaw:>6.1f}°",
            flush=True,
        )
        time.sleep(0.4)

    print("-" * 52, flush=True)
    print("Motion streaming complete.", flush=True)


if __name__ == "__main__":
    main()
