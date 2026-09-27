import { lstatSync, realpathSync } from 'fs';
import { isAbsolute, join, relative, resolve } from 'path';
import { NotAllowed } from '../../../../errors/NotAllowed';
import { PROMPTBOOK_TEMPORARY_DIRECTORY } from '../../../../utils/filesystem/promptbookTemporaryPath';
import { spaceTrim } from '../../../../utils/organization/spaceTrim';

/**
 * Keeps host-owned staging and Git runtime directories inside the ordinary Promptbook temporary tree.
 * Missing directories are allowed, but no existing ancestor may redirect subsequent writes through a link.
 * @private internal execution boundary of `coder plan`
 */
export function assertPlanningRuntimePath(projectPath: string, runtimePath: string): void {
    const root = realpathSync(projectPath);
    const path = relative(resolve(projectPath), resolve(runtimePath));
    const segments = path.split(/[\\/]/u);
    if (isAbsolute(path) || segments[0] !== PROMPTBOOK_TEMPORARY_DIRECTORY || segments.includes('..')) {
        throw new NotAllowed(spaceTrim("Planning runtime files must stay in the project's `.promptbook/` directory."));
    }
    let current = root;
    for (const segment of segments) {
        current = join(current, segment);
        try {
            const stats = lstatSync(current);
            if (!stats.isDirectory() || stats.isSymbolicLink()) {
                throw new NotAllowed(
                    spaceTrim(`Planning runtime directory \`${current}\` must not be a link or file.`),
                );
            }
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
            throw error;
        }
    }
}
