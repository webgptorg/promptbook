import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { TaskDefinition, Workspace } from './domain.js';
import { assertConfined, checksum, parseBook, parseMarkdown, serializeTaskBook } from './sources.js';
import type { MigrationJournal } from './sources.js';

/** Lease supplied by the common workspace ownership service. @private */
export interface MigrationLease { assertOwned(): Promise<void> | void }

/** One generated Book in a deterministic migration plan. @private */
export interface MigrationDestination { path: string; id: string; content: string }

/** Atomic migration unit: all sections from one original source. @private */
export interface MigrationPlanEntry {
    sourcePath: string;
    sourceChecksum: string;
    archivePath: string;
    destinations: MigrationDestination[];
}

/** Paths owned by migration, allowing the caller to make a scoped commit. @private */
export interface MigrationResult { created: string[]; archived: string[]; plan: MigrationPlanEntry[] }

/** Resolve project-relative journal paths and reject lexical traversal. */
function projectFile(workspace: Workspace, relative: string): string {
    if (path.isAbsolute(relative) || relative.split(/[\\/]/).includes('..')) throw new Error(`Invalid migration journal path: ${relative}`);
    return path.resolve(workspace.projectPath, relative);
}

/** Convert a path to the portable project-relative provenance spelling. */
function relative(workspace: Workspace, file: string): string {
    return path.relative(workspace.projectPath, file).split(path.sep).join('/');
}

/** Rebase only Markdown link destinations outside fenced and inline code. */
function rebaseLinks(payload: string, source: string, destination: string): string {
    let fence: string | undefined;
    /** Preserve URL/fragment suffixes while relocating a Markdown asset destination. */
    function rebaseTarget(raw: string): string {
        const destinationText = raw.startsWith('<') ? raw.slice(1, -1) : raw;
        if (/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(destinationText)) return raw;
        const suffixIndex = destinationText.search(/[?#]/);
        const target = suffixIndex < 0 ? destinationText : destinationText.slice(0, suffixIndex);
        const suffix = suffixIndex < 0 ? '' : destinationText.slice(suffixIndex);
        const rebased = path.relative(path.dirname(destination), path.resolve(path.dirname(source), target)).split(path.sep).join('/') + suffix;
        return raw.startsWith('<') ? `<${rebased}>` : rebased;
    }
    return payload.split(/(?<=\n)/).map((line) => {
        const marker = /^\s*(`{3,}|~{3,})/.exec(line);
        if (marker) {
            if (!fence) fence = marker[1];
            else if (marker[1]![0] === fence[0] && marker[1]!.length >= fence.length) fence = undefined;
            return line;
        }
        if (fence) return line;
        const definition = /^( {0,3}\[[^\]]+\]:[ \t]+)(<[^>]+>|[^\s]+)([\s\S]*)$/.exec(line);
        if (definition) return `${definition[1]}${rebaseTarget(definition[2]!)}${definition[3]}`;
        return line.split(/(`+[^`]*`+)/).map((part, index) => index % 2 ? part : part.replace(
            /(!?\[[^\]]*\]\()(<[^>]+>|[^\s)]+)([^)]*\))/g,
            (_match, opening: string, raw: string, closing: string) => `${opening}${rebaseTarget(raw)}${closing}`,
        )).join('');
    }).join('');
}

/** Verify generated Books preserve every executable field after literal decoding. */
function equivalent(left: TaskDefinition, right: TaskDefinition): boolean {
    return JSON.stringify([left.id, left.title, left.payload, left.rules, left.status, left.priority, left.runners, left.after ?? null, left.repeat ?? null])
        === JSON.stringify([right.id, right.title, right.payload, right.rules, right.status, right.priority, right.runners, right.after ?? null, right.repeat ?? null]);
}

