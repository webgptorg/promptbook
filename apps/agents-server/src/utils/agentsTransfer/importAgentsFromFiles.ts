import type { SupabaseClient } from '@supabase/supabase-js';
import { DatabaseError, ParseError, UnexpectedError } from '@promptbook-local/core';
import type { string_book } from '@promptbook-local/types';
import JSZip from 'jszip';
import { spaceTrim } from 'spacetrim';
import { prepareAgentSourceForPersistence } from '../../../../../src/collection/agent-collection/constructors/agent-collection-in-supabase/prepareAgentSourceForPersistence';
import { $getTableName } from '../../database/$getTableName';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '../../database/schema';
import { $provideAgentCollectionForServer } from '../../tools/$provideAgentCollectionForServer';
import { invalidateCachedActiveOrganizationSnapshots } from '../agentOrganization/loadAgentOrganizationState';
import { resolveCurrentUserIdentity } from '../currentUserIdentity';
import { createAgentWithDefaultVisibility } from '../createAgentWithDefaultVisibility';
import { getNextOwnedAgentSortOrder } from '../managementApi/managementApiAgents';
import { getNextOwnedFolderSortOrder } from '../managementApi/managementApiFolders';

/**
 * Supported duplicate-conflict import behavior.
 */
export type AgentsImportConflictResolution = 'ASK' | 'SKIP' | 'DUPLICATE';

/**
 * Binary file uploaded by the agents import route.
 */
export type AgentsImportFile = {
    /**
     * Original browser-provided filename.
     */
    readonly name: string;
    /**
     * Full file content.
     */
    readonly content: ArrayBuffer | Uint8Array;
};

/**
 * Warning discovered while parsing dropped import files.
 */
export type AgentsImportWarning = {
    /**
     * Path of the ignored or suspicious file.
     */
    readonly path: string;
    /**
     * Human-readable warning message.
     */
    readonly message: string;
};

/**
 * Duplicate book conflict that needs a user decision.
 */
export type AgentsImportConflict = {
    /**
     * Agent name parsed from the imported book.
     */
    readonly agentName: string;
    /**
     * Source file path that contains the conflicting book.
     */
    readonly path: string;
    /**
     * Number of existing agents with the same name and different source.
     */
    readonly existingDifferentBookCount: number;
};

/**
 * Result returned after analyzing or applying an agents import.
 */
export type AgentsImportResult = {
    /**
     * Number of newly created agents.
     */
    readonly importedCount: number;
    /**
     * Number of book entries skipped because they were already present or explicitly skipped.
     */
    readonly skippedCount: number;
    /**
     * Number of non-book files ignored from uploads and ZIP archives.
     */
    readonly ignoredFileCount: number;
    /**
     * Warnings produced while reading uploaded files.
     */
    readonly warnings: ReadonlyArray<AgentsImportWarning>;
    /**
     * Duplicate conflicts that still require a user decision.
     */
    readonly conflicts: ReadonlyArray<AgentsImportConflict>;
};

/**
 * Options accepted by the agents import service.
 */
export type ImportAgentsFromFilesOptions = {
    /**
     * Dropped or selected files.
     */
    readonly files: ReadonlyArray<AgentsImportFile>;
    /**
     * Folder where dropped files should be embedded.
     */
    readonly targetFolderId: number | null;
    /**
     * How different-book duplicates should be handled.
     */
    readonly conflictResolution: AgentsImportConflictResolution;
};

/**
 * Parsed book entry ready for duplicate checks and persistence.
 */
type AgentsImportBookEntry = {
    /**
     * Original file path inside the upload batch.
     */
    readonly path: string;
    /**
     * Folder path segments resolved from the file path.
     */
    readonly folderSegments: ReadonlyArray<string>;
    /**
     * Raw book source to persist through the standard agent collection.
     */
    readonly source: string_book;
    /**
     * Agent name parsed from the book source.
     */
    readonly agentName: string;
    /**
     * Normalized source used for same-book duplicate checks.
     */
    readonly normalizedAgentSource: string;
};

/**
 * Existing active agent row used for duplicate checks.
 */
type ExistingAgentRow = Pick<AgentsServerDatabase['public']['Tables']['Agent']['Row'], 'agentName' | 'agentSource'>;

/**
 * Active folder row used while recreating folder paths from ZIP entries.
 */
type ExistingFolderRow = Pick<AgentsServerDatabase['public']['Tables']['AgentFolder']['Row'], 'id' | 'name' | 'parentId' | 'sortOrder'>;

