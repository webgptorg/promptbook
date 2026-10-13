import { createHash, randomUUID } from 'node:crypto';
import { lstat, readdir, readFile, realpath, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { MigrationOrigin, OccurrenceState, TaskDefinition, TaskStatus, Workspace } from './domain.js';
import { replaceFileWithRetry, type FileReplacementOptions } from './file-replacement.js';
import { bindSchedule, parseDate, parseInterval, scheduleRevision } from './schedule.js';

/** Source checksums are independent of text encoding and line endings. @private */
export function checksum(text: string | Buffer): string {
    return createHash('sha256').update(text).digest('hex');
}

/** Supported source lifecycle values. */
const STATUSES = new Set<TaskStatus>(['todo', 'in-progress', 'done', 'failed', 'not-ready', 'retired']);

/** Source controls accepted by modern task Books; activity belongs to runtime state. */
const BOOK_STATUSES = new Set<TaskStatus>(['todo', 'failed', 'not-ready', 'retired']);

/** A shared, deterministic rank for common importance descriptions. */
const PRIORITIES: Record<string, number> = { lowest: 0, low: 0, ordinary: 0, normal: 0, medium: 1, high: 2, 'very high': 3, highest: 3, urgent: 3, critical: 4 };

/** Complete task control keywords, ordered longest first. */
const TASK_CONTROLS = ['TASK THINKING LEVEL', 'TASK DEPENDS ON', 'TASK DUE DATE', 'TASK PRIORITY', 'TASK HARNESS', 'TASK RUNNER', 'TASK STATUS', 'TASK ORIGIN', 'TASK PARENT', 'TASK REPEAT', 'TASK AGENT', 'TASK MODEL', 'TASK AFTER', 'TASK DONE', 'TASK NOTE', 'TASK ID'];

/** Shared task instructions and their documented aliases have one effective meaning. */
const TASK_INSTRUCTIONS: Readonly<Record<string, string>> = {
    RULE: 'RULE', RULES: 'RULE', NOTE: 'NOTE', NOTES: 'NOTE', COMMENT: 'NOTE', NONCE: 'NOTE', TODO: 'NOTE',
};

/** Legacy checkbox mappings. */
const MARKERS: Record<string, TaskStatus> = { ' ': 'todo', '-': 'not-ready', '.': 'not-ready', '^': 'in-progress', x: 'done', X: 'done', '!': 'failed' };

/** A legacy section with its original byte-compatible string offsets. @private */
export interface MarkdownSection {
    text: string;
    start: number;
    end: number;
    index: number;
}

/** Split only at standalone separator lines, matching the legacy queue contract. @private */
export function markdownSections(text: string): MarkdownSection[] {
    const sections: MarkdownSection[] = [];
    let start = 0;
    let fence: string | undefined;
    for (const match of text.matchAll(/^[^\n]*(?:\n|$)/gm)) {
        if (!match[0]) continue;
        const line = match[0].replace(/\r?\n$/, '');
        const marker = /^\s*(`{3,}|~{3,})/.exec(line);
        if (marker) {
            if (!fence) fence = marker[1];
            else if (marker[1]![0] === fence[0] && marker[1]!.length >= fence.length && /^\s*(?:`+|~+)\s*$/.test(line)) fence = undefined;
        } else if (!fence && /^[ \t]*---[ \t]*\r?$/.test(line)) {
            sections.push({ text: text.slice(start, match.index), start, end: match.index, index: sections.length });
            start = match.index + match[0].length;
        }
    }
    sections.push({ text: text.slice(start), start, end: text.length, index: sections.length });
    return sections;
}

/** Construct the shared source-independent task fields. */
function taskBase(text: string, file: string, format: 'markdown' | 'book', sectionIndex: number): TaskDefinition {
    return {
        id: `${format}-${checksum(`${path.resolve(file)}:${sectionIndex}`).slice(0, 24)}`,
        title: '', payload: '', rules: [], status: 'todo', priority: 0, runners: [],
        scheduleRevision: scheduleRevision(),
        source: { format, path: path.resolve(file), relativePath: file, sectionIndex, revision: checksum(text) },
        diagnostics: [],
    };
}

