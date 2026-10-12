# 02. Moving Name Marquee on Sense HAT 8x8 LED Matrix
# File: example-codes/02_moving_name.py
# Prints student name on the Sense HAT 8x8 display in a moving (scrolling) format!
import sys
import os
import time

# Ensure project modules are discovered regardless of execution directory
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

try:
    from pi_twin import SenseHat, LCD
except ImportError:
    from sense_hat import SenseHat
    LCD = None

sense = SenseHat()
sense.clear()
lcd = LCD() if LCD else None

# -------------------------------------------------------------
# STUDENT TASK: Change "Raspberry Pi" to your own name!
# -------------------------------------------------------------
student_name = "Raspberry Pi"

print("=" * 60)
print("  Pi-Digit: Moving Name Marquee Display on Sense HAT & LCD")
print("=" * 60)
print(f"Displaying moving name: '{student_name}'")
print("Tip: Change student_name to display your own name in moving format!")

# Part 1: Scroll name across the 8x8 RGB LED matrix display
# scroll_speed: time in seconds between each column shift (0.07s is smooth)
# text_colour: [R, G, B] color of the text (e.g. Amber Gold [255, 180, 0])
# back_colour: [R, G, B] background color (e.g. Deep Navy [0, 0, 25])
print("\n[Display 1] Scrolling marquee across Sense HAT 8x8 RGB LED matrix...")
sense.show_message(
    student_name,
    scroll_speed=0.07,
    text_colour=[255, 180, 0],   # Warm Amber / Gold
    back_colour=[0, 0, 25]       # Deep Navy Blue
)

time.sleep(0.3)
sense.clear()

# Part 2: Scroll name across 16x2 Character LCD display
if lcd:
    print("[Display 2] Scrolling moving text across 16x2 Character LCD...")
    lcd.clear()
    lcd.write("Student Name:")
    banner = f"*** {student_name} ***   "
    for i in range(len(banner)):
        lcd.set_cursor(1, 0)
        chunk = (banner[i:] + banner[:i])[:16]
        lcd.write(chunk)
        time.sleep(0.12)

print(f"\nMoving display of '{student_name}' completed successfully.")
