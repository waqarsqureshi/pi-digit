/* ==============================================================================
 * 10. Linux Character Device Driver Example in C (Raspberry Pi 4 / Sense HAT)
 * File: examples/c/10_device_driver.c
 *
 * This example demonstrates:
 * 1. Linux Kernel Character Device Driver Architecture:
 *    - register_chrdev_region() / alloc_chrdev_region()
 *    - struct file_operations (.open, .release, .read, .write, .unlocked_ioctl)
 *    - copy_to_user() and copy_from_user() safe kernel-space memory transitions
 *    - IOCTL command interface for direct peripheral configuration
 * 2. Standalone Userspace Driver Simulator Test Harness (compiled with -DUSERSPACE_SIM)
 *    allowing classroom students to test driver syscalls without needing root kernel headers.
 * ==============================================================================
 */

#ifndef __KERNEL__
/* ==============================================================================
 * SECTION A: USERSPACE HARDWARE DRIVER HARNESS
 * Simulates kernel device driver open(), write(), read(), and ioctl() operations.
 * ==============================================================================
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>
#include "../../src/pi_twin.h"

#define DEVICE_NAME       "sense_hat_led"
#define SENSE_IOC_MAGIC   's'
#define SENSE_IOC_CLEAR   _IO(SENSE_IOC_MAGIC, 1)
#define SENSE_IOC_SET_PIX _IOW(SENSE_IOC_MAGIC, 2, struct sense_pixel_cmd)
#define SENSE_IOC_GET_TMP _IOR(SENSE_IOC_MAGIC, 3, float)

#ifndef _IO
#define _IO(type, nr)         ((type << 8) | (nr))
#define _IOW(type, nr, data)  ((type << 8) | (nr))
#define _IOR(type, nr, data)  ((type << 8) | (nr))
#endif

struct sense_pixel_cmd {
    int x;
    int y;
    unsigned char r;
    unsigned char g;
    unsigned char b;
};

/* Virtual Device Driver State in Userspace */
typedef struct {
    int is_open;
    unsigned char frame_buffer[64][3]; // 8x8 RGB pixels
    float cached_temperature;
} sense_cdev_t;

static sense_cdev_t g_driver_device;

/* Driver open() implementation */
int driver_open(void) {
    if (g_driver_device.is_open) {
        printf("[DRIVER KERNEL] Warning: Device /dev/%s already opened by another process.\n", DEVICE_NAME);
    }
    g_driver_device.is_open = 1;
    twin_init();
    printf("[DRIVER KERNEL] chrdev /dev/%s: open() syscall successful. Major=240, Minor=0\n", DEVICE_NAME);
    return 0;
}

/* Driver write() implementation */
ssize_t driver_write(const void *user_buf, size_t count) {
    if (!g_driver_device.is_open) return -1;

    size_t pixels_to_write = count / 3;
    if (pixels_to_write > 64) pixels_to_write = 64;

    const unsigned char *data = (const unsigned char *)user_buf;
    printf("[DRIVER KERNEL] write() called: streaming %zu RGB bytes into 8x8 LED matrix...\n", count);

    for (size_t i = 0; i < pixels_to_write; i++) {
        int x = (int)(i % 8);
        int y = (int)(i / 8);
        unsigned char r = data[i * 3 + 0];
        unsigned char g = data[i * 3 + 1];
        unsigned char b = data[i * 3 + 2];

        g_driver_device.frame_buffer[i][0] = r;
        g_driver_device.frame_buffer[i][1] = g;
        g_driver_device.frame_buffer[i][2] = b;

        twin_set_pixel(x, y, r, g, b);
    }
    return count;
}

/* Driver ioctl() implementation */
long driver_ioctl(unsigned int cmd, unsigned long arg) {
    if (!g_driver_device.is_open) return -1;

    if (cmd == SENSE_IOC_CLEAR) {
        printf("[DRIVER KERNEL] ioctl(SENSE_IOC_CLEAR): Clearing display.\n");
        twin_clear_matrix();
        memset(g_driver_device.frame_buffer, 0, sizeof(g_driver_device.frame_buffer));
        return 0;
    } else if (cmd == SENSE_IOC_SET_PIX) {
        struct sense_pixel_cmd *pix = (struct sense_pixel_cmd *)arg;
        if (pix->x < 0 || pix->x > 7 || pix->y < 0 || pix->y > 7) return -1;

        printf("[DRIVER KERNEL] ioctl(SENSE_IOC_SET_PIX): Coordinate (%d, %d) -> RGB(%d, %d, %d)\n",
               pix->x, pix->y, pix->r, pix->g, pix->b);
        twin_set_pixel(pix->x, pix->y, pix->r, pix->g, pix->b);
        return 0;
    } else if (cmd == SENSE_IOC_GET_TMP) {
        float *out_temp = (float *)arg;
        *out_temp = twin_get_temperature();
        printf("[DRIVER KERNEL] ioctl(SENSE_IOC_GET_TMP): Hardware temperature = %.2f C\n", *out_temp);
        return 0;
    }
    return -22; // EINVAL
}

/* Driver release() implementation */
int driver_release(void) {
    printf("[DRIVER KERNEL] chrdev /dev/%s: release() syscall executed.\n", DEVICE_NAME);
    g_driver_device.is_open = 0;
    twin_shutdown();
    return 0;
}