/** Parse every legacy section without treating body checklists as status. @private */
export function parseMarkdown(text: string, file: string, timezone: string): TaskDefinition[] {
    if (/^readme(?:\.[^.]*)?$/i.test(path.basename(file)) || text.includes('<!--ptbk-coder-ignore-->')) return [];
    return markdownSections(text).filter((section) => section.text.trim()).map((section) => {
        const task = taskBase(text, file, 'markdown', section.index);
        task.source.sectionRevision = checksum(section.text);
        const lines = section.text.split(/\r?\n/);
        const first = lines.findIndex((line) => line.trim());
        const control = lines[first]!;
        const marker = /^\s*(?:[-*+]\s+)?\[([^\]])\](.*)$/.exec(control);
        if (marker) {
            task.metadata = [`META NOTE ${JSON.stringify(control.trim())}`];
            task.status = MARKERS[marker[1]!] ?? 'not-ready';
            if (!MARKERS[marker[1]!]) task.diagnostics.push(`${file}:${first + 1}: Invalid task status marker.`);
            const annotation = marker[2]!;
            const tokens = [...annotation.matchAll(/`([^`]+)`/g)].map((match) => match[1]!.trim());
            const annotationWithoutTokens = annotation.replace(/`[^`]*`/g, '');
            if (annotationWithoutTokens.includes('`')) task.diagnostics.push(`${file}:${first + 1}: Unclosed control token.`);
            task.priority = [...annotationWithoutTokens].filter((character) => character === '!').length;
            for (const token of tokens) {
                if (/^\d{4}[-/]/.test(token)) {
                    task.afterRaw ??= token;
                    try {
                        const instant = parseDate(token, timezone);
                        if (task.after !== undefined && task.after !== instant) throw new Error('Conflicting AFTER dates.');
                        task.after = instant;
                    } catch (error) { task.diagnostics.push(`${file}:${first + 1}: ${(error as Error).message}`); }
                } else task.runners.push(token.toLowerCase());
            }
            const newline = section.text.includes('\r\n') ? '\r\n' : '\n';
            task.payload = lines.slice(first + 1).join(newline);
            const inlineTitle = annotationWithoutTokens.replace(/!/g, '').replace(/^\s*use\s*$/i, '').trim();
            task.title = task.payload.split(/\r?\n/).find((line) => line.trim())?.trim() || inlineTitle || path.basename(file, '.md');
            if (inlineTitle && !/^use\b/i.test(inlineTitle)) task.payload = `${inlineTitle}${newline}${task.payload}`;
        } else {
            task.payload = section.text;
            task.title = control.trim();
        }
        task.scheduleRevision = scheduleRevision(task.after);
        if (!task.payload.trim()) task.diagnostics.push(`${file}:${first + 1}: Task payload is empty.`);
        return task;
    });
}

/** A lexical commitment outside ordinary fenced content. */
interface BookBlock { name: string; argument: string; body: string[]; line: number }