/** Build all sections before writing or archiving anything from a source file. */
function makePlan(workspace: Workspace, file: string, bytes: Buffer): MigrationPlanEntry | null {
    if (!Buffer.from(bytes.toString('utf8')).equals(bytes)) throw new Error(`Migration source is not valid UTF-8: ${file}; refusing a lossy conversion.`);
    const tasks = parseMarkdown(bytes.toString('utf8'), file, workspace.timezone);
    if (!tasks.length) return null;
    const invalid = tasks.flatMap((task) => task.diagnostics);
    if (invalid.length) throw new Error(`Migration cannot safely convert ${file}: ${invalid.join('; ')}`);
    const sourcePath = relative(workspace, file);
    const sourceChecksum = checksum(bytes);
    const stem = path.basename(file, path.extname(file)).replace(/[^\p{L}\p{N}._-]+/gu, '-');
    const destinations = tasks.map((legacy) => {
        const destination = path.join(workspace.tasksPath, `${stem}-${legacy.source.sectionIndex + 1}.book`);
        const task: TaskDefinition = {
            ...legacy,
            id: `task-${checksum(`${sourcePath}:${legacy.source.sectionIndex}`).slice(0, 24)}`,
            payload: rebaseLinks(legacy.payload, file, destination),
            afterRaw: undefined,
            source: {
                ...legacy.source, path: destination, format: 'book', sectionIndex: 0,
                origin: { sourcePath, sectionIndex: legacy.source.sectionIndex, sourceChecksum, migrationVersion: 1 },
            },
        };
        const content = serializeTaskBook(task);
        const parsed = parseBook(content, destination, workspace.timezone);
        if (!parsed || parsed.diagnostics.length || !equivalent(task, parsed)) throw new Error(`Migration round-trip failed for ${file} section ${legacy.source.sectionIndex + 1}.`);
        return { path: destination, id: task.id, content };
    });
    return { sourcePath: file, sourceChecksum, archivePath: path.join(workspace.legacyPath, 'migrated', `${path.basename(file)}.${sourceChecksum.slice(0, 12)}.archive`), destinations };
}

/** Read bytes while distinguishing a missing path from all other errors. */
async function readOptional(file: string): Promise<Buffer | undefined> {
    try { return await readFile(file); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw error; }
}

