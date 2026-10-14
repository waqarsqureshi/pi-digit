#!/usr/bin/env python3
"""
Master Test Runner: Verify Individual Components
File: test-codes/run_all_tests.py

Runs automated unit and component verification tests across:
  1. 8x8 RGB LED Matrix Subsystem
  2. Environmental Sensors & Temperature Calibration (HTS221 / LPS25H)
  3. Sense HAT 5-Way Joystick & Event State Machine (Up, Down, Left, Right, Middle, Hold, Release)
  4. Hardware PWM Signal Generator (GPIO 18)
  5. 16x2 I2C Character LCD Subsystem
  6. Comprehensive Platform Hardware Diagnostics
"""
import sys
import os
import time
import subprocess

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
TESTS_DIR = os.path.join(PROJECT_ROOT, 'test-codes')

TEST_SUITE = [
    {
        "name": "8x8 RGB LED Matrix Subsystem",
        "script": "test_led_matrix.py",
        "args": ["--check"],
    },
    {
        "name": "Environmental Sensors & Calibration",
        "script": "test_sensors.py",
        "args": ["--check"],
    },
    {
        "name": "5-Way Joystick & State Machine",
        "script": "test_joystick.py",
        "args": ["--check"],
    },
    {
        "name": "Hardware PWM0 Signal Generator",
        "script": "test_pwm.py",
        "args": ["--check"],
    },
    {
        "name": "16x2 I2C Character LCD Viewport",
        "script": "test_lcd.py",
        "args": [],
    },
    {
        "name": "Full Hardware Diagnostics & Self-Test",
        "script": "test_diagnostics.py",
        "args": [],
    },
]

def main():
    print("=" * 70)
    print("  Pi-Digit: Master Automated Component Verification Suite")
    print(f"  Working Directory: {PROJECT_ROOT}")
    print(f"  Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    results = []
    total_start = time.time()

    for idx, test in enumerate(TEST_SUITE, 1):
        test_path = os.path.join(TESTS_DIR, test["script"])
        cmd = [sys.executable, test_path] + test["args"]
        print(f"\n[{idx}/{len(TEST_SUITE)}] Running {test['name']}...")
        print(f"CMD: {' '.join(cmd)}")

        t0 = time.time()
        try:
            proc = subprocess.run(cmd, cwd=PROJECT_ROOT, capture_output=True, text=True, timeout=15)
            duration = time.time() - t0
            passed = proc.returncode == 0
            
            # Print last few lines of output
            lines = [l for l in proc.stdout.strip().split('\n') if l]
            for l in lines[-4:]:
                print(f"   | {l}")
            if proc.stderr:
                err_lines = [l for l in proc.stderr.strip().split('\n') if l]
                for l in err_lines[-2:]:
                    print(f"   ! {l}")

            results.append((test["name"], passed, duration, proc.returncode))
        except subprocess.TimeoutExpired:
            duration = time.time() - t0
            print("   ! TIMEOUT: Test exceeded 15 second safety deadline.")
            results.append((test["name"], False, duration, 124))
        except Exception as e:
            duration = time.time() - t0
            print(f"   ! ERROR: Failed to launch test: {e}")
            results.append((test["name"], False, duration, -1))

    total_duration = time.time() - total_start

    print("\n" + "=" * 70)
    print("  AUTOMATED VERIFICATION SUMMARY REPORT")
    print("=" * 70)
    print(f"{'Component / Subsystem Test':<44} | {'Status':<8} | {'Duration'}")
    print("-" * 70)

    all_passed = True
    passed_count = 0

    for name, passed, duration, code in results:
        status_str = "[ PASS ]" if passed else "[ FAIL ]"
        if passed:
            passed_count += 1
        else:
            all_passed = False
        print(f"{name:<44} | {status_str:<8} | {duration:5.2f}s")

    print("-" * 70)
    print(f"Total Tests Run: {len(TEST_SUITE)} | Passed: {passed_count} | Failed: {len(TEST_SUITE) - passed_count}")
    print(f"Total Execution Time: {total_duration:5.2f}s")
    print("=" * 70)

    if all_passed:
        print(">>> ALL INDIVIDUAL HARDWARE SUBSYSTEMS VERIFIED AND NOMINAL <<<\n")
        sys.exit(0)
    else:
        print(">>> SOME SUBSYSTEM TESTS ENCOUNTERED WARNINGS OR FAILURES <<<\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