/** Tokenize only task/shared commitments while shielding literal fences and prose. */
function bookBlocks(lines: string[], from: number): { blocks: BookBlock[]; description: string[]; unclosedFence?: number } {
    const blocks: BookBlock[] = [];
    const description: string[] = [];
    let fence: string | undefined;
    let fenceLine: number | undefined;
    for (let index = from; index < lines.length; index++) {
        const line = lines[index]!;
        const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(line);
        if (fenceMatch) {
            if (!fence) { fence = fenceMatch[1]; fenceLine = index + 1; }
            else if (fenceMatch[1]![0] === fence[0] && fenceMatch[1]!.length >= fence.length && /^\s*(?:`+|~+)\s*$/.test(line)) { fence = undefined; fenceLine = undefined; }
            (blocks.at(-1)?.body ?? description).push(line);
            continue;
        }
        const name = !fence && [...TASK_CONTROLS, ...Object.keys(TASK_INSTRUCTIONS)].find((keyword) => line === keyword || line.startsWith(`${keyword} `) || line.startsWith(`${keyword}\t`) || line === `${keyword}\r`);
        const unknown = !fence && /^(TASK(?:[ \t]+[A-Z][A-Z0-9_-]*)?|STATUS|PRIORITY|AGENT|HARNESS|MODEL|RUNNER|AFTER|REPEAT|PROMPT|META)(?:[ \t]+(.*))?\r?$/.exec(line);
        if (name) blocks.push({ name: TASK_INSTRUCTIONS[name] ?? name, argument: line.slice(name.length).trim(), body: [], line: index + 1 });
        else if (unknown) blocks.push({ name: unknown[1]!, argument: unknown[2] ?? '', body: [], line: index + 1 });
        else (blocks.at(-1)?.body ?? description).push(line);
    }
    return { blocks, description, unclosedFence: fence ? fenceLine : undefined };
}

/** Decode the exact migration literal wrapper, or return ordinary multiline text. */
function blockPayload(block: BookBlock): string {
    const raw = [block.argument, ...block.body].join('\n').trim();
    if (!/^`{3,}ptbk-task-literal-json(?:\r?\n|$)/.test(raw)) return raw;
    const literal = /^(`{3,})ptbk-task-literal-json\n([\s\S]*)\n\1$/.exec(raw);
    if (!literal) throw new Error('Malformed ptbk-task-literal-json fence.');
    const value: unknown = JSON.parse(literal[2]!);
    if (typeof value !== 'string') throw new Error('ptbk-task-literal-json must contain exactly one JSON string.');
    return value;
}

/** Strip paragraph separators while decoding migration's exact literal representation. */
function descriptionPayload(lines: string[]): string {
    return blockPayload({ name: '', argument: '', body: lines, line: 0 });
}

/** Fingerprint the assignment whose accepted result a completion stamp certifies. */
function completionRevision(task: TaskDefinition): string {
    return checksum(JSON.stringify([task.title, task.payload, task.rules]));
}

/** Match the latest engine completion evidence against the current assignment. */
function completionMatchesAssignment(task: TaskDefinition): boolean {
    const proof = task.metadata?.slice().reverse().find((meta) => /^TASK NOTE ptbk-completion-source [a-f0-9]{64}$/.test(meta));
    return !proof || proof.slice(-64) === completionRevision(task);
}

/** Validate migration provenance before discovery uses it for source authority. */
function originValue(value: string): MigrationOrigin {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') throw new Error('META ORIGIN must be a JSON object.');
    const item = parsed as MigrationOrigin;
    if (typeof item.sourcePath !== 'string' || path.isAbsolute(item.sourcePath) || item.sourcePath.split(/[\\/]/).includes('..')
        || !Number.isSafeInteger(item.sectionIndex) || item.sectionIndex < 0 || !/^[a-f0-9]{64}$/.test(item.sourceChecksum)
        || item.migrationVersion !== 1) throw new Error('Invalid META ORIGIN fields.');
    return item;
}

/** Parse a task Book; an agent Book never becomes a task implicitly. @private */
export function parseBook(text: string, file: string, timezone: string): TaskDefinition | null {
    const lines = text.replace(/^\uFEFF/, '').split('\n');
    const first = lines.findIndex((line) => line.trim());
    if (first < 0) return null;
    if (!/^TASK(?:[ \t]|\r?$)/.test(lines[first]!)) return null;
    const task = taskBase(text, file, 'book', 0);
    task.title = lines[first]!.replace(/^TASK(?:[ \t]+)?/, '').trim();
    if (!task.title) task.diagnostics.push(`${file}:${first + 1}: TASK requires a nonempty title.`);
    if (TASK_CONTROLS.some((keyword) => lines[first]!.trimEnd() === keyword || lines[first]!.startsWith(`${keyword} `) || lines[first]!.startsWith(`${keyword}\t`))) {
        task.diagnostics.push(`${file}:${first + 1}: A task control cannot replace the first-line TASK title declaration.`);
    }
    task.metadata = [];
    task.doneTimestamps = [];
    task.dependencies = [];
    const counts = new Map<string, number>();
    const { blocks, description, unclosedFence } = bookBlocks(lines, first + 1);
    if (unclosedFence) task.diagnostics.push(`${file}:${unclosedFence}: Unclosed literal fence prevents reliable task controls.`);
    const descriptions = [description];
    for (const block of blocks) {
        const multiline = ['RULE', 'NOTE', 'TASK NOTE', 'TASK ORIGIN'].includes(block.name);
        const full = multiline ? [block.argument, ...block.body].join('\n').trim() : block.argument.trim();
        if (!multiline && block.body.some((line) => line.trim())) descriptions.push(block.body);
        counts.set(block.name, (counts.get(block.name) ?? 0) + 1);
        try {
            switch (block.name) {
                case 'TASK ID': {
                    if (!full || /[\s#{}]/.test(full)) throw new Error('TASK ID must be one nonempty reference token.');
                    task.id = full; task.source.explicitId = true;
                    break;
                }
                case 'TASK NOTE': case 'NOTE': task.metadata.push(`${block.name} ${full}`); break;
                case 'TASK ORIGIN':
                    if (!full) throw new Error('TASK ORIGIN is empty.');
                    task.origin = full;
                    task.metadata.push(`TASK ORIGIN ${full}`);
                    if (/^\{/.test(full) && /"migrationVersion"\s*:/.test(full)) task.source.origin = originValue(full);
                    break;
                case 'TASK STATUS':
                    if (!BOOK_STATUSES.has(full as TaskStatus)) throw new Error(`Invalid TASK STATUS ${JSON.stringify(full)}; completion uses TASK DONE.`);
                    task.status = full as TaskStatus; task.source.statusLine = block.line; break;
                case 'TASK PRIORITY': {
                    if (!full) throw new Error('TASK PRIORITY requires an importance value.');
                    if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(full)) {
                        const value = Number(full);
                        if (!Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) throw new Error('TASK PRIORITY must be a nonnegative finite safe number.');
                        task.priority = value;
                    } else {
                        task.priorityRaw = full;
                        const rank = PRIORITIES[full.toLowerCase()];
                        task.priorityResolved = rank !== undefined;
                        task.priority = rank ?? 0;
                    }
                    break;
                }
                case 'TASK AGENT': {
                    const reference = full.replace(/^\{([^}]+)\}$/, '$1').replace(/^@/, '');
                    if (!reference || /[\r\n]/.test(reference)) throw new Error('TASK AGENT requires one agent reference.');
                    if (/^https?:/i.test(reference)) {
                        const url = new URL(reference);
                        if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Remote AGENT requires HTTPS without embedded credentials.');
                        task.agent = url.href;
                    } else task.agent = reference.includes('/') || reference.endsWith('.book') ? path.resolve(path.dirname(file), reference) : reference;
                    break;
                }
                case 'TASK HARNESS': case 'TASK MODEL': case 'TASK THINKING LEVEL':
                    if (!full || /\s/.test(full)) throw new Error(`${block.name} requires one nonempty token.`);
                    if (block.name === 'TASK HARNESS') task.harness = full;
                    else if (block.name === 'TASK MODEL') task.model = full;
                    else task.thinkingLevel = full;
                    break;
                case 'TASK RUNNER': if (!full) throw new Error('TASK RUNNER is empty.'); task.runners.push(full.toLowerCase()); break;
                case 'TASK AFTER': {
                    task.afterRaw ??= full;
                    const instant = parseDate(full, timezone);
                    if (task.after !== undefined && task.after !== instant) throw new Error('Conflicting AFTER dates.');
                    task.after = instant; break;
                }
                case 'TASK DUE DATE': task.dueRaw = full; task.due = parseDate(full, timezone); break;
                case 'TASK DONE':
                    if (full !== 'unknown') {
                        if (!/[T ][^\n]+(?:Z|[+-]\d{2}:\d{2})$/.test(full)) throw new Error('TASK DONE requires a timestamp with an explicit timezone, or unknown for migrated history.');
                        parseDate(full, timezone);
                    }
                    task.doneTimestamps.push(full); break;
                case 'TASK REPEAT': {
                    const interval = parseInterval(full);
                    if (task.repeat !== undefined && task.repeat !== interval) throw new Error('Conflicting REPEAT intervals.');
                    task.repeat = interval; break;
                }
                case 'TASK DEPENDS ON': {
                    const references = /^#[^\s,]+(?:[\s,]+#[^\s,]+)*$/.test(full) ? full.split(/[\s,]+/) : [full];
                    if (references.some((reference) => !reference || /[\r\n]/.test(reference))) throw new Error('TASK DEPENDS ON requires stable task references.');
                    task.dependencies.push(...references); break;
                }
                case 'TASK PARENT':
                    if (!full || /[\r\n]/.test(full)) throw new Error('TASK PARENT requires one stable task reference.');
                    task.parent = full; break;
                case 'RULE': task.rules.push(blockPayload(block)); break;
                default: throw new Error(`Unsupported executable commitment ${block.name}.`);
            }
        } catch (error) { task.diagnostics.push(`${file}:${block.line}: ${(error as Error).message}`); }
    }
    try { task.payload = descriptions.map(descriptionPayload).filter(Boolean).join('\n\n'); }
    catch (error) { task.diagnostics.push(`${file}:${first + 2}: ${(error as Error).message}`); }
    for (const key of ['TASK ID', 'TASK STATUS', 'TASK PRIORITY', 'TASK AGENT', 'TASK HARNESS', 'TASK MODEL', 'TASK THINKING LEVEL', 'TASK AFTER', 'TASK DUE DATE', 'TASK REPEAT', 'TASK PARENT']) {
        if ((counts.get(key) ?? 0) > 1) task.diagnostics.push(`${file}: Duplicate singleton ${key}.`);
    }
    if (!task.payload.trim() && !task.title) task.diagnostics.push(`${file}: Task description is empty.`);
    if (task.doneTimestamps.includes('unknown') && !task.origin && !task.source.origin) task.diagnostics.push(`${file}: Unknown historical completion requires explicit conversion provenance in TASK ORIGIN.`);
    if (!task.repeat && task.doneTimestamps.length && task.status === 'todo') task.status = 'done';
    if (task.status === 'done' && !completionMatchesAssignment(task)) {
        task.diagnostics.push(`${file}: Completed assignment changed after its accepted result; review its completion evidence before using it as a prerequisite.`);
    }
    task.scheduleRevision = scheduleRevision(task.after, task.repeat);
    return task;
}

/** Serialize payload literally so executable-looking lines remain task content. */
function literal(payload: string): string {
    const json = JSON.stringify(payload);
    const longest = Math.max(2, ...[...json.matchAll(/`+/g)].map((match) => match[0].length));
    const fence = '`'.repeat(longest + 1);
    return `${fence}ptbk-task-literal-json\n${json}\n${fence}`;
}

/** Prefer ordinary readable text when no escaping is needed for an exact round-trip. */
function serializePayload(payload: string): string {
    const lexical = bookBlocks(payload.split('\n'), 0);
    return payload.trim() === payload && !payload.includes('\r') && !lexical.blocks.length && !lexical.unclosedFence ? payload : literal(payload);
}

/** Serialize a canonical task Book, preserving nonexecutive metadata and payload. @private */
export function serializeTaskBook(task: TaskDefinition): string {
    const header = [`TASK ${task.title}`, '', serializePayload(task.payload), '', `TASK ID ${task.id}`];
    if (task.status !== 'todo' && task.status !== 'done') header.push(`TASK STATUS ${task.status === 'in-progress' ? 'not-ready' : task.status}`);
    header.push(`TASK PRIORITY ${task.priorityRaw ?? task.priority}`);
    if (task.agent) {
        const reference = path.isAbsolute(task.agent) ? path.relative(path.dirname(task.source.path), task.agent).split(path.sep).join('/') : task.agent;
        header.push(`TASK AGENT {${reference}}`);
    }
    if (task.harness) header.push(`TASK HARNESS ${task.harness}`);
    if (task.model) header.push(`TASK MODEL ${task.model}`);
    if (task.thinkingLevel) header.push(`TASK THINKING LEVEL ${task.thinkingLevel}`);
    task.runners.forEach((runner) => header.push(`TASK RUNNER ${runner}`));
    if (task.after !== undefined) header.push(`TASK AFTER ${task.afterRaw ?? new Date(task.after).toISOString()}`);
    if (task.due !== undefined) header.push(`TASK DUE DATE ${task.dueRaw ?? new Date(task.due).toISOString()}`);
    if (task.repeat !== undefined) header.push(`TASK REPEAT ${task.repeat / 1000}s`);
    if (task.parent) header.push(`TASK PARENT ${task.parent}`);
    task.dependencies?.forEach((dependency) => header.push(`TASK DEPENDS ON ${dependency}`));
    header.push(...(task.metadata ?? []).map((meta) => meta.replace(/^META NOTE /, 'TASK NOTE ').replace(/^META ORIGIN /, 'TASK ORIGIN ')));
    if (task.origin && !task.metadata?.some((meta) => /^(?:META|TASK) ORIGIN /.test(meta))) header.push(`TASK ORIGIN ${task.origin}`);
    if (task.source.origin && !task.metadata?.some((meta) => /^(?:META|TASK) ORIGIN /.test(meta))) header.push(`TASK ORIGIN ${JSON.stringify(task.source.origin)}`);
    const stamps = task.doneTimestamps?.length ? task.doneTimestamps : task.status === 'done' ? ['unknown'] : [];
    stamps.forEach((stamp) => header.push(`TASK DONE ${stamp}`));
    task.rules.forEach((rule) => header.push('', /^[^\r\n]+$/.test(rule) && rule.trim() === rule ? `RULE ${rule}` : `RULE\n${literal(rule)}`));
    return `${header.join('\n')}\n`;
}

/** Verify an existing file and every symlink target remain within the workspace. @private */
export async function assertConfined(file: string, projectPath: string): Promise<void> {
    const root = await realpath(projectPath);
    let existing = path.resolve(file);
    for (;;) {
        try { existing = await realpath(existing); break; }
        catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
            const parent = path.dirname(existing);
            if (parent === existing) throw error;
            existing = parent;
        }
    }
    const relative = path.relative(root, existing);
    if (relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) throw new Error(`Source path escapes project through a symlink: ${file}`);
    const lexical = path.relative(path.resolve(projectPath), path.resolve(file));
    if (lexical.startsWith(`..${path.sep}`) || lexical === '..' || path.isAbsolute(lexical)) throw new Error(`Source path is outside project: ${file}`);
}

