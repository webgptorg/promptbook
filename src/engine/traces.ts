import { appendFile, readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { ensureDirectory, toProjectRelative } from '../common/fs.js';
import { slugify } from '../common/ids.js';
import { createRedactor } from '../common/redact.js';
import { fileTimestamp } from '../common/time.js';
import { ENGINE_VERSION } from '../common/version.js';
import type { Project } from '../project/workspace.js';
import { rotateServiceLog } from '../service/records.js';

/**
 * Maximal number of retained trace files when log preservation is off.
 */
const MAX_TRACE_FILES = 400;

/**
 * An append-only, redacted evidence file for one attempt or operation.
 *
 * @private execution evidence
 */
export type TraceFile = {
    /** Absolute path. */
    readonly path: string;
    /** Project-relative path. */
    readonly relativePath: string;
    /** Appends redacted text. */
    readonly write: (text: string) => Promise<void>;
};

/**
 * Creates a trace file under `.ptbk/traces/<date>/`.
 *
 * Returns `undefined` (never a fictitious path) when trace storage is unavailable.
 *
 * @private execution evidence
 */
export async function createTrace(project: Project, label: string, extraSecrets: readonly string[] = []): Promise<TraceFile | undefined> {
    const redactor = createRedactor(extraSecrets);
    try {
        const stamp = fileTimestamp();
        const directory = await ensureDirectory(join(project.runtime.traces, stamp.slice(0, 10)));
        const path = join(directory, `${stamp.slice(11)}-${slugify(label, 60)}-${process.pid}.log`);
        await appendFile(path, `# ptbk ${ENGINE_VERSION} · ${new Date().toISOString()} · ${label}\n`);
        let failed = false;
        return {
            path,
            relativePath: toProjectRelative(project.root, path),
            write: async (text: string) => {
                if (failed) return;
                try {
                    await appendFile(path, redactor(text.endsWith('\n') ? text : `${text}\n`));
                } catch {
                    failed = true;
                }
            },
        };
    } catch {
        return undefined;
    }
}

/**
 * Records a diagnostic outside a task (`.ptbk/logs/diagnostics.jsonl`); returns the log path or `undefined`.
 *
 * @private execution evidence
 */
export async function recordDiagnostic(project: Project, entry: { phase: string; message: string; details?: unknown }): Promise<string | undefined> {
    const redactor = createRedactor();
    try {
        await ensureDirectory(project.runtime.logs);
        const path = join(project.runtime.logs, 'diagnostics.jsonl');
        rotateServiceLog(path);
        const line = JSON.stringify({ at: new Date().toISOString(), engineVersion: ENGINE_VERSION, ...entry });
        await appendFile(path, `${redactor(line)}\n`);
        return toProjectRelative(project.root, path);
    } catch {
        return undefined;
    }
}

/**
 * Removes the oldest traces beyond the retention bound, never touching protected paths.
 *
 * @private execution evidence
 */
export async function rotateTraces(project: Project, protectedRelativePaths: ReadonlySet<string>): Promise<void> {
    const files: Array<{ path: string; mtime: number }> = [];
    let days: string[];
    try {
        days = await readdir(project.runtime.traces);
    } catch {
        return;
    }
    for (const day of days) {
        const directory = join(project.runtime.traces, day);
        let names: string[];
        try {
            names = await readdir(directory);
        } catch {
            continue;
        }
        for (const name of names) {
            const path = join(directory, name);
            try {
                files.push({ path, mtime: (await stat(path)).mtimeMs });
            } catch {
                // removed concurrently
            }
        }
    }
    if (files.length <= MAX_TRACE_FILES) return;
    files.sort((a, b) => a.mtime - b.mtime);
    for (const file of files.slice(0, files.length - MAX_TRACE_FILES)) {
        if (protectedRelativePaths.has(toProjectRelative(project.root, file.path))) continue;
        await rm(file.path, { force: true });
    }
}
