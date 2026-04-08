import { readFile, stat } from 'fs/promises';
import { resolve } from 'path';
import { NotFoundError } from '../../../src/errors/NotFoundError';
import { spaceTrim } from '../../../src/utils/organization/spaceTrim';

/**
 * Resolves optional coding context provided inline or via a file path.
 */
export async function resolveCoderContext(
    contextReference: string | undefined,
    currentWorkingDirectory: string,
): Promise<string | undefined> {
    const normalizedContextReference = contextReference?.trim();
    if (!normalizedContextReference) {
        return undefined;
    }

    const contextPath = resolve(currentWorkingDirectory, normalizedContextReference);
    const contextPathStats = await stat(contextPath).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') {
            return undefined;
        }
        throw error;
    });

    if (!contextPathStats) {
        return normalizedContextReference;
    }

    if (!contextPathStats.isFile()) {
        throw new NotFoundError(
            spaceTrim(`
                Coding context path \`${normalizedContextReference}\` exists but it is not a file.

                Pass a file path or inline instructions in \`--context\`.
            `),
        );
    }

    return readFile(contextPath, 'utf-8');
}