/** Read top-level files only; missing implicit directories are empty. */
async function filesIn(directory: string, extension: string): Promise<string[]> {
    try {
        const entries = await readdir(directory, { withFileTypes: true });
        return entries.filter((entry) => (entry.isFile() || entry.isSymbolicLink()) && entry.name.toLowerCase().endsWith(extension)).map((entry) => path.join(directory, entry.name)).sort();
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
        throw error;
    }
}

/** Migration transaction structure understood by discovery even after a crash. @private */
export interface MigrationJournal {
    version: 1;
    entries: Array<{ sourcePath: string; sourceChecksum: string; phase: 'prepared' | 'books-written' | 'archived'; destinations: string[]; archivePath?: string; destinationChecksums?: Record<string, string> }>;
}

/** Resolve stable IDs or explicit source paths, never a coincidentally matching title. */
function referencedTasks(reference: string, from: TaskDefinition, tasks: TaskDefinition[]): TaskDefinition[] {
    const token = reference.replace(/^\{([^}]+)\}$/, '$1');
    if (token.startsWith('#')) return tasks.filter((task) => task.id === token.slice(1));
    const source = /^(.*\.(?:book|md))(?:#([^#]+))?$/i.exec(token);
    if (!source) return [];
    const file = path.resolve(path.dirname(from.source.path), source[1]!);
    return tasks.filter((task) => task.source.path === file && (!source[2] || task.id === source[2] || String(task.source.sectionIndex + 1) === source[2]));
}

