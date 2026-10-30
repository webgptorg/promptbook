import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { kebabIdentifier } from '../common/naming.js';
import { redact } from '../common/redact.js';
import type { ThinkingLevel } from '../project/config.js';
import { runHarness, type HarnessRunResult } from './run.js';
import type { HarnessInspection, HarnessPlugin } from './types.js';

/**
 * One small preparatory harness call outside any project: the selected instance's real (service-user) environment and
 * normal noninteractive execution, in a temporary directory that is removed afterwards. Nothing is recorded as project
 * work: such calls have no task, run, trace or project Usage entry (their small provider usage is accepted).
 *
 * @private harness setup
 */
export type PreparatoryCall = {
    readonly plugin: HarnessPlugin;
    /** The inspection of the instance (its executable and authentication). */
    readonly inspection: HarnessInspection;
    /** The instance environment as the background service will see it. */
    readonly env: NodeJS.ProcessEnv;
    /** The model and thinking level to use (the plugin's coded defaults when omitted). */
    readonly model?: string;
    readonly thinkingLevel?: ThinkingLevel;
    readonly baseUrl?: string;
    /** Working directory; a temporary non-project directory when omitted. */
    readonly directory?: string;
    readonly timeoutMs?: number;
    readonly signal?: AbortSignal;
};

/**
 * Outcome of a harness's real functional check.
 *
 * @private harness setup
 */
export type FunctionalCheck = {
    /** Whether an actual request returned the expected response. */
    readonly ok: boolean;
    /** What happened, with secrets redacted (the concrete cause of a failure). */
    readonly summary: string;
    readonly model?: string;
    /** Usage the harness reported for this call, when it reports any. */
    readonly usage?: Readonly<Record<string, number>>;
    readonly durationMs: number;
};

/**
 * Runs one prompt as a preparatory call.
 */
async function preparatoryRun(call: PreparatoryCall, prompt: string): Promise<HarnessRunResult> {
    const directory = call.directory ?? (await mkdtemp(join(tmpdir(), 'ptbk-preparation-')));
    const promptFile = join(directory, `.ptbk-prompt-${process.pid}-${Date.now()}.md`);
    try {
        await writeFile(promptFile, prompt);
        return await runHarness(
            call.plugin,
            {
                projectRoot: directory,
                cwd: directory,
                prompt,
                promptFile,
                model: call.model ?? call.plugin.defaultModel,
                thinkingLevel: call.thinkingLevel ?? (call.plugin.thinkingLevels.length ? (call.plugin.defaultThinkingLevel ?? call.plugin.thinkingLevels[0]) : undefined),
                baseUrl: call.baseUrl,
                // The ordinary execution mode, so sandbox/runtime failures of real work show up here too.
                readOnly: false,
                env: call.env,
                timeoutMs: call.timeoutMs ?? 180_000,
                signal: call.signal,
                allowCredits: false,
                authentication: call.inspection.authentication,
                readableDirectories: [],
            },
            call.inspection.executablePath ?? call.plugin.executable,
        );
    } finally {
        if (call.directory) await rm(promptFile, { force: true });
        else await rm(directory, { recursive: true, force: true });
    }
}

/**
 * The adapter's minimal real request/response check: an actual inference turn through the same invocation as ordinary
 * work. Executable discovery, version and login status alone are never proof of usable inference.
 *
 * @private harness setup
 */
export async function functionalCheck(call: PreparatoryCall): Promise<FunctionalCheck> {
    const started = Date.now();
    const result = await preparatoryRun(call, '# Harness check\n\nThis is a connectivity check. Do not use any tools or read any files. Reply with exactly the word PONG.\n').catch((error: unknown) => error as Error);
    if (result instanceof Error) return { ok: false, summary: redact(`${call.plugin.displayName} could not be checked: ${result.message}`), durationMs: Date.now() - started };
    const seconds = `${(result.durationMs / 1000).toFixed(1)} s`;
    const ok = result.outcome === 'completed' && /\bPONG\b/i.test(result.finalMessage);
    const summary = ok
        ? `Answered a real request in ${seconds}${result.model ? ` (${result.model})` : ''}`
        : result.outcome === 'completed'
          ? `Completed without the expected answer (${JSON.stringify(result.finalMessage.trim().slice(0, 80) || '(empty)')})`
          : result.diagnostic;
    return { ok, summary: redact(summary), ...(result.model ? { model: result.model } : {}), ...(result.usage ? { usage: result.usage } : {}), durationMs: result.durationMs };
}

/**
 * A proposed project title and folder name.
 *
 * @private harness setup
 */
export type ProposedName = { readonly title: string; readonly folder: string };

/**
 * Asks a working harness for a project title and a safe folder name from the **meaning** of the initial intent (not its
 * first words). A failed call or an unusable answer throws: it is an unexpected failure after a successful check.
 *
 * @private harness setup
 */
export async function proposeProjectName(call: PreparatoryCall, intent: string): Promise<ProposedName> {
    const prompt = [
        '# Project name',
        '',
        'Name a new project from the meaning of its brief below (not from its first words, and not from requests such as "please create a project").',
        'Do not use any tools or read any files. Reply with only one JSON object: {"title": "<short readable title, at most 60 characters>", "folder": "<lowercase-kebab-case folder name, at most 40 characters>"}.',
        '',
        '## Brief',
        '',
        intent.slice(0, 8000),
        '',
    ].join('\n');
    const result = await preparatoryRun(call, prompt);
    if (result.outcome !== 'completed') throw new Error(redact(result.diagnostic));
    const json = /\{[\s\S]*\}/.exec(result.finalMessage)?.[0];
    let data: Record<string, unknown> | undefined;
    try {
        data = json ? (JSON.parse(json) as Record<string, unknown>) : undefined;
    } catch {
        data = undefined;
    }
    const title = typeof data?.title === 'string' ? data.title.replace(/\s+/g, ' ').trim().slice(0, 80) : '';
    const folder = kebabIdentifier(typeof data?.folder === 'string' && data.folder.trim() ? data.folder : title)?.slice(0, 40).replace(/-+$/, '') ?? '';
    if (!title || !folder) throw new Error(`${call.plugin.displayName} did not propose a usable name (${JSON.stringify(result.finalMessage.trim().slice(0, 120) || '(empty)')}).`);
    return { title, folder };
}
