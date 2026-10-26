import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathExists } from '../common/fs.js';
import { runProcess, which } from '../common/process.js';
import { extractVersion } from '../common/semver.js';
import type { HarnessContext, HarnessEvent, HarnessInspection, HarnessPlugin, ParserState } from './types.js';

/**
 * Timeout of read-only metadata probes (`--version`, login status, help).
 *
 * @private harness plugin helpers
 */
export const PROBE_TIMEOUT_MS = 15_000;

/**
 * Runs a read-only metadata probe of a harness executable.
 *
 * @private harness plugin helpers
 */
export async function probe(context: HarnessContext, executable: string, args: readonly string[], env?: NodeJS.ProcessEnv): Promise<{ ok: boolean; output: string; exitCode: number | null }> {
    const result = await runProcess(executable, args, { cwd: context.projectRoot, env: env ?? context.env, timeoutMs: PROBE_TIMEOUT_MS, signal: context.signal, maxOutputBytes: 512 * 1024 });
    return { ok: result.exitCode === 0, output: `${result.stdout}\n${result.stderr}`.trim(), exitCode: result.exitCode };
}

/**
 * Cache of help texts per executable path (help output is stable within one process).
 */
const helpCache = new Map<string, Promise<string>>();

/**
 * Reads (and caches) the help text of a harness subcommand to detect supported flags.
 *
 * @private harness plugin helpers
 */
export function helpText(context: HarnessContext, executable: string, args: readonly string[]): Promise<string> {
    const key = `${executable}\0${args.join(' ')}\0${context.env.PATH ?? ''}`;
    let cached = helpCache.get(key);
    if (!cached) {
        cached = probe(context, executable, args).then((result) => result.output);
        helpCache.set(key, cached);
    }
    return cached;
}

/**
 * Starts an inspection: locates the executable and reads its version.
 *
 * Returns `undefined` fields for a missing installation, with an actionable summary.
 *
 * @private harness plugin helpers
 */
export async function baseInspection(
    plugin: Pick<HarnessPlugin, 'id' | 'displayName' | 'executable' | 'npmPackage' | 'thinkingLevels' | 'capabilities' | 'homepage'>,
    context: HarnessContext,
): Promise<{ inspection: HarnessInspection; executablePath?: string }> {
    const executablePath = await which(plugin.executable, context.env);
    const now = Date.now();
    if (!executablePath) {
        return {
            inspection: {
                id: plugin.id,
                displayName: plugin.displayName,
                installed: false,
                authenticated: false,
                authentication: 'none',
                usable: false,
                models: [],
                thinkingLevels: plugin.thinkingLevels,
                capabilities: plugin.capabilities,
                summary: `\`${plugin.executable}\` was not found on PATH.`,
                problem: 'missing',
                nextAction: plugin.npmPackage ? `Install it globally: npm install --global ${plugin.npmPackage}` : `Install ${plugin.displayName} (${plugin.homepage}).`,
                checkedAt: now,
            },
        };
    }
    const versionProbe = await probe(context, executablePath, ['--version']);
    return {
        executablePath,
        inspection: {
            id: plugin.id,
            displayName: plugin.displayName,
            installed: true,
            executablePath,
            version: extractVersion(versionProbe.output),
            authenticated: 'unknown',
            authentication: 'unknown',
            usable: false,
            models: [],
            thinkingLevels: plugin.thinkingLevels,
            capabilities: plugin.capabilities,
            summary: 'Installed.',
            checkedAt: now,
        },
    };
}

/**
 * Completes an inspection from an authentication observation.
 *
 * @private harness plugin helpers
 */
export function withAuthentication(
    inspection: HarnessInspection,
    authenticated: boolean | 'unknown',
    authentication: HarnessInspection['authentication'],
    loginHint: string,
    detail?: string,
): HarnessInspection {
    if (authenticated === false) {
        return { ...inspection, authenticated, authentication, usable: false, summary: detail ?? 'Installed but signed out.', problem: 'signed-out', nextAction: loginHint };
    }
    const label = authentication === 'account' ? 'account login' : authentication === 'api' ? 'API key' : authenticated === 'unknown' ? 'authentication not verifiable without a model call' : 'authenticated';
    return { ...inspection, authenticated, authentication, usable: true, summary: detail ?? `Ready (${label}${inspection.version ? `, v${inspection.version}` : ''}).` };
}

/**
 * Absolute path in the user's home directory.
 *
 * @private harness plugin helpers
 */
export function homePath(...segments: string[]): string {
    return join(homedir(), ...segments);
}

/**
 * Checks whether any listed file exists.
 *
 * @private harness plugin helpers
 */
export async function anyExists(paths: readonly string[]): Promise<boolean> {
    for (const path of paths) if (await pathExists(path)) return true;
    return false;
}

/**
 * Parses a JSON line, returning `undefined` for non-JSON output.
 *
 * @private harness plugin helpers
 */