/** Reevaluate relationships from the current source snapshot, including dependency cycles. */
function bindRelationships(tasks: TaskDefinition[]): void {
    const edges = new Map<TaskDefinition, TaskDefinition[]>();
    for (const task of tasks) {
        task.relationshipDiagnostics = [];
        const predecessors: TaskDefinition[] = [];
        for (const reference of task.dependencies ?? []) {
            const matches = referencedTasks(reference, task, tasks);
            if (matches.length !== 1) task.relationshipDiagnostics.push(`${matches.length ? 'Ambiguous' : 'Missing'} prerequisite ${reference}.`);
            else predecessors.push(matches[0]!);
        }
        edges.set(task, predecessors);
        if (task.parent) {
            const matches = referencedTasks(task.parent, task, tasks);
            if (matches.length !== 1) task.relationshipDiagnostics.push(`${matches.length ? 'Ambiguous' : 'Missing'} parent ${task.parent}.`);
            else if (matches[0] === task) task.relationshipDiagnostics.push('Task cannot be its own parent.');
        }
    }
    const visited = new Set<TaskDefinition>();
    const active: TaskDefinition[] = [];
    const dependencyOrder: TaskDefinition[] = [];
    /** Mark only a cycle's participating definitions; dependents are checked separately. */
    function visit(task: TaskDefinition): void {
        const index = active.indexOf(task);
        if (index >= 0) {
            active.slice(index).forEach((member) => {
                if (!member.relationshipDiagnostics!.includes('Cyclic task prerequisites.')) member.relationshipDiagnostics!.push('Cyclic task prerequisites.');
            });
            return;
        }
        if (visited.has(task)) return;
        active.push(task);
        edges.get(task)?.forEach(visit);
        active.pop(); visited.add(task); dependencyOrder.push(task);
    }
    tasks.forEach(visit);
    // Validate predecessors before consumers so invalid completion propagates through
    // the entire graph independently of filenames, discovery order and priority.
    for (const task of dependencyOrder) for (const predecessor of edges.get(task) ?? []) {
        const completed = predecessor.status === 'done' || Boolean(predecessor.repeat && predecessor.doneTimestamps?.length && ['todo', 'retired'].includes(predecessor.status));
        if (!completed || !completionMatchesAssignment(predecessor) || predecessor.diagnostics.length || predecessor.relationshipDiagnostics?.length) {
            task.relationshipDiagnostics!.push(`Prerequisite #${predecessor.id} has no valid completed result in its current source (${predecessor.status}).`);
        }
    }
}

