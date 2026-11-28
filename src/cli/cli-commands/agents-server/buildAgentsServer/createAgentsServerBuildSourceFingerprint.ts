import { createHash, type Hash } from 'crypto';
import { readFile, readdir, stat } from 'fs/promises';
import { join, resolve } from 'path';
import { getAgentsServerBuildInputRelativePaths } from './getAgentsServerBuildInputRelativePaths';
import { isExcludedAgentsServerBuildInputPath } from './isExcludedAgentsServerBuildInputPath';
import { normalizeAgentsServerBuildInputPath } from './normalizeAgentsServerBuildInputPath';

/**
 * Fingerprints all runtime source paths that can affect the local Agents Server build.
 *
 * @private internal utility of `buildAgentsServer`
 */
export async function createAgentsServerBuildSourceFingerprint(appPath: string): Promise<string> {
    const runtimeRootPath = resolve(appPath, '..', '..');
    const fingerprint = createHash('sha256');

    for (const relativeInputPath of getAgentsServerBuildInputRelativePaths()) {
        await addAgentsServerBuildInputToFingerprint(fingerprint, {
            inputPath: join(runtimeRootPath, relativeInputPath),
            runtimeRootPath,
        });
    }

    return fingerprint.digest('hex');
}

/**
 * Adds one runtime source file or directory subtree to the production build fingerprint.
 */
async function addAgentsServerBuildInputToFingerprint(
    fingerprint: Hash,
    options: {
        readonly inputPath: string;
        readonly runtimeRootPath: string;
    },
): Promise<void> {
    if (isExcludedAgentsServerBuildInputPath(options.inputPath, options.runtimeRootPath)) {
        return;
    }

    let inputStats;

    try {
        inputStats = await stat(options.inputPath);
    } catch {
        fingerprint.update(
            `missing:${normalizeAgentsServerBuildInputPath(options.runtimeRootPath, options.inputPath)}\n`,
        );
        return;
    }

    if (inputStats.isFile()) {
        fingerprint.update(`file:${normalizeAgentsServerBuildInputPath(options.runtimeRootPath, options.inputPath)}\n`);
        fingerprint.update(await readFile(options.inputPath));
        fingerprint.update('\n');
        return;
    }

    if (!inputStats.isDirectory()) {
        return;
    }

    fingerprint.update(
        `directory:${normalizeAgentsServerBuildInputPath(options.runtimeRootPath, options.inputPath)}\n`,
    );
    const inputDirents = await readdir(options.inputPath, { withFileTypes: true });
    const sortedInputDirents = [...inputDirents].sort((left, right) => left.name.localeCompare(right.name));

    for (const inputDirent of sortedInputDirents) {
        await addAgentsServerBuildInputToFingerprint(fingerprint, {
            inputPath: join(options.inputPath, inputDirent.name),
            runtimeRootPath: options.runtimeRootPath,
        });
    }
}
