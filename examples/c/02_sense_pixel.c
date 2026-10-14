/* 02. Sense HAT Single Pixel Control in C
 * Sets individual RGB LEDs on the 8x8 matrix via libpi_twin.
 */

#include <stdio.h>
#include <unistd.h>
#include "../../src/pi_twin.h"

int main(void) {
    twin_init();
    
    printf("Clearing 8x8 RGB LED matrix...\n");
    twin_clear_matrix();
    usleep(200000);
    
    printf("Setting Pixel (0, 0) to Crimson Red: RGB(255, 0, 0)\n");
    twin_set_pixel(0, 0, 255, 0, 0);
    
    printf("Setting Pixel (7, 7) to Ocean Blue: RGB(0, 100, 255)\n");
    twin_set_pixel(7, 7, 0, 100, 255);
    
    printf("Setting Pixel (3, 3) to Emerald Green: RGB(0, 255, 100)\n");
    twin_set_pixel(3, 3, 0, 255, 100);

    printf("Setting Pixel (7, 0) to Warm Amber: RGB(255, 180, 0)\n");
    twin_set_pixel(7, 0, 255, 180, 0);

    printf("Setting Pixel (0, 7) to Magenta: RGB(220, 0, 220)\n");
    twin_set_pixel(0, 7, 220, 0, 220);
    
    printf("Pixel colors rendered on Sense HAT display.\n");
    twin_shutdown();
    return 0;
}
