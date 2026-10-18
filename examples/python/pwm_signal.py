import pathlib
import runpy

runpy.run_path(str(pathlib.Path(__file__).with_name("10_pwm_waveform.py")), run_name="__main__")
