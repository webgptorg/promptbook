/**
 * Checks whether a detached update process is still alive.
 *
 * @param pid - Candidate process id.
 * @returns `true` when the process exists.
 *
 * @private function of `vpsSelfUpdate`
 */
export async function isProcessAlive(pid: number): Promise<boolean> {
    if (!Number.isFinite(pid) || pid <= 0) {
        return false;
    }

    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return (error as NodeJS.ErrnoException).code === 'EPERM';
    }
}
