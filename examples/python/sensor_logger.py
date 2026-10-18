import pathlib
import runpy

runpy.run_path(str(pathlib.Path(__file__).with_name("05_temp_poll.py")), run_name="__main__")
