import { randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { kebabIdentifier } from '../common/naming.js';
import { redact } from '../common/redact.js';
import type { ThinkingLevel } from '../project/config.js';
import { runHarness, type HarnessRunResult } from './run.js';
import { ToolBridge } from '../engine/bridge.js';
import type { HarnessInspection, HarnessPlugin, LocalRoute, McpServerLaunch } from './types.js';

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
    /** A managed local connection: its runtime route is used and no hosted default is ever inserted. */
    readonly localRoute?: LocalRoute;
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
async function preparatoryRun(call: PreparatoryCall, prompt: string, options: { readonly readOnly?: boolean; readonly resumeSessionId?: string; readonly mcp?: McpServerLaunch } = {}): Promise<HarnessRunResult> {
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
                model: call.model ?? (call.localRoute ? undefined : call.plugin.defaultModel),
                thinkingLevel: call.thinkingLevel ?? (!call.localRoute && call.plugin.thinkingLevels.length ? (call.plugin.defaultThinkingLevel ?? call.plugin.thinkingLevels[0]) : undefined),
                baseUrl: call.baseUrl,
                localRoute: call.localRoute,
                // The ordinary execution mode, so sandbox/runtime failures of real work show up here too.
                readOnly: options.readOnly ?? false,
                ...(options.resumeSessionId ? { resumeSessionId: options.resumeSessionId } : {}),
                ...(options.mcp ? { mcp: options.mcp } : {}),
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

/**
 * One bounded capability check of a local connection.
 *
 * @private harness setup
 */
export type CapabilityCheck = {
    readonly name: 'scratch-file' | 'read-only' | 'continuation' | 'mcp';
    readonly outcome: 'supported' | 'failed' | 'unknown';
    readonly summary: string;
    /** When this outcome was verified, if it was reused from earlier evidence of the identical combination (ISO). */
    readonly verifiedAt?: string;
};

/**
 * The Promptbook tool path (the `ptbk` MCP server) through one connection: a read-only turn, as in chats and
 * consultations, that must call a check tool of a disposable bridge and relay the code it returns. The bridge serves
 * nothing else, so the model can reach no project, account or desktop through it.
 */
async function mcpCapabilityCheck(call: PreparatoryCall): Promise<CapabilityCheck> {
    if (!call.plugin.capabilities.mcp) return { name: 'mcp', outcome: 'unknown', summary: `${call.plugin.displayName} cannot load the Promptbook tool bridge (TEAM consultations, chat actions and browser tools are unavailable through it).` };
    const code = `PTBK-${randomBytes(3).toString('hex').toUpperCase()}`;
    let called = false;
    const bridge = await ToolBridge.start([
        {
            name: 'ptbk_capability_check',
            description: 'Returns the verification code of this Promptbook capability check. Takes no arguments.',
            inputSchema: { type: 'object', properties: {}, additionalProperties: false },
            handler: async () => {
                called = true;
                return { text: code };
            },
        },
    ]);
    try {
        const result = await preparatoryRun(
            call,
            '# Harness check: tool bridge\n\nThis is a capability check. Call the tool `ptbk_capability_check` of the `ptbk` MCP server (it takes no arguments). Then reply with exactly the code it returned and nothing else.\n',
            { readOnly: true, mcp: bridge.launch() },
        ).catch((error: unknown) => error as Error);
        if (called) {
            const relayed = !(result instanceof Error) && result.outcome === 'completed' && result.finalMessage.includes(code);
            return { name: 'mcp', outcome: 'supported', summary: relayed ? 'Called a Promptbook tool through the MCP bridge in a read-only turn and relayed its result.' : 'Called a Promptbook tool through the MCP bridge in a read-only turn.' };
        }
        if (result instanceof Error || result.outcome !== 'completed') return { name: 'mcp', outcome: 'unknown', summary: redact(result instanceof Error ? result.message : result.diagnostic) };
        return {
            name: 'mcp',
            outcome: 'failed',
            summary: bridge.discovered
                ? 'Listed the Promptbook tools but never called one: TEAM consultations, chat actions and browser tools would not work with this model.'
                : 'Never loaded the Promptbook tool bridge: TEAM consultations, chat actions and browser tools would not work through this connection.',
        };
    } finally {
        await bridge.close();
    }
}

/**
 * Bounded functional verification of a local connection beyond PONG, each in its own disposable directory: permitted
 * scratch-file work (a harmless tool call), enforced read-only behavior, session continuation and a call through the
 * Promptbook MCP tool path. Nothing touches a project, an outside account or the desktop.
 *
 * @private harness setup
 */
export async function localCapabilityChecks(call: PreparatoryCall): Promise<CapabilityCheck[]> {
    const results: CapabilityCheck[] = [];
    const scratch = async (readOnly: boolean): Promise<{ readonly result: HarnessRunResult | Error; readonly written: boolean }> => {
        const directory = await mkdtemp(join(tmpdir(), 'ptbk-local-check-'));
        try {
            const result = await preparatoryRun(
                { ...call, directory },
                '# Harness check: scratch file\n\nThis is a capability check in a disposable directory. Create a file named `ptbk-check.txt` in the current directory containing exactly the word READY (use your file or shell tool). Then reply with exactly the word DONE.\n',
                { readOnly },
            ).catch((error: unknown) => error as Error);
            const written = (await readFile(join(directory, 'ptbk-check.txt'), 'utf8').catch(() => '')).trim() === 'READY';
            return { result, written };
        } finally {
            await rm(directory, { recursive: true, force: true });
        }
    };
    const write = await scratch(false);
    results.push(
        write.written
            ? { name: 'scratch-file', outcome: 'supported', summary: 'Wrote a scratch file with a tool call.' }
            : { name: 'scratch-file', outcome: 'failed', summary: redact(write.result instanceof Error ? write.result.message : write.result.outcome === 'completed' ? 'Completed without writing the scratch file (tool calls may not work with this model).' : write.result.diagnostic) },
    );
    const readOnly = await scratch(true);
    results.push(
        readOnly.written
            ? { name: 'read-only', outcome: 'failed', summary: 'A read-only turn wrote a file: read-only chat and consultations are not enforceable with this connection.' }
            : readOnly.result instanceof Error || (readOnly.result.outcome !== 'completed' && !write.written)
              ? { name: 'read-only', outcome: 'unknown', summary: redact(readOnly.result instanceof Error ? readOnly.result.message : readOnly.result.diagnostic) }
              : { name: 'read-only', outcome: write.written ? 'supported' : 'unknown', summary: write.written ? 'The sandbox kept a read-only turn from writing.' : 'No write happened, but writes did not work either, so enforcement is not proven.' },
    );
    if (!call.plugin.sessions) results.push({ name: 'continuation', outcome: 'unknown', summary: `${call.plugin.displayName} has no session continuation in Promptbook.` });
    else {
        const first = await preparatoryRun(call, '# Harness check: continuation\n\nRemember the code word ORCHID-42. Do not use any tools. Reply with exactly the word OK.\n').catch((error: unknown) => error as Error);
        if (first instanceof Error || first.outcome !== 'completed' || !first.sessionId) results.push({ name: 'continuation', outcome: first instanceof Error || first.outcome !== 'completed' ? 'failed' : 'unknown', summary: redact(first instanceof Error ? first.message : first.outcome !== 'completed' ? first.diagnostic : 'The harness reported no session to continue.') });
        else {
            const second = await preparatoryRun(call, '# Harness check: continuation\n\nWhat was the code word? Do not use any tools. Reply with only the code word.\n', { resumeSessionId: first.sessionId }).catch((error: unknown) => error as Error);
            const ok = !(second instanceof Error) && second.outcome === 'completed' && /ORCHID-42/i.test(second.finalMessage);
            results.push({ name: 'continuation', outcome: ok ? 'supported' : 'failed', summary: ok ? 'Continued the same session.' : redact(second instanceof Error ? second.message : second.outcome === 'completed' ? 'The continued session did not recall the earlier turn.' : second.diagnostic) });
        }
    }
    results.push(await mcpCapabilityCheck(call));
    return results;
}
