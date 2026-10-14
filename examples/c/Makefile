# Makefile for Pi-Digit Embedded C Examples
# Supports compiling all C examples on Raspberry Pi 4 and Digital Twin

CC = gcc
CFLAGS = -Wall -O2 -I../../src
LDFLAGS = -L../../src -lpi_twin

TARGETS = 01_hello 02_sense_pixel 03_matrix_pattern 04_sensor_read \
          05_gpio_blink 06_gpio_input 07_lcd_output 08_combined \
          09_joystick_pixel 10_device_driver

all: $(TARGETS)

%: %.c
	$(CC) $(CFLAGS) $< -o $@ || $(CC) -Wall -O2 $< -o $@

clean:
	rm -f $(TARGETS)

.PHONY: all clean
