import { join } from 'node:path';
import { pathExists, readJsonIfExists } from '../common/fs.js';
import { runProcess, which } from '../common/process.js';

/**
 * Maximal check output kept for repair feedback and traces.
 */
const MAX_CHECK_OUTPUT = 24_000;

/**
 * Default timeout of one check run.
 */
const CHECK_TIMEOUT_MS = 60 * 60_000;

/**
 * Result of validating a check command without executing it.
 *
 * @private project checks
 */
export type CheckValidation =
    | { readonly ok: true; readonly command: string; readonly description: string }
    | { readonly ok: false; readonly command?: string; readonly problem: 'missing' | 'empty' | 'placeholder' | 'unconditional' | 'unresolved' | 'recursive' | 'dependencies'; readonly reason: string };

/**
 * Commands that always succeed and therefore do not validate anything.
 */
const UNCONDITIONAL = /^\s*(true|:|exit\s+0|echo\b[^&|;]*|node\s+-e\s+["']?\s*["']?)\s*$/i;

/**
 * npm's generated failing placeholder test script.
 */
const NPM_PLACEHOLDER = /no test specified/i;

/**
 * Shell builtins and common tools that need no project dependency.
 */
const BUILTIN_COMMANDS = new Set(['cd', 'echo', 'exit', 'test', '[', 'set', 'export', 'node', 'npm', 'npx', 'yarn', 'pnpm', 'bun', 'git', 'sh', 'bash', 'cmd', 'make', 'python', 'python3', 'go', 'cargo', 'deno', 'rm', 'cp', 'mv', 'mkdir', 'cat', 'grep', 'find', 'ls']);

/**
 * Minimal `package.json` view.
 */
type PackageManifest = { scripts?: Record<string, string>; dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

/**
 * Extracts `npm run x`, `npm test`, `yarn x` and `pnpm x` script references from a command.
 */
function scriptReferences(command: string): string[] {
    const references: string[] = [];
    for (const match of command.matchAll(/\b(?:npm|pnpm|bun)\s+(?:run(?:-script)?\s+|--silent\s+run\s+)?([\w:.-]+)/g)) {
        const name = match[1]!;
        if (['install', 'ci', 'exec', 'i', 'x', 'add'].includes(name)) continue;
        references.push(name === 't' ? 'test' : name);
    }
    for (const match of command.matchAll(/\byarn\s+(?:run\s+)?([\w:.-]+)/g)) if (!['install', 'add', 'dlx'].includes(match[1]!)) references.push(match[1]!);
    return references;
}

/**
 * First executable word of each `&&`/`||`/`;`-separated segment.
 */
function commandWords(script: string): string[] {
    return script
        .split(/&&|\|\||;|\|/)
        .map((segment) => segment.trim().replace(/^(?:\w+=\S+\s+)+/, ''))
        .map((segment) => segment.split(/\s+/)[0] ?? '')
        .filter((word) => word && !word.startsWith('-'));
}

/**
 * Validates a check command: references resolve, the script graph terminates, it is not a placeholder or
 * unconditional success, and its dependencies are installed. Never executes the check.
 *
 * @private project checks
 */
export async function validateCheckCommand(projectRoot: string, command: string | null | undefined, env: NodeJS.ProcessEnv = process.env): Promise<CheckValidation> {
    if (command === undefined) return { ok: false, problem: 'missing', reason: 'No project check is configured (ptbk.json execution.check).' };
    if (command === null || !command.trim()) return { ok: false, command: command ?? '', problem: 'empty', reason: 'The project check is empty or explicitly disabled.' };
    if (UNCONDITIONAL.test(command)) return { ok: false, command, problem: 'unconditional', reason: `\`${command}\` always succeeds and does not validate anything.` };
    const manifest = await readJsonIfExists<PackageManifest>(join(projectRoot, 'package.json')).catch(() => undefined);
    const scripts = manifest?.scripts ?? {};
    const visited = new Set<string>();
    const executables = new Set<string>();
    const visit = (name: string, chain: string[]): CheckValidation | undefined => {
        if (chain.includes(name)) return { ok: false, command, problem: 'recursive', reason: `The npm script graph is recursive: ${[...chain, name].join(' → ')}.` };
        if (visited.has(name)) return undefined;
        visited.add(name);
        const script = scripts[name];
        if (script === undefined) return { ok: false, command, problem: 'unresolved', reason: `package.json has no "${name}" script.` };
        if (NPM_PLACEHOLDER.test(script)) return { ok: false, command, problem: 'placeholder', reason: `The "${name}" script is npm's generated placeholder ("${script}").` };
        if (UNCONDITIONAL.test(script)) return { ok: false, command, problem: 'unconditional', reason: `The "${name}" script (\`${script}\`) always succeeds.` };
        for (const word of commandWords(script)) executables.add(word);
        for (const reference of scriptReferences(script)) {
            const nested = visit(reference, [...chain, name]);
            if (nested) return nested;
        }
        return undefined;
    };
    for (const reference of scriptReferences(command)) {
        const problem = visit(reference, []);
        if (problem) return problem;
    }
    if (!scriptReferences(command).length) for (const word of commandWords(command)) executables.add(word);
    const hasDependencies = Object.keys({ ...(manifest?.dependencies ?? {}), ...(manifest?.devDependencies ?? {}) }).length > 0;
    if (hasDependencies && visited.size && !(await pathExists(join(projectRoot, 'node_modules')))) {
        return { ok: false, command, problem: 'dependencies', reason: 'package.json declares dependencies, but node_modules is missing.' };
    }
    for (const executable of executables) {
        if (BUILTIN_COMMANDS.has(executable) || executable.startsWith('./') || executable.startsWith('.\\') || executable.includes('/')) continue;
        if (await pathExists(join(projectRoot, 'node_modules', '.bin', executable))) continue;
        if (await pathExists(join(projectRoot, 'node_modules', '.bin', `${executable}.cmd`))) continue;
        if (await which(executable, env)) continue;
        return { ok: false, command, problem: 'dependencies', reason: `\`${executable}\` used by the check is not installed (not in node_modules/.bin or on PATH).` };
    }
    return { ok: true, command, description: visited.size ? `runs npm script${visited.size > 1 ? 's' : ''} ${[...visited].join(', ')}` : 'runs a direct command' };
}

/**
 * Valid check candidates from `package.json` scripts, best first.
 *
 * @private project checks
 */
export async function checkCandidates(projectRoot: string, env: NodeJS.ProcessEnv = process.env): Promise<Array<{ command: string; description: string }>> {
    const manifest = await readJsonIfExists<PackageManifest>(join(projectRoot, 'package.json')).catch(() => undefined);
    const names = Object.keys(manifest?.scripts ?? {});
    const preferred = ['check', 'test', 'verify', 'validate', 'ci', 'lint', 'typecheck', 'build'];
    const ordered = [...preferred.filter((name) => names.includes(name)), ...names.filter((name) => !preferred.includes(name) && /test|check|lint|verify/i.test(name))];
    const result: Array<{ command: string; description: string }> = [];
    for (const name of ordered) {
        const command = name === 'test' ? 'npm test' : `npm run ${name}`;
        const validation = await validateCheckCommand(projectRoot, command, env);
        if (validation.ok) result.push({ command, description: `npm script "${name}": ${manifest!.scripts![name]}` });
    }
    return result;
}

/**
 * Outcome of running a check.
 *
 * @private project checks
 */
export type CheckRun = {
    /** Exit code 0. */
    readonly passed: boolean;
    /** Exit code. */
    readonly exitCode: number | null;
    /** Combined output tail. */
    readonly output: string;
    /** Duration. */
    readonly durationMs: number;
    /** Infrastructure failure (shell missing, timeout, cancellation). */
    readonly failure?: string;
};

/**
 * Runs a user-selected check command with explicit shell semantics in the project directory.
 *
 * @private project checks
 */
export async function runCheck(cwd: string, command: string, options: { env?: NodeJS.ProcessEnv; signal?: AbortSignal; onLine?: (line: string) => void; timeoutMs?: number } = {}): Promise<CheckRun> {
    const shell = process.platform === 'win32' ? { file: process.env.ComSpec || 'cmd.exe', args: ['/d', '/s', '/c', command] } : { file: '/bin/sh', args: ['-c', command] };
    const env = { ...(options.env ?? process.env), CI: options.env?.CI ?? process.env.CI ?? '1', FORCE_COLOR: '0' };
    const result = await runProcess(shell.file, shell.args, {
        cwd,
        env,
        timeoutMs: options.timeoutMs ?? CHECK_TIMEOUT_MS,
        signal: options.signal,
        onStdoutLine: options.onLine,
        onStderrLine: options.onLine,
        maxOutputBytes: 2 * 1024 * 1024,
    });
    const combined = `${result.stdout}${result.stderr ? `\n${result.stderr}` : ''}`.trim();
    const output = combined.length > MAX_CHECK_OUTPUT ? `[… output truncated to the last ${MAX_CHECK_OUTPUT} characters …]\n${combined.slice(-MAX_CHECK_OUTPUT)}` : combined;
    const failure = result.spawnError ?? (result.timedOut ? 'The check exceeded its time limit.' : result.cancelled ? 'The check was cancelled.' : undefined);
    return { passed: result.exitCode === 0 && !failure, exitCode: result.exitCode, output, durationMs: result.durationMs, failure };
}
