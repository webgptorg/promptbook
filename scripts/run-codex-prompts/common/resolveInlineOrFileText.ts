import { readFile, stat } from 'fs/promises';
import { isAbsolute, resolve } from 'path';
import { NotFoundError } from '../../../src/errors/NotFoundError';
import { NotAllowed } from '../../../src/errors/NotAllowed';
import { spaceTrim } from '../../../src/utils/organization/spaceTrim';

/**
 * Options for resolving a CLI value that can be either inline text or a file path.
 */
type ResolveInlineOrFileTextOptions = {
    readonly textReference: string | undefined;
    readonly currentWorkingDirectory: string;
    readonly contextLabel: string;
    readonly optionName: string;
    /** Reject missing values that unambiguously look like paths instead of sending them as prose. */
    readonly isMissingFileAnError?: boolean;
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
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
            return undefined;
        }
        if (['ENAMETOOLONG', 'EINVAL', 'ERR_INVALID_ARG_VALUE'].includes(error.code || '') && !isContextFileReference(normalizedTextReference)) {
            return undefined;
        }
        throw contextReadError(options, textPath, error);
    });

    if (!textPathStats) {
        if (options.isMissingFileAnError && isContextFileReference(normalizedTextReference)) {
            throw new NotFoundError(spaceTrim(`
                ${options.contextLabel} file \`${textPath}\` does not exist.
                Correct the file path in \`${options.optionName}\` or pass inline instructions.
            `));
        }
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

    return readFile(textPath, 'utf-8').catch((error: NodeJS.ErrnoException) => {
        throw contextReadError(options, textPath, error);
    });
}

/** Distinguishes explicit file spellings from ordinary inline instructions, including native Windows paths. */
function isContextFileReference(reference: string): boolean {
    return isAbsolute(reference) || /^(?:\.{1,2}[/\\]|[a-z]:[/\\]|\\\\)/iu.test(reference) ||
        (!/[\r\n]/u.test(reference) && /\.(?:md|markdown|txt|book|json|ya?ml)$/iu.test(reference)) ||
        (!/\s/u.test(reference) && /[/\\]/u.test(reference) && !/^[a-z]+:\/\//iu.test(reference));
}

/** Adds the selected path and recovery guidance to filesystem failures. */
function contextReadError(options: ResolveInlineOrFileTextOptions, path: string, error: Error): NotAllowed {
    return new NotAllowed(spaceTrim(`
        Cannot read ${options.contextLabel.toLowerCase()} file \`${path}\`: ${error.message}
        Check file permissions and the path in \`${options.optionName}\`.
    `));
}