/**
 * Supabase client type used by the import service.
 */
type AgentsImportSupabase = SupabaseClient<AgentsServerDatabase>;

/**
 * File extension used by book files.
 */
const BOOK_FILE_EXTENSION = '.book';

/**
 * File extension used by ZIP archives.
 */
const ZIP_FILE_EXTENSION = '.zip';

/**
 * Separator used for composite folder lookup keys.
 */
const FOLDER_LOOKUP_KEY_SEPARATOR = '\u0000';

/**
 * Imports agent books from dropped `.book` files or ZIP archives.
 *
 * When duplicate agent names with different book sources are found and the conflict resolution is `ASK`, this function
 * returns conflicts without creating anything.
 *
 * @param options - Import files, target folder, and duplicate handling.
 * @returns Import summary.
 */
export async function importAgentsFromFiles(options: ImportAgentsFromFilesOptions): Promise<AgentsImportResult> {
    const { entries, warnings, ignoredFileCount } = await extractAgentsImportBookEntries(options.files);
    if (entries.length === 0) {
        throw new ParseError(
            spaceTrim(`
                No book files were found.

                Drop individual \`.book\` files or a ZIP archive that contains \`.book\` files.
            `),
        );
    }

    const supabase = $provideSupabaseForServer();
    await ensureImportTargetFolderExists(supabase, options.targetFolderId);

    const existingAgents = await loadExistingAgents(supabase);
    const conflicts = createAgentsImportConflicts(entries, existingAgents);
    if (options.conflictResolution === 'ASK' && conflicts.length > 0) {
        return {
            importedCount: 0,
            skippedCount: 0,
            ignoredFileCount,
            warnings,
            conflicts,
        };
    }

    const importedCount = await persistAgentsImportEntries({
        entries,
        existingAgents,
        conflictResolution: options.conflictResolution,
        targetFolderId: options.targetFolderId,
        supabase,
    });

    invalidateCachedActiveOrganizationSnapshots();

    return {
        importedCount,
        skippedCount: entries.length - importedCount,
        ignoredFileCount,
        warnings,
        conflicts: [],
    };
}

/**
 * Extracts book entries from uploaded files.
 *
 * @param files - Uploaded files.
 * @returns Parsed book entries and warnings.
 */
export async function extractAgentsImportBookEntries(files: ReadonlyArray<AgentsImportFile>): Promise<{
    readonly entries: ReadonlyArray<AgentsImportBookEntry>;
    readonly warnings: ReadonlyArray<AgentsImportWarning>;
    readonly ignoredFileCount: number;
}> {
    const entries: AgentsImportBookEntry[] = [];
    const warnings: AgentsImportWarning[] = [];
    let ignoredFileCount = 0;

    for (const file of files) {
        if (isBookFilePath(file.name)) {
            entries.push(createAgentsImportBookEntry(file.name, [], decodeImportFileContent(file.content)));
            continue;
        }

        if (isZipFilePath(file.name)) {
            const zipResult = await extractAgentsImportBookEntriesFromZip(file);
            entries.push(...zipResult.entries);
            warnings.push(...zipResult.warnings);
            ignoredFileCount += zipResult.ignoredFileCount;
            continue;
        }

        ignoredFileCount += 1;
        warnings.push({
            path: file.name,
            message: 'Ignored file because it is not a `.book` file or ZIP archive.',
        });
    }

    return { entries, warnings, ignoredFileCount };
}

/**
 * Extracts book entries from one ZIP archive.
 *
 * @param file - Uploaded ZIP file.
 * @returns Parsed book entries and ignored-file warnings.
 */
async function extractAgentsImportBookEntriesFromZip(file: AgentsImportFile): Promise<{
    readonly entries: ReadonlyArray<AgentsImportBookEntry>;
    readonly warnings: ReadonlyArray<AgentsImportWarning>;
    readonly ignoredFileCount: number;
}> {
    let zip: JSZip;

    try {
        zip = await JSZip.loadAsync(file.content);
    } catch (error) {
        throw new ParseError(
            spaceTrim(
                (block) => `
                    Failed to read agents ZIP archive \`${file.name}\`.

                    ${block(error instanceof Error ? error.message : 'Unknown ZIP parsing error.')}
                `,
            ),
        );
    }

    const entries: AgentsImportBookEntry[] = [];
    const warnings: AgentsImportWarning[] = [];
    let ignoredFileCount = 0;
    const zipEntries = Object.values(zip.files).sort((left, right) => left.name.localeCompare(right.name));

    for (const zipEntry of zipEntries) {
        if (zipEntry.dir) {
            continue;
        }

        const normalizedPath = normalizeImportedZipPath(zipEntry.name);
        if (!isBookFilePath(normalizedPath)) {
            ignoredFileCount += 1;
            warnings.push({
                path: `${file.name}/${normalizedPath}`,
                message: 'ZIP entry was ignored because it is not a `.book` file.',
            });
            continue;
        }

        const pathSegments = resolveImportedBookPathSegments(normalizedPath);
        const source = await zipEntry.async('string');
        entries.push(
            createAgentsImportBookEntry(
                `${file.name}/${normalizedPath}`,
                pathSegments.slice(0, -1),
                source,
            ),
        );
    }

    return { entries, warnings, ignoredFileCount };
}

