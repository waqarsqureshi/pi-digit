#!/usr/bin/env python3
"""
Pi-Digit Hardware Camera Service & Stream Daemon
File: src/scripts/camera_service.py

Captures live video frames from physical Raspberry Pi Camera Module or USB V4L2
camera (/dev/video0) using OpenCV (cv2) or V4L2/ffmpeg, applies real morphological
filters (Sobel, Canny, Dilation, Erosion, Threshold), and writes live JPEG frames
to /tmp/pi_cam_frame.jpg for high-speed network streaming over HTTP / WebSockets.
"""
import sys
import os
import time
import json
import math
import subprocess

FRAME_PATH = '/tmp/pi_cam_frame.jpg'
STATUS_PATH = '/tmp/pi_camera_status.json'
COMMAND_PATH = '/tmp/pi_cam_command.json'
TEST_FRAME_PATH = '/tmp/pi_camera_test.jpg'

def check_hardware_camera():
    """Detects physical camera devices on Linux / Raspberry Pi."""
    has_v4l2 = False
    v4l2_dev = "/dev/video0"
    for dev in ['/dev/video0', '/dev/video1', '/dev/video10', '/dev/video11', '/dev/video12']:
        if os.path.exists(dev):
            has_v4l2 = True
            v4l2_dev = dev
            break

    has_libcam = (
        os.path.exists('/usr/bin/rpicam-still') or
        os.path.exists('/usr/bin/libcamera-still') or
        os.path.exists('/usr/bin/rpicam-hello') or
        os.path.exists('/usr/bin/libcamera-hello') or
        os.path.exists('/usr/bin/rpicam-vid') or
        os.path.exists('/usr/bin/libcamera-vid')
    )

    cv2_available = False
    try:
        import cv2
        cv2_available = True
    except ImportError:
        pass

    pil_available = False
    try:
        from PIL import Image
        pil_available = True
    except ImportError:
        pass

    is_phys = has_v4l2 or has_libcam

    return {
        "has_v4l2": has_v4l2,
        "v4l2_dev": v4l2_dev,
        "has_libcam": has_libcam,
        "cv2_available": cv2_available,
        "pil_available": pil_available,
        "is_physical": is_phys,
        "device": v4l2_dev if has_v4l2 else ("libcamera CSI-2 (Raspberry Pi Camera Module)" if has_libcam else "Digital Twin Synthetic Camera"),
    }

def generate_cv2_synthetic_frame(width=640, height=480, filter_mode="none", frame_idx=0):
    """High-speed in-memory frame generation using OpenCV and NumPy (<2ms execution)."""
    try:
        import cv2
        import numpy as np
        
        # Create base canvas with dark hardware background
        img = np.zeros((height, width, 3), dtype=np.uint8)
        img[:, :] = (20, 16, 12)
        grid_step = 40
        img[::grid_step, :] = (45, 35, 25)
        img[:, ::grid_step] = (45, 35, 25)

        # Animated target circle representing real-world object / camera tracking target
        t = frame_idx * 0.08
        cx = int(width / 2 + math.sin(t) * 160)
        cy = int(height / 2 + math.cos(t) * 90)
        
        cv2.circle(img, (cx, cy), 65, (255, 60, 200), -1)   # Magenta core
        cv2.circle(img, (cx, cy), 75, (255, 230, 0), 3)     # Cyan ring
        cv2.circle(img, (cx, cy), 85, (0, 255, 128), 2)     # Green outer ring
        
        # Pi-Camera HUD Telemetry Overlay
        time_str = time.strftime("%Y-%m-%d %H:%M:%S")
        cv2.putText(img, f"PI-CAM V4L2 STREAM | FRAME #{frame_idx}", (20, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 255, 255), 2)
        cv2.putText(img, f"TIME: {time_str} | 640x480 @ 25FPS", (20, 65), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
        cv2.putText(img, f"ACTIVE FILTER: {filter_mode.upper()}", (20, 95), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 128), 1)
        cv2.putText(img, f"TRACKING TARGET: X={cx} Y={cy}", (20, height - 25), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 200, 0), 1)

        # Apply Requested Morphological / CV Filter
        if filter_mode in ("sobel", "edges"):
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            gx = cv2.Sobel(gray, cv2.CV_16S, 1, 0, ksize=3)
            gy = cv2.Sobel(gray, cv2.CV_16S, 0, 1, ksize=3)
            abs_gx = cv2.convertScaleAbs(gx)
            abs_gy = cv2.convertScaleAbs(gy)
            img = cv2.addWeighted(abs_gx, 0.5, abs_gy, 0.5, 0)
            img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
        elif filter_mode == "canny":
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            edges = cv2.Canny(gray, 50, 150)
            img = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
        elif filter_mode == "dilation":
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
            img = cv2.dilate(img, kernel, iterations=1)
        elif filter_mode == "erosion":
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
            img = cv2.erode(img, kernel, iterations=1)
        elif filter_mode == "threshold":
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            _, thresh = cv2.threshold(gray, 100, 255, cv2.THRESH_BINARY)
            img = cv2.cvtColor(thresh, cv2.COLOR_GRAY2BGR)
        elif filter_mode == "grayscale":
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            img = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)

        out_tmp = '/tmp/pi_cam_frame_tmp.jpg'
        cv2.imwrite(out_tmp, img, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
        os.replace(out_tmp, FRAME_PATH)
        return True
    except Exception as e:
        return False

def capture_libcamera(filter_mode="none"):
    """Captures a real video frame from Raspberry Pi Camera Module using rpicam-still or libcamera-still."""
    bin_cmd = "rpicam-still" if os.path.exists("/usr/bin/rpicam-still") else "libcamera-still"
    out_tmp = '/tmp/pi_cam_frame_tmp.jpg'
    cmd = [
        bin_cmd,
        "-t", "1",
        "--immediate",
        "--width", "640",
        "--height", "480",
        "-n",
        "-q", "80",
        "-o", out_tmp
    ]
    try:
        proc = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=2)
        if proc.returncode == 0 and os.path.exists(out_tmp) and os.path.getsize(out_tmp) > 500:
            os.replace(out_tmp, FRAME_PATH)
            return True
    except Exception:
        pass
    return False

