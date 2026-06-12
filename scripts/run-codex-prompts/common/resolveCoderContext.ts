import { resolveInlineOrFileText } from './resolveInlineOrFileText';

/**
 * Resolves optional coding context provided inline or via a file path.
 */
export async function resolveCoderContext(
    contextReference: string | undefined,
    currentWorkingDirectory: string,
): Promise<string | undefined> {
    return resolveInlineOrFileText({
        textReference: contextReference,
        currentWorkingDirectory,
        contextLabel: 'Coding context',
        optionName: '--context',
    });
}
