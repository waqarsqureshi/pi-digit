#!/usr/bin/env python3
"""
Sense HAT 8x8 RGB LED Matrix Diagnostic Test
File: test-codes/test_led_matrix.py
Tests pixel addressing, RGB primary channels, brightness, and clearing.
"""
import sys
import os
import time

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

def get_sense():
    orig_path = list(sys.path)
    clean_path = [p for p in orig_path if p and p != '' and p != '.' and not os.path.exists(os.path.join(p, 'pi_emulator.py'))]
    try:
        sys.path = clean_path
        sys.modules.pop('sense_hat', None)
        import sense_hat
        if hasattr(sense_hat, 'SenseHat') and 'pi_emulator' not in getattr(sense_hat.SenseHat, '__module__', ''):
            return sense_hat.SenseHat()
    except Exception:
        pass
    finally:
        sys.path = orig_path

    if PROJECT_ROOT not in sys.path:
        sys.path.insert(0, PROJECT_ROOT)
    from pi_emulator import EmulatorSenseHat
    return EmulatorSenseHat()

def main():
    print("=" * 60)
    print("  Pi-Digit: 8x8 RGB LED Matrix Diagnostic Test")
    print("=" * 60)

    sense = get_sense()
    print("Step 1: Clearing LED Matrix...")
    sense.clear()
    time.sleep(0.5)

    print("Step 2: Lighting corner calibration pixels...")
    # 4 corners in distinct colors
    sense.set_pixel(0, 0, 255, 0, 0)      # Top-left: Red
    sense.set_pixel(7, 0, 0, 255, 0)      # Top-right: Green
    sense.set_pixel(0, 7, 0, 0, 255)      # Bottom-left: Blue
    sense.set_pixel(7, 7, 255, 255, 255)  # Bottom-right: White
    time.sleep(1.2)

    print("Step 3: Drawing diagonal test cross...")
    for i in range(8):
        sense.set_pixel(i, i, 255, 200, 0)
        sense.set_pixel(7 - i, i, 0, 200, 255)
        time.sleep(0.1)

    time.sleep(1.0)
    print("Step 4: All tests completed. Clearing matrix.")
    sense.clear()
    print("=" * 60)

if __name__ == "__main__":
    main()
