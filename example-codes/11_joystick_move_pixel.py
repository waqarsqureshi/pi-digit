#!/usr/bin/env python3
"""
11. Sense HAT Joystick Interactive RGB Pixel Mover
File: examples/python/11_joystick_move_pixel.py

Use the 5-way joystick to move an illuminated RGB LED pixel around the 8x8 matrix:
  - Up    : Move pixel UP
  - Down  : Move pixel DOWN
  - Left  : Move pixel LEFT
  - Right : Move pixel RIGHT
  - Middle: Change pixel color cycle (Red -> Green -> Blue -> Amber -> Magenta -> Cyan -> White)
"""

from sense_hat import SenseHat
import time

sense = SenseHat()
sense.clear()

print("=" * 65)
print("  Pi-Digit: Joystick Interactive RGB LED Pixel Navigation")
print("=" * 65)
print("Controls:")
print("  - Use Joystick UP, DOWN, LEFT, RIGHT to navigate the pixel")
print("  - Press MIDDLE button to cycle pixel color")
print("  - Moving pixel updates live on the 8x8 RGB LED matrix")
print("-" * 65)

# Starting position at matrix center
x = 3
y = 3

# Palette of colors
COLORS = [
    (255, 0, 0),     # Red
    (0, 255, 0),     # Green
    (0, 150, 255),   # Cyan/Blue
    (255, 180, 0),   # Amber/Gold
    (220, 0, 220),   # Magenta
    (0, 255, 180),   # Mint
    (255, 255, 255), # White
]
color_idx = 0

def draw(px, py, c):
    sense.clear()
    sense.set_pixel(px, py, c[0], c[1], c[2])
    print(f"Pixel at (X={px}, Y={py}) | Color: RGB{c}")

# Draw initial position
draw(x, y, COLORS[color_idx])

# Run interactive loop
try:
    running = True
    iterations = 0
    # Poll for up to 30 seconds or user interrupt
    start_time = time.time()
    while time.time() - start_time < 30.0:
        events = sense.stick.get_events()
        for ev in events:
            # We react to 'pressed' and 'held' actions
            if ev.action in ('pressed', 'held'):
                d = str(ev.direction).lower()
                old_x, old_y = x, y
                
                if d == 'up':
                    y = max(0, y - 1)
                elif d == 'down':
                    y = min(7, y + 1)
                elif d == 'left':
                    x = max(0, x - 1)
                elif d == 'right':
                    x = min(7, x + 1)
                elif d in ('middle', 'centre', 'center', 'enter'):
                    color_idx = (color_idx + 1) % len(COLORS)
                    print(f"-> Middle Pressed: Color changed to {COLORS[color_idx]}")
                
                if old_x != x or old_y != y or d in ('middle', 'centre', 'center', 'enter'):
                    draw(x, y, COLORS[color_idx])
                    
        time.sleep(0.05)

except KeyboardInterrupt:
    print("\nNavigation stopped by user.")

finally:
    print("\nClearing matrix display...")
    sense.clear()
    print("Joystick Pixel Mover finished.")
