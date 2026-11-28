import { cache } from 'react';
import { getMetadata } from '../database/getMetadata';
import {
    DEFAULT_SERVER_VISIBILITY,
    parseServerVisibility,
    SERVER_VISIBILITY_METADATA_KEY,
    type ServerVisibility,
} from './serverVisibility';

/**
 * Parses one optional environment-level server visibility value.
 *
 * @param value - Raw environment value.
 * @returns Parsed visibility when provided, otherwise `null`.
 */
function parseEnvironmentServerVisibility(value: unknown): ServerVisibility | null {
    if (typeof value !== 'string' || value.trim() === '') {
        return null;
    }

    return parseServerVisibility(value);
}

/**
 * Loads server visibility once per request.
 *
 * Environment variable `SERVER_VISIBILITY` takes precedence when explicitly set.
 *
 * @returns Effective server visibility.
 */
const getCachedServerVisibility = cache(async (): Promise<ServerVisibility> => {
    const visibilityFromEnvironment = parseEnvironmentServerVisibility(process.env.SERVER_VISIBILITY);
    if (visibilityFromEnvironment) {
        return visibilityFromEnvironment;
    }

    return parseServerVisibility(await getMetadata(SERVER_VISIBILITY_METADATA_KEY), DEFAULT_SERVER_VISIBILITY);
});

/**
 * Resolves effective server visibility for the current request.
 *
 * @returns Effective server visibility.
 */
export async function getServerVisibility(): Promise<ServerVisibility> {
    return getCachedServerVisibility();
}
