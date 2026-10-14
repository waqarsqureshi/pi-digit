/* 04. C Environmental Sensor Read
 * Reads temperature, humidity, and pressure with ambient calibration.
 */

#include <stdio.h>
#include <unistd.h>
#include "../../src/pi_twin.h"

int main(void) {
    twin_init();
    
    printf("==========================================\n");
    printf("  Sense HAT Environmental Sensors (C API)\n");
    printf("==========================================\n");
    
    for (int i = 1; i <= 5; i++) {
        float temp = twin_get_temperature();
        float humidity = twin_get_humidity();
        float pressure = twin_get_pressure();
        
        printf("Sample #%d: Temp = %.1f C (%.1f F) | Humidity = %.1f %% | Pressure = %.1f hPa\n",
               i, temp, (temp * 9.0f / 5.0f) + 32.0f, humidity, pressure);
        usleep(400000);
    }
    
    twin_shutdown();
    return 0;
}
