import { constants as filesystemConstants } from 'fs';
import { access, readFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import { resolveVpsEnvironmentFilePath } from '../vpsConfiguration';
import { resolveVpsSelfUpdateEnvironment, type VpsSelfUpdateEnvironmentOption } from './vpsSelfUpdateEnvironment';

/**
 * Reads the currently configured standalone VPS self-update environment from `.env`.
 *
 * @returns Canonical environment metadata.
 *
 * @private function of `vpsSelfUpdate`
 */
export async function readCurrentVpsSelfUpdateEnvironment(): Promise<VpsSelfUpdateEnvironmentOption> {
    const configuredBranch = await readVpsSelfUpdateConfiguredEnvironmentValue('PROMPTBOOK_REPOSITORY_REF');
    return resolveVpsSelfUpdateEnvironment(configuredBranch);
}

/**
 * Reads one configured `.env` value from the standalone VPS installation.
 *
 * @param key - Environment variable name.
 * @returns Stored value or `null`.
 *
 * @private function of `vpsSelfUpdate`
 */
export async function readVpsSelfUpdateConfiguredEnvironmentValue(key: string): Promise<string | null> {
    try {
        const environmentFileContent = await readFile(resolveVpsEnvironmentFilePath(), 'utf-8');

        for (const line of environmentFileContent.split(/\r?\n/u)) {
            const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/u);
            if (!match || match[1] !== key) {
                continue;
            }

            const rawValue = match[2]?.trim() || '';
            if (
                (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
                (rawValue.startsWith("'") && rawValue.endsWith("'"))
            ) {
                return rawValue.slice(1, -1);
            }

            return rawValue;
        }
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return process.env[key]?.trim() || null;
        }
        throw error;
    }

    return process.env[key]?.trim() || null;
}

/**
 * Resolves the managed Promptbook repository directory.
 *
 * @returns Absolute path or `null` when it cannot be determined.
 *
 * @private function of `vpsSelfUpdate`
 */
export async function resolveManagedPromptbookRepositoryDirectory(): Promise<string | null> {
    const configuredDirectory =
        (await readVpsSelfUpdateConfiguredEnvironmentValue('PTBK_REPOSITORY_DIR')) ||
        process.env.PTBK_REPOSITORY_DIR?.trim() ||
        '';

    if (configuredDirectory) {
        return resolve(configuredDirectory);
    }

    const fallbackDirectory = resolve(dirname(resolveVpsEnvironmentFilePath()), 'repository');
    try {
        await access(fallbackDirectory, filesystemConstants.R_OK);
        return fallbackDirectory;
    } catch {
        return null;
    }
}