export function parseJsonLine(line: string): Record<string, unknown> | undefined {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) return undefined;
    try {
        const value = JSON.parse(trimmed) as unknown;
        return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Short one-line summary of a tool invocation input.
 *
 * @private harness plugin helpers
 */
export function summarizeToolInput(input: unknown): string {
    if (!input || typeof input !== 'object') return typeof input === 'string' ? input.slice(0, 120) : '';
    const record = input as Record<string, unknown>;
    for (const key of ['command', 'cmd', 'file_path', 'path', 'filePath', 'pattern', 'url', 'query', 'description', 'agent']) {
        const value = record[key];
        if (typeof value === 'string' && value) return value.replace(/\s+/g, ' ').slice(0, 120);
        if (Array.isArray(value) && value.length) return value.join(' ').replace(/\s+/g, ' ').slice(0, 120);
    }
    return '';
}

/**
 * Tool names whose invocation changes the file named in its input (Claude Code, Gemini CLI, Qwen Code, OpenCode, …).
 */
const FILE_EDITING_TOOL = /^(write|edit|multiedit|multi_edit|notebookedit|notebook_edit|write_file|replace|edit_file|create_file|apply_patch|str_replace(_based_edit_tool|_editor)?)$/i;

/**
 * Files a tool invocation reports changing (empty for reading or other tools).
 *
 * @private harness plugin helpers
 */
export function editedFiles(tool: unknown, input: unknown): string[] {
    if (typeof tool !== 'string' || !FILE_EDITING_TOOL.test(tool.replace(/^.*[.:]/, '')) || !input || typeof input !== 'object') return [];
    const record = input as Record<string, unknown>;
    return ['file_path', 'filePath', 'path', 'notebook_path', 'absolute_path']
        .map((key) => record[key])
        .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
        .slice(0, 1);
}

/**
 * Tolerant parser for Claude-style and Gemini-style `stream-json` events.
 *
 * @private harness plugin helpers
 */
export function parseStreamJson(line: string, state: ParserState): HarnessEvent[] {
    const event = parseJsonLine(line);
    if (!event) return [];
    const events: HarnessEvent[] = [];
    const type = event.type;
    if (type === 'system' && event.subtype === 'init') {
        if (typeof event.model === 'string') events.push({ type: 'model', model: event.model });
        if (typeof event.session_id === 'string') events.push({ type: 'session', id: event.session_id });
    } else if (type === 'init') {
        if (typeof event.model === 'string') events.push({ type: 'model', model: event.model });
        if (typeof event.session_id === 'string') events.push({ type: 'session', id: event.session_id });
    } else if (type === 'assistant') {
        const message = event.message as { content?: unknown } | undefined;
        const content = Array.isArray(message?.content) ? (message!.content as Array<Record<string, unknown>>) : [];
        const texts: string[] = [];
        for (const block of content) {
            if (block.type === 'text' && typeof block.text === 'string') texts.push(block.text);
            else if (block.type === 'thinking' && typeof block.thinking === 'string') events.push({ type: 'reasoning', text: block.thinking });
            else if (block.type === 'tool_use') {
                events.push({ type: 'activity', text: `${String(block.name)} ${summarizeToolInput(block.input)}`.trim() });
                const paths = editedFiles(block.name, block.input);
                if (paths.length) events.push({ type: 'files', paths });
            }
        }
        if (texts.length) events.push({ type: 'message', text: texts.join('\n') });
    } else if (type === 'message') {
        if (event.role === 'assistant' && typeof event.content === 'string') {
            if (event.delta) state.pendingText += event.content;
            else events.push({ type: 'message', text: event.content });
        }
    } else if (type === 'tool_use') {
        if (state.pendingText) {
            events.push({ type: 'message', text: state.pendingText });
            state.pendingText = '';
        }
        events.push({ type: 'activity', text: `${String(event.tool_name ?? event.name ?? 'tool')} ${summarizeToolInput(event.parameters ?? event.input)}`.trim() });
        const paths = editedFiles(event.tool_name ?? event.name, event.parameters ?? event.input);
        if (paths.length) events.push({ type: 'files', paths });
    } else if (type === 'result') {
        if (state.pendingText) {
            events.push({ type: 'message', text: state.pendingText });
            state.pendingText = '';
        }
        if (typeof event.result === 'string' && event.result) events.push({ type: 'message', text: event.result });
        const usage = (event.usage ?? (event.stats as Record<string, unknown> | undefined)?.models) as Record<string, unknown> | undefined;
        const numeric = usage ? Object.fromEntries(Object.entries(usage).filter(([, value]) => typeof value === 'number')) : {};
        if (Object.keys(numeric).length || typeof event.total_cost_usd === 'number') {
            events.push({ type: 'usage', usage: numeric as Record<string, number>, costUsd: typeof event.total_cost_usd === 'number' ? event.total_cost_usd : undefined });
        }
        if (event.is_error === true || (typeof event.status === 'string' && event.status !== 'success')) {
            events.push({ type: 'turn-failed', text: String(event.result ?? event.error ?? event.subtype ?? event.status ?? 'The harness reported an unsuccessful result.') });
        }
    } else if (type === 'error') {
        events.push({ type: 'error', text: String((event.error as { message?: string } | undefined)?.message ?? event.message ?? JSON.stringify(event)) });
    }
    return events;
}
