import { execFile } from 'child_process';
// cspell:ignore fsmonitor textconv
import { readFile, readdir, stat } from 'fs/promises';
import { relative } from 'path';
import { promisify } from 'util';
import { NotAllowed } from '../../../../errors/NotAllowed';
import { spaceTrim } from '../../../../utils/organization/spaceTrim';
import type { PlanningRead } from './planningProtocol';
import { resolvePlanningPath } from './resolvePlanningPath';

/** Directories omitted from repository discovery; no links or hidden runtime state are followed. */
const IGNORED_DIRECTORIES = new Set(['node_modules', 'vendor', 'dist', 'build', 'coverage']);
/** Maximum bytes read from an individual repository file. */
const MAX_FILE_BYTES = 524288;
/** Fixed Git argument vectors prevent shell, diff-driver, pager, and filesystem-monitor execution. */
const READ_ONLY_GIT_ARGUMENTS = {
    status: ['status', '--short'],
    diff: ['diff', '--no-ext-diff', '--no-textconv', '--stat'],
    log: ['log', '-10', '--format=%h %s'],
};

/**
 * Executes only the read operations in the planning protocol. Never evaluates a command from the model.
 * @private internal utility of `coder plan`
 */
export async function readPlanningContext(projectPath: string, request: PlanningRead): Promise<string> {
    if (request.kind === 'git') {
        const result = await promisify(execFile)(
            'git',
            [
                '--no-pager',
                '--no-optional-locks',
                '-c',
                'core.fsmonitor=false',
                ...READ_ONLY_GIT_ARGUMENTS[request.operation],
            ],
            {
                cwd: projectPath,
                timeout: 10000,
                maxBuffer: MAX_FILE_BYTES,
                windowsHide: true,
                env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
            },
        );
        return result.stdout;
    }
    const path = resolvePlanningPath(projectPath, request.path);
    if (request.kind === 'read') {
        const content = await readPlanningText(path);
        return content
            .split(/\r?\n/u)
            .slice(request.startLine - 1, request.startLine - 1 + request.lineCount)
            .map((line, index) => `${request.startLine + index}: ${line}`)
            .join('\n');
    }
    const files: string[] = [];
    await listPlanningFiles(projectPath, request.path, files);
    if (request.kind === 'list') {
        return (
            files.join('\n') +
            (files.length >= 2000 ? '\n[Listing limited to 2000 paths; choose a narrower directory.]' : '')
        );
    }
    const matches: string[] = [];
    for (const file of files) {
        const content = await readPlanningText(resolvePlanningPath(projectPath, file)).catch(() => '');
        for (const [index, line] of content.split(/\r?\n/u).entries()) {
            if (line.includes(request.query)) {
                matches.push(`${file}:${index + 1}: ${line.slice(0, 500)}`);
            }
            if (matches.length >= 100) {
                return matches.join('\n') + '\n[Search limited to 100 matches.]';
            }
        }
    }
    return matches.join('\n') || 'No matches.';
}

/** Reads bounded regular text, refusing binary or oversized files. */
async function readPlanningText(path: string): Promise<string> {
    const stats = await stat(path);
    if (!stats.isFile() || stats.size > MAX_FILE_BYTES) {
        throw new NotAllowed(spaceTrim('Choose a regular text file smaller than 512 KiB.'));
    }
    const content = await readFile(path, 'utf-8');
    if (content.includes('\0')) {
        throw new NotAllowed(spaceTrim('Binary files cannot be read as planning context.'));
    }
    return content;
}

/** Walks a bounded, deterministic directory listing, skipping links before traversing them. */
async function listPlanningFiles(projectPath: string, directory: string, files: string[]): Promise<void> {
    const path = resolvePlanningPath(projectPath, directory);
    if ((await stat(path)).isFile()) {
        files.push(relative(projectPath, path).replace(/\\/gu, '/'));
        return;
    }
    for (const entry of (await readdir(path, { withFileTypes: true })).sort((left, right) =>
        left.name.localeCompare(right.name),
    )) {
        if (files.length >= 2000) return;
        if (entry.isSymbolicLink() || entry.name.startsWith('.') || IGNORED_DIRECTORIES.has(entry.name)) continue;
        const entryPath = `${directory}/${entry.name}`;
        if (entry.isDirectory()) await listPlanningFiles(projectPath, entryPath, files);
        else if (entry.isFile()) files.push(entryPath.replace(/^\.\//u, ''));
    }
}
