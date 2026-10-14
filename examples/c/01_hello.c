/* 01. Hello World from C (libpi_twin)
 * Pi-Digit C Native Computing Foundation
 */

#include <stdio.h>
#include <unistd.h>
#include "../../src/pi_twin.h"

int main(void) {
    printf("==========================================\n");
    printf("  Pi-Digit: Embedded C Runtime Environment\n");
    printf("  Host: Raspberry Pi 4 Model B (BCM2711)\n");
    printf("==========================================\n");

    twin_init();
    
    printf("Step 1/3: Initializing I2C bus & GPIO controller...\n");
    usleep(300000);
    printf("Step 2/3: Linking Sense HAT 8x8 matrix & sensors...\n");
    usleep(300000);
    printf("Step 3/3: Digital Twin IPC Bridge established.\n");
    
    printf("\nHello Raspberry Pi Embedded C Developer!\n");
    printf("Ready for physical computing and driver development.\n");

    twin_shutdown();
    return 0;
}
