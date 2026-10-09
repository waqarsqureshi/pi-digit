# 01. Hello World
# Pi-Digit Physical Computing & Digital Twin
import time
from pi_emulator import System

print("=== Pi-Digit Physical Computing Foundation ===")
print("Host: Raspberry Pi 4 Model B (Bookworm)")
print("Hardware Bridge: Active")
for i in range(1, 4):
    print(f"Step {i}/3: Initializing subsystem checks...")
    time.sleep(0.4)
print("System Ready! Hello Raspberry Pi Student.")
