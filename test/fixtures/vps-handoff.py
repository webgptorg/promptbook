"""Runs a command in a pseudo-terminal, like an attended SSH session, and accepts each default answer of ptbk init.

The server-deployment workflow uses it to check that the VPS bootstrap hands its live terminal to the ordinary
initializer as the engine user. Prints the terminal text without escape sequences and exits with the command's status.
"""
import fcntl
import os
import pty
import re
import select
import struct
import sys
import termios
import time

ESCAPES = re.compile(r'\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[@-Z\\-_]')
TIMEOUT_SECONDS = 900

pid, fd = pty.fork()
if pid == 0:
    os.execvp(sys.argv[1], sys.argv[1:])
fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack('HHHH', 40, 120, 0, 0))
output = b''
answered_at = -1
deadline = time.time() + TIMEOUT_SECONDS
while time.time() < deadline:
    ready, _, _ = select.select([fd], [], [], 1.0)
    if ready:
        try:
            chunk = os.read(fd, 65536)
        except OSError:
            break
        if not chunk:
            break
        output += chunk
        continue
    # Quiet after new output: a wizard question waits; take its default.
    text = ESCAPES.sub('', output.decode('utf8', 'replace'))
    if len(output) != answered_at and 'Enter confirm' in text[-400:]:
        os.write(fd, b'\r')
        answered_at = len(output)
else:
    os.kill(pid, 15)
    print('Timed out waiting for the command.', file=sys.stderr)
_, status = os.waitpid(pid, 0)
text = ESCAPES.sub('', output.decode('utf8', 'replace'))
print(text[-8000:])
if 'Starting the setup assistant' not in text:
    print('The bootstrap did not hand its terminal to ptbk init.', file=sys.stderr)
    sys.exit(1)
sys.exit(os.waitstatus_to_exitcode(status))