/** Discover a deterministic mixed queue and visibly block ambiguous identities. @private */
export async function discoverTasks(workspace: Workspace): Promise<TaskDefinition[]> {
    const tasks: TaskDefinition[] = [];
    let occurrences: Record<string, OccurrenceState> = {};
    try {
        const ledger = JSON.parse(await readFile(path.join(workspace.statePath, 'occurrences.json'), 'utf8')) as { version: number; tasks: Record<string, OccurrenceState> };
        if (ledger.version !== 1 || !ledger.tasks || typeof ledger.tasks !== 'object' || Array.isArray(ledger.tasks)) throw new Error('Invalid occurrence ledger; preserved for explicit recovery.');
        occurrences = ledger.tasks;
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    const adapters = [{ directory: workspace.legacyPath, extension: '.md' }, { directory: workspace.tasksPath, extension: '.book' }];
    const visited = new Set<string>();
    for (const adapter of adapters) {
        for (const file of await filesIn(adapter.directory, adapter.extension)) {
            await assertConfined(file, workspace.projectPath);
            const actual = await realpath(file);
            const key = `${adapter.extension}:${actual}`;
            if (visited.has(key)) continue;
            visited.add(key);
            const text = await readFile(file, 'utf8');
            const parsed = adapter.extension === '.md' ? parseMarkdown(text, file, workspace.timezone) : [parseBook(text, file, workspace.timezone)].filter((task): task is TaskDefinition => Boolean(task));
            for (const task of parsed) {
                task.source.projectPath = workspace.projectPath;
                task.source.relativePath = path.relative(workspace.projectPath, file).split(path.sep).join('/');
                if (task.source.format === 'markdown') task.id = `markdown-${checksum(`${task.source.relativePath}:${task.source.sectionIndex}`).slice(0, 24)}`;
                else if (!task.source.explicitId) task.id = `book-${checksum(task.source.relativePath).slice(0, 24)}`;
                tasks.push(bindSchedule(task, occurrences[task.id], workspace.timezone));
            }
        }
    }
    let journal: MigrationJournal | undefined;
    try {
        journal = JSON.parse(await readFile(path.join(workspace.statePath, 'migration.json'), 'utf8')) as MigrationJournal;
        if (journal.version !== 1 || !Array.isArray(journal.entries)) throw new Error('Invalid migration journal.');
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    for (const entry of journal?.entries ?? []) {
        for (const task of tasks) {
            if (task.source.format === 'markdown' && task.source.relativePath === entry.sourcePath && entry.phase !== 'prepared') {
                task.diagnostics.push('Migration transaction makes the Book representation authoritative; legacy source is blocked.');
            }
            if (task.source.format === 'book' && entry.destinations.includes(task.source.relativePath) && entry.phase === 'prepared') {
                task.diagnostics.push('Migration is incomplete; the legacy representation remains authoritative.');
            }
            if (task.source.format === 'book' && entry.destinationChecksums?.[task.source.relativePath]
                && task.source.revision !== entry.destinationChecksums[task.source.relativePath] && entry.phase !== 'archived') {
                task.diagnostics.push('Migration destination changed before its transaction finished.');
            }
            if (task.source.format === 'markdown' && task.source.relativePath === entry.sourcePath && task.source.revision !== entry.sourceChecksum) {
                task.diagnostics.push('Migration source changed; resolve the transaction explicitly.');
            }
        }
    }
    for (const book of tasks.filter((task) => task.source.origin)) {
        const origin = book.source.origin!;
        const legacy = tasks.find((task) => task.source.format === 'markdown' && task.source.relativePath === origin.sourcePath && task.source.sectionIndex === origin.sectionIndex);
        if (legacy && !journal?.entries.some((entry) => entry.sourcePath === origin.sourcePath)) {
            book.diagnostics.push('Ambiguous migration copies have no authoritative transaction journal.');
            legacy.diagnostics.push('Ambiguous migration copies have no authoritative transaction journal.');
        }
    }
    const ids = new Map<string, TaskDefinition[]>();
    tasks.forEach((task) => ids.set(task.id, [...(ids.get(task.id) ?? []), task]));
    for (const [id, definitions] of ids) if (definitions.length > 1) definitions.forEach((task) => task.diagnostics.push(`Duplicate task ID ${id}.`));
    bindRelationships(tasks);
    return tasks.sort((left, right) => right.priority - left.priority || left.source.relativePath.localeCompare(right.source.relativePath, 'en') || left.source.sectionIndex - right.source.sectionIndex || left.id.localeCompare(right.id, 'en'));
}

/** Ownership checks and filesystem seams for atomic task source replacement. @private */
export interface TaskSourceWriteOptions extends FileReplacementOptions {
    assertOwned?: () => Promise<void>;
}

/** Replace a task source atomically after verifying the complete discovery revision. */
async function rewriteTaskSource(task: TaskDefinition, change: (text: string) => string, options: TaskSourceWriteOptions = {}): Promise<TaskDefinition> {
    await options.assertOwned?.();
    if (task.source.projectPath) await assertConfined(task.source.path, task.source.projectPath);
    const text = await readFile(task.source.path, 'utf8');
    if (checksum(text) !== task.source.revision) throw new Error(`Source changed concurrently: ${task.source.path}; retained current contents and refused status update.`);
    const updated = change(text);
    const stat = await lstat(task.source.path);
    if (stat.isSymbolicLink()) throw new Error(`Refusing to replace symbolic link task source: ${task.source.path}`);
    const temporary = `${task.source.path}.${randomUUID()}.tmp`;
    try {
        await writeFile(temporary, updated, { flag: 'wx', mode: stat.mode });
        // A Windows reader or virus scanner can briefly hold the destination open. Retain the
        // same complete candidate and original file, and revalidate ownership and user edits
        // after every wait rather than unlinking the destination or rebuilding the candidate.
        await replaceFileWithRetry(temporary, task.source.path, async () => {
            await options.assertOwned?.();
            if (task.source.projectPath) await assertConfined(task.source.path, task.source.projectPath);
            const current = await lstat(task.source.path);
            if (current.isSymbolicLink()) throw new Error(`Refusing to replace symbolic link task source: ${task.source.path}`);
            if (!current.isFile()) throw new Error(`Refusing to replace non-file task source: ${task.source.path}`);
            if (checksum(await readFile(task.source.path, 'utf8')) !== task.source.revision) throw new Error(`Source changed concurrently: ${task.source.path}.`);
        }, options);
    } finally { await unlink(temporary).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'ENOENT') throw error; }); }
    const timezone = task.scheduleTimezone ?? 'UTC';
    const parsed = task.source.format === 'book' ? parseBook(updated, task.source.path, timezone) : parseMarkdown(updated, task.source.path, timezone).find((candidate) => candidate.source.sectionIndex === task.source.sectionIndex);
    if (!parsed) throw new Error(`Updated task disappeared from ${task.source.path}.`);
    parsed.source.relativePath = task.source.relativePath;
    parsed.source.projectPath = task.source.projectPath;
    parsed.id = task.id;
    parsed.after = task.after;
    parsed.afterRaw = task.afterRaw;
    parsed.scheduleTimezone = task.scheduleTimezone;
    parsed.repeat = task.repeat;
    parsed.scheduleRevision = task.scheduleRevision;
    return parsed;
}

