# 10. GPIO LED Blink
from pi_twin import GPIO
import time

LED_PIN = 17

print(f"Initializing BCM GPIO {LED_PIN} (Physical Pin 11) as OUTPUT...")
GPIO.setup(LED_PIN, GPIO.OUT)

for cycle in range(1, 5):
    print(f"Cycle {cycle}: LED ON  (GPIO 17 -> HIGH / 3.3V)")
    GPIO.output(LED_PIN, GPIO.HIGH)
    time.sleep(0.4)

    print(f"Cycle {cycle}: LED OFF (GPIO 17 -> LOW  / 0.0V)")
    GPIO.output(LED_PIN, GPIO.LOW)
    time.sleep(0.4)

print("GPIO blink sequence completed.")