/**
 * Persists all import entries after duplicate conflicts have already been resolved.
 *
 * @param options - Persistence context.
 * @returns Number of created agents.
 */
async function persistAgentsImportEntries(options: {
    readonly entries: ReadonlyArray<AgentsImportBookEntry>;
    readonly existingAgents: ReadonlyArray<ExistingAgentRow>;
    readonly conflictResolution: AgentsImportConflictResolution;
    readonly targetFolderId: number | null;
    readonly supabase: AgentsImportSupabase;
}): Promise<number> {
    const currentUserIdentity = await resolveCurrentUserIdentity();
    if (!currentUserIdentity?.sessionUser?.isAdmin) {
        throw new UnexpectedError('Agents import reached persistence without an admin session.');
    }

    const collection = await $provideAgentCollectionForServer();
    const folderContext = await createAgentsImportFolderContext({
        supabase: options.supabase,
        userId: currentUserIdentity.userId,
    });
    const nextAgentSortOrderByFolderId = new Map<number | null, number>();
    const knownAgentSourcesByName = createKnownAgentSourcesByName(options.existingAgents);
    let importedCount = 0;

    for (const entry of options.entries) {
        const duplicateState = resolveAgentsImportDuplicateState(entry, knownAgentSourcesByName);
        if (duplicateState === 'SAME_BOOK') {
            continue;
        }
        if (duplicateState === 'DIFFERENT_BOOK' && options.conflictResolution === 'SKIP') {
            continue;
        }

        const folderId = await resolveImportEntryTargetFolderId(folderContext, options.targetFolderId, entry.folderSegments);
        const sortOrder = await resolveNextImportAgentSortOrder({
            userId: currentUserIdentity.userId,
            folderId,
            nextAgentSortOrderByFolderId,
        });

        await createAgentWithDefaultVisibility(collection, entry.source, {
            folderId,
            sortOrder,
            userId: currentUserIdentity.userId,
        });
        importedCount += 1;
        appendKnownAgentSource(knownAgentSourcesByName, entry);
    }

    return importedCount;
}

/**
 * Creates folder lookup state used while recreating ZIP path structure.
 *
 * @param options - Supabase and user context.
 * @returns Mutable folder import context.
 */
async function createAgentsImportFolderContext(options: {
    readonly supabase: AgentsImportSupabase;
    readonly userId: number;
}): Promise<{
    readonly folderByLookupKey: Map<string, ExistingFolderRow>;
    readonly nextFolderSortOrderByParentId: Map<number | null, number>;
    readonly supabase: AgentsImportSupabase;
    readonly userId: number;
}> {
    const folderRows = await loadExistingFolders(options.supabase);
    const folderByLookupKey = new Map<string, ExistingFolderRow>();
    const nextFolderSortOrderByParentId = new Map<number | null, number>();

    for (const folder of folderRows) {
        folderByLookupKey.set(createFolderLookupKey(folder.parentId ?? null, folder.name), folder);
        const parentId = folder.parentId ?? null;
        const nextSortOrder = Math.max(nextFolderSortOrderByParentId.get(parentId) ?? 1, (folder.sortOrder ?? 0) + 1);
        nextFolderSortOrderByParentId.set(parentId, nextSortOrder);
    }

    return {
        folderByLookupKey,
        nextFolderSortOrderByParentId,
        supabase: options.supabase,
        userId: options.userId,
    };
}

/**
 * Resolves or creates the target folder for one imported book entry.
 *
 * @param folderContext - Mutable folder import context.
 * @param targetFolderId - Folder selected in the UI.
 * @param folderSegments - Folder path from the dropped ZIP entry.
 * @returns Persisted folder id or `null` for root.
 */
