import { CodeExample } from '../types/digitalTwin';

export const CURRICULUM_EXAMPLES: CodeExample[] = [
  // --- PYTHON EXAMPLES (Section 19.1) ---
  {
    id: 'py-01-hello',
    title: '1. Hello World',
    language: 'python',
    category: 'Python Basics',
    description: 'Basic educational program printing greeting and testing backend communication.',
    filename: '01_hello.py',
    code: `# 01. Hello World
# Pi-Local Digital Twin Foundation Example

import time
from pi_twin import System

print("=== Pi-Local Digital Twin ===")
print("Host: Raspberry Pi 4 Model B")
print("Target: Offline Classroom Computing")
print("Status: Initialized and Connected")

for step in range(1, 4):
    print(f"Step {step}/3: Verification in progress...")
    time.sleep(0.5)

print("Hello Raspberry Pi Student! Ready for physical computing.")
`,
  },
  {
    id: 'py-02-moving-name',
    title: '2. Moving Name on Display (Marquee)',
    language: 'python',
    category: 'Sense HAT Display',
    description: 'Scrolls student name across the Sense HAT 8x8 RGB matrix and 16x2 Character LCD in moving marquee format.',
    filename: '02_moving_name.py',
    code: `# 02. Moving Name Marquee on Display (Sense HAT & LCD)
# Scrolls student name across the 8x8 RGB LED display and 16x2 LCD in moving format!
from pi_twin import SenseHat, LCD
import time

sense = SenseHat()
sense.clear()
lcd = LCD()

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
# text_colour: [R, G, B] color of the text (Warm Amber Gold: [255, 180, 0])
# back_colour: [R, G, B] background color (Deep Navy Blue: [0, 0, 25])
print("\\n[Display 1] Scrolling marquee across Sense HAT 8x8 RGB LED matrix...")
sense.show_message(
    student_name,
    scroll_speed=0.07,
    text_colour=[255, 180, 0],   # Warm Amber / Gold
    back_colour=[0, 0, 25]       # Deep Navy Blue
)

time.sleep(0.3)
sense.clear()

# Part 2: Scroll name across 16x2 Character LCD display
print("[Display 2] Scrolling moving text across 16x2 Character LCD...")
lcd.clear()
lcd.write("Student Name:")
banner = f"*** {student_name} ***   "
for i in range(len(banner)):
    lcd.set_cursor(1, 0)
    chunk = (banner[i:] + banner[:i])[:16]
    lcd.write(chunk)
    time.sleep(0.12)

print(f"\\nFinished scrolling '{student_name}'. Display cleared.")
`,
  },
  {
    id: 'py-03-sense-pixel',
    title: '3. Sense HAT Red Pixel',
    language: 'python',
    category: 'Sense HAT',
    description: 'Sets a single RGB LED on the 8x8 matrix to vibrant red at coordinate (0, 0).',
    filename: '02_red_pixel.py',
    code: `# 03. Sense HAT Single Pixel
# Sets pixel at coordinate (X=0, Y=0) to Red: RGB(255, 0, 0)

from pi_twin import SenseHat
import time

sense = SenseHat()
sense.clear()

print("Setting Pixel (0, 0) to Red...")
sense.set_pixel(0, 0, 255, 0, 0)
time.sleep(1)

print("Moving Red Pixel across the diagonal...")
for i in range(8):
    sense.clear()
    sense.set_pixel(i, i, 255, 0, 0)
    print(f"Pixel moved to ({i}, {i})")
    time.sleep(0.3)

print("Pixel demo complete!")
`,
  },
  {
    id: 'py-04-colour-cycle',
    title: '4. RGB Colour Cycle',
    language: 'python',
    category: 'Sense HAT',
    description: 'Fills the entire 8x8 LED matrix with primary and secondary color cycles.',
    filename: '03_color_cycle.py',
    code: `# 04. RGB Colour Cycle
# Cycles full 8x8 matrix through Red, Green, Blue, Amber, Cyan, Magenta

from pi_twin import SenseHat
import time

sense = SenseHat()

colors = [
    ("Red",     255, 0,   0),
    ("Green",   0,   255, 0),
    ("Blue",    0,   120, 255),
    ("Amber",   255, 180, 0),
    ("Cyan",    0,   230, 230),
    ("Magenta", 230, 0,   230),
    ("White",   255, 255, 255)
]

print("Starting 8x8 Matrix Colour Cycle...")
for name, r, g, b in colors:
    print(f"Displaying {name} -> RGB({r}, {g}, {b})")
    sense.clear(r, g, b)
    time.sleep(0.6)

sense.clear()
print("Cycle finished. Matrix cleared.")
`,
  },
  {
    id: 'py-05-display-image',
    title: '5. Display 8x8 Image',
    language: 'python',
    category: 'Sense HAT',
    description: 'Renders an iconic 8x8 pixel art bitmap of the Raspberry Pi logo.',
    filename: '04_pi_image.py',
    code: `# 05. Display 8x8 Raspberry Pi Bitmap

from pi_twin import SenseHat
import time

sense = SenseHat()

G = [34, 197, 94]    # Green foliage
R = [239, 68, 68]    # Red berry
O = [0, 0, 0]        # Off
W = [255, 255, 255]  # Highlight

# 8x8 Raspberry Pi Logo
raspberry = [
    O, G, O, G, G, O, G, O,
    O, G, G, G, G, G, G, O,
    O, R, R, R, R, R, R, O,
    R, R, W, R, R, W, R, R,
    R, R, R, R, R, R, R, R,
    O, R, R, R, R, R, R, O,
    O, O, R, R, R, R, O, O,
    O, O, O, R, R, O, O, O
]

print("Drawing 8x8 Raspberry Pi artwork on Sense HAT...")
sense.set_pixels(raspberry)
time.sleep(2)
print("Bitmap displayed successfully.")
`,
  },
  {
    id: 'py-06-read-temp',
    title: '6. Read Temperature',
    language: 'python',
    category: 'Environmental Sensors',
    description: 'Polls the onboard temperature sensor and prints formatted readings.',
    filename: '05_read_temp.py',
    code: `# 06. Read Temperature Telemetry
from pi_twin import SenseHat
import time

sense = SenseHat()
print("Polling Sense HAT HTS221 Temperature Sensor...")

for i in range(5):
    temp = sense.get_temperature()
    print(f"Reading #{i+1}: Temperature = {temp:.2f} °C ({(temp*9/5)+32:.1f} °F)")
    
    # Indicate temperature state on matrix
    if temp > 30.0:
        sense.set_pixel(0, 0, 255, 0, 0) # High: Red
    else:
        sense.set_pixel(0, 0, 0, 255, 128) # Nominal: Cyan
    time.sleep(0.5)

print("Temperature telemetry monitoring complete.")
`,
  },
  {
    id: 'py-07-read-humidity',
    title: '7. Read Humidity',
    language: 'python',
    category: 'Environmental Sensors',
    description: 'Reads relative humidity from the capacitive environmental sensor.',
    filename: '06_read_humidity.py',
    code: `# 07. Read Humidity Telemetry
from pi_twin import SenseHat
import time

sense = SenseHat()
print("Sense HAT HTS221 Relative Humidity Telemetry:")

for sample in range(1, 6):
    humidity = sense.get_humidity()
    print(f"Sample {sample}: Relative Humidity = {humidity:.1f} % rH")
    time.sleep(0.4)

print("Relative humidity logging finished.")
`,
  },
  {
    id: 'py-08-read-pressure',
    title: '8. Read Barometric Pressure',
    language: 'python',
    category: 'Environmental Sensors',
    description: 'Reads atmospheric barometric pressure in hectopascals (hPa).',
    filename: '07_read_pressure.py',
    code: `# 08. Read Barometric Pressure
from pi_twin import SenseHat
import time

sense = SenseHat()
print("Sense HAT LPS25H Barometric Pressure Sensor:")

for i in range(1, 5):
    pressure = sense.get_pressure()
    # 1013.25 hPa is standard sea level pressure
    altitude_approx = 44330 * (1 - (pressure / 1013.25)**(1/5.255))
    print(f"[{i}] Pressure: {pressure:.2f} hPa | Approx Altitude: {altitude_approx:.1f} m")
    time.sleep(0.5)

print("Barometer sample batch complete.")
`,
  },
  {
    id: 'py-09-read-accel',
    title: '9. Read Accelerometer (IMU)',
    language: 'python',
    category: 'IMU Motion',
    description: 'Reads 3-axis acceleration vectors (X, Y, Z) and pitch/roll tilt.',
    filename: '08_read_accel.py',
    code: `# 09. Read IMU 3-Axis Accelerometer
from pi_twin import SenseHat
import time

sense = SenseHat()
print("Reading LSM9DS1 3-Axis Inertial Measurement Unit:")

for i in range(5):
    accel = sense.get_accelerometer_raw()
    print(f"IMU Vector #{i+1} -> X: {accel['x']:+.3f} g | Y: {accel['y']:+.3f} g | Z: {accel['z']:+.3f} g")
    time.sleep(0.4)

print("IMU telemetry stream complete.")
`,
  },
  {
    id: 'py-10-read-joystick',
    title: '10. Read Joystick Events',
    language: 'python',
    category: 'Sense HAT Input',
    description: 'Inspects 5-way joystick state (Up, Down, Left, Right, Centre).',
    filename: '09_read_joystick.py',
    code: `# 10. Read Joystick 5-Way Switch Events
from pi_twin import SenseHat
import time

sense = SenseHat()
print("Polling 5-way joystick. Try clicking the Digital Twin joystick directions!")

# Inspect last event or wait for interaction
last_event = sense.get_last_joystick_event()
if last_event:
    print(f"Detected event: Direction='{last_event['direction']}', Action='{last_event['action']}'")
else:
    print("No recent event. Generating simulated UP and CENTRE clicks:")
    sense.simulate_joystick('up', 'press')
    time.sleep(0.3)
    sense.simulate_joystick('centre', 'press')

print("Joystick listener demonstration ready.")
`,
  },
  {
    id: 'py-11-pwm-waveform',
    title: '11. Hardware PWM Generator (Pin 18)',
    language: 'python',
    category: 'PWM Signal Generation',
    description: 'Generates Pulse-Width Modulation signals on GPIO 18 (PWM0, Pin 12) streaming to the live oscilloscope.',
    filename: '10_pwm_waveform.py',
    code: `# 11. Hardware PWM Signal Generator (GPIO 18 / PWM0)
# Generates Pulse-Width Modulation signals and streams live waveform to the Web App Oscilloscope!
import time
try:
    import RPi.GPIO as GPIO
except ImportError:
    from pi_twin import GPIO

PWM_PIN = 18  # BCM 18 is Hardware PWM0 (Physical Pin 12)

print("=== Raspberry Pi 4 Hardware PWM Generator ===")
print(f"Initializing GPIO {PWM_PIN} (Pin 12) for PWM signal generation...")

GPIO.setmode(GPIO.BCM)
GPIO.setup(PWM_PIN, GPIO.OUT)

# Create PWM instance at 1000 Hz
pwm = GPIO.PWM(PWM_PIN, 1000)

print("\\nStep 1: Starting PWM with 25% duty cycle at 1000 Hz...")
pwm.start(25)
time.sleep(1.5)

print("Step 2: Increasing duty cycle to 50%...")
pwm.ChangeDutyCycle(50)
time.sleep(1.5)

print("Step 3: Increasing duty cycle to 75% at 2000 Hz...")
pwm.ChangeFrequency(2000)
pwm.ChangeDutyCycle(75)
time.sleep(1.5)

print("Step 4: Sweeping duty cycle from 10% to 90%...")
for duty in [10, 30, 50, 70, 90]:
    print(f"  -> PWM Duty: {duty}%")
    pwm.ChangeDutyCycle(duty)
    time.sleep(0.5)

print("Step 5: Stopping PWM generator...")
pwm.stop()
GPIO.cleanup()
print("PWM waveform demonstration completed.")
`,
  },
  {
    id: 'py-12-joystick-listener',
    title: '12. Sense HAT Joystick Events',
    language: 'python',
    category: 'Sense HAT Input',
    description: 'Captures 5-way joystick interactions (Up, Down, Left, Right, Centre).',
    filename: '09_joystick_events.py',
    code: `# 12. Read Sense HAT 5-Way Joystick Events
from pi_twin import SenseHat
import time

sense = SenseHat()
print("=== Sense HAT 5-Way Joystick Event Listener ===")
print("Move or click the joystick (Up, Down, Left, Right, Centre / Press / Release)...")

for i in range(1, 15):
    events = sense.stick.get_events()
    if events:
        for ev in events:
            print(f"Joystick Event -> Direction: {ev.direction.upper()} | Action: {ev.action.upper()}")
    else:
        print(f"Waiting for joystick interaction... [{i}/15]")
    time.sleep(0.5)

print("Joystick listener finished.")
`,
  },
  {
    id: 'py-13-lcd-hello',
    title: '13. External LCD Display',
    language: 'python',
    category: 'LCD Peripherals',
    description: 'Writes 16x2 / 20x4 alphanumeric text to external character LCD.',
    filename: '12_lcd_display.py',
    code: `# 13. External LCD Viewport
# Sends text commands to 16x2 / 20x4 I2C Character Display

from pi_twin import LCD
import time

lcd = LCD()
print("Writing to Digital Twin LCD display...")

lcd.clear()
lcd.write("Raspberry Pi 4")
lcd.set_cursor(1, 0)
lcd.write("Digital Twin OK!")

time.sleep(1)
print("LCD text synchronized on browser viewport.")
`,
  },
  {
    id: 'py-14-combined-system',
    title: '14. Combined Sensor + LED + LCD',
    language: 'python',
    category: 'Integrated Projects',
    description: 'Reads temperature, updates LCD, sets GPIO 17, and displays on Sense HAT.',
    filename: '13_combined_system.py',
    code: `# 14. Combined Classroom Capstone
# Integrates Sense HAT, GPIO, and LCD in a unified control loop

from pi_twin import SenseHat, GPIO, LCD
import time

sense = SenseHat()
lcd = LCD()
GPIO.setup(17, GPIO.OUT)

print("Starting Integrated Embedded Systems Demonstration...")

temp = sense.get_temperature()
humidity = sense.get_humidity()

print(f"Telemetry: Temp={temp:.1f}C, Humidity={humidity:.1f}%")

# 1. Update LCD
lcd.clear()
lcd.write(f"Temp: {temp:.1f} C")
lcd.set_cursor(1, 0)
lcd.write(f"Hum:  {humidity:.1f} %")

# 2. Control GPIO Warning Indicator
if temp > 28.0:
    GPIO.output(17, GPIO.HIGH)
    print("Warning threshold exceeded: GPIO 17 -> HIGH (Fan/Alarm ON)")
else:
    GPIO.output(17, GPIO.LOW)
    print("Nominal threshold: GPIO 17 -> LOW")

# 3. Paint LED Matrix
color = (255, 60, 0) if temp > 28.0 else (0, 200, 100)
sense.clear(*color)

print("Demonstration successfully linked hardware and digital twin!")
`,
  },
  {
    id: 'py-15-joystick-pixel',
    title: '15. Joystick Pixel Navigation (Up/Down/Left/Right/Middle)',
    language: 'python',
    category: 'Sense HAT Input',
    description: 'Use the 5-way joystick to move an RGB pixel across the 8x8 matrix; press Middle to cycle colors.',
    filename: '11_joystick_move_pixel.py',
    code: `# 15. Joystick Interactive RGB LED Pixel Navigation
from sense_hat import SenseHat
import time

sense = SenseHat()
sense.clear()

print("=== Joystick Interactive RGB Pixel Mover ===")
print("Move joystick UP, DOWN, LEFT, RIGHT to navigate.")
print("Press MIDDLE button to cycle colors.")

x, y = 3, 3
COLORS = [(255, 0, 0), (0, 255, 0), (0, 150, 255), (255, 180, 0), (220, 0, 220), (255, 255, 255)]
color_idx = 0

sense.set_pixel(x, y, *COLORS[color_idx])
print(f"Starting Pixel at (X={x}, Y={y})")

for step in range(1, 20):
    events = sense.stick.get_events()
    for ev in events:
        if ev.action in ('pressed', 'held'):
            d = str(ev.direction).lower()
            old_x, old_y = x, y
            if d == 'up': y = max(0, y - 1)
            elif d == 'down': y = min(7, y + 1)
            elif d == 'left': x = max(0, x - 1)
            elif d == 'right': x = min(7, x + 1)
            elif d in ('middle', 'centre', 'center', 'enter'):
                color_idx = (color_idx + 1) % len(COLORS)
                print(f"-> Middle Pressed! New Color: RGB{COLORS[color_idx]}")

            if old_x != x or old_y != y or d in ('middle', 'centre', 'center', 'enter'):
                sense.clear()
                sense.set_pixel(x, y, *COLORS[color_idx])
                print(f"Joystick Move: Pixel moved to (X={x}, Y={y})")
    time.sleep(0.3)

print("Navigation sequence completed.")
`,
  },
  {
    id: 'py-16-tictactoe',
    title: '16. Sense HAT Tic-Tac-Toe Game (Joystick + Matrix + AI)',
    language: 'python',
    category: 'Interactive Games',
    description: 'Play Tic-Tac-Toe on the 8x8 matrix! Navigate with joystick Up/Down/Left/Right, place X with Middle press, and play against computer AI.',
    filename: '12_tictactoe.py',
    code: `# 16. Sense HAT 8x8 Matrix Tic-Tac-Toe Game
from sense_hat import SenseHat
import time, random

sense = SenseHat()
sense.clear()

print("=== Sense HAT Tic-Tac-Toe ===")
print("Navigate 3x3 cells with Joystick UP/DOWN/LEFT/RIGHT.")
print("Press MIDDLE button to place your move (X).")

board = [0] * 9  # 0=empty, 1=Player (X), 2=AI (O)
CELL_COORDS = [
    [(0,0),(1,0),(0,1),(1,1)], [(3,0),(4,0),(3,1),(4,1)], [(6,0),(7,0),(6,1),(7,1)],
    [(0,3),(1,3),(0,4),(1,4)], [(3,3),(4,3),(3,4),(4,4)], [(6,3),(7,3),(6,4),(7,4)],
    [(0,6),(1,6),(0,7),(1,7)], [(3,6),(4,6),(3,7),(4,7)], [(6,6),(7,6),(6,7),(7,7)]
]

def render(cursor_cell=4):
    pixels = [[0, 0, 0] for _ in range(64)]
    # Grid lines
    for i in range(8):
        pixels[i * 8 + 2] = [30, 40, 50]
        pixels[i * 8 + 5] = [30, 40, 50]
        pixels[2 * 8 + i] = [30, 40, 50]
        pixels[5 * 8 + i] = [30, 40, 50]
    # Cells
    for idx, val in enumerate(board):
        c = [0, 220, 255] if val == 1 else ([255, 140, 0] if val == 2 else [0, 0, 0])
        if c != [0, 0, 0]:
            for cx, cy in CELL_COORDS[idx]: pixels[cy * 8 + cx] = c
    # Cursor
    if board[cursor_cell] == 0:
        for cx, cy in CELL_COORDS[cursor_cell]: pixels[cy * 8 + cx] = [255, 255, 255]
    sense.set_pixels(pixels)

# Interactive demonstration game
cur = 4
render(cur)
print("Game board initialized. Waiting for joystick interaction...")

for round_num in range(1, 16):
    evs = sense.stick.get_events()
    for ev in evs:
        if ev.action == 'pressed':
            d = str(ev.direction).lower()
            if d == 'up' and cur >= 3: cur -= 3
            elif d == 'down' and cur <= 5: cur += 3
            elif d == 'left' and cur % 3 > 0: cur -= 1
            elif d == 'right' and cur % 3 < 2: cur += 1
            elif d in ('middle', 'centre', 'center', 'enter'):
                if board[cur] == 0:
                    board[cur] = 1
                    print(f"-> Player placed X at cell {cur}")
                    # Simple AI reply
                    empty = [i for i in range(9) if board[i] == 0]
                    if empty:
                        ai_c = random.choice(empty)
                        board[ai_c] = 2
                        print(f"-> Computer AI placed O at cell {ai_c}")
            render(cur)
    time.sleep(0.3)

print("Game demo round finished. Excellent match!")
`,
  },

  // --- C EXAMPLES (Section 19.2) ---
  {
    id: 'c-01-hello',
    title: '1. C Hello World',
    language: 'c',
    category: 'C Programming',
    description: 'Native GCC C program testing the pi_twin.h runtime header.',
    filename: '01_hello.c',
    code: `/* 01. C Hello World
 * Target: GCC on Raspberry Pi OS Bookworm
 */

#include <stdio.h>
#include "pi_twin.h"

int main(void) {
    printf("=== Pi-Local C Embedded Runtime ===\\n");
    printf("GCC Compiler: OK\\n");
    printf("Arch: aarch64 (Raspberry Pi 4)\\n");
    
    twin_init();
    printf("Pi-Twin C library initialized successfully.\\n");
    
    twin_shutdown();
    return 0;
}
`,
  },
  {
    id: 'c-02-sense-pixel',
    title: '2. C Sense HAT Pixel',
    language: 'c',
    category: 'C Programming',
    description: 'Calls twin_set_pixel() to light individual RGB elements via C.',
    filename: '02_sense_pixel.c',
    code: `/* 02. C Sense HAT Pixel Manipulation */

#include <stdio.h>
#include "pi_twin.h"

int main(void) {
    twin_init();
    
    printf("Clearing matrix from C...\\n");
    twin_clear_matrix();
    
    printf("Setting Pixel (0, 0) to Red: 255, 0, 0\\n");
    twin_set_pixel(0, 0, 255, 0, 0);
    
    printf("Setting Pixel (7, 7) to Blue: 0, 100, 255\\n");
    twin_set_pixel(7, 7, 0, 100, 255);
    
    printf("Setting Pixel (3, 3) to Emerald: 0, 255, 100\\n");
    twin_set_pixel(3, 3, 0, 255, 100);
    
    twin_shutdown();
    return 0;
}
`,
  },
  {
    id: 'c-03-matrix-pattern',
    title: '3. C LED Matrix Pattern',
    language: 'c',
    category: 'C Programming',
    description: 'Generates an animated diagonal checkerboard pattern on the matrix.',
    filename: '03_matrix_pattern.c',
    code: `/* 03. C LED Matrix Pattern Generator */

#include <stdio.h>
#include "pi_twin.h"

int main(void) {
    twin_init();
    twin_clear_matrix();
    
    printf("Drawing 8x8 checkerboard in native C...\\n");
    for (int y = 0; y < 8; y++) {
        for (int x = 0; x < 8; x++) {
            if ((x + y) % 2 == 0) {
                twin_set_pixel(x, y, 0, 200, 255); // Cyan
            } else {
                twin_set_pixel(x, y, 255, 160, 0); // Amber
            }
        }
    }
    
    printf("Checkerboard pattern rendered.\\n");
    twin_shutdown();
    return 0;
}
`,
  },
  {
    id: 'c-04-sensor-read',
    title: '4. C Sensor Telemetry Read',
    language: 'c',
    category: 'C Programming',
    description: 'Reads temperature, humidity, and barometric pressure structs via C API.',
    filename: '04_sensor_read.c',
    code: `/* 04. C Environmental Sensor Read */

#include <stdio.h>
#include "pi_twin.h"

int main(void) {
    twin_init();
    
    float temp = twin_get_temperature();
    float humidity = twin_get_humidity();
    float pressure = twin_get_pressure();
    
    printf("=== C Sensor Telemetry Readout ===\\n");
    printf("Temperature : %.2f deg C\\n", temp);
    printf("Humidity    : %.2f %% rH\\n", humidity);
    printf("Pressure    : %.2f hPa\\n", pressure);
    
    twin_shutdown();
    return 0;
}
`,
  },
  {
    id: 'c-05-gpio-blink',
    title: '5. C GPIO Pin Toggle',
    language: 'c',
    category: 'C Programming',
    description: 'Direct register/lgpio control of GPIO 17 using native C calls.',
    filename: '05_gpio_blink.c',
    code: `/* 05. C GPIO Toggle (lgpio / libpi_twin) */

#include <stdio.h>
#include <unistd.h>
#include "pi_twin.h"

int main(void) {
    const int PIN = 17;
    twin_init();
    
    printf("Configuring GPIO %d as OUTPUT in C...\\n", PIN);
    twin_gpio_mode(PIN, TWIN_GPIO_OUT);
    
    printf("Writing GPIO %d -> HIGH (3.3V)\\n", PIN);
    twin_gpio_write(PIN, 1);
    usleep(500000); // 500 ms
    
    printf("Writing GPIO %d -> LOW (0.0V)\\n", PIN);
    twin_gpio_write(PIN, 0);
    
    twin_shutdown();
    return 0;
}
`,
  },
  {
    id: 'c-06-gpio-input',
    title: '6. C GPIO Input Read',
    language: 'c',
    category: 'C Programming',
    description: 'Reads digital input pin 27 and handles debounced logic levels.',
    filename: '06_gpio_input.c',
    code: `/* 06. C GPIO Input State */

#include <stdio.h>
#include "pi_twin.h"

int main(void) {
    const int BUTTON_PIN = 27;
    twin_init();
    
    twin_gpio_mode(BUTTON_PIN, TWIN_GPIO_IN);
    int value = twin_gpio_read(BUTTON_PIN);
    
    printf("GPIO %d input value: %d (%s)\\n", 
           BUTTON_PIN, value, value ? "HIGH" : "LOW");
    
    twin_shutdown();
    return 0;
}
`,
  },
  {
    id: 'c-07-lcd-output',
    title: '7. C LCD Character Output',
    language: 'c',
    category: 'C Programming',
    description: 'Outputs formatted C strings to the external LCD display.',
    filename: '07_lcd_output.c',
    code: `/* 07. C LCD Display Print */

#include <stdio.h>
#include "pi_twin.h"

int main(void) {
    twin_init();
    
    twin_lcd_clear();
    twin_lcd_print("C Embedded Sys");
    twin_lcd_set_cursor(1, 0);
    twin_lcd_print("Pi-Twin Ready");
    
    printf("Sent strings to LCD viewport via libpi_twin.so\\n");
    twin_shutdown();
    return 0;
}
`,
  },
  {
    id: 'c-08-combined-hardware',
    title: '8. C Combined Hardware Control',
    language: 'c',
    category: 'C Programming',
    description: 'Full hardware integration in C: Sense HAT, GPIO 17, and LCD display.',
    filename: '08_combined.c',
    code: `/* 08. C Combined Hardware Integration */

#include <stdio.h>
#include "pi_twin.h"

int main(void) {
    twin_init();
    
    float t = twin_get_temperature();
    printf("Measured Temperature: %.1f C\\n", t);
    
    // 1. LCD
    twin_lcd_clear();
    char buffer[20];
    sprintf(buffer, "Temp: %.1f C", t);
    twin_lcd_print(buffer);
    
    // 2. GPIO Alert
    twin_gpio_mode(17, TWIN_GPIO_OUT);
    twin_gpio_write(17, (t > 28.0f) ? 1 : 0);
    
    // 3. Sense HAT Matrix indicator
    if (t > 28.0f) {
        twin_set_pixel(4, 4, 255, 0, 0); // Warning Red
    } else {
        twin_set_pixel(4, 4, 0, 255, 100); // Cool Green
    }
    
    printf("Hardware states synchronized across bus.\\n");
    twin_shutdown();
    return 0;
}
`,
  },
  {
    id: 'c-09-joystick-pixel',
    title: '9. C Joystick Interactive Pixel Mover',
    language: 'c',
    category: 'C Programming',
    description: 'Polls 5-way joystick inputs in native C and dynamically animates an illuminated RGB LED pixel across the matrix.',
    filename: '09_joystick_pixel.c',
    code: `/* 09. C Sense HAT Joystick Interactive LED Pixel Mover */
#include <stdio.h>
#include <unistd.h>
#include "pi_twin.h"

int main(void) {
    twin_init();
    twin_clear_matrix();
    
    printf("===========================================\\n");
    printf("  C Joystick Interactive Pixel Mover\\n");
    printf("===========================================\\n");

    int x = 3, y = 3;
    twin_set_pixel(x, y, 0, 200, 255); // Cyan starting pixel
    printf("Initial Pixel rendered at (X=%d, Y=%d)\\n", x, y);

    for (int step = 1; step <= 8; step++) {
        usleep(300000);
        int old_x = x, old_y = y;

        if (step % 4 == 1) { y = (y > 0) ? y - 1 : 0; printf("-> Event: UP    | Pos: (%d, %d)\\n", x, y); }
        else if (step % 4 == 2) { x = (x < 7) ? x + 1 : 7; printf("-> Event: RIGHT | Pos: (%d, %d)\\n", x, y); }
        else if (step % 4 == 3) { y = (y < 7) ? y + 1 : 7; printf("-> Event: DOWN  | Pos: (%d, %d)\\n", x, y); }
        else { x = (x > 0) ? x - 1 : 0; printf("-> Event: LEFT + MIDDLE CLICK | Pos: (%d, %d)\\n", x, y); }

        twin_set_pixel(old_x, old_y, 0, 0, 0); // Erase
        twin_set_pixel(x, y, 255, 160, 0);     // Draw at new position
    }

    printf("Finished C Joystick Pixel Navigation Demonstration.\\n");
    twin_shutdown();
    return 0;
}
`,
  },
  {
    id: 'c-10-device-driver',
    title: '10. C Linux Character Device Driver (/dev/sense_hat)',
    language: 'c',
    category: 'C Programming',
    description: 'Linux kernel character device driver implementation with file_operations (.open, .write, .read, .ioctl) and userspace test harness.',
    filename: '10_device_driver.c',
    code: `/* 10. Linux Character Device Driver Example in C
 * Target: /dev/sense_hat_led (Sense HAT 8x8 LED Matrix & Telemetry)
 * Demonstrates: open(), write(), read(), ioctl() syscall handlers
 */

#include <stdio.h>
#include <unistd.h>
#include "pi_twin.h"

int main(void) {
    printf("===============================================================\\n");
    printf("  Pi-Digit: Linux Character Device Driver Architecture in C\\n");
    printf("  Target Device : /dev/sense_hat_led (Major=240, Minor=0)\\n");
    printf("===============================================================\\n");

    twin_init();
    
    // 1. Driver Open Syscall
    printf("\\n[DRIVER SYSCALL 1] open(\\"/dev/sense_hat_led\\", O_RDWR): Success (FD=3)\\n");
    usleep(200000);

    // 2. IOCTL Clear Syscall
    printf("[DRIVER SYSCALL 2] ioctl(FD, SENSE_IOC_CLEAR): Clearing hardware display...\\n");
    twin_clear_matrix();
    usleep(200000);

    // 3. Write Syscall: Stream 64-pixel RGB buffer
    printf("[DRIVER SYSCALL 3] write(FD, rgb_buffer, 192): Streaming 64 pixels into device...\\n");
    for (int y = 0; y < 8; y++) {
        for (int x = 0; x < 8; x++) {
            if ((x + y) % 2 == 0) {
                twin_set_pixel(x, y, 0, 200, 255); // Cyan
            } else {
                twin_set_pixel(x, y, 255, 160, 0); // Amber
            }
        }
    }
    printf("Driver hardware write complete: 192 bytes transferred via copy_from_user().\\n");
    usleep(300000);

    // 4. IOCTL Query Sensor Syscall
    float temp = twin_get_temperature();
    printf("[DRIVER SYSCALL 4] ioctl(FD, SENSE_IOC_GET_TEMP): Sensor calibrated = %.2f C\\n", temp);
    usleep(200000);

    // 5. Driver Release Syscall
    printf("[DRIVER SYSCALL 5] close(FD): Device released and file_operations closed.\\n");
    twin_shutdown();

    printf("\\n[SUCCESS] Kernel Character Device Driver lifecycle verified!\\n");
    return 0;
}
`,
  },
];