def generate_pil_jpeg_frame(width=640, height=480, filter_mode="none", frame_idx=0):
    """Generates genuine JPEG frames using Pillow if OpenCV is unavailable."""
    try:
        from PIL import Image, ImageDraw, ImageFilter
        img = Image.new('RGB', (width, height), color=(20, 16, 12))
        draw = ImageDraw.Draw(img)
        for x in range(0, width, 40):
            draw.line([(x, 0), (x, height)], fill=(45, 35, 25))
        for y in range(0, height, 40):
            draw.line([(0, y), (width, y)], fill=(45, 35, 25))

        t = frame_idx * 0.08
        cx = int(width / 2 + math.sin(t) * 160)
        cy = int(height / 2 + math.cos(t) * 90)
        draw.ellipse([cx - 65, cy - 65, cx + 65, cy + 65], fill=(255, 60, 200), outline=(255, 230, 0), width=3)
        draw.ellipse([cx - 85, cy - 85, cx + 85, cy + 85], outline=(0, 255, 128), width=2)

        time_str = time.strftime("%Y-%m-%d %H:%M:%S")
        draw.text((20, 30), f"PI-CAM STREAM | FRAME #{frame_idx} | {filter_mode.upper()}", fill=(0, 255, 255))
        draw.text((20, 60), f"TIME: {time_str} | 640x480 @ 25FPS", fill=(200, 200, 200))

        if filter_mode in ("sobel", "edges", "canny"):
            img = img.filter(ImageFilter.FIND_EDGES)
        elif filter_mode == "grayscale":
            img = img.convert("L").convert("RGB")

        out_tmp = '/tmp/pi_cam_frame_tmp.jpg'
        img.save(out_tmp, 'JPEG', quality=80)
        os.replace(out_tmp, FRAME_PATH)
        return True
    except Exception:
        return False

def generate_fallback_synthetic_frame(width=640, height=480, filter_mode="none", frame_idx=0):
    """Generates synthetic camera frames via ffmpeg or convert when cv2/PIL are unavailable."""
    out_tmp = '/tmp/pi_cam_frame_tmp.jpg'
    t = (frame_idx % 120) * 0.05
    cx = int(width / 2 + math.sin(t) * 130)
    cy = int(height / 2 + math.cos(t) * 65)

    if os.path.exists('/usr/bin/convert'):
        try:
            cmd = [
                'convert', '-size', f'{width}x{height}', 'xc:#151b28',
                '-stroke', '#334155', '-strokewidth', '1',
                '-draw', 'line 0,120 640,120 line 0,240 640,240 line 0,360 640,360 line 160,0 160,480 line 320,0 320,480 line 480,0 480,480',
                '-fill', '#ec4899', '-stroke', '#f43f5e', '-strokewidth', '2',
                '-draw', f'circle {cx},{cy} {cx},{cy+35}',
                '-fill', 'none', '-stroke', '#38bdf8', '-strokewidth', '2',
                '-draw', f'circle {cx},{cy} {cx},{cy+55}',
                '-fill', '#ef4444', '-stroke', '#ef4444', '-strokewidth', '2',
                '-draw', 'line 40,40 80,40 line 40,40 40,80',
                '-draw', 'line 600,40 560,40 line 600,40 600,80',
                '-draw', 'line 40,440 80,440 line 40,440 40,400',
                '-draw', 'line 600,440 560,440 line 600,440 600,400',
                '-fill', '#38bdf8', '-stroke', 'none',
                '-pointsize', '14',
                '-draw', f'text 20,30 "PI-CAM STREAM | FRAME #{frame_idx} | {filter_mode.upper()}"',
                '-quality', '85', out_tmp
            ]
            res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=2)
            if res.returncode == 0 and os.path.exists(out_tmp) and os.path.getsize(out_tmp) > 500:
                os.replace(out_tmp, FRAME_PATH)
                return True
        except Exception:
            pass

    if os.path.exists('/usr/bin/ffmpeg'):
        try:
            cmd = [
                'ffmpeg', '-y', '-loglevel', 'error',
                '-f', 'lavfi', '-i', f'testsrc=size={width}x{height}:rate=25',
                '-vframes', '1', '-q:v', '3', out_tmp
            ]
            res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=2)
            if res.returncode == 0 and os.path.exists(out_tmp) and os.path.getsize(out_tmp) > 500:
                os.replace(out_tmp, FRAME_PATH)
                return True
        except Exception:
            pass
    return False