async function resolveImportEntryTargetFolderId(
    folderContext: Awaited<ReturnType<typeof createAgentsImportFolderContext>>,
    targetFolderId: number | null,
    folderSegments: ReadonlyArray<string>,
): Promise<number | null> {
    let parentId = targetFolderId;

    for (const folderSegment of folderSegments) {
        const lookupKey = createFolderLookupKey(parentId, folderSegment);
        const existingFolder = folderContext.folderByLookupKey.get(lookupKey);

        if (existingFolder) {
            parentId = existingFolder.id;
            continue;
        }

        const createdFolder = await createImportFolder(folderContext, parentId, folderSegment);
        folderContext.folderByLookupKey.set(lookupKey, createdFolder);
        parentId = createdFolder.id;
    }

    return parentId;
}

/**
 * Creates one folder for an imported ZIP path segment.
 *
 * @param folderContext - Mutable folder import context.
 * @param parentId - Parent folder id.
 * @param name - Folder name.
 * @returns Persisted folder row.
 */
async function createImportFolder(
    folderContext: Awaited<ReturnType<typeof createAgentsImportFolderContext>>,
    parentId: number | null,
    name: string,
): Promise<ExistingFolderRow> {
    const folderTable = await $getTableName('AgentFolder');
    const sortOrder = await resolveNextImportFolderSortOrder(folderContext, parentId);
    const insertResult = await folderContext.supabase
        .from(folderTable)
        .insert({
            userId: folderContext.userId,
            name,
            parentId,
            sortOrder,
            icon: null,
            color: null,
            createdAt: new Date().toISOString(),
            updatedAt: null,
        } as never)
        .select('id, name, parentId, sortOrder')
        .maybeSingle();

    if (insertResult.error || !insertResult.data) {
        throw new DatabaseError(
            spaceTrim(
                (block) => `
                    Failed to create folder \`${name}\` while importing agents.

                    ${block(insertResult.error?.message || 'The database did not return the created folder.')}
                `,
            ),
        );
    }

    return insertResult.data as ExistingFolderRow;
}

/**
 * Resolves and increments the next sort order for a newly imported folder.
 *
 * @param folderContext - Mutable folder import context.
 * @param parentId - Parent folder id.
 * @returns Sort order for a new folder.
 */
async function resolveNextImportFolderSortOrder(
    folderContext: Awaited<ReturnType<typeof createAgentsImportFolderContext>>,
    parentId: number | null,
): Promise<number> {
    let nextSortOrder = folderContext.nextFolderSortOrderByParentId.get(parentId);

    if (nextSortOrder === undefined) {
        nextSortOrder = await getNextOwnedFolderSortOrder(folderContext.userId, parentId);
    }

    folderContext.nextFolderSortOrderByParentId.set(parentId, nextSortOrder + 1);
    return nextSortOrder;
}

/**
 * Resolves and increments the next sort order for a newly imported agent.
 *
 * @param options - Sort order lookup context.
 * @returns Sort order for a new agent.
 */
async function resolveNextImportAgentSortOrder(options: {
    readonly userId: number;
    readonly folderId: number | null;
    readonly nextAgentSortOrderByFolderId: Map<number | null, number>;
}): Promise<number> {
    let nextSortOrder = options.nextAgentSortOrderByFolderId.get(options.folderId);

    if (nextSortOrder === undefined) {
        nextSortOrder = await getNextOwnedAgentSortOrder(options.userId, options.folderId);
    }

    options.nextAgentSortOrderByFolderId.set(options.folderId, nextSortOrder + 1);
    return nextSortOrder;
}

/**
 * Loads active agents for duplicate detection.
 *
 * @param supabase - Supabase client.
 * @returns Existing active agents.
 */
async function loadExistingAgents(supabase: AgentsImportSupabase): Promise<Array<ExistingAgentRow>> {
    const agentTable = await $getTableName('Agent');
    const result = await supabase
        .from(agentTable)
        .select('agentName, agentSource')
        .is('deletedAt', null);

    if (result.error) {
        throw new DatabaseError(
            spaceTrim(
                (block) => `
                    Failed to load existing agents before import.

                    ${block(result.error.message)}
                `,
            ),
        );
    }

    return (result.data || []) as ExistingAgentRow[];
}

/**
 * Loads active folders for recreating ZIP folder paths.
 *
 * @param supabase - Supabase client.
 * @returns Existing active folders.
 */
