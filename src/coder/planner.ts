import { createInterface } from 'node:readline';
import { mkdir, readFile, readdir, realpath, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, relative, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Readable, Writable } from 'node:stream';
import type { Workspace, TaskDefinition } from './domain.js';
import type { BridgeTool } from './team.js';
import { runHarness, redactSecrets } from './harness.js';
import { serializeTaskBook } from './sources.js';
import { captureSnapshot, commitScoped } from './git.js';
import { confinePath, InputError, readContext, requireGit } from './workspace.js';
import { withLease } from './state.js';

/** Planner options use the same role/config precedence as execution. @private */
export interface PlannerOptions {
    harness?: string; agent?: string; agentPath?: string; context?: string; model?: string; thinkingLevel?: string;
    allowCredits?: boolean; signal?: AbortSignal; onOutput?: (chunk: string) => void; noQuestions?: boolean;
    noCommit?: boolean; commit?: boolean; input?: Readable; output?: Writable; tasks?: string; prompt?: string;
}

/** A host-owned review candidate; no model tool can write it. @private */
interface Proposal { path: string; title: string; prompt: string; id: string; priority: number; }

/** Sensitive and operational files never enter the planning read protocol. @private */
const PRIVATE_PATH = /(^|[\/])(?:\.git|\.promptbook|node_modules|\.env(?:\.[^\/]*)?|\.npmrc|\.netrc|credentials(?:\.json)?|secrets?(?:\.[^\/]*)?)(?:[\/]|$)|\.(?:pem|key|p12|pfx)$/i;

/** Check read paths against actual filesystem boundaries and privacy policy. @private */
async function readPath(projectPath: string, path: unknown): Promise<string> {
    if (typeof path !== 'string' || !path || path.length > 4096) throw new Error('Read path must be a non-empty relative project path');
    const target = await confinePath(projectPath, resolve(projectPath, path));
    const name = relative(await realpath(projectPath), target);
    if (PRIVATE_PATH.test(name)) throw new Error(`Planning read access is denied: ${path}`);
    return target;
}

/** Host-mediated read tools expose bounded text and listings, with no shell or write API. @private */
export function planningReadTools(projectPath: string): BridgeTool[] {
    return [
        { name: 'read_project', description: 'Read a UTF-8 project file. Secrets and operational files are denied.', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'], additionalProperties: false }, invoke: async ({ path }) => {
            const target = await readPath(projectPath, path);
            const info = await stat(target);
            if (!info.isFile() || info.size > 512 * 1024) throw new Error('Planning reads require a text file of at most 512 KiB');
            const bytes = await readFile(target);
            if (bytes.includes(0) || !Buffer.from(bytes.toString('utf8')).equals(bytes)) throw new Error('Planning reads support UTF-8 text only');
            return redactSecrets(bytes.toString('utf8'), projectPath);
        } },
        { name: 'list_project', description: 'List one project directory, omitting secrets and operational directories.', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'], additionalProperties: false }, invoke: async ({ path }) => {
            const target = await readPath(projectPath, path);
            const entries = await readdir(target, { withFileTypes: true });
            return entries.filter((entry) => !PRIVATE_PATH.test(entry.name)).slice(0, 2000).map((entry) => `${entry.name}${entry.isDirectory() ? '/' : entry.isSymbolicLink() ? ' (symlink; checked when read)' : ''}`).sort().join('\n');
        } },
    ];
}

/** Render a proposal through the same Book serializer as ordinary authoring. @private */
function renderProposal(workspace: Workspace, proposal: Proposal, draft: boolean): string {
    const task: TaskDefinition = { id: proposal.id, title: proposal.title, payload: proposal.prompt, status: draft ? 'not-ready' : 'todo', priority: proposal.priority, rules: [], runners: [], scheduleRevision: '', diagnostics: [], source: { format: 'book', path: proposal.path, relativePath: relative(workspace.projectPath, proposal.path), sectionIndex: 0, revision: '' } };
    return serializeTaskBook(task);
}

