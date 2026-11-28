import { readFile } from 'fs/promises';
import { join } from 'path';
import { UnexpectedError } from '../../../../../src/errors/UnexpectedError';
import { spaceTrim } from '../../../../../src/utils/organization/spaceTrim';
import { isMissingPathError } from './isMissingPathError';

/**
 * File name of the npm manifest that can declare a project dev script.
 */
const AGENT_PROJECT_PACKAGE_JSON_FILENAME = 'package.json';

/**
 * Returns whether an agent project declares a non-empty npm `dev` script.
 *
 * Missing or malformed manifests deliberately resolve to `false`, allowing the
 * project runtime to use the static-server fallback.
 *
 * @param projectPath - Absolute path of the project directory.
 * @returns Whether the project should be started as a dev server.
 */
export async function hasAgentProjectDevScript(projectPath: string): Promise<boolean> {
    const packageJsonPath = join(projectPath, AGENT_PROJECT_PACKAGE_JSON_FILENAME);
    let packageJsonContent: string;

    try {
        packageJsonContent = await readFile(packageJsonPath, 'utf-8');
    } catch (error) {
        if (isMissingPathError(error)) {
            return false;
        }

        throw new UnexpectedError(
            spaceTrim(`
                Failed to read project package manifest.

                **Package manifest:** \`${packageJsonPath}\`
                **Cause:** \`${error instanceof Error ? error.message : String(error)}\`
            `),
        );
    }

    try {
        return hasDevScript(JSON.parse(packageJsonContent));
    } catch {
        return false;
    }
}

/**
 * Checks whether parsed package metadata contains a non-empty `scripts.dev` value.
 *
 * @param packageJson - Parsed package manifest value.
 * @returns Whether the package declares a dev script.
 */
function hasDevScript(packageJson: unknown): boolean {
    if (!packageJson || typeof packageJson !== 'object' || Array.isArray(packageJson)) {
        return false;
    }

    const scripts = (packageJson as { readonly scripts?: unknown }).scripts;

    if (!scripts || typeof scripts !== 'object' || Array.isArray(scripts)) {
        return false;
    }

    const devScript = (scripts as { readonly dev?: unknown }).dev;
    return typeof devScript === 'string' && Boolean(devScript.trim());
}
