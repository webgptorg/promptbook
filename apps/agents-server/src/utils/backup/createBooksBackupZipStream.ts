import JSZip from 'jszip';
import { $getTableName } from '../../database/$getTableName';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '../../database/schema';
import { sanitizeBackupPathSegment } from './sanitizeBackupPathSegment';

/**
 * Agent row fields required to build the books backup.
 */
type BackupAgentRow = Pick<
    AgentsServerDatabase['public']['Tables']['Agent']['Row'],
    'id' | 'agentName' | 'agentSource' | 'folderId' | 'sortOrder'
>;

/**
 * Folder row fields required to reconstruct the UI folder tree.
 */
type BackupFolderRow = Pick<AgentsServerDatabase['public']['Tables']['AgentFolder']['Row'], 'id' | 'name' | 'parentId' | 'sortOrder'>;

/**
 * Backups root folder prefix used inside and outside of the ZIP archive.
 */
const BACKUP_ROOT_PREFIX = 'promptbook-backup-';

/**
 * Extension used for exported book files.
 */
const BOOK_FILE_EXTENSION = '.book';

/**
 * Fallback folder label used when a folder name sanitizes to an empty value.
 */
const DEFAULT_FOLDER_SEGMENT = 'Unnamed folder';

/**
 * Fallback book filename base used when an agent name sanitizes to an empty value.
 */
const DEFAULT_BOOK_FILENAME_BASE = 'Unnamed book';

/**
 * Ordering helper for sibling folders.
 *
 * @param left - First folder.
 * @param right - Second folder.
 * @returns Stable order matching UI sorting and deterministic tie-breaks.
 */
function compareFolders(left: BackupFolderRow, right: BackupFolderRow): number {
    if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
    }

    return left.id - right.id;
}

/**
 * Orders agents deterministically for stable ZIP outputs.
 *
 * @param left - First agent.
 * @param right - Second agent.
 * @param leftFolderPath - Precomputed folder path string for first agent.
 * @param rightFolderPath - Precomputed folder path string for second agent.
 * @returns Sort order for deterministic archive entry generation.
 */
function compareAgents(
    left: BackupAgentRow,
    right: BackupAgentRow,
    leftFolderPath: string,
    rightFolderPath: string,
): number {
    if (leftFolderPath !== rightFolderPath) {
        return leftFolderPath.localeCompare(rightFolderPath);
    }

    if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
    }

    if (left.agentName !== right.agentName) {
        return left.agentName.localeCompare(right.agentName);
    }

    return left.id - right.id;
}

/**
 * Output payload needed by the API route to stream one ZIP file.
 */
export type BooksBackupZipStream = {
    /**
     * Suggested output filename for the download response.
     */
    readonly filename: string;
    /**
     * Node stream with ZIP bytes.
     */
    readonly stream: NodeJS.ReadableStream;
};

/**
 * Builds a download-ready stream with all books organized by the Agents Server folder tree.
 *
 * Uses canonical persisted `Agent.agentSource` values and resolves folder/file collisions
 * deterministically so backups remain stable and human-readable.
 *
 * @returns ZIP filename and stream payload.
 */
export async function createBooksBackupZipStream(): Promise<BooksBackupZipStream> {
    const supabase = $provideSupabaseForServer();
    const agentTable = await $getTableName('Agent');
    const folderTable = await $getTableName('AgentFolder');

    const [agentsResult, foldersResult] = await Promise.all([
        supabase.from(agentTable).select('id,agentName,agentSource,folderId,sortOrder'),
        supabase.from(folderTable).select('id,name,parentId,sortOrder'),
    ]);

    if (agentsResult.error) {
        throw new Error(`Unable to load books backup agents: ${agentsResult.error.message}`);
    }

    if (foldersResult.error) {
        throw new Error(`Unable to load books backup folders: ${foldersResult.error.message}`);
    }

    const agents = (agentsResult.data || []) as BackupAgentRow[];
    const folders = (foldersResult.data || []) as BackupFolderRow[];
    const folderSegmentById = buildFolderSegmentById(folders);
    const resolveFolderPath = createFolderPathResolver(folders, folderSegmentById);
    const backupRootFolderName = `${BACKUP_ROOT_PREFIX}${new Date().toISOString().slice(0, 10)}`;
    const zip = new JSZip();

    // Keep the root directory explicit even when there are no agents.
    zip.folder(backupRootFolderName);

    const relativeFilePaths = new Set<string>();
    const folderPathByAgentId = new Map<number, string>();

    for (const agent of agents) {
        const folderPath = resolveFolderPath(agent.folderId ?? null).join('/');
        folderPathByAgentId.set(agent.id, folderPath);
    }

    const sortedAgents = [...agents].sort((left, right) =>
        compareAgents(
            left,
            right,
            folderPathByAgentId.get(left.id) || '',
            folderPathByAgentId.get(right.id) || '',
        ),
    );

    for (const agent of sortedAgents) {
        const folderSegments = resolveFolderPath(agent.folderId ?? null);
        const initialBookFilename = createInitialBookFilename(agent);
        const relativePath = createUniqueBookRelativePath(relativeFilePaths, folderSegments, initialBookFilename, agent.id);
        zip.file(`${backupRootFolderName}/${relativePath}`, agent.agentSource || '');
    }

    const stream = zip.generateNodeStream({
        streamFiles: true,
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
    });

    return {
        filename: `${backupRootFolderName}.zip`,
        stream,
    };
}

