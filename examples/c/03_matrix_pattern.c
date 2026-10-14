/* 03. C LED Matrix Pattern Generator
 * Generates an alternating checkerboard pattern across all 64 pixels.
 */

#include <stdio.h>
#include <unistd.h>
#include "../../src/pi_twin.h"

int main(void) {
    twin_init();
    twin_clear_matrix();
    
    printf("Drawing 8x8 checkerboard in native C...\n");
    for (int y = 0; y < 8; y++) {
        for (int x = 0; x < 8; x++) {
            if ((x + y) % 2 == 0) {
                twin_set_pixel(x, y, 0, 200, 255); // Cyan
            } else {
                twin_set_pixel(x, y, 255, 160, 0); // Amber
            }
        }
        usleep(40000); // 40ms per scan line
    }
    
    printf("Checkerboard pattern rendered successfully.\n");
    twin_shutdown();
    return 0;
}
