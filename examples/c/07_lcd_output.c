/* 07. C 16x2 / 20x4 Alphanumeric LCD Driver Output
 * Note: External LCD is connected via I2C character bus (0x27 / 0x3F).
 * Emulates how signals sent to the I2C bus behave in the real world.
 */

#include <stdio.h>
#include <unistd.h>
#include "../../src/pi_twin.h"

int main(void) {
    twin_init();
    
    printf("Sending character commands to 16x2 LCD via I2C bus...\n");
    twin_lcd_clear();
    usleep(150000);
    
    twin_lcd_set_cursor(0, 0);
    twin_lcd_print("Pi-4 Embedded C");
    
    twin_lcd_set_cursor(1, 0);
    twin_lcd_print("I2C LCD OK: 0x27");
    
    printf("Text displayed on 16x2 LCD viewport.\n");
    twin_shutdown();
    return 0;
}
