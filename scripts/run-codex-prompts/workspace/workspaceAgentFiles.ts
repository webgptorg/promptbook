import { createHash, randomUUID } from 'crypto';
import { mkdir, readFile, readdir, rename, unlink, writeFile } from 'fs/promises';
import { basename, dirname, join, relative, resolve } from 'path';
import { spaceTrim } from 'spacetrim';
import { parseAgentSource } from '../../../src/book-2.0/agent-source/parseAgentSource';
import type { string_book } from '../../../src/book-2.0/agent-source/string_book';
import { ConflictError } from '../../../src/errors/ConflictError';
import { NotAllowed } from '../../../src/errors/NotAllowed';
import { $resolveConfinedProjectPath } from '../../../src/utils/filesystem/$resolveConfinedProjectPath';

/** Versioned identities and organization live beside Books; sources are never duplicated in this manifest. */
export const WORKSPACE_AGENTS_MANIFEST = 'agents/.promptbook.json';
/** One stable source identity, retained as a tombstone when deleted. */
export type WorkspaceAgentFile = {
    readonly id: string;
    readonly path: string;
    readonly hash: string;
    readonly name: string;
    readonly sortOrder: number;
    readonly isDeleted?: boolean;
    readonly error?: string;
};
/** Minimal versioned folder information which cannot be expressed by a directory name alone. */
export type WorkspaceFolder = {
    readonly id: number;
    readonly name: string;
    readonly parentId: number | null;
    readonly sortOrder: number;
    readonly icon?: string | null;
    readonly color?: string | null;
    readonly isDeleted?: boolean;
};
/** File paths express placement; this manifest preserves identities, order, empty folders and appearance. */
export type WorkspaceAgentsManifest = {
    readonly version: 1;
    readonly agents: ReadonlyArray<WorkspaceAgentFile>;
    readonly folders: ReadonlyArray<WorkspaceFolder>;
};

/** A portable content revision used for optimistic saves and external rename detection. */
export function hashWorkspaceSource(source: string): string {
    return createHash('sha256').update(source).digest('hex');
}

/**
 * Confines reads and writes to the selected project's agents directory, refusing every symlink ancestor.
 * Windows device names and Unicode/case aliases are rejected consistently on every supported platform.
 */
export async function resolveConfinedAgentPath(projectPath: string, relativePath: string): Promise<string> {
    return resolveConfinedWorkspacePath(projectPath, relativePath, 'agents');
}

/** Applies the same portable-path and symlink confinement to sources and private runtime artifacts. */
export async function resolveConfinedWorkspacePath(
    projectPath: string,
    relativePath: string,
    directory: 'agents' | '.promptbook' | 'prompts',
): Promise<string> {
    const parts = relativePath.split('/');
    if (parts[0] !== directory || parts.length < 2 || !relativePath) {
        throw new NotAllowed(
            spaceTrim(`Invalid workspace path \`${relativePath}\`. Use portable names inside \`${directory}/\`.`),
        );
    }
    return $resolveConfinedProjectPath(projectPath, relativePath);
}

/** Reads an optional confined file, distinguishing absence from inaccessible content. */
export async function readWorkspaceAgentFile(projectPath: string, path: string): Promise<string | null> {
    return readConfinedWorkspaceFile(projectPath, path, 'agents');
}

/** Reads source or private state only after applying the shared workspace path contract. */
export async function readConfinedWorkspaceFile(
    projectPath: string,
    path: string,
    directory: 'agents' | '.promptbook' | 'prompts',
): Promise<string | null> {
    const absolutePath = await resolveConfinedWorkspacePath(projectPath, path, directory);
    return readFile(absolutePath, 'utf-8').catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return null;
        throw error;
    });
}

/**
 * Replaces one file with an atomic sibling rename after checking the observed revision again.
 * Callers hold the repository lease; comparison also protects against ordinary external-editor saves.
 */
export async function writeWorkspaceAgentFile(
    projectPath: string,
    path: string,
    before: string | null,
    after: string | null,
): Promise<void> {
    return writeConfinedWorkspaceFile(projectPath, path, before, after, 'agents');
}

