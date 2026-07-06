import { constants as filesystemConstants } from 'fs';
import { access, mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import { spaceTrim } from 'spacetrim';
import { NotAllowed } from '../../../../../src/errors/NotAllowed';
import { resolveVpsEnvironmentFilePath } from '../vpsConfiguration';
import {
    VPS_SELF_UPDATE_DEFAULT_ORIGIN_REPOSITORY_URL,
    resolveVpsSelfUpdateEnvironment,
    type VpsSelfUpdateEnvironmentOption,
} from './vpsSelfUpdateEnvironments';

/**
 * Reads one configured `.env` value from the standalone VPS installation.
 *
 * @param key - Environment variable name.
 * @returns Stored value or `null`.
 */
async function readConfiguredVpsEnvironmentValue(key: string): Promise<string | null> {
    try {
        const envFileContent = await readFile(resolveVpsEnvironmentFilePath(), 'utf-8');

        for (const line of envFileContent.split(/\r?\n/u)) {
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
 * Reads the currently configured standalone VPS self-update environment from `.env`.
 *
 * @returns Canonical environment metadata.
 *
 * @private function of `vpsSelfUpdate`
 */
export async function readCurrentVpsSelfUpdateEnvironment(): Promise<VpsSelfUpdateEnvironmentOption> {
    const configuredBranch = await readConfiguredVpsEnvironmentValue('PROMPTBOOK_REPOSITORY_REF');
    return resolveVpsSelfUpdateEnvironment(configuredBranch);
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
        (await readConfiguredVpsEnvironmentValue('PTBK_REPOSITORY_DIR')) ||
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

/**
 * Reads the configured upstream repository URL from `.env` (falling back to the default upstream).
 *
 * @returns Configured upstream URL.
 *
 * @private function of `vpsSelfUpdate`
 */
export async function readConfiguredVpsSelfUpdateOriginRepositoryUrl(): Promise<string> {
    const configuredUrl = await readConfiguredVpsEnvironmentValue('PROMPTBOOK_REPOSITORY_URL');
    return configuredUrl?.trim() || VPS_SELF_UPDATE_DEFAULT_ORIGIN_REPOSITORY_URL;
}

/**
 * Persists the configured upstream repository URL into the standalone VPS `.env` file.
 *
 * Setting the value to the default upstream URL removes any previous override so that the
 * installer falls back to the bundled default the next time it runs.
 *
 * @param originRepositoryUrl - Normalized upstream URL.
 *
 * @private function of `vpsSelfUpdate`
 */
export async function persistVpsSelfUpdateOriginRepositoryUrl(originRepositoryUrl: string): Promise<void> {
    const envFilePath = resolveVpsEnvironmentFilePath();
    let existingContent = '';
    try {
        existingContent = await readFile(envFilePath, 'utf-8');
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error;
        }
    }

    const lines = existingContent.split(/\r?\n/u);
    const keyPattern = /^\s*(?:export\s+)?PROMPTBOOK_REPOSITORY_URL=/u;
    const isDefaultUpstream = originRepositoryUrl === VPS_SELF_UPDATE_DEFAULT_ORIGIN_REPOSITORY_URL;
    const filteredLines = lines.filter((line) => !keyPattern.test(line));

    if (!isDefaultUpstream) {
        filteredLines.push(`PROMPTBOOK_REPOSITORY_URL=${originRepositoryUrl}`);
    }

    const nextContent = `${filteredLines.join('\n').replace(/\n+$/u, '')}\n`;
    await mkdir(dirname(envFilePath), { recursive: true });
    await writeFile(envFilePath, nextContent, { encoding: 'utf-8', mode: 0o600 });
    process.env.PROMPTBOOK_REPOSITORY_URL = isDefaultUpstream ? '' : originRepositoryUrl;
}

/**
 * Validates a user-provided upstream repository URL.
 *
 * @param value - Raw URL string.
 * @returns Normalized URL or `null` when the user did not request an override.
 *
 * @private function of `vpsSelfUpdate`
 */
export function normalizeOriginRepositoryUrl(value: string | null | undefined): string | null {
    if (value === null || value === undefined) {
        return null;
    }

    const trimmedValue = value.trim();
    if (!trimmedValue) {
        return null;
    }

    if (!/^https:\/\/[\w.-]+\/[\w./-]+(?:\.git)?$/u.test(trimmedValue)) {
        throw new NotAllowed(
            spaceTrim(`
                The upstream repository URL \`${trimmedValue}\` is not a valid public **https** git URL.
            `),
        );
    }

    return trimmedValue;
}
