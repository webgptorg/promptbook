import { readFile, stat } from 'fs/promises';
import { resolve } from 'path';
import { NotFoundError } from '../../../src/errors/NotFoundError';
import { spaceTrim } from '../../../src/utils/organization/spaceTrim';

/**
 * Options for resolving a CLI value that can be either inline text or a file path.
 */
type ResolveInlineOrFileTextOptions = {
    readonly textReference: string | undefined;
    readonly currentWorkingDirectory: string;
    readonly contextLabel: string;
    readonly optionName: string;
};

/**
 * Resolves optional CLI text provided inline or via a file path.
 */
export async function resolveInlineOrFileText(
    options: ResolveInlineOrFileTextOptions,
): Promise<string | undefined> {
    const normalizedTextReference = options.textReference?.trim();
    if (!normalizedTextReference) {
        return undefined;
    }

    const textPath = resolve(options.currentWorkingDirectory, normalizedTextReference);
    const textPathStats = await stat(textPath).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') {
            return undefined;
        }
        throw error;
    });

    if (!textPathStats) {
        return normalizedTextReference;
    }

    if (!textPathStats.isFile()) {
        throw new NotFoundError(
            spaceTrim(`
                ${options.contextLabel} path \`${normalizedTextReference}\` exists but it is not a file.

                Pass a file path or inline text in \`${options.optionName}\`.
            `),
        );
    }

    return readFile(textPath, 'utf-8');
}

