import { appendFileSync, existsSync, lstatSync, renameSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { Workspace } from './domain.js';
import { redactSecrets } from './harness.js';

/** Maximum size of each of the daemon's two rotating diagnostic files. */
const LOG_BYTES = 5 * 1024 * 1024;

/** Append redacted diagnostics with bounded rotation, preserving task evidence in separate journals.
 * @private Internal owned worker log sink; it never follows a session or user-file symlink.
 */
export function daemonLogWriter(workspace: Workspace, limit = LOG_BYTES): (chunk: string | Uint8Array) => void {
    const filename = join(workspace.statePath, 'service.log');
    const previous = `${filename}.1`;
    return chunk => {
        for (const path of [filename, previous]) {
            try { if (!lstatSync(path).isFile()) throw new Error(`Refusing non-file daemon log: ${path}`); }
            catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
        }
        const text = redactSecrets(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'), workspace.projectPath);
        let bytes = Buffer.from(text);
        if (bytes.length > limit) {
            // Retain a valid UTF-8 prefix and an explicit truncation marker within the same bound.
            const marker = Buffer.from('\n[ptbk] Diagnostic output truncated; task-linked evidence is stored separately.\n');
            const prefix = bytes.subarray(0, Math.max(0, limit - marker.length)).toString('utf8').replace(/\uFFFD$/, '');
            bytes = Buffer.concat([Buffer.from(prefix), marker]).subarray(0, limit);
        }
        if (existsSync(filename) && statSync(filename).size + bytes.length > limit) {
            rmSync(previous, { force: true });
            renameSync(filename, previous);
        }
        appendFileSync(filename, bytes, { mode: 0o600 });
    };
}

/** Redirect only a detached worker's diagnostic streams; failure leaves controls and recovery alive.
 * @private Internal service-worker logging installation.
 */
export function installDaemonLogging(workspace: Workspace): void {
    const append = daemonLogWriter(workspace);
    const fallback = process.stderr.write.bind(process.stderr);
    let failed = false;
    /** Implement Node's writable overloads without changing foreground terminal streams. */
    const write = ((chunk: string | Uint8Array, encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void), callback?: (error?: Error | null) => void): boolean => {
        const complete = typeof encodingOrCallback === 'function' ? encodingOrCallback : callback;
        try { append(chunk); failed = false; }
        catch (error) {
            if (!failed) fallback(`[ptbk] Daemon log unavailable: ${(error as Error).message}. Inspect ptbk show for current state.\n`);
            failed = true;
        }
        if (complete) queueMicrotask(() => complete());
        return true;
    }) as typeof process.stdout.write;
    process.stdout.write = write;
    process.stderr.write = write;
}
