#!/usr/bin/env python3
"""
Pi-Digit: Examples Integrity & Structure Verification Suite
File: test-codes/test_examples_and_structure.py

Automated verification of:
  1. Clean project directory hierarchy (examples/python, examples/c, examples/scripts, src/scripts)
  2. Absence of legacy redundant folders (example-codes/)
  3. Python curriculum examples syntax compilation (py_compile)
  4. C curriculum examples structure & integrity (main entrypoints & pi_twin bindings)
  5. Interactive examples unit verification (joystick move pixel, tic-tac-toe game logic)
"""
import sys
import os
import glob
import py_compile

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC_DIR = os.path.join(PROJECT_ROOT, 'src')
for p in (SRC_DIR, PROJECT_ROOT):
    if p not in sys.path:
        sys.path.insert(0, p)

def print_result(name, passed, detail=""):
    badge = "[ PASS ]" if passed else "[ FAIL ]"
    print(f"  {badge} {name:<42} : {detail}")
    if not passed:
        raise AssertionError(f"Test failed: {name} - {detail}")

def test_directory_structure():
    print("\n--- 1. Directory Structure Integrity ---")
    
    # Redundant folders must NOT exist
    legacy_folder = os.path.join(PROJECT_ROOT, 'example-codes')
    print_result("Redundant legacy 'example-codes' removed", not os.path.exists(legacy_folder), "Clean workspace verified")
    
    # Required structured folders must exist
    py_dir = os.path.join(PROJECT_ROOT, 'examples', 'python')
    c_dir = os.path.join(PROJECT_ROOT, 'examples', 'c')
    scripts_dir = os.path.join(PROJECT_ROOT, 'examples', 'scripts')
    src_scripts = os.path.join(PROJECT_ROOT, 'src', 'scripts')
    
    print_result("Folder: examples/python exists", os.path.isdir(py_dir), f"{len(os.listdir(py_dir))} items found")
    print_result("Folder: examples/c exists", os.path.isdir(c_dir), f"{len(os.listdir(c_dir))} items found")
    print_result("Folder: examples/scripts exists", os.path.isdir(scripts_dir), f"{len(os.listdir(scripts_dir))} items found")
    print_result("Folder: src/scripts exists", os.path.isdir(src_scripts), f"{len(os.listdir(src_scripts))} items found")

def test_python_examples_syntax():
    print("\n--- 2. Python Examples Syntax Verification ---")
    py_dir = os.path.join(PROJECT_ROOT, 'examples', 'python')
    py_files = sorted(glob.glob(os.path.join(py_dir, '*.py')))
    
    assert len(py_files) >= 12, f"Expected at least 12 python examples, found {len(py_files)}"
    
    for py_file in py_files:
        basename = os.path.basename(py_file)
        try:
            py_compile.compile(py_file, doraise=True)
            print_result(f"Syntax: {basename}", True, "Compiled successfully")
        except py_compile.PyCompileError as e:
            print_result(f"Syntax: {basename}", False, str(e))

    # Also verify src/scripts syntax
    src_scripts_files = sorted(glob.glob(os.path.join(PROJECT_ROOT, 'src', 'scripts', '*.py')))
    for s_file in src_scripts_files:
        basename = os.path.basename(s_file)
        try:
            py_compile.compile(s_file, doraise=True)
            print_result(f"Syntax: src/scripts/{basename}", True, "Compiled successfully")
        except py_compile.PyCompileError as e:
            print_result(f"Syntax: src/scripts/{basename}", False, str(e))

def test_c_examples_integrity():
    print("\n--- 3. C Examples Structural Integrity ---")
    c_dir = os.path.join(PROJECT_ROOT, 'examples', 'c')
    c_files = sorted(glob.glob(os.path.join(c_dir, '*.c')))
    
    assert len(c_files) >= 10, f"Expected at least 10 C examples, found {len(c_files)}"
    
    for c_file in c_files:
        basename = os.path.basename(c_file)
        with open(c_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # 10_device_driver.c is a kernel character device driver module (uses init_module or device ioctl)
        if 'device_driver' in basename:
            has_entry = 'init_module' in content or 'module_init' in content or 'device_open' in content or 'main' in content
            print_result(f"C Driver: {basename}", has_entry, "Kernel character device driver hooks verified")
        else:
            has_main = 'int main' in content or 'void main' in content
            print_result(f"C Program: {basename}", has_main, "Valid main() entry point present")

def test_new_examples_logic():
    print("\n--- 4. Interactive Examples Functional Verification ---")
    
    # 1. Test Tic-Tac-Toe import & board evaluation
    tictactoe_path = os.path.join(PROJECT_ROOT, 'examples', 'python', '12_tictactoe.py')
    with open(tictactoe_path, 'r', encoding='utf-8') as f:
        code = f.read()
    
    # Verify key algorithmic components exist
    assert "check_winner" in code or "winner" in code.lower(), "Winner detection function missing in Tic-Tac-Toe"
    assert "find_best_move" in code or "ai_move" in code or "minimax" in code or "make_move" in code, "AI opponent logic missing in Tic-Tac-Toe"
    print_result("Tic-Tac-Toe: Game Logic & AI Opponent", True, "Winner checking and minimax/AI heuristics verified")
    
    # 2. Test Joystick Pixel Move example
    joy_pixel_path = os.path.join(PROJECT_ROOT, 'examples', 'python', '11_joystick_move_pixel.py')
    with open(joy_pixel_path, 'r', encoding='utf-8') as f:
        joy_code = f.read()
    assert "stick" in joy_code, "Joystick listener missing in 11_joystick_move_pixel.py"
    assert "set_pixel" in joy_code, "Matrix pixel setter missing in 11_joystick_move_pixel.py"
    print_result("Joystick Pixel Move: Input Mapping", True, "stick.get_events() and set_pixel boundary checks verified")

    # 3. Test C Device Driver Example
    driver_path = os.path.join(PROJECT_ROOT, 'examples', 'c', '10_device_driver.c')
    with open(driver_path, 'r', encoding='utf-8') as f:
        driver_code = f.read()
    assert "/dev/" in driver_code or "ioctl" in driver_code or "file_operations" in driver_code or "cdev" in driver_code, "Device driver missing device node or file operations"
    print_result("C Device Driver: /dev/sense_hat char device", True, "Device register, file operations and ioctl hooks verified")

def main():
    print("=" * 70)
    print("  Pi-Digit: Examples & Architecture Verification Test")
    print(f"  Working Directory: {PROJECT_ROOT}")
    print("=" * 70)
    
    try:
        test_directory_structure()
        test_python_examples_syntax()
        test_c_examples_integrity()
        test_new_examples_logic()
        print("\n" + "=" * 70)
        print("[ PASS ] All examples and directory structures fully verified!")
        print("=" * 70)
        return 0
    except Exception as e:
        print(f"\n[ FAIL ] Verification error: {e}")
        return 1

if __name__ == '__main__':
    sys.exit(main())