async function loadExistingFolders(supabase: AgentsImportSupabase): Promise<Array<ExistingFolderRow>> {
    const folderTable = await $getTableName('AgentFolder');
    const result = await supabase
        .from(folderTable)
        .select('id, name, parentId, sortOrder')
        .is('deletedAt', null);

    if (result.error) {
        throw new DatabaseError(
            spaceTrim(
                (block) => `
                    Failed to load existing folders before import.

                    ${block(result.error.message)}
                `,
            ),
        );
    }

    return (result.data || []) as ExistingFolderRow[];
}

/**
 * Ensures the requested drop target folder still exists.
 *
 * @param supabase - Supabase client.
 * @param targetFolderId - Target folder id from the UI.
 */
async function ensureImportTargetFolderExists(supabase: AgentsImportSupabase, targetFolderId: number | null): Promise<void> {
    if (targetFolderId === null) {
        return;
    }

    const folderTable = await $getTableName('AgentFolder');
    const result = await supabase
        .from(folderTable)
        .select('id')
        .eq('id', targetFolderId)
        .is('deletedAt', null)
        .maybeSingle();

    if (result.error) {
        throw new DatabaseError(
            spaceTrim(
                (block) => `
                    Failed to validate target folder before import.

                    ${block(result.error.message)}
                `,
            ),
        );
    }

    if (!result.data) {
        throw new ParseError(`Target folder \`${targetFolderId}\` was not found.`);
    }
}

/**
 * Creates duplicate conflicts for entries whose agent name already exists with different source.
 *
 * @param entries - Parsed import entries.
 * @param existingAgents - Existing active agents.
 * @returns Conflicts that require a user decision.
 */
function createAgentsImportConflicts(
    entries: ReadonlyArray<AgentsImportBookEntry>,
    existingAgents: ReadonlyArray<ExistingAgentRow>,
): Array<AgentsImportConflict> {
    const knownAgentSourcesByName = createKnownAgentSourcesByName(existingAgents);
    const conflicts: AgentsImportConflict[] = [];

    for (const entry of entries) {
        const matchingAgentSources = knownAgentSourcesByName.get(entry.agentName) || [];
        const isSameBookAlreadyPresent = matchingAgentSources.includes(entry.normalizedAgentSource);

        if (matchingAgentSources.length === 0) {
            appendKnownAgentSource(knownAgentSourcesByName, entry);
            continue;
        }

        if (isSameBookAlreadyPresent) {
            continue;
        }

        conflicts.push({
            agentName: entry.agentName,
            path: entry.path,
            existingDifferentBookCount: matchingAgentSources.length,
        });
        appendKnownAgentSource(knownAgentSourcesByName, entry);
    }

    return conflicts;
}

/**
 * Resolves duplicate state for one import entry against existing agents.
 *
 * @param entry - Parsed import entry.
 * @param knownAgentSourcesByName - Known normalized sources keyed by agent name.
 * @returns Duplicate state for the import entry.
 */
function resolveAgentsImportDuplicateState(
    entry: AgentsImportBookEntry,
    knownAgentSourcesByName: ReadonlyMap<string, ReadonlyArray<string>>,
): 'NONE' | 'SAME_BOOK' | 'DIFFERENT_BOOK' {
    const matchingAgentSources = knownAgentSourcesByName.get(entry.agentName) || [];
    if (matchingAgentSources.length === 0) {
        return 'NONE';
    }

    const isSameBookAlreadyPresent = matchingAgentSources.includes(entry.normalizedAgentSource);

    return isSameBookAlreadyPresent ? 'SAME_BOOK' : 'DIFFERENT_BOOK';
}

/**
 * Builds known normalized source lookup from existing agents.
 *
 * @param existingAgents - Existing active agents.
 * @returns Known sources keyed by agent name.
 */
function createKnownAgentSourcesByName(existingAgents: ReadonlyArray<ExistingAgentRow>): Map<string, string[]> {
    const knownAgentSourcesByName = new Map<string, string[]>();

    for (const agent of existingAgents) {
        const knownSources = knownAgentSourcesByName.get(agent.agentName) || [];
        knownSources.push(normalizeAgentSourceForComparison(agent.agentSource as string_book));
        knownAgentSourcesByName.set(agent.agentName, knownSources);
    }

    return knownAgentSourcesByName;
}

/**
 * Adds one imported entry to the known source lookup.
 *
 * @param knownAgentSourcesByName - Mutable known source lookup.
 * @param entry - Imported entry.
 */
