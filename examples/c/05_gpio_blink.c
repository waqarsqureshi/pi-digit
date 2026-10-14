/* 05. C GPIO Pin Toggle (lgpio / libpi_twin)
 * Directly controls Raspberry Pi 4 BCM GPIO 17 (Physical Pin 11).
 */

#include <stdio.h>
#include <unistd.h>
#include "../../src/pi_twin.h"

int main(void) {
    const int PIN = 17;
    twin_init();
    
    printf("Configuring BCM GPIO %d (Pin 11) as DIGITAL OUTPUT...\n", PIN);
    twin_gpio_mode(PIN, TWIN_GPIO_OUT);
    
    for (int cycle = 1; cycle <= 4; cycle++) {
        printf("Cycle %d/4: Writing GPIO %d -> HIGH (3.3V)\n", cycle, PIN);
        twin_gpio_write(PIN, 1);
        usleep(350000); // 350 ms
        
        printf("Cycle %d/4: Writing GPIO %d -> LOW  (0.0V)\n", cycle, PIN);
        twin_gpio_write(PIN, 0);
        usleep(350000); // 350 ms
    }
    
    printf("GPIO toggle test completed.\n");
    twin_shutdown();
    return 0;
}