/**
 * Creates a sibling-safe sanitized folder segment table.
 *
 * @param folders - All folder rows.
 * @returns Map of folder id to filesystem-safe folder segment.
 */
function buildFolderSegmentById(folders: ReadonlyArray<BackupFolderRow>): Map<number, string> {
    const foldersByParentId = new Map<number | null, BackupFolderRow[]>();

    for (const folder of folders) {
        const parentId = folder.parentId ?? null;
        const siblings = foldersByParentId.get(parentId) || [];
        siblings.push(folder);
        foldersByParentId.set(parentId, siblings);
    }

    const result = new Map<number, string>();

    for (const siblings of foldersByParentId.values()) {
        const sortedSiblings = [...siblings].sort(compareFolders);
        const siblingRecords = sortedSiblings.map((folder) => {
            const segment = sanitizeBackupPathSegment(folder.name, `${DEFAULT_FOLDER_SEGMENT} ${folder.id}`);
            return { folder, segment };
        });
        const sameSegmentCounts = new Map<string, number>();

        for (const record of siblingRecords) {
            const currentCount = sameSegmentCounts.get(record.segment) || 0;
            sameSegmentCounts.set(record.segment, currentCount + 1);
        }

        for (const record of siblingRecords) {
            const isCollision = (sameSegmentCounts.get(record.segment) || 0) > 1;
            result.set(record.folder.id, isCollision ? `${record.segment}--folder-${record.folder.id}` : record.segment);
        }
    }

    return result;
}

/**
 * Creates a folder-path resolver with caching and cycle protection.
 *
 * @param folders - All folder rows.
 * @param folderSegmentById - Precomputed safe segment for each folder id.
 * @returns Function resolving folder ids to root-to-leaf path segments.
 */
function createFolderPathResolver(
    folders: ReadonlyArray<BackupFolderRow>,
    folderSegmentById: ReadonlyMap<number, string>,
): (folderId: number | null) => string[] {
    const folderById = new Map<number, BackupFolderRow>(folders.map((folder) => [folder.id, folder]));
    const cache = new Map<number, string[]>();

    /**
     * Recursively resolves one folder id into root-to-leaf path segments.
     *
     * @param folderId - Folder id assigned to the agent.
     * @param stack - Current recursion stack for cycle detection.
     * @returns Safe folder path segments.
     */
    const resolveFolderPath = (folderId: number | null, stack: Set<number>): string[] => {
        if (folderId === null) {
            return [];
        }

        const cached = cache.get(folderId);
        if (cached) {
            return cached;
        }

        if (stack.has(folderId)) {
            return [`folder-${folderId}`];
        }

        const folder = folderById.get(folderId);
        if (!folder) {
            return [];
        }

        const nextStack = new Set(stack);
        nextStack.add(folderId);

        const parentSegments = resolveFolderPath(folder.parentId ?? null, nextStack);
        const folderSegment = folderSegmentById.get(folderId) || `folder-${folderId}`;
        const resolvedPath = [...parentSegments, folderSegment];

        cache.set(folderId, resolvedPath);
        return resolvedPath;
    };

    return (folderId: number | null): string[] => resolveFolderPath(folderId, new Set<number>());
}

/**
 * Builds the default filename for one book entry before collision handling.
 *
 * @param agent - Agent row used for naming.
 * @returns Safe filename intended for the ZIP path.
 */
function createInitialBookFilename(agent: BackupAgentRow): string {
    const safeBase = sanitizeBackupPathSegment(agent.agentName, `${DEFAULT_BOOK_FILENAME_BASE} ${agent.id}`);
    return safeBase.endsWith(BOOK_FILE_EXTENSION) ? safeBase : `${safeBase}${BOOK_FILE_EXTENSION}`;
}

/**
 * Creates a unique relative ZIP path for a book, with deterministic collision suffixes.
 *
 * @param usedRelativePaths - Already allocated paths in the archive.
 * @param folderSegments - Resolved folder path segments.
 * @param filename - Initial filename candidate.
 * @param agentId - Numeric agent id used for deterministic collision suffix.
 * @returns Unique relative path (`folders/.../book.book`).
 */
function createUniqueBookRelativePath(
    usedRelativePaths: Set<string>,
    folderSegments: ReadonlyArray<string>,
    filename: string,
    agentId: number,
): string {
    const buildPath = (candidateFilename: string): string => {
        return folderSegments.length === 0 ? candidateFilename : `${folderSegments.join('/')}/${candidateFilename}`;
    };

    const initialPath = buildPath(filename);
    if (!usedRelativePaths.has(initialPath)) {
        usedRelativePaths.add(initialPath);
        return initialPath;
    }

    const extensionIndex = filename.lastIndexOf('.');
    const hasExtension = extensionIndex > 0;
    const filenameBase = hasExtension ? filename.slice(0, extensionIndex) : filename;
    const extension = hasExtension ? filename.slice(extensionIndex) : '';

    for (let suffixIndex = 0; suffixIndex < Number.MAX_SAFE_INTEGER; suffixIndex += 1) {
        const suffix = suffixIndex === 0 ? `--book-${agentId}` : `--book-${agentId}-${suffixIndex + 1}`;
        const nextPath = buildPath(`${filenameBase}${suffix}${extension}`);

        if (!usedRelativePaths.has(nextPath)) {
            usedRelativePaths.add(nextPath);
            return nextPath;
        }
    }

    throw new Error(`Unable to allocate unique backup path for agent ${agentId}.`);
}
