#ifndef PI_TWIN_H
#define PI_TWIN_H

#ifdef __cplusplus
extern "C" {
#endif

#define TWIN_GPIO_OUT 0
#define TWIN_GPIO_IN  1
#define TWIN_HIGH     1
#define TWIN_LOW      0

void twin_init(void);
void twin_shutdown(void);

// Sense HAT LED Matrix
void twin_clear_matrix(void);
void twin_set_pixel(int x, int y, int r, int g, int b);

// Sense HAT Telemetry
float twin_get_temperature(void);
float twin_get_humidity(void);
float twin_get_pressure(void);

// GPIO Pins
void twin_gpio_mode(int pin, int mode);
void twin_gpio_write(int pin, int value);
int  twin_gpio_read(int pin);

// 16x2 Character LCD
void twin_lcd_clear(void);
void twin_lcd_print(const char* text);
void twin_lcd_set_cursor(int row, int col);

#ifdef __cplusplus
}
#endif

#endif // PI_TWIN_H
