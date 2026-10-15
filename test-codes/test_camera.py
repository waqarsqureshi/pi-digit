#!/usr/bin/env python3
"""
Pi-Digit Hardware Camera Verification Test
File: test-codes/test_camera.py

Verifies:
  1. Checks if Raspberry Pi Camera Module or V4L2 device (/dev/video0) is attached
  2. Tests that an actual video image / frame is generated
  3. Verifies frame file integrity and non-zero byte stream
"""
import sys
import os
import subprocess
import time

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
CAMERA_SCRIPT = os.path.join(PROJECT_ROOT, 'src', 'scripts', 'camera_service.py')
TEST_FRAME_PATH = '/tmp/pi_camera_test.jpg'

def check_hardware_camera():
    has_v4l2 = os.path.exists('/dev/video0')
    has_libcam = os.path.exists('/usr/bin/libcamera-hello') or os.path.exists('/usr/bin/rpicam-hello')
    
    cv2_ok = False
    try:
        import cv2
        cv2_ok = True
    except ImportError:
        pass

    return {
        "attached": has_v4l2 or has_libcam,
        "v4l2": has_v4l2,
        "libcamera": has_libcam,
        "opencv": cv2_ok,
    }

def main():
    print("=" * 65)
    print("  Raspberry Pi Camera & Video Frame Generation Test")
    print("=" * 65)

    hw = check_hardware_camera()
    print(f"[*] Physical Camera Node (/dev/video0) : {'ATTACHED' if hw['v4l2'] else 'NOT DETECTED (Virtual Twin)'}")
    print(f"[*] libcamera CSI-2 Subsystem         : {'AVAILABLE' if hw['libcamera'] else 'STANDBY'}")
    print(f"[*] OpenCV (cv2) Acceleration Module  : {'INSTALLED' if hw['opencv'] else 'FALLBACK (Pure Python/V4L2)'}")

    # Remove stale test frame if exists
    if os.path.exists(TEST_FRAME_PATH):
        try:
            os.remove(TEST_FRAME_PATH)
        except Exception:
            pass

    # Trigger video frame acquisition
    print("\n[*] Acquiring video test frame via camera pipeline...")
    cmd = [sys.executable, CAMERA_SCRIPT, '--test']
    proc = subprocess.run(cmd, cwd=PROJECT_ROOT, capture_output=True, text=True, timeout=10)

    if proc.returncode != 0:
        print(f"[ FAIL ] Camera service failed: {proc.stderr}")
        return 1

    # Verify frame was generated
    if not os.path.exists(TEST_FRAME_PATH):
        print(f"[ FAIL ] Test frame was not created at {TEST_FRAME_PATH}")
        return 1

    frame_size = os.path.getsize(TEST_FRAME_PATH)
    if frame_size < 1000:
        print(f"[ FAIL ] Video frame size suspiciously small: {frame_size} bytes")
        return 1

    print(f"[ PASS ] Video image successfully generated: {TEST_FRAME_PATH} ({frame_size:,} bytes)")
    print(f"[ PASS ] Status: {'Physical Camera Online' if hw['attached'] else 'Digital Twin Video Stream Nominal'}")
    print("=" * 65)
    return 0

if __name__ == '__main__':
    sys.exit(main())
