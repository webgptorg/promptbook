import { createHash, randomUUID } from 'node:crypto';
import { lstat, readdir, readFile, realpath, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { MigrationOrigin, OccurrenceState, TaskDefinition, TaskStatus, Workspace } from './domain.js';
import { bindSchedule, parseDate, parseInterval, scheduleRevision } from './schedule.js';

/** Source checksums are independent of text encoding and line endings. @private */
export function checksum(text: string | Buffer): string {
    return createHash('sha256').update(text).digest('hex');
}

/** Supported source lifecycle values. */
const STATUSES = new Set<TaskStatus>(['todo', 'in-progress', 'done', 'failed', 'not-ready']);

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
    const separator = /^[ \t]*---[ \t]*\r?$/gm;
    let start = 0;
    let match: RegExpExecArray | null;
    while ((match = separator.exec(text))) {
        sections.push({ text: text.slice(start, match.index), start, end: match.index, index: sections.length });
        start = match.index + match[0].length;
        if (text[start] === '\n') start++;
    }
    sections.push({ text: text.slice(start), start, end: text.length, index: sections.length });
    return sections;
}

/** Remove only whitespace surrounding a control argument. */
function argument(text: string): string {
    return text.trim();
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

/** Tokenize Book commitments while shielding ordinary fenced code. */
function bookBlocks(lines: string[], from: number): BookBlock[] {
    const blocks: BookBlock[] = [];
    let fence: string | undefined;
    for (let index = from; index < lines.length; index++) {
        const line = lines[index]!;
        const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(line);
        if (fenceMatch) {
            if (!fence) fence = fenceMatch[1];
            else if (fenceMatch[1]![0] === fence[0] && fenceMatch[1]!.length >= fence.length) fence = undefined;
            blocks.at(-1)?.body.push(line);
            continue;
        }
        const control = !fence && /^([A-Z][A-Z0-9_-]*)(?:[ \t]+(.*))?$/.exec(line);
        if (control) blocks.push({ name: control[1]!, argument: control[2] ?? '', body: [], line: index + 1 });
        else blocks.at(-1)?.body.push(line);
    }
    return blocks;
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
    const lines = text.split(/\r?\n/);
    const first = lines.findIndex((line) => line.trim());
    if (first < 0) return null;
    const header = lines.findIndex((line, index) => index > first && Boolean(line.trim()));
    if (header < 0 || !/^TASK(?:\s|$)/.test(lines[header]!)) return null;
    const task = taskBase(text, file, 'book', 0);
    task.title = lines[first]!.trim();
    task.metadata = [];
    const counts = new Map<string, number>();
    const blocks = bookBlocks(lines, header);
    for (const block of blocks) {
        const full = [block.argument, ...block.body].join('\n').trim();
        const key = block.name === 'META' ? `META ${block.argument.split(/\s+/)[0]}` : block.name;
        counts.set(key, (counts.get(key) ?? 0) + 1);
        try {
            switch (block.name) {
                case 'TASK': if (full) throw new Error('TASK declaration does not accept arguments.'); break;
                case 'META': {
                    const meta = /^([A-Z][A-Z0-9_-]*)(?:\s+([\s\S]*))?$/.exec(full);
                    if (!meta) throw new Error('Malformed META commitment.');
                    if (meta[1] === 'ID') {
                        if (!meta[2]?.trim() || /\s/.test(meta[2])) throw new Error('META ID must be one nonempty token.');
                        task.id = meta[2];
                    } else {
                        task.metadata.push(`META ${full}`);
                        if (meta[1] === 'ORIGIN') task.source.origin = originValue(meta[2] ?? '');
                    }
                    break;
                }
                case 'STATUS':
                    if (!STATUSES.has(full as TaskStatus)) throw new Error(`Invalid STATUS ${JSON.stringify(full)}.`);
                    task.status = full as TaskStatus; task.source.statusLine = block.line; break;
                case 'PRIORITY':
                    if (!/^\d+$/.test(full) || !Number.isSafeInteger(Number(full))) throw new Error('PRIORITY must be a nonnegative safe integer.');
                    task.priority = Number(full); break;
                case 'AGENT': {
                    const reference = full.replace(/^\{([^}]+)\}$/, '$1');
                    if (!reference) throw new Error('AGENT requires a reference.');
                    if (/^https?:/i.test(reference)) {
                        const url = new URL(reference);
                        if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Remote AGENT requires HTTPS without embedded credentials.');
                        task.agent = url.href;
                    } else task.agent = reference.includes('/') || reference.endsWith('.book') ? path.resolve(path.dirname(file), reference) : reference;
                    break;
                }
                case 'HARNESS': case 'MODEL':
                    if (!full || /\s/.test(full)) throw new Error(`${block.name} requires one nonempty token.`);
                    if (block.name === 'HARNESS') task.harness = full; else task.model = full; break;
                case 'RUNNER': if (!full) throw new Error('RUNNER is empty.'); task.runners.push(full.toLowerCase()); break;
                case 'AFTER': {
                    task.afterRaw ??= full;
                    const instant = parseDate(full, timezone);
                    if (task.after !== undefined && task.after !== instant) throw new Error('Conflicting AFTER dates.');
                    task.after = instant; break;
                }
                case 'REPEAT': {
                    const interval = parseInterval(full);
                    if (task.repeat !== undefined && task.repeat !== interval) throw new Error('Conflicting REPEAT intervals.');
                    task.repeat = interval; break;
                }
                case 'PROMPT': task.payload = blockPayload(block); if (!task.payload.trim()) throw new Error('PROMPT is empty.'); break;
                case 'RULE': task.rules.push(blockPayload(block)); break;
                default: throw new Error(`Unsupported executable commitment ${block.name}.`);
            }
        } catch (error) { task.diagnostics.push(`${file}:${block.line}: ${(error as Error).message}`); }
    }
    for (const key of ['TASK', 'META ID', 'STATUS', 'PROMPT']) {
        if (!counts.get(key)) task.diagnostics.push(`${file}: Missing ${key}.`);
    }
    for (const key of ['TASK', 'META ID', 'META ORIGIN', 'STATUS', 'PRIORITY', 'AGENT', 'HARNESS', 'MODEL', 'PROMPT']) {
        if ((counts.get(key) ?? 0) > 1) task.diagnostics.push(`${file}: Duplicate singleton ${key}.`);
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

/** Serialize a canonical task Book, preserving nonexecutive metadata and payload. @private */
export function serializeTaskBook(task: TaskDefinition): string {
    const header = [task.title, '', 'TASK', `META ID ${task.id}`, `STATUS ${task.status}`, `PRIORITY ${task.priority}`];
    if (task.agent) {
        const reference = path.isAbsolute(task.agent) ? path.relative(path.dirname(task.source.path), task.agent).split(path.sep).join('/') : task.agent;
        header.push(`AGENT {${reference}}`);
    }
    if (task.harness) header.push(`HARNESS ${task.harness}`);
    if (task.model) header.push(`MODEL ${task.model}`);
    task.runners.forEach((runner) => header.push(`RUNNER ${runner}`));
    if (task.after !== undefined) header.push(`AFTER ${task.afterRaw ?? new Date(task.after).toISOString()}`);
    if (task.repeat !== undefined) header.push(`REPEAT ${task.repeat / 1000}s`);
    header.push(...(task.metadata ?? []));
    if (task.source.origin && !task.metadata?.some((meta) => meta.startsWith('META ORIGIN '))) header.push(`META ORIGIN ${JSON.stringify(task.source.origin)}`);
    header.push('', 'PROMPT', literal(task.payload));
    task.rules.forEach((rule) => header.push('', 'RULE', literal(rule)));
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
    return tasks.sort((left, right) => right.priority - left.priority || left.source.relativePath.localeCompare(right.source.relativePath, 'en') || left.source.sectionIndex - right.source.sectionIndex || left.id.localeCompare(right.id, 'en'));
}

/** Replace a source under a lease, rejecting edits since discovery. @private */
export async function updateTaskStatus(task: TaskDefinition, status: TaskStatus): Promise<TaskDefinition> {
    if (!STATUSES.has(status)) throw new Error(`Invalid task status ${status}.`);
    if (task.source.projectPath) await assertConfined(task.source.path, task.source.projectPath);
    const text = await readFile(task.source.path, 'utf8');
    if (checksum(text) !== task.source.revision) throw new Error(`Source changed concurrently: ${task.source.path}; retained current contents and refused status update.`);
    let updated: string;
    if (task.source.format === 'book') {
        const statusLine = task.source.statusLine ?? parseBook(text, task.source.path, 'UTC')?.source.statusLine;
        if (!statusLine) throw new Error(`Missing STATUS in ${task.source.path}.`);
        const lines = text.split('\n');
        const line = lines[statusLine - 1]!;
        if (!/^STATUS[ \t]+/.test(line)) throw new Error(`STATUS location changed in ${task.source.path}.`);
        lines[statusLine - 1] = line.replace(/^(STATUS[ \t]+)[^\r\n]*/, `$1${status}`);
        updated = lines.join('\n');
    } else {
        const section = markdownSections(text)[task.source.sectionIndex];
        if (!section || checksum(section.text) !== task.source.sectionRevision) throw new Error(`Task section changed in ${task.source.path}.`);
        const newline = text.includes('\r\n') ? '\r\n' : '\n';
        const marker = { todo: ' ', 'not-ready': '-', 'in-progress': '^', done: 'x', failed: '!' }[status];
        const control = /^(\s*(?:[-*+]\s+)?\[)[^\]](\])/m;
        const firstNonempty = /\S/.exec(section.text)?.index ?? 0;
        const lineStart = section.text.lastIndexOf('\n', firstNonempty - 1) + 1;
        const lineEnd = section.text.indexOf('\n', firstNonempty);
        const firstLine = section.text.slice(lineStart, lineEnd < 0 ? section.text.length : lineEnd);
        const changedSection = /^\s*(?:[-*+]\s+)?\[[^\]]\]/.test(firstLine)
            ? section.text.replace(control, `$1${marker}$2`)
            : `${section.text.slice(0, lineStart)}[${marker}]${newline}${section.text.slice(lineStart)}`;
        updated = text.slice(0, section.start) + changedSection + text.slice(section.end);
    }
    const stat = await lstat(task.source.path);
    if (stat.isSymbolicLink()) throw new Error(`Refusing to replace symbolic link task source: ${task.source.path}`);
    const temporary = `${task.source.path}.${randomUUID()}.tmp`;
    try {
        await writeFile(temporary, updated, { flag: 'wx', mode: stat.mode });
        if (checksum(await readFile(task.source.path, 'utf8')) !== task.source.revision) throw new Error(`Source changed concurrently: ${task.source.path}.`);
        await rename(temporary, task.source.path);
    } finally { await unlink(temporary).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'ENOENT') throw error; }); }
    const parsed = task.source.format === 'book' ? parseBook(updated, task.source.path, 'UTC') : parseMarkdown(updated, task.source.path, 'UTC').find((candidate) => candidate.source.sectionIndex === task.source.sectionIndex);
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
