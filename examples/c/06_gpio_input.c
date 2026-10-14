/* 06. C GPIO Digital Input Read
 * Reads digital input level on BCM GPIO 27 (Physical Pin 13).
 */

#include <stdio.h>
#include <unistd.h>
#include "../../src/pi_twin.h"

int main(void) {
    const int BUTTON_PIN = 27;
    twin_init();
    
    printf("Configuring BCM GPIO %d (Pin 13) as DIGITAL INPUT...\n", BUTTON_PIN);
    twin_gpio_mode(BUTTON_PIN, TWIN_GPIO_IN);
    
    for (int i = 1; i <= 5; i++) {
        int value = twin_gpio_read(BUTTON_PIN);
        printf("Poll #%d: GPIO %d level = %d (%s)\n",
               i, BUTTON_PIN, value, value ? "HIGH (3.3V)" : "LOW (0.0V)");
        usleep(300000);
    }
    
    twin_shutdown();
    return 0;
}
