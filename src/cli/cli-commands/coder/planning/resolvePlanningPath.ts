import { lstatSync, realpathSync } from 'fs';
import { isAbsolute, join, relative, resolve } from 'path';
import { NotAllowed } from '../../../../errors/NotAllowed';
import { spaceTrim } from '../../../../utils/organization/spaceTrim';

/** Control characters cannot be model-supplied filesystem path components. */
const FIRST_PRINTABLE_CHARACTER_CODE = 32;

/** Windows devices are not ordinary files, including when they carry a Markdown extension. */
const WINDOWS_DEVICE_NAME_PATTERN = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu;

/** Repository guidance is never an editable PRD, even when stored alongside the queue. */
const PLANNING_CONTEXT_FILE_NAMES = new Set(['agents.md', 'claude.md', 'gemini.md', 'readme.md', 'skill.md']);

/**
 * Resolves a repository path without traversing symlinks, junctions, device paths, or parent escapes.
 * Writes additionally require an ordinary, singly linked PRD Markdown file in the active prompts directory.
 * The queue loader reads only this directory; archives, templates and reusable context remain read-only.
 * @private internal execution boundary of `coder plan`
 */
export function resolvePlanningPath(projectPath: string, path: string, isWriting = false): string {
    const root = realpathSync(projectPath);
    const normalizedPath = path.replace(/\\/gu, '/');
    if (isAbsolute(path) || normalizedPath.includes(':') || normalizedPath.split('/').includes('..')) {
        throw new NotAllowed(spaceTrim(`Planning path \`${path}\` must stay inside the project.`));
    }
    const segments = normalizedPath.split('/').filter((part) => part && part !== '.');
    if (
        segments.some(
            (part) =>
                part.startsWith('.') ||
                WINDOWS_DEVICE_NAME_PATTERN.test(part) ||
                (isWriting && /[$`%[\]]/u.test(part)) ||
                /[<>"|?*]/u.test(part) ||
                [...part].some((character) => character.charCodeAt(0) < FIRST_PRINTABLE_CHARACTER_CODE) ||
                /[. ]$/u.test(part),
        )
    ) {
        throw new NotAllowed(spaceTrim(`Planning cannot access hidden or special path \`${path}\`.`));
    }
    if (
        isWriting &&
        (segments[0] !== 'prompts' ||
            segments.length !== 2 ||
            !path.toLowerCase().endsWith('.md') ||
            PLANNING_CONTEXT_FILE_NAMES.has(segments[1]!.toLowerCase()))
    ) {
        throw new NotAllowed(spaceTrim(`Planning can only author PRD Markdown files in \`prompts/\`: \`${path}\`.`));
    }
    let current = root;
    for (const [index, segment] of segments.entries()) {
        current = join(current, segment);
        try {
            const stats = lstatSync(current);
            if (
                stats.isSymbolicLink() ||
                (!stats.isDirectory() && !stats.isFile()) ||
                (isWriting && stats.isFile() && stats.nlink !== 1)
            ) {
                throw new NotAllowed(spaceTrim(`Planning refuses linked or special path \`${path}\`.`));
            }
            if (relative(root, realpathSync(current)).startsWith('..')) {
                throw new NotAllowed(spaceTrim(`Planning path \`${path}\` escapes the project.`));
            }
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT' || index !== segments.length - 1 || !isWriting) {
                throw error;
            }
        }
    }
    return resolve(current);
}
