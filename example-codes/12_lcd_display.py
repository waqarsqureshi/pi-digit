# 12. External Character LCD Display Viewport
# Sends text commands to 16x2 / 20x4 I2C Character Display
from pi_twin import LCD
import time

lcd = LCD()
print("Writing to Character LCD display...")

lcd.clear()
lcd.write("Raspberry Pi 4")
lcd.set_cursor(1, 0)
lcd.write("Digital Twin OK!")

time.sleep(2)
print("LCD text synchronized on browser viewport.")