/** Append a control using the source's existing line endings. */
function appendControl(text: string, control: string): string {
    const newline = text.includes('\r\n') ? '\r\n' : '\n';
    return `${text}${text.endsWith('\n') ? '' : newline}${control}${newline}`;
}

/** Materialize a stable ID only during an explicitly authorized mutation. @private */
export async function assignTaskId(task: TaskDefinition, options: TaskSourceWriteOptions = {}): Promise<TaskDefinition> {
    if (task.source.format !== 'book' || task.source.explicitId) return task;
    return rewriteTaskSource(task, (text) => appendControl(text, `TASK ID ${task.id}`), options);
}

/** Routing/relationship controls changed by an ordinary Manager assignment. @private */
export interface TaskControlUpdates {
    agent?: string;
    harness?: string;
    model?: string;
    thinkingLevel?: string;
    priority?: number;
    dependencies?: string[];
    parent?: string;
    origin?: string;
}

/** Update selected controls while preserving all other task source text. @private */
export async function updateTaskControls(task: TaskDefinition, updates: TaskControlUpdates, options: TaskSourceWriteOptions = {}): Promise<TaskDefinition> {
    if (task.source.format !== 'book') throw new Error('Typed task controls require a task Book; migrate this Markdown task explicitly first.');
    return rewriteTaskSource(task, (text) => {
        const fields: Record<keyof TaskControlUpdates, string> = {
            agent: 'TASK AGENT', harness: 'TASK HARNESS', model: 'TASK MODEL', thinkingLevel: 'TASK THINKING LEVEL',
            priority: 'TASK PRIORITY', dependencies: 'TASK DEPENDS ON', parent: 'TASK PARENT', origin: 'TASK ORIGIN',
        };
        const lines = text.split('\n');
        const first = lines.findIndex((line) => line.trim());
        const { blocks } = bookBlocks(lines, first + 1);
        const removed = new Set<number>();
        const additions: string[] = [];
        for (const key of Object.keys(updates) as Array<keyof TaskControlUpdates>) {
            const keyword = fields[key];
            if (!keyword) throw new Error(`Unknown task control field ${String(key)}.`);
            blocks.filter((block) => block.name === keyword).forEach((block) => {
                removed.add(block.line - 1);
                if (['TASK ORIGIN', 'TASK NOTE'].includes(keyword)) block.body.forEach((line, index) => { if (line.trim()) removed.add(block.line + index); });
            });
            const value = updates[key];
            if (value === undefined) continue;
            if (key === 'dependencies') {
                if (!Array.isArray(value) || value.some((reference) => typeof reference !== 'string' || /[\r\n]/.test(reference))) throw new Error('Task dependencies must be an array of single-line references.');
                value.forEach((reference) => additions.push(`${keyword} ${reference}`));
            }
            else additions.push(`${keyword} ${value}`);
            if (typeof value === 'string' && /[\r\n]/.test(value)) throw new Error(`${keyword} updates must stay on one source line.`);
            if (key === 'priority' && task.priorityRaw) additions.push(`TASK NOTE original priority ${JSON.stringify(task.priorityRaw)}`);
        }
        let updated = lines.filter((_line, index) => !removed.has(index)).join('\n');
        for (const addition of additions) updated = appendControl(updated, addition);
        const parsed = parseBook(updated, task.source.path, task.scheduleTimezone ?? 'UTC');
        if (!parsed || parsed.diagnostics.length) throw new Error(`Invalid task control update: ${parsed?.diagnostics.join('; ') ?? 'not a task Book'}`);
        return updated;
    }, options);
}

