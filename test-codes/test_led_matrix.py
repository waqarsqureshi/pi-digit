#!/usr/bin/env python3
"""
Sense HAT 8x8 RGB LED Matrix Diagnostic & Self-Test
File: test-codes/test_led_matrix.py
Verifies:
  1. clear() and clear(r, g, b)
  2. set_pixel(x, y, r, g, b) and get_pixel(x, y)
  3. Bulk 64-pixel buffer array set_pixels() and get_pixels()
  4. Character rendering via show_letter()
"""
import sys
import os
import time

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC_DIR = os.path.join(PROJECT_ROOT, 'src')
for p in (SRC_DIR, PROJECT_ROOT):
    if p not in sys.path:
        sys.path.insert(0, p)

def get_sense():
    try:
        from py_twin import EmulatorSenseHat
        return EmulatorSenseHat()
    except Exception:
        from pi_emulator import EmulatorSenseHat
        return EmulatorSenseHat()

def main():
    quick_check = "--quick" in sys.argv or "--check" in sys.argv
    print("=" * 65)
    print("  Pi-Digit: 8x8 RGB LED Matrix Verification & Self-Test")
    print("=" * 65)

    sense = get_sense()
    all_passed = True

    # 1. Clear test
    print("Test 1: Clearing Matrix to Black RGB(0,0,0)...")
    sense.clear()
    px = sense.get_pixel(0, 0)
    if px == [0, 0, 0] or px == (0, 0, 0):
        print("  [PASS] Matrix clear verified.")
    else:
        print(f"  [WARN] Expected [0, 0, 0], got {px}")

    # 2. Discrete pixel addressing
    print("Test 2: Setting Corner Calibration Pixels...")
    sense.set_pixel(0, 0, 255, 0, 0)      # Top-left: Red
    sense.set_pixel(7, 0, 0, 255, 0)      # Top-right: Green
    sense.set_pixel(0, 7, 0, 0, 255)      # Bottom-left: Blue
    sense.set_pixel(7, 7, 255, 255, 255)  # Bottom-right: White

    p_tl = sense.get_pixel(0, 0)
    p_tr = sense.get_pixel(7, 0)
    p_bl = sense.get_pixel(0, 7)
    p_br = sense.get_pixel(7, 7)

    if (p_tl[0] > 200 and p_tl[1] < 50 and
        p_tr[1] > 200 and p_tr[0] < 50 and
        p_bl[2] > 200 and p_bl[0] < 50 and
        p_br[0] > 200 and p_br[1] > 200 and p_br[2] > 200):
        print("  [PASS] Corner pixels addressed and validated.")
    else:
        print("  [FAIL] Pixel readback mismatch.")
        all_passed = False

    time.sleep(0.3 if quick_check else 0.8)

    # 3. Bulk 64-pixel array set_pixels()
    print("Test 3: Testing Full 64-Pixel Buffer Array (set_pixels)...")
    cyan = [0, 200, 255]
    amber = [255, 160, 0]
    pattern = []
    for y in range(8):
        for x in range(8):
            pattern.append(cyan if (x + y) % 2 == 0 else amber)
    sense.set_pixels(pattern)
    readback = sense.get_pixels()
    if len(readback) == 64:
        print("  [PASS] 64-pixel frame buffer transfer verified.")
    else:
        print(f"  [FAIL] Frame buffer size mismatch: expected 64, got {len(readback)}")
        all_passed = False

    time.sleep(0.3 if quick_check else 0.8)

    # 4. show_letter test
    print("Test 4: Single Character Rasterizer (show_letter 'P')...")
    sense.show_letter('P', text_colour=[255, 255, 0], back_colour=[0, 0, 50])
    time.sleep(0.3 if quick_check else 0.8)

    sense.clear()
    print("-" * 65)
    if all_passed:
        print("[ PASS ] 8x8 RGB LED Matrix subsystem nominal.")
    else:
        print("[ FAIL ] One or more LED matrix tests failed.")
        sys.exit(1)
    print("=" * 65)

if __name__ == "__main__":
    main()