function appendKnownAgentSource(
    knownAgentSourcesByName: Map<string, string[]>,
    entry: Pick<AgentsImportBookEntry, 'agentName' | 'normalizedAgentSource'>,
): void {
    const knownSources = knownAgentSourcesByName.get(entry.agentName) || [];
    knownSources.push(entry.normalizedAgentSource);
    knownAgentSourcesByName.set(entry.agentName, knownSources);
}

/**
 * Creates one parsed import entry from a book source string.
 *
 * @param path - Original file path.
 * @param folderSegments - Folder path segments from ZIP structure.
 * @param source - Raw book source.
 * @returns Parsed import entry.
 */
function createAgentsImportBookEntry(
    path: string,
    folderSegments: ReadonlyArray<string>,
    source: string,
): AgentsImportBookEntry {
    const agentSource = source as string_book;
    const preparedAgentSource = prepareAgentSourceForPersistence(agentSource);
    const agentName = preparedAgentSource.agentProfile.agentName?.trim();

    if (!agentName) {
        throw new ParseError(
            spaceTrim(`
                Book file \`${path}\` does not contain an agent name.

                The first line of the book must define the agent name.
            `),
        );
    }

    return {
        path,
        folderSegments: folderSegments.map(normalizeImportedFolderName),
        source: agentSource,
        agentName,
        normalizedAgentSource: normalizeAgentSourceForComparison(agentSource),
    };
}

/**
 * Normalizes agent source before comparing same-book duplicates.
 *
 * @param agentSource - Raw or persisted agent source.
 * @returns Normalized source for equality checks.
 */
function normalizeAgentSourceForComparison(agentSource: string_book): string {
    return prepareAgentSourceForPersistence(agentSource).agentSource.replace(/\r\n/g, '\n');
}

/**
 * Decodes uploaded file content as UTF-8 text.
 *
 * @param content - Binary file content.
 * @returns Decoded text content.
 */
function decodeImportFileContent(content: AgentsImportFile['content']): string {
    return new TextDecoder().decode(toUint8Array(content));
}

/**
 * Converts supported binary inputs into a `Uint8Array`.
 *
 * @param content - Binary file content.
 * @returns Byte array.
 */
function toUint8Array(content: AgentsImportFile['content']): Uint8Array {
    return content instanceof Uint8Array ? content : new Uint8Array(content);
}

/**
 * Checks whether a path points to a book file.
 *
 * @param path - File path.
 * @returns `true` for `.book` files.
 */
function isBookFilePath(path: string): boolean {
    return path.toLowerCase().endsWith(BOOK_FILE_EXTENSION);
}

/**
 * Checks whether a path points to a ZIP archive.
 *
 * @param path - File path.
 * @returns `true` for `.zip` files.
 */
function isZipFilePath(path: string): boolean {
    return path.toLowerCase().endsWith(ZIP_FILE_EXTENSION);
}

/**
 * Normalizes a ZIP entry path to POSIX-style relative path.
 *
 * @param path - Raw ZIP entry path.
 * @returns Normalized ZIP entry path.
 */
function normalizeImportedZipPath(path: string): string {
    return path.replace(/\\/g, '/').replace(/^\/+/g, '');
}

/**
 * Splits and validates a book path from inside a ZIP archive.
 *
 * @param path - Normalized ZIP entry path.
 * @returns Folder and file path segments.
 */
function resolveImportedBookPathSegments(path: string): string[] {
    const segments = path.split('/').filter((segment) => segment.length > 0);

    if (segments.length === 0 || segments.some((segment) => segment === '.' || segment === '..')) {
        throw new ParseError(`Invalid book path \`${path}\` in agents ZIP archive.`);
    }

    return segments;
}

/**
 * Normalizes one imported folder segment before storing it as a folder name.
 *
 * @param folderName - Raw folder path segment.
 * @returns Folder name safe for Agents Server folders.
 */
function normalizeImportedFolderName(folderName: string): string {
    const normalizedFolderName = folderName.trim();

    if (!normalizedFolderName || normalizedFolderName.includes('/')) {
        throw new ParseError(`Invalid folder name \`${folderName}\` in agents import.`);
    }

    return normalizedFolderName;
}

/**
 * Builds a composite folder lookup key.
 *
 * @param parentId - Parent folder id.
 * @param name - Folder name.
 * @returns Stable lookup key.
 */
function createFolderLookupKey(parentId: number | null, name: string): string {
    return `${parentId ?? 'root'}${FOLDER_LOOKUP_KEY_SEPARATOR}${name}`;
}
