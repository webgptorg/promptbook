import { lstat, readdir, realpath } from 'fs/promises';
import { join, sep } from 'path';
import { ConflictError } from '../../errors/ConflictError';
import { NotAllowed } from '../../errors/NotAllowed';
import { spaceTrim } from '../organization/spaceTrim';

/**
 * Resolves a portable project-relative path without following symlink ancestors or case aliases.
 * Missing paths remain valid for additive bootstrap and atomic writes. The selected project itself may use
 * a filesystem alias; its real root is resolved once for this check, and every descendant is inspected directly.
 * @private shared confinement for workspace storage and project bootstrap
 */
export async function $resolveConfinedProjectPath(projectPath: string, relativePath: string): Promise<string> {
    const parts = relativePath.split('/');
    if (
        relativePath.includes('\\') ||
        parts.some(
            (part) =>
                !part ||
                part === '.' ||
                part === '..' ||
                part !== part.normalize('NFC') ||
                // eslint-disable-next-line no-control-regex -- Portable paths must explicitly reject control characters.
                /[\x00-\x1f<>:"|?*]/u.test(part) ||
                /[. ]$/u.test(part) ||
                /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(part),
        )
    )
        throw new NotAllowed(
            spaceTrim(`Invalid project path \`${relativePath}\`. Use portable names inside the selected project.`),
        );
    const root = await realpath(projectPath);
    let current = root;
    for (const part of parts) {
        const entries = await readdir(current).catch((error: NodeJS.ErrnoException) => {
            if (error.code === 'ENOENT') return [];
            throw error;
        });
        if (
            entries.some((name) => name.toLocaleLowerCase('en-US') === part.toLocaleLowerCase('en-US') && name !== part)
        )
            throw new ConflictError(`Project path \`${relativePath}\` collides with another path's letter case.`);
        current = join(current, part);
        const information = await lstat(current).catch((error: NodeJS.ErrnoException) => {
            if (error.code === 'ENOENT') return null;
            throw error;
        });
        if (information?.isSymbolicLink())
            throw new NotAllowed(`Symlinks are not permitted in project paths: \`${current}\`.`);
    }
    if (!current.startsWith(root + sep)) throw new NotAllowed('The path escapes the selected project.');
    return current;
}

// Note: [🟢] Filesystem confinement is never published into browser packages.