/** Append one accepted occurrence's actual completion timestamp without retiring recurrence. @private */
export async function recordTaskCompletion(task: TaskDefinition, timestamp: number | string = Date.now(), options: TaskSourceWriteOptions = {}): Promise<TaskDefinition> {
    if (task.source.format === 'markdown') return updateTaskStatus(task, 'done', options);
    const stamp = typeof timestamp === 'number' ? new Date(timestamp).toISOString() : timestamp;
    if (!/[T ][^\n]+(?:Z|[+-]\d{2}:\d{2})$/.test(stamp)) throw new Error('Completion requires an actual timestamp with an explicit timezone.');
    parseDate(stamp, 'UTC');
    if (task.diagnostics.length) throw new Error(`Cannot complete an invalid task source: ${task.diagnostics.join('; ')}`);
    return rewriteTaskSource(task, (text) => appendControl(appendControl(text, `TASK DONE ${stamp}`), `TASK NOTE ptbk-completion-source ${completionRevision(task)}`), options);
}

/** Replace legacy state or explicit Book holds while retaining descriptive content. @private */
export async function updateTaskStatus(task: TaskDefinition, status: TaskStatus, options: TaskSourceWriteOptions = {}): Promise<TaskDefinition> {
    if (!STATUSES.has(status)) throw new Error(`Invalid task status ${status}.`);
    if (task.source.format === 'book') {
        if (status === 'done') return recordTaskCompletion(task, Date.now(), options);
        if (status === 'in-progress') return task;
        return rewriteTaskSource(task, (text) => {
            const statusLine = task.source.statusLine ?? parseBook(text, task.source.path, task.scheduleTimezone ?? 'UTC')?.source.statusLine;
            if (!statusLine) return appendControl(text, `TASK STATUS ${status}`);
            const lines = text.split('\n');
            const line = lines[statusLine - 1]!;
            if (!/^TASK STATUS[ \t]+/.test(line)) throw new Error(`TASK STATUS location changed in ${task.source.path}.`);
            lines[statusLine - 1] = line.replace(/^(TASK STATUS[ \t]+)[^\r\n]*/, `$1${status}`);
            return lines.join('\n');
        }, options);
    }
    return rewriteTaskSource(task, (text) => {
        const section = markdownSections(text)[task.source.sectionIndex];
        if (!section || checksum(section.text) !== task.source.sectionRevision) throw new Error(`Task section changed in ${task.source.path}.`);
        const newline = text.includes('\r\n') ? '\r\n' : '\n';
        const marker = { todo: ' ', 'not-ready': '-', 'in-progress': '^', done: 'x', failed: '!', retired: '-' }[status];
        const control = /^(\s*(?:[-*+]\s+)?\[)[^\]](\])/m;
        const firstNonempty = /\S/.exec(section.text)?.index ?? 0;
        const lineStart = section.text.lastIndexOf('\n', firstNonempty - 1) + 1;
        const lineEnd = section.text.indexOf('\n', firstNonempty);
        const firstLine = section.text.slice(lineStart, lineEnd < 0 ? section.text.length : lineEnd);
        const changedSection = /^\s*(?:[-*+]\s+)?\[[^\]]\]/.test(firstLine)
            ? section.text.replace(control, `$1${marker}$2`)
            : `${section.text.slice(0, lineStart)}[${marker}]${newline}${section.text.slice(lineStart)}`;
        return text.slice(0, section.start) + changedSection + text.slice(section.end);
    }, options);
}
