import pathlib
import runpy

runpy.run_path(str(pathlib.Path(__file__).with_name("08_imu_accel.py")), run_name="__main__")