/** Converse using a capability-checked read-only Codex and host-reviewed task saves. @private */
export async function planConversation(workspace: Workspace, options: PlannerOptions): Promise<{ saved: string[] }> {
    const harness = options.harness || process.env.PTBK_HARNESS;
    if (harness !== 'openai-codex') throw new InputError('Planning requires --harness openai-codex with host-mediated read-only capability. Other providers cannot run the planning mode.');
    await requireGit(workspace);
    if (options.noQuestions && !options.prompt) throw new InputError('Planning needs a conversation. Provide --prompt for a read-only proposal, or run plan interactively.');
    const agentPath = options.agentPath || options.agent || 'agents/developer.book';
    const context = await readContext(workspace, options.context);
    const proposals: Proposal[] = [];
    const saved: string[] = [];
    const output = options.output || process.stdout;
    /** Emit host messages separately from provider streaming events. */
    function write(text: string): void { output.write(redactSecrets(text, workspace.projectPath)); }
    const tools = planningReadTools(workspace.projectPath);
    tools.push({ name: 'propose_task', description: 'Propose a new top-level task Book for human review. This never writes files.', inputSchema: { type: 'object', properties: { title: { type: 'string' }, prompt: { type: 'string' }, filename: { type: 'string' }, priority: { type: 'integer', minimum: 0 } }, required: ['title', 'prompt'], additionalProperties: false }, invoke: async (input) => {
        if (typeof input.title !== 'string' || !input.title.trim() || typeof input.prompt !== 'string' || !input.prompt.trim() || input.prompt.length > 128_000) throw new Error('A proposal requires a title and 1–128000 characters of prompt');
        const priority = input.priority ?? 0;
        if (!Number.isSafeInteger(priority) || Number(priority) < 0) throw new Error('Proposal priority must be a nonnegative integer');
        const id = randomUUID();
        const slug = input.title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64) || 'task';
        const filename = input.filename ?? `${new Date().toISOString().slice(0, 10)}-${slug}-${id.slice(0, 8)}.book`;
        if (typeof filename !== 'string' || basename(filename) !== filename || !filename.endsWith('.book') || filename.startsWith('.')) throw new Error('Proposal filename must be a visible top-level .book filename');
        const path = await confinePath(workspace.projectPath, resolve(workspace.tasksPath, filename));
        if (dirname(path) !== await confinePath(workspace.projectPath, workspace.tasksPath)) throw new Error('Proposal is outside the configured top-level task source');
        try { await stat(path); throw new Error(`Proposal destination already exists: ${path}; choose a new filename`); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
        if (proposals.some((proposal) => proposal.path === path)) throw new Error('Proposal destination already belongs to a pending review');
        const proposal = { path, title: input.title.trim(), prompt: input.prompt, id, priority: Number(priority) };
        proposals.push(proposal);
        write(`\nProposed task (not saved): ${path}\n${renderProposal(workspace, proposal, false)}\n`);
        return `Proposal ${path} is pending human review. Only a user /save or /draft action can save it.`;
    } });
    let conversation = 'Discuss the project and formulate clear tasks with acceptance criteria. Read project files only through list_project and read_project. Use propose_task when the user requests a task proposal; do not attempt application changes or shell commands.';
    /** Perform one bounded read-only inference; no unrestricted execution fallback exists. */
    async function infer(message: string): Promise<void> {
        const result = await runHarness({ harness: 'openai-codex', projectPath: workspace.projectPath, agentPath, context, model: options.model || process.env.PTBK_MODEL, thinkingLevel: options.thinkingLevel || process.env.PTBK_THINKING_LEVEL, allowCredits: options.allowCredits, signal: options.signal, tools, readOnly: true, timeoutMs: 300_000, maxOutputBytes: 2 * 1024 * 1024, prompt: `${conversation}\n\nUSER: ${message}`, onOutput: options.onOutput || ((chunk) => write(chunk)) });
        if (result.outcome !== 'success') throw new InputError(`Planning inference ${result.outcome}: ${result.output}. Existing project files and saved tasks were preserved.`);
        conversation = `${conversation}\n\nUSER: ${message}\n\nASSISTANT: ${result.output}`.slice(-1024 * 1024);
    }
    write('Planning is read-only. Commands: /save (ready), /draft (not-ready), /discard, /exit. EOF discards unsaved proposals.\n');
    if (options.prompt) await infer(options.prompt);
    if (options.noQuestions) return { saved };
    const reader = createInterface({ input: options.input || process.stdin, crlfDelay: Infinity, terminal: false });
    /** Closing readline also releases a blocked input wait on cancellation. */
    const cancelInput = () => reader.close();
    options.signal?.addEventListener('abort', cancelInput, { once: true });
    const iterator = reader[Symbol.asyncIterator]();
    try {
        for (;;) {
            if (options.signal?.aborted) break;
            write('plan> ');
            const next = await iterator.next();
            if (next.done) break;
            const message = next.value.trim();
            if (!message) continue;
            if (message === '/exit') break;
            if (message === '/discard') { proposals.length = 0; write('Unsaved proposals discarded.\n'); continue; }
            if (message === '/save' || message === '/draft') {
                if (!proposals.length) { write('No pending task proposals.\n'); continue; }
                const draft = message === '/draft';
                for (const proposal of proposals) write(`\nReview ${proposal.path}:\n${renderProposal(workspace, proposal, draft)}\n`);
                write('Save these exact files? Type yes to save: ');
                const approval = await iterator.next();
                if (approval.done) break;
                if (approval.value.trim().toLowerCase() !== 'yes') { write('Nothing saved.\n'); continue; }
                await withLease(workspace, async () => {
                    // Revalidate every target before beginning the reviewed transaction.
                    for (const proposal of proposals) {
                        const path = await confinePath(workspace.projectPath, proposal.path);
                        if (path !== proposal.path) throw new InputError('Proposal path changed since preview. Review the current source again.');
                        try { await stat(path); throw new InputError(`Proposal destination changed since preview: ${path}. No existing file was overwritten.`); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
                    }
                    const baseline = options.commit && !options.noCommit ? await captureSnapshot(workspace.gitRoot!) : undefined;
                    await mkdir(workspace.tasksPath, { recursive: true });
                    for (const proposal of proposals) {
                        await writeFile(proposal.path, renderProposal(workspace, proposal, draft), { flag: 'wx' });
                        saved.push(proposal.path);
                        write(`Saved ${proposal.path}${draft ? ' (not-ready)' : ' (ready)'}.\n`);
                    }
                    if (baseline) await commitScoped(baseline, 'docs: Save reviewed coder tasks', { paths: proposals.map((proposal) => relative(baseline.root, proposal.path)) });
                    proposals.length = 0;
                });
                continue;
            }
            if (message.startsWith('/')) { write(`Unknown planning command ${message}. Use /save, /draft, /discard or /exit.\n`); continue; }
            await infer(message);
        }
    } finally { options.signal?.removeEventListener('abort', cancelInput); reader.close(); proposals.length = 0; }
    return { saved };
}