/** Atomic optimistic write shared by Book saves and supervised PRD status updates. */
export async function writeConfinedWorkspaceFile(
    projectPath: string,
    path: string,
    before: string | null,
    after: string | null,
    directory: 'agents' | '.promptbook' | 'prompts',
): Promise<void> {
    const absolutePath = await resolveConfinedWorkspacePath(projectPath, path, directory);
    if ((await readConfinedWorkspaceFile(projectPath, path, directory)) !== before)
        throw new ConflictError(`\`${path}\` changed since it was read. Reload before saving.`);
    if (after === null) {
        if (before !== null) await unlink(absolutePath);
        return;
    }
    await mkdir(dirname(absolutePath), { recursive: true });
    const temporaryPath = join(dirname(absolutePath), `.${basename(absolutePath)}.${randomUUID()}.tmp`);
    try {
        await writeFile(temporaryPath, after, { flag: 'wx' });
        if ((await readConfinedWorkspaceFile(projectPath, path, directory)) !== before)
            throw new ConflictError(`\`${path}\` changed during the save. Reload before saving.`);
        await rename(temporaryPath, await resolveConfinedWorkspacePath(projectPath, path, directory));
    } finally {
        await unlink(temporaryPath).catch(() => undefined);
    }
}

/** Loads portable Books recursively; invalid definitions stay visible as errors instead of stale executable sources. */
export async function discoverWorkspaceAgentFiles(
    projectPath: string,
): Promise<Array<{ path: string; source?: string_book; hash: string; name: string; error?: string }>> {
    const results: Array<{ path: string; source?: string_book; hash: string; name: string; error?: string }> = [];
    /** Walks only real directories, never following links. */
    async function walk(path: string): Promise<void> {
        const absolutePath = await resolveConfinedAgentPath(projectPath, `${path}/.probe`);
        const entries = await readdir(dirname(absolutePath), { withFileTypes: true }).catch(
            (error: NodeJS.ErrnoException) => {
                if (error.code === 'ENOENT') return [];
                throw error;
            },
        );
        for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
            const entryPath = `${path}/${entry.name}`;
            if (entry.isSymbolicLink()) {
                results.push({
                    path: entryPath,
                    hash: '',
                    name: entry.name,
                    error: 'Symlinked agents and folders are not allowed.',
                });
            } else if (entry.isDirectory() && !entry.name.startsWith('.')) {
                try {
                    await walk(entryPath);
                } catch (error) {
                    results.push({
                        path: entryPath,
                        hash: '',
                        name: entry.name,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.book')) {
                try {
                    const source = (await readWorkspaceAgentFile(projectPath, entryPath))! as string_book;
                    if (!source.trim() || source.includes('\0') || source.includes('@@@'))
                        throw new NotAllowed('Book is empty, unfinished or contains invalid text.');
                    const profile = parseAgentSource(source);
                    results.push({
                        path: entryPath,
                        source,
                        hash: hashWorkspaceSource(source),
                        name: profile.agentName,
                    });
                } catch (error) {
                    results.push({
                        path: entryPath,
                        hash: '',
                        name: entry.name,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }
        }
    }
    await walk('agents');
    const names = new Map<string, number>();
    const identities = new Map<string, number>();
    for (const file of results) {
        names.set(file.name.toLowerCase(), (names.get(file.name.toLowerCase()) ?? 0) + 1);
        const id = file.source && parseAgentSource(file.source).permanentId;
        if (id) identities.set(id, (identities.get(id) ?? 0) + 1);
    }
    return results.map((file) => {
        const id = file.source && parseAgentSource(file.source).permanentId;
        const error =
            names.get(file.name.toLowerCase())! > 1
                ? 'Agent name collides with another Book.'
                : id && identities.get(id)! > 1
                ? 'META ID collides with another Book.'
                : file.error;
        return error ? { ...file, source: undefined, error } : file;
    });
}

/** Computes repository pathspecs while preserving a selected project's subdirectory scope. */
export function repositoryAgentPath(repositoryRoot: string, projectPath: string, path: string): string {
    return relative(repositoryRoot, resolve(projectPath, path)).replace(/\\/gu, '/');
}

// Note: [🟡] Workspace file storage is only published in `@promptbook/cli`.
// Note: [💞] Ignore a discrepancy between file name and exported helper names
