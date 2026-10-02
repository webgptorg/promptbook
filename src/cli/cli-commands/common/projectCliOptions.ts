import type { Command } from 'commander';
import { constants } from 'fs';
import { access, realpath, stat } from 'fs/promises';
import { resolve } from 'path';
import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import { spaceTrim } from '../../../utils/organization/spaceTrim';

/**
 * Optional project selection shared by workspace actions, independently of Book and harness selection.
 * @private internal CLI options
 */
export type ProjectCliOptions = { readonly path?: string };

/**
 * Registers project selection without capturing a directory during command registration.
 * @private internal CLI registration helper
 */
export function addProjectPathOption(command: Command): void {
    command.option('--path <directory>', 'Project directory (default: invocation current directory); relative paths start there');
}

/**
 * Registers additional context independently of primary-agent selection.
 * @private internal CLI registration helper
 */
export function addProjectContextOption(command: Command): void {
    command.option(
        '--context <context-or-file>',
        'Additional instructions (default: project AGENTS.md); inline text or a project-relative file replaces the default; an empty value disables it',
    );
}

/**
 * Captures an invocation's directory at action time. No process-global state is changed.
 * @private internal CLI normalization helper
 */
export function normalizeProjectCliOptions(
    options: ProjectCliOptions,
    invocationDirectory = process.cwd(),
): { readonly projectDirectory: string } {
    const selectedPath = options.path;
    if (selectedPath !== undefined && !selectedPath.trim()) {
        throw new EnvironmentMismatchError(spaceTrim('Pass a non-empty project directory in `--path`, or omit it to use the current directory.'));
    }
    return { projectDirectory: resolve(invocationDirectory, selectedPath ?? '.') };
}

/**
 * Validates the selected directory before any setup writes, without selecting an enclosing Git root.
 * @private shared project resolution for CLI services
 */
export async function resolveProjectDirectory(projectDirectory: string): Promise<string> {
    const requestedPath = resolve(projectDirectory);
    try {
        const projectPath = await realpath(requestedPath);
        if (!(await stat(projectPath)).isDirectory()) {
            throw new EnvironmentMismatchError(spaceTrim(`Project path \`${requestedPath}\` is not a directory.`));
        }
        await access(projectPath, constants.R_OK | constants.X_OK);
        return projectPath;
    } catch (error) {
        throw new EnvironmentMismatchError(spaceTrim(`
            Cannot access project directory \`${requestedPath}\`.
            Check that it exists, is a directory, and is readable and searchable; correct \`--path\` before retrying.

            ${error instanceof Error ? error.message : String(error)}
        `));
    }
}

// Note: [💞] Shared project registration and resolution helpers.