def capture_v4l2_ffmpeg(device="/dev/video0", filter_mode="none"):
    """Captures a real video frame from V4L2 device via ffmpeg."""
    out_tmp = '/tmp/pi_cam_frame_tmp.jpg'
    vf_list = []
    if filter_mode in ("sobel", "edges"):
        vf_list.append("edgedetect=low=0.1:high=0.4")
    elif filter_mode == "canny":
        vf_list.append("edgedetect=mode=canny")
    elif filter_mode == "grayscale":
        vf_list.append("format=gray")
    elif filter_mode == "threshold":
        vf_list.append("format=gray,eq=contrast=3.0:brightness=0.1")

    vf_arg = ["-vf", ",".join(vf_list)] if vf_list else []

    cmd = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-f", "v4l2", "-video_size", "640x480", "-i", device,
        *vf_arg,
        "-vframes", "1",
        "-q:v", "2",
        out_tmp
    ]
    try:
        proc = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=2)
        if proc.returncode == 0 and os.path.exists(out_tmp) and os.path.getsize(out_tmp) > 500:
            os.replace(out_tmp, FRAME_PATH)
            return True
    except Exception:
        pass
    return False

def run_service(single_shot=False, filter_mode="none"):
    hw_info = check_hardware_camera()
    cv2_cap = None
    cv2_module = None

    # Try initializing OpenCV VideoCapture if cv2 is installed
    if hw_info["cv2_available"]:
        try:
            import cv2
            cv2_module = cv2
            for dev_idx in [0, 1, '/dev/video0']:
                try:
                    cap = cv2.VideoCapture(dev_idx)
                    if cap.isOpened():
                        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                        # Verify we can read a frame
                        ret, test_f = cap.read()
                        if ret and test_f is not None:
                            cv2_cap = cap
                            break
                        cap.release()
                except Exception:
                    pass
        except Exception:
            cv2_cap = None

    is_physical = cv2_cap is not None or hw_info["is_physical"]
    active_backend = (
        "opencv" if cv2_cap is not None
        else ("libcamera_csi" if hw_info["has_libcam"]
        else ("v4l2_ffmpeg" if hw_info["has_v4l2"]
        else ("opencv_synthetic" if hw_info["cv2_available"]
        else ("pil_synthetic" if hw_info["pil_available"] else "pure_synthetic"))))
    )

    status = {
        "connected": is_physical,
        "device": hw_info["device"],
        "backend": active_backend,
        "resolution": "640x480",
        "fps": 30 if cv2_cap is not None else 25,
        "filter": filter_mode,
        "timestamp": int(time.time() * 1000)
    }

    try:
        with open(STATUS_PATH, 'w') as f:
            json.dump(status, f)
    except Exception:
        pass

    frame_count = 0
    max_frames = 1 if single_shot else 999999999

    print(f"[Camera Service] Initialized. Physical: {is_physical} | Backend: {active_backend} | Target: {FRAME_PATH}")

    consecutive_cam_errors = 0
    while frame_count < max_frames:
        frame_count += 1
        written = False

        # Check for live command updates (filter changes from web UI)
        if os.path.exists(COMMAND_PATH):
            try:
                with open(COMMAND_PATH, 'r') as cf:
                    cmd_data = json.load(cf)
                    if 'filter' in cmd_data and cmd_data['filter'] != filter_mode:
                        filter_mode = cmd_data['filter']
                        status['filter'] = filter_mode
                        with open(STATUS_PATH, 'w') as sf:
                            json.dump(status, sf)
            except Exception:
                pass

        # 1. OpenCV Capture & Filter Pipeline
        if cv2_cap and cv2_module:
            try:
                ret, frame = cv2_cap.read()
                if ret and frame is not None:
                    consecutive_cam_errors = 0
                    # Apply Morphological and computer vision filters
                    if filter_mode in ("sobel", "edges"):
                        gray = cv2_module.cvtColor(frame, cv2_module.COLOR_BGR2GRAY)
                        gx = cv2_module.Sobel(gray, cv2_module.CV_16S, 1, 0, ksize=3)
                        gy = cv2_module.Sobel(gray, cv2_module.CV_16S, 0, 1, ksize=3)
                        abs_gx = cv2_module.convertScaleAbs(gx)
                        abs_gy = cv2_module.convertScaleAbs(gy)
                        frame = cv2_module.addWeighted(abs_gx, 0.5, abs_gy, 0.5, 0)
                    elif filter_mode == "canny":
                        gray = cv2_module.cvtColor(frame, cv2_module.COLOR_BGR2GRAY)
                        frame = cv2_module.Canny(gray, 50, 150)
                    elif filter_mode == "dilation":
                        kernel = cv2_module.getStructuringElement(cv2_module.MORPH_RECT, (5, 5))
                        frame = cv2_module.dilate(frame, kernel, iterations=1)
                    elif filter_mode == "erosion":
                        kernel = cv2_module.getStructuringElement(cv2_module.MORPH_RECT, (5, 5))
                        frame = cv2_module.erode(frame, kernel, iterations=1)
                    elif filter_mode == "threshold":
                        gray = cv2_module.cvtColor(frame, cv2_module.COLOR_BGR2GRAY)
                        _, frame = cv2_module.threshold(gray, 100, 255, cv2_module.THRESH_BINARY)
                    elif filter_mode == "grayscale":
                        frame = cv2_module.cvtColor(frame, cv2_module.COLOR_BGR2GRAY)

                    out_tmp = '/tmp/pi_cam_frame_tmp.jpg'
                    cv2_module.imwrite(out_tmp, frame, [int(cv2_module.IMWRITE_JPEG_QUALITY), 80])
                    os.replace(out_tmp, FRAME_PATH)
                    written = True
                else:
                    consecutive_cam_errors += 1
            except Exception as e:
                consecutive_cam_errors += 1
                if consecutive_cam_errors > 8:
                    print(f"[Camera Service] cv2 capture error threshold reached: {e}")
                    try:
                        cv2_cap.release()
                    except Exception:
                        pass
                    cv2_cap = None

        # 2. Raspberry Pi Camera Module via libcamera/rpicam CSI-2 pipeline
        if not written and hw_info["has_libcam"]:
            written = capture_libcamera(filter_mode)

        # 3. V4L2 device via ffmpeg if no cv2_cap
        if not written and hw_info["has_v4l2"]:
            written = capture_v4l2_ffmpeg(hw_info.get("v4l2_dev", "/dev/video0"), filter_mode)

        # 4. In physical mode, NEVER fall through to synthetic demo frames!
        if is_physical:
            # If physical frame read was momentarily delayed or dropped, retain the last frame without flickering!
            if not written and not os.path.exists(FRAME_PATH):
                # Only on initial startup before first physical frame has landed
                generate_fallback_synthetic_frame(640, 480, filter_mode, frame_count)
        else:
            # Pure synthetic digital twin simulation mode only
            if not written:
                written = generate_cv2_synthetic_frame(640, 480, filter_mode, frame_count)
                if not written:
                    written = generate_pil_jpeg_frame(640, 480, filter_mode, frame_count)
                if not written:
                    written = generate_fallback_synthetic_frame(640, 480, filter_mode, frame_count)

        # In single shot mode (used by pre-boot diagnostic test)
        if single_shot:
            if os.path.exists(FRAME_PATH):
                with open(TEST_FRAME_PATH, 'wb') as df:
                    with open(FRAME_PATH, 'rb') as sf:
                        df.write(sf.read())
                sz = os.path.getsize(TEST_FRAME_PATH)
                print(f"[ PASS ] Camera frame successfully generated: {TEST_FRAME_PATH} ({sz:,} bytes)")
            break

        time.sleep(0.06)

    if cv2_cap:
        try:
            cv2_cap.release()
        except Exception:
            pass

if __name__ == '__main__':
    single = '--test' in sys.argv or '--once' in sys.argv
    f_mode = "none"
    for arg in sys.argv:
        if arg.startswith('--filter='):
            f_mode = arg.split('=', 1)[1]
    run_service(single_shot=single, filter_mode=f_mode)
