import { spawn } from 'child_process';
import { $terminateOwnedProcessTree } from '../../../../utils/execCommand/$terminateOwnedProcessTree';
import { extractNpmPackageVersionFromOutput } from '../npm/extractNpmPackageVersionFromOutput';
import type { HarnessDefinition } from './HarnessDefinition';

/**
 * Time limit for asking the globally installed harness command for its version.
 */
const HARNESS_VERSION_COMMAND_TIMEOUT_MS = 30 * 1000;

/** Maximum retained probe output; a malfunctioning optional executable cannot exhaust supervisor memory. */
const HARNESS_VERSION_OUTPUT_LIMIT = 16_384;

/**
 * Per-invocation probe context shared by finite CLI startup, workspace workers and chats.
 * @private internal CLI harness discovery
 */
export type HarnessProbeOptions = {
    readonly environment?: NodeJS.ProcessEnv;
    readonly signal?: AbortSignal;
};

/**
 * Reads the version of the globally installed harness command.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it runs the harness command
 *
 * @returns The installed version or `null` when the harness command is not available globally
 * @private internal utility of `promptbookCli`
 */
export async function $resolveInstalledHarnessVersion(
    definition: HarnessDefinition,
    options: HarnessProbeOptions = {},
): Promise<string | null> {
    options.signal?.throwIfAborted();
    return new Promise((done) => {
        const isWindows = process.platform === 'win32';
        const commandProcess = spawn(definition.commandName, ['--version'], {
            shell: isWindows,
            detached: !isWindows,
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'pipe'],
            env: options.environment ? { ...process.env, ...options.environment } : process.env,
        });
        let output = '';
        let isCancelled = false;
        /** Timeout and supervisor shutdown cancel only this probe's owned tree. */
        const cancel = (): void => {
            isCancelled = true;
            $terminateOwnedProcessTree(commandProcess, !isWindows);
        };
        const timeout = setTimeout(cancel, HARNESS_VERSION_COMMAND_TIMEOUT_MS);
        options.signal?.addEventListener('abort', cancel, { once: true });
        if (options.signal?.aborted) cancel();
        /** Resolves unavailable probes without allowing an optional harness to fail startup. */
        const finish = (code?: number | null): void => {
            clearTimeout(timeout);
            options.signal?.removeEventListener('abort', cancel);
            done(!isCancelled && code === 0 ? extractNpmPackageVersionFromOutput(output) : null);
        };
        /** Retains bounded stdout/stderr because adapters print version banners to either stream. */
        const appendOutput = (chunk: Buffer): void => {
            output = (output + chunk.toString()).slice(-HARNESS_VERSION_OUTPUT_LIMIT);
        };
        commandProcess.stdout.on('data', appendOutput);
        commandProcess.stderr.on('data', appendOutput);
        commandProcess.once('close', finish);
        commandProcess.once('error', () => finish());
    });
}

// Note: [🟡] Code for CLI harness version detection [$resolveInstalledHarnessVersion](src/cli/cli-commands/common/harness/$resolveInstalledHarnessVersion.ts) should never be published outside of `@promptbook/cli`
