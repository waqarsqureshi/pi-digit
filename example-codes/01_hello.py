# 01. Hello World
# Pi-Digit Physical Computing & Digital Twin
import sys
import os
import time

_SRC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src'))
if _SRC_DIR not in sys.path:
    sys.path.insert(0, _SRC_DIR)

from py_twin import System

print("=== Pi-Digit Physical Computing Foundation ===")
print("Host: Raspberry Pi 4 Model B (Bookworm)")
print("Hardware Bridge: Active")
for i in range(1, 4):
    print(f"Step {i}/3: Initializing subsystem checks...")
    time.sleep(0.4)
print("System Ready! Hello Raspberry Pi Student.")
