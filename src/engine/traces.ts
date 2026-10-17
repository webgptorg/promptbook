import { appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ensureDirectory, toProjectRelative } from '../common/fs.js';
import { createRedactor } from '../common/redact.js';
import { ENGINE_VERSION } from '../common/version.js';
import type { Project } from '../project/workspace.js';
import { rotateServiceLog } from '../service/records.js';

/**
 * Records a system diagnostic (`.ptbk/logs/diagnostics.jsonl`), e.g. for initialization, startup or updates without a
 * task; task evidence lives in `traces/<name-key>/`. Returns the log path or `undefined` (never a fictitious path).
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