/** Atomically persist the authority journal before the next migration boundary. */
async function saveJournal(file: string, journal: MigrationJournal, lease: MigrationLease): Promise<void> {
    await lease.assertOwned();
    const temporary = `${file}.${randomUUID()}.tmp`;
    try {
        await writeFile(temporary, `${JSON.stringify(journal, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
        await rename(temporary, file);
    } finally { await unlink(temporary).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'ENOENT') throw error; }); }
}

/** Migrate Markdown without model calls; caller owns Git persistence and the lease. @private */
export async function migrateTasks(
    workspace: Workspace,
    options: { dryRun?: boolean; noCommit?: boolean },
    lease?: MigrationLease,
): Promise<MigrationResult> {
    await assertConfined(workspace.tasksPath, workspace.projectPath);
    await assertConfined(workspace.legacyPath, workspace.projectPath);
    await assertConfined(workspace.statePath, workspace.gitRoot ?? workspace.projectPath);
    const journalPath = path.join(workspace.statePath, 'migration.json');
    const previous = await readOptional(journalPath);
    const journal: MigrationJournal = previous ? JSON.parse(previous.toString('utf8')) as MigrationJournal : { version: 1, entries: [] };
    if (journal.version !== 1 || !Array.isArray(journal.entries)) throw new Error('Invalid migration journal; preserved for explicit recovery.');
    const plans: MigrationPlanEntry[] = [];
    for (const entry of journal.entries) {
        const file = projectFile(workspace, entry.sourcePath);
        const archive = entry.archivePath ? projectFile(workspace, entry.archivePath) : undefined;
        const bytes = await readOptional(file) ?? (archive ? await readOptional(archive) : undefined);
        if (!bytes || checksum(bytes) !== entry.sourceChecksum) throw new Error(`Migration source changed or disappeared: ${file}; resolve its journal explicitly.`);
        const plan = makePlan(workspace, file, bytes);
        if (!plan || plan.destinations.some((destination) => !entry.destinations.includes(relative(workspace, destination.path)))) throw new Error(`Migration configuration changed for ${file}.`);
        for (const destination of plan.destinations) {
            await assertConfined(destination.path, workspace.projectPath);
            const existing = await readOptional(destination.path);
            if ((existing && existing.toString('utf8') !== destination.content && entry.phase !== 'archived') || (!existing && entry.phase !== 'prepared')) {
                throw new Error(`Migration destination changed: ${destination.path}; it will not be overwritten.`);
            }
        }
        if (entry.phase !== 'archived') plans.push(plan);
    }
    let files: string[];
    try { files = (await readdir(workspace.legacyPath)).filter((file) => file.toLowerCase().endsWith('.md')).sort(); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; files = []; }
    for (const name of files) {
        const file = path.join(workspace.legacyPath, name);
        if (journal.entries.some((entry) => entry.sourcePath === relative(workspace, file))) continue;
        await assertConfined(file, workspace.projectPath);
        const bytes = await readFile(file);
        const plan = makePlan(workspace, file, bytes);
        if (plan) plans.push(plan);
    }
    const ids = new Set<string>();
    for (const plan of plans) {
        await assertConfined(plan.archivePath, workspace.projectPath);
        const archive = await readOptional(plan.archivePath);
        if (archive && checksum(archive) !== plan.sourceChecksum) throw new Error(`Migration archive collision at ${plan.archivePath}.`);
        for (const destination of plan.destinations) {
            if (ids.has(destination.id)) throw new Error(`Migration ID collision: ${destination.id}.`);
            ids.add(destination.id);
            await assertConfined(destination.path, workspace.projectPath);
            const existing = await readOptional(destination.path);
            if (existing && existing.toString('utf8') !== destination.content) throw new Error(`Migration destination collision at ${destination.path}.`);
        }
    }
    try {
        for (const name of await readdir(workspace.tasksPath)) {
            if (!name.toLowerCase().endsWith('.book')) continue;
            const file = path.join(workspace.tasksPath, name);
            await assertConfined(file, workspace.projectPath);
            const book = parseBook(await readFile(file, 'utf8'), file, workspace.timezone);
            if (book && ids.has(book.id) && !plans.some((plan) => plan.destinations.some((destination) => destination.path === file))) throw new Error(`Migration ID already exists in ${file}.`);
        }
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    if (options.dryRun || !plans.length) return { created: [], archived: [], plan: plans };
    if (!lease) throw new Error('Migration requires the common workspace mutation lease.');
    await lease.assertOwned();
    await mkdir(workspace.statePath, { recursive: true });
    await mkdir(workspace.tasksPath, { recursive: true });
    const result: MigrationResult = { created: [], archived: [], plan: plans };
    for (const plan of plans) {
        let entry = journal.entries.find((candidate) => candidate.sourcePath === relative(workspace, plan.sourcePath));
        if (!entry) {
            entry = {
                sourcePath: relative(workspace, plan.sourcePath), sourceChecksum: plan.sourceChecksum,
                phase: 'prepared', destinations: plan.destinations.map((destination) => relative(workspace, destination.path)),
                archivePath: relative(workspace, plan.archivePath),
                destinationChecksums: Object.fromEntries(plan.destinations.map((destination) => [relative(workspace, destination.path), checksum(destination.content)])),
            };
            journal.entries.push(entry);
            await saveJournal(journalPath, journal, lease);
        }
        for (const destination of plan.destinations) {
            await lease.assertOwned();
            await assertConfined(destination.path, workspace.projectPath);
            const existing = await readOptional(destination.path);
            if (!existing) await writeFile(destination.path, destination.content, { flag: 'wx' });
            else if (existing.toString('utf8') !== destination.content) throw new Error(`Migration destination changed: ${destination.path}.`);
            const parsed = parseBook(await readFile(destination.path, 'utf8'), destination.path, workspace.timezone);
            if (!parsed || parsed.diagnostics.length) throw new Error(`Written Book is invalid: ${destination.path}.`);
            result.created.push(destination.path);
        }
        const source = await readOptional(plan.sourcePath);
        if (source && checksum(source) !== plan.sourceChecksum) throw new Error(`Migration source changed: ${plan.sourcePath}.`);
        entry.phase = 'books-written';
        await saveJournal(journalPath, journal, lease);
        await mkdir(path.dirname(plan.archivePath), { recursive: true });
        const archive = await readOptional(plan.archivePath);
        if (!archive) {
            if (!source) throw new Error(`Migration source disappeared: ${plan.sourcePath}.`);
            await writeFile(plan.archivePath, source, { flag: 'wx' });
        } else if (checksum(archive) !== plan.sourceChecksum) throw new Error(`Migration archive changed: ${plan.archivePath}.`);
        await lease.assertOwned();
        const current = await readOptional(plan.sourcePath);
        if (current && checksum(current) !== plan.sourceChecksum) throw new Error(`Migration source changed before archival: ${plan.sourcePath}.`);
        if (current) await unlink(plan.sourcePath);
        entry.phase = 'archived';
        await saveJournal(journalPath, journal, lease);
        result.archived.push(plan.sourcePath, plan.archivePath);
    }
    return result;
}
