# 08. 9-DOF IMU Accelerometer & Motion Telemetry
# Reads real-time acceleration and orientation from Sense HAT LSM9DS1
import sys
import os
import time

_SRC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src'))
if _SRC_DIR not in sys.path:
    sys.path.insert(0, _SRC_DIR)

try:
    from py_twin import SenseHat
except ImportError:
    from pi_emulator import SenseHat

sense = SenseHat()
print("=== 9-DOF IMU Accelerometer Motion Stream ===")
print("Move or tilt your Raspberry Pi 4 to observe dynamic acceleration changes!")
print("-" * 60)
print(f"{'Sample':<8} | {'Accel X (g)':<12} {'Accel Y (g)':<12} {'Accel Z (g)':<12} | {'Heading':<8}")
print("-" * 60)

for i in range(1, 16):
    accel = sense.get_accelerometer_raw()
    orient = sense.get_orientation()
    heading = orient.get('yaw', 0.0)
    print(f"#{i:<7} | {accel['x']:>10.3f}   {accel['y']:>10.3f}   {accel['z']:>10.3f}   | {heading:>6.1f}°")
    time.sleep(0.4)

print("-" * 60)
print("Motion streaming complete.")
