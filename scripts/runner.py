import subprocess


def run(cmd):
    # intentionally insecure to exercise the SAST gate
    subprocess.call(cmd, shell=True)
