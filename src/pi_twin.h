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

// Hardware PWM Controller (GPIO 18 / PWM0 · Pin 12)
void twin_pwm_init(int channel, float freq_hz);
void twin_pwm_start(int channel, float duty_cycle);
void twin_pwm_set_duty(int channel, float duty_cycle);
void twin_pwm_set_freq(int channel, float freq_hz);
void twin_pwm_stop(int channel);

#ifdef __cplusplus
}
#endif

#endif // PI_TWIN_H