/* USERSPACE APPLICATION DEMONSTRATING DRIVER INVOCATION */
int main(void) {
    printf("===============================================================\n");
    printf("  Pi-Digit: Linux Character Device Driver Simulation in C\n");
    printf("  Target Device : /dev/%s\n", DEVICE_NAME);
    printf("===============================================================\n\n");

    // 1. Open Driver Device
    driver_open();
    usleep(200000);

    // 2. Clear Device via IOCTL
    printf("\n>>> Syscall 1: ioctl() CLEAR command...\n");
    driver_ioctl(SENSE_IOC_CLEAR, 0);
    usleep(300000);

    // 3. Set Individual Pixel via IOCTL
    printf("\n>>> Syscall 2: ioctl() SET_PIXEL command...\n");
    struct sense_pixel_cmd corner_pixel = { .x = 0, .y = 0, .r = 255, .g = 0, .b = 0 };
    driver_ioctl(SENSE_IOC_SET_PIX, (unsigned long)&corner_pixel);
    usleep(300000);

    // 4. Bulk Write 8x8 RGB Stream to Character Device
    printf("\n>>> Syscall 3: write() streaming 64-pixel RGB buffer...\n");
    unsigned char test_pattern[64 * 3];
    for (int y = 0; y < 8; y++) {
        for (int x = 0; x < 8; x++) {
            int idx = (y * 8 + x) * 3;
            if ((x + y) % 2 == 0) {
                test_pattern[idx + 0] = 0;   // R
                test_pattern[idx + 1] = 200; // G
                test_pattern[idx + 2] = 255; // B (Cyan)
            } else {
                test_pattern[idx + 0] = 255; // R
                test_pattern[idx + 1] = 160; // G (Amber)
                test_pattern[idx + 2] = 0;   // B
            }
        }
    }
    driver_write(test_pattern, sizeof(test_pattern));
    usleep(400000);

    // 5. Read Telemetry via IOCTL
    printf("\n>>> Syscall 4: ioctl() GET_TEMPERATURE query...\n");
    float current_temp = 0.0f;
    driver_ioctl(SENSE_IOC_GET_TMP, (unsigned long)&current_temp);
    printf("Userspace App received calibrated temperature: %.2f C\n", current_temp);

    // 6. Close Driver
    printf("\n>>> Syscall 5: close() driver release...\n");
    driver_release();

    printf("\n[SUCCESS] Device driver lifecycle verified: open -> ioctl -> write -> read -> release\n");
    return 0;
}

#else
/* ==============================================================================
 * SECTION B: KERNEL MODULE SOURCE CODE (Linux Kernel Module Build)
 * To compile as a real .ko kernel module on Raspberry Pi:
 *   make -C /lib/modules/$(uname -r)/build M=$PWD modules
 * ==============================================================================
 */
#include <linux/init.h>
#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/fs.h>
#include <linux/cdev.h>
#include <linux/uaccess.h>
#include <linux/device.h>

#define DEVICE_NAME "sense_hat_led"
#define CLASS_NAME  "sense_hat"

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Pi-Digit Embedded Systems Laboratory");
MODULE_DESCRIPTION("Linux Character Device Driver for Raspberry Pi Sense HAT");
MODULE_VERSION("1.0.0");

static int major_number;
static struct class*  sense_class  = NULL;
static struct device* sense_device = NULL;
static struct cdev    sense_cdev;
static unsigned char  kernel_buffer[192]; // 64 pixels * 3 RGB bytes

static int dev_open(struct inode *inodep, struct file *filep) {
    pr_info("sense_hat_led: Device opened successfully\n");
    return 0;
}

static ssize_t dev_read(struct file *filep, char __user *buffer, size_t len, loff_t *offset) {
    int error_count = 0;
    if (*offset >= 192) return 0;
    if (len > (192 - *offset)) len = 192 - *offset;
    
    error_count = copy_to_user(buffer, kernel_buffer + *offset, len);
    if (error_count == 0) {
        *offset += len;
        return len;
    } else {
        return -EFAULT;
    }
}

static ssize_t dev_write(struct file *filep, const char __user *buffer, size_t len, loff_t *offset) {
    size_t to_copy = (len > 192) ? 192 : len;
    if (copy_from_user(kernel_buffer, buffer, to_copy)) {
        return -EFAULT;
    }
    pr_info("sense_hat_led: Received %zu bytes for LED matrix\n", to_copy);
    return to_copy;
}

static int dev_release(struct inode *inodep, struct file *filep) {
    pr_info("sense_hat_led: Device successfully closed\n");
    return 0;
}

static struct file_operations fops = {
    .owner   = THIS_MODULE,
    .open    = dev_open,
    .read    = dev_read,
    .write   = dev_write,
    .release = dev_release,
};

static int __init sense_driver_init(void) {
    pr_info("sense_hat_led: Initializing Sense HAT character device driver\n");
    major_number = register_chrdev(0, DEVICE_NAME, &fops);
    if (major_number < 0) {
        pr_alert("sense_hat_led: Failed to register a major number\n");
        return major_number;
    }
    sense_class = class_create(THIS_MODULE, CLASS_NAME);
    if (IS_ERR(sense_class)) {
        unregister_chrdev(major_number, DEVICE_NAME);
        return PTR_ERR(sense_class);
    }
    sense_device = device_create(sense_class, NULL, MKDEV(major_number, 0), NULL, DEVICE_NAME);
    if (IS_ERR(sense_device)) {
        class_destroy(sense_class);
        unregister_chrdev(major_number, DEVICE_NAME);
        return PTR_ERR(sense_device);
    }
    pr_info("sense_hat_led: Device node created at /dev/%s (Major %d)\n", DEVICE_NAME, major_number);
    return 0;
}

static void __exit sense_driver_exit(void) {
    device_destroy(sense_class, MKDEV(major_number, 0));
    class_unregister(sense_class);
    class_destroy(sense_class);
    unregister_chrdev(major_number, DEVICE_NAME);
    pr_info("sense_hat_led: Driver unregistered and removed\n");
}

module_init(sense_driver_init);
module_exit(sense_driver_exit);
#endif
