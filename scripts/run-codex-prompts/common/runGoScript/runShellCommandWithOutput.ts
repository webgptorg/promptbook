import { spawn } from 'child_process';
import { coderRunRawOutput } from '../../ui/CoderRunSessionContext';

/**
 * Options for running one shell command while streaming raw output into the coding-run session.
 */
export type RunShellCommandWithOutputOptions = {
    command: string;
    cwd?: string;
    env?: Record<string, string>;
};

/**
 * Executes one shell command, forwarding stdout/stderr to the active coding-run session and returning full output.
 */
export async function runShellCommandWithOutput(options: RunShellCommandWithOutputOptions): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
        const output: string[] = [];
        let settled = false;
        const commandProcess = spawn(options.command, {
            cwd: options.cwd,
            shell: true,
            env: options.env ? { ...process.env, ...options.env } : process.env,
        });

        /**
         * Ensures the promise settles only once.
         */
        const settleOnce = (handler: () => void): void => {
            if (settled) {
                return;
            }

            settled = true;
            handler();
        };

        commandProcess.stdout.on('data', (stdout) => {
            const stdoutText = stdout.toString();
            output.push(stdoutText);
            coderRunRawOutput(stdoutText, 'stdout');
        });

        commandProcess.stderr.on('data', (stderr) => {
            const stderrText = stderr.toString();
            output.push(stderrText);
            coderRunRawOutput(stderrText, 'stderr');
        });

        /**
         * Handles process exit and resolves or rejects with collected output.
         */
        const finishWithCode = (code: number | null): void => {
            settleOnce(() => {
                const trimmedOutput = output.join('').trim();

                if (code === 0) {
                    resolve(trimmedOutput);
                    return;
                }

                reject(new Error(trimmedOutput || `Command "${options.command}" exited with code ${code ?? 'unknown'}`));
            });
        };

        commandProcess.on('close', finishWithCode);
        commandProcess.on('exit', finishWithCode);
        commandProcess.on('disconnect', () => {
            settleOnce(() => {
                reject(new Error(`Command "${options.command}" disconnected`));
            });
        });
        commandProcess.on('error', (error) => {
            settleOnce(() => {
                reject(new Error(`Command "${options.command}" failed: ${error.message}`));
            });
        });
    });
}
