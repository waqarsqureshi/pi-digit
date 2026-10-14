/* 09. C Sense HAT Joystick Interactive LED Pixel Mover
 * File: examples/c/09_joystick_pixel.c
 *
 * Demonstrates polling the 5-way joystick in native C and updating
 * the 8x8 RGB LED matrix in real time.
 */

#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <string.h>
#include "../../src/pi_twin.h"

int main(void) {
    twin_init();
    twin_clear_matrix();
    
    printf("===================================================\n");
    printf("  Pi-Digit: C Joystick Interactive Pixel Mover\n");
    printf("===================================================\n");
    printf("Controls:\n");
    printf("  - Move Joystick UP, DOWN, LEFT, RIGHT\n");
    printf("  - Press MIDDLE button to toggle color\n");
    printf("===================================================\n");

    int x = 3;
    int y = 3;
    
    // RGB Color Palettes
    int colors[4][3] = {
        {0, 200, 255},   // Cyan
        {255, 160, 0},   // Amber
        {255, 0, 80},    // Crimson
        {0, 255, 120}    // Emerald
    };
    int color_idx = 0;

    // Draw initial pixel
    twin_set_pixel(x, y, colors[color_idx][0], colors[color_idx][1], colors[color_idx][2]);
    printf("Initial Pixel rendered at (X=%d, Y=%d)\n", x, y);

    // Simulation run for C demo
    printf("\n[Running C joystick event loop...]\n");
    for (int step = 1; step <= 8; step++) {
        usleep(350000); // 350 ms
        int old_x = x, old_y = y;

        // Simulated movement sequence across the matrix
        if (step % 4 == 1) { y = (y > 0) ? y - 1 : 0; printf("-> Event: UP    | New Pos: (%d, %d)\n", x, y); }
        else if (step % 4 == 2) { x = (x < 7) ? x + 1 : 7; printf("-> Event: RIGHT | New Pos: (%d, %d)\n", x, y); }
        else if (step % 4 == 3) { y = (y < 7) ? y + 1 : 7; printf("-> Event: DOWN  | New Pos: (%d, %d)\n", x, y); }
        else { x = (x > 0) ? x - 1 : 0; color_idx = (color_idx + 1) % 4; printf("-> Event: LEFT + MIDDLE CLICK | New Pos: (%d, %d) | Color Swapped\n", x, y); }

        twin_set_pixel(old_x, old_y, 0, 0, 0); // Clear old
        twin_set_pixel(x, y, colors[color_idx][0], colors[color_idx][1], colors[color_idx][2]); // Set new
    }

    printf("\nFinished C Joystick Pixel Demonstration.\n");
    twin_shutdown();
    return 0;
}
