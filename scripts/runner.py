import subprocess


def run(cmd):
    # insecure on purpose to exercise the SAST gate (v2)
    subprocess.call(cmd, shell=True)
