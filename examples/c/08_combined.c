/* 08. C Combined Hardware Integration Capstone
 * Simultaneously controls Sense HAT RGB matrix, GPIO 17, and I2C LCD.
 */

#include <stdio.h>
#include <unistd.h>
#include "../../src/pi_twin.h"

int main(void) {
    twin_init();
    printf("Starting C Integrated Embedded System Demonstration...\n");
    
    float t = twin_get_temperature();
    printf("Telemetry: Ambient Temperature = %.1f C\n", t);
    
    // 1. LCD Output
    twin_lcd_clear();
    char buffer[24];
    sprintf(buffer, "Temp: %.1f C", t);
    twin_lcd_print(buffer);
    twin_lcd_set_cursor(1, 0);
    twin_lcd_print(t > 28.0f ? "Status: HIGH" : "Status: NORMAL");
    
    // 2. GPIO Output
    twin_gpio_mode(17, TWIN_GPIO_OUT);
    twin_gpio_write(17, (t > 28.0f) ? 1 : 0);
    
    // 3. Sense HAT Matrix Indicator
    twin_clear_matrix();
    if (t > 28.0f) {
        // High temp: Red center cross
        for (int i = 2; i <= 5; i++) {
            twin_set_pixel(i, 3, 255, 0, 0);
            twin_set_pixel(i, 4, 255, 0, 0);
            twin_set_pixel(3, i, 255, 0, 0);
            twin_set_pixel(4, i, 255, 0, 0);
        }
    } else {
        // Normal temp: Emerald square
        for (int x = 2; x <= 5; x++) {
            for (int y = 2; y <= 5; y++) {
                twin_set_pixel(x, y, 0, 220, 80);
            }
        }
    }
    
    printf("All hardware bus states synchronized successfully.\n");
    twin_shutdown();
    return 0;
}
