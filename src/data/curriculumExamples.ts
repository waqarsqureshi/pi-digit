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
    id: 'py-02-sense-pixel',
    title: '2. Sense HAT Red Pixel',
    language: 'python',
    category: 'Sense HAT',
    description: 'Sets a single RGB LED on the 8x8 matrix to vibrant red at coordinate (0, 0).',
    filename: '02_red_pixel.py',
    code: `# 02. Sense HAT Single Pixel
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
    id: 'py-03-colour-cycle',
    title: '3. RGB Colour Cycle',
    language: 'python',
    category: 'Sense HAT',
    description: 'Fills the entire 8x8 LED matrix with primary and secondary color cycles.',
    filename: '03_color_cycle.py',
    code: `# 03. RGB Colour Cycle
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
    id: 'py-04-display-image',
    title: '4. Display 8x8 Image',
    language: 'python',
    category: 'Sense HAT',
    description: 'Renders an iconic 8x8 pixel art bitmap of the Raspberry Pi logo.',
    filename: '04_pi_image.py',
    code: `# 04. Display 8x8 Raspberry Pi Bitmap

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
    id: 'py-05-read-temp',
    title: '5. Read Temperature',
    language: 'python',
    category: 'Environmental Sensors',
    description: 'Polls the onboard temperature sensor and prints formatted readings.',
    filename: '05_read_temp.py',
    code: `# 05. Read Temperature Telemetry
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
    id: 'py-06-read-humidity',
    title: '6. Read Humidity',
    language: 'python',
    category: 'Environmental Sensors',
    description: 'Reads relative humidity from the capacitive environmental sensor.',
    filename: '06_read_humidity.py',
    code: `# 06. Read Humidity Telemetry
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
    id: 'py-07-read-pressure',
    title: '7. Read Barometric Pressure',
    language: 'python',
    category: 'Environmental Sensors',
    description: 'Reads atmospheric barometric pressure in hectopascals (hPa).',
    filename: '07_read_pressure.py',
    code: `# 07. Read Barometric Pressure
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
    id: 'py-08-read-accel',
    title: '8. Read Accelerometer (IMU)',
    language: 'python',
    category: 'IMU Motion',
    description: 'Reads 3-axis acceleration vectors (X, Y, Z) and pitch/roll tilt.',
    filename: '08_read_accel.py',
    code: `# 08. Read IMU 3-Axis Accelerometer
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
    id: 'py-09-read-joystick',
    title: '9. Read Joystick Events',
    language: 'python',
    category: 'Sense HAT Input',
    description: 'Inspects 5-way joystick state (Up, Down, Left, Right, Centre).',
    filename: '09_read_joystick.py',
    code: `# 09. Read Joystick 5-Way Switch Events
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
    id: 'py-10-pwm-waveform',
    title: '10. Hardware PWM Generator (Pin 18)',
    language: 'python',
    category: 'PWM Signal Generation',
    description: 'Generates Pulse-Width Modulation signals on GPIO 18 (PWM0, Pin 12) streaming to the live oscilloscope.',
    filename: '10_pwm_waveform.py',
    code: `# 10. Hardware PWM Signal Generator (GPIO 18 / PWM0)
# Generates Pulse-Width Modulation signals and streams live waveform to the Web App Oscilloscope!
import time
import RPi.GPIO as GPIO

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
    id: 'py-11-joystick-listener',
    title: '11. Sense HAT Joystick Events',
    language: 'python',
    category: 'Sense HAT Input',
    description: 'Captures 5-way joystick interactions (Up, Down, Left, Right, Centre).',
    filename: '09_joystick_events.py',
    code: `# 11. Read Sense HAT 5-Way Joystick Events
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
    id: 'py-12-lcd-hello',
    title: '12. External LCD Display',
    language: 'python',
    category: 'LCD Peripherals',
    description: 'Writes 16x2 / 20x4 alphanumeric text to external character LCD.',
    filename: '12_lcd_display.py',
    code: `# 12. External LCD Viewport
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
    id: 'py-13-combined-system',
    title: '13. Combined Sensor + LED + LCD',
    language: 'python',
    category: 'Integrated Projects',
    description: 'Reads temperature, updates LCD, sets GPIO 17, and displays on Sense HAT.',
    filename: '13_combined_system.py',
    code: `# 13. Combined Classroom Capstone
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
];
