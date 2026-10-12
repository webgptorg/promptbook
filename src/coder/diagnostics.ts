import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Workspace } from './domain.js';
import { confinePath } from './workspace.js';
import { redactSecrets } from './harness.js';
import { installedEngineVersion } from './version.js';

/** Choose actionable next steps from observed failure categories without inventing a cause. */
function nextAction(message: string): string {
    if (/authentication|login|sign.?in/i.test(message)) return 'Complete the harness native login, then retry the command.';
    if (/quota|rate.?limit|credits/i.test(message)) return 'Wait for the provider limit to reset or correct the authorized account configuration.';
    if (/commit|signing|git identity/i.test(message)) return 'Correct Git identity, signing or hooks, then inspect ptbk recover; successful model work must not be replayed.';
    if (/push|synchronization/i.test(message)) return 'Correct the remote connection and retry synchronization; retain the successful local commit.';
    if (/config|unsupported|requires|missing|invalid|setup|does not exist/i.test(message)) return 'Correct the reported option or prerequisite, then rerun the command.';
    return 'Inspect the diagnostic evidence and preserved work before retrying; use ptbk show or ptbk recover for interrupted tasks.';
}

/** Explain an actual failure and link only evidence successfully written; read-only calls never create storage. @private */
export async function reportDiagnostic(error: unknown, options: { command: string; phase: string; projectPath: string; workspace?: Workspace; readOnly?: boolean; metadata?: Record<string, unknown> }): Promise<{ trace?: string; nextAction: string }> {
    const exception = error instanceof Error ? error : new Error(String(error));
    const version = await installedEngineVersion().catch(() => 'unavailable');
    const message = redactSecrets(exception.message, options.projectPath);
    const body = redactSecrets(`Promptbook ${version}\nCommand: ${options.command}\nPhase: ${options.phase}\nProject: ${options.projectPath}\nTime: ${new Date().toISOString()}\nMetadata: ${JSON.stringify(options.metadata ?? {})}\n\n${exception.stack ?? exception.message}\n\nNext action: ${nextAction(message)}\n`, options.projectPath).slice(0, 2 * 1024 * 1024);
    let trace: string | undefined;
    let storage = options.readOnly || !options.workspace ? 'Diagnostic storage was not written for this inspection or preflight; redacted details follow.' : '';
    if (!storage && options.workspace) {
        try {
            const directory = await confinePath(options.workspace.projectPath, join(options.workspace.statePath, 'traces', 'diagnostics'));
            await mkdir(directory, { recursive: true, mode: 0o700 });
            const filename = await confinePath(options.workspace.projectPath, join(directory, `${Date.now()}-${randomUUID()}.log`));
            await writeFile(filename, body, { flag: 'wx', mode: 0o600 });
            trace = filename;
        } catch (failure) { storage = `Diagnostic storage unavailable: ${redactSecrets((failure as Error).message, options.projectPath)}. Redacted details follow.`; }
    }
    process.stderr.write(`Promptbook ${version}: ${options.command} failed during ${options.phase}.\nProject: ${options.projectPath}\n${message}\nThe command did not complete; existing source and recovery evidence remain available.\nNext: ${nextAction(message)}\n${trace ? `Diagnostic: ${trace}\n` : `${storage}\n${body}\n`}`);
    return { trace, nextAction: nextAction(message) };
}
