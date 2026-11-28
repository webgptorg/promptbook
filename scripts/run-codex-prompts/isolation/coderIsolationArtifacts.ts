import { chmod, copyFile, lstat, mkdir } from 'fs/promises';
import { dirname, relative, resolve } from 'path';
import { $runWorkspaceGit } from '../../../src/cli/cli-commands/common/workspaceRepository';
import { buildCoderExecutionArtifactPaths } from '../common/runGoScript/buildCoderExecutionArtifactPaths';
import type { CoderCommitScope } from '../git/coderCommitScope';
import { CoderGitOperationError } from '../git/CoderGitOperationError';
import { assertCoderRegularWriterPath } from '../git/coderFinalizationFiles';
import {
    CODER_FILE_PERMISSIONS_MASK,
    assertCoderDeltaIsOwned,
    readCoderTree,
    readCoderWorkingFileHashes,
} from '../git/coderRepositorySnapshot';
import { buildScriptPath } from '../prompts/buildScriptPath';
import type { PromptSelection } from '../prompts/types/PromptSelection';

/** Original artifact content, checked before isolated writers run or publish into supported durable locations. */
export type CoderIsolationArtifactBoundary = {
    readonly repositoryRoot: string;
    readonly objectFormat: string;
    readonly paths: ReadonlyArray<string>;
    readonly hashes: ReadonlyMap<string, string>;
};

/** Captures even ignored original logs and refuses pre-existing staged/unstaged artifacts before execution. */
export async function captureCoderIsolationArtifacts(
    scope: CoderCommitScope,
    selection: PromptSelection,
): Promise<CoderIsolationArtifactBoundary | undefined> {
    if (!scope.repositorySnapshot) return undefined;
    const repositoryRoot = scope.repositorySnapshot.repositoryRoot;
    const paths = buildCoderExecutionArtifactPaths(
        buildScriptPath(selection.file, selection.section, scope.projectPath),
    ).map((path) => relative(repositoryRoot, path).replace(/\\/gu, '/'));
    const originalHead = scope.repositorySnapshot.head
        ? await readCoderTree(repositoryRoot, scope.repositorySnapshot.head)
        : new Map();
    assertCoderDeltaIsOwned(scope.repositorySnapshot, paths, originalHead);
    for (const path of paths) await assertCoderRegularWriterPath(repositoryRoot, resolve(repositoryRoot, path));
    const objectFormat = (await $runWorkspaceGit(repositoryRoot, ['rev-parse', '--show-object-format'])).trim();
    return {
        repositoryRoot,
        paths,
        objectFormat,
        hashes: await readCoderWorkingFileHashes(repositoryRoot, paths, objectFormat),
    };
}

/**
 * Eligible artifacts travel in the execution commits and integration. Ignored or failed-round artifacts are
 * copied back into their existing durable locations before cleanup; unexpected original edits are retained.
 */
export async function preserveCoderIsolationArtifacts(
    boundary: CoderIsolationArtifactBoundary | undefined,
    executionRoot: string,
): Promise<void> {
    if (!boundary) return;
    const executionHashes = await readCoderWorkingFileHashes(executionRoot, boundary.paths, boundary.objectFormat);
    const currentHashes = await readCoderWorkingFileHashes(
        boundary.repositoryRoot,
        boundary.paths,
        boundary.objectFormat,
    );
    for (const path of boundary.paths) {
        const resultHash = executionHashes.get(path);
        if (!resultHash || resultHash === currentHashes.get(path)) continue;
        if (currentHashes.get(path) !== boundary.hashes.get(path)) {
            throw new CoderGitOperationError(
                'record',
                `The original execution artifact \`${path}\` changed concurrently. Its content and the isolated copy were retained.`,
            );
        }
        const source = resolve(executionRoot, path);
        const destination = resolve(boundary.repositoryRoot, path);
        await assertCoderRegularWriterPath(boundary.repositoryRoot, destination);
        const details = await lstat(source);
        if (!details.isFile())
            throw new CoderGitOperationError(
                'record',
                `Cannot safely retain non-regular execution artifact \`${path}\`. The isolated copy was kept.`,
            );
        await mkdir(dirname(destination), { recursive: true });
        await copyFile(source, destination);
        await chmod(destination, details.mode & CODER_FILE_PERMISSIONS_MASK);
    }
    const retainedHashes = await readCoderWorkingFileHashes(
        boundary.repositoryRoot,
        boundary.paths,
        boundary.objectFormat,
    );
    if ([...executionHashes].some(([path, hash]) => retainedHashes.get(path) !== hash)) {
        throw new CoderGitOperationError(
            'record',
            'Isolated execution artifacts changed while being retained. Both locations were kept for inspection.',
        );
    }
}
