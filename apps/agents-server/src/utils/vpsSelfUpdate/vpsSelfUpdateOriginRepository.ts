import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname } from 'path';
import { NotAllowed } from '../../../../../src/errors/NotAllowed';
import { spaceTrim } from 'spacetrim';
import { resolveVpsEnvironmentFilePath } from '../vpsConfiguration';
import { readVpsSelfUpdateConfiguredEnvironmentValue } from './vpsSelfUpdateConfiguration';

/**
 * Default upstream repository URL used when no custom origin is configured.
 *
 * @private constant of `vpsSelfUpdate`
 */
export const VPS_SELF_UPDATE_DEFAULT_ORIGIN_REPOSITORY_URL = 'https://github.com/webgptorg/promptbook.git';

/**
 * Validates a user-provided upstream repository URL.
 *
 * @param value - Raw URL string.
 * @returns Normalized URL or `null` when the user did not request an override.
 *
 * @private function of `vpsSelfUpdate`
 */
export function normalizeVpsSelfUpdateOriginRepositoryUrl(value: string | null | undefined): string | null {
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

/**
 * Reads the configured upstream repository URL from `.env` (falling back to the default upstream).
 *
 * @returns Configured upstream URL.
 *
 * @private function of `vpsSelfUpdate`
 */
export async function readConfiguredVpsSelfUpdateOriginRepositoryUrl(): Promise<string> {
    const configuredUrl = await readVpsSelfUpdateConfiguredEnvironmentValue('PROMPTBOOK_REPOSITORY_URL');
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
    const environmentFilePath = resolveVpsEnvironmentFilePath();
    let existingContent = '';
    try {
        existingContent = await readFile(environmentFilePath, 'utf-8');
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
    await mkdir(dirname(environmentFilePath), { recursive: true });
    await writeFile(environmentFilePath, nextContent, { encoding: 'utf-8', mode: 0o600 });
    process.env.PROMPTBOOK_REPOSITORY_URL = isDefaultUpstream ? '' : originRepositoryUrl;
}
