import spaceTrim from 'spacetrim';
import { DatabaseError } from '../../../../src/errors/DatabaseError';
import {
    SERVER_ENVIRONMENT,
    type ServerEnvironment,
    type ServerRecord,
} from '../utils/serverRegistry';

/**
 * Reserved migration target that expands to all production servers.
 */
const MIGRATION_TARGET_PRODUCTION = 'production';

/**
 * Reserved migration target that expands to all preview servers.
 */
const MIGRATION_TARGET_PREVIEW = 'preview';

/**
 * Selects prefixes to migrate and validates `--only` targets.
 *
 * Targets may reference environment groups (`production`, `preview`),
 * registered server names, or raw table prefixes.
 *
 * @param configuredPrefixes - Prefixes available for migration.
 * @param registeredServers - Servers known from the global `_Server` registry.
 * @param onlyTargets - Optional CLI filter.
 * @returns Prefixes selected for this run.
 */
export function selectPrefixesForMigration(
    configuredPrefixes: ReadonlyArray<string>,
    registeredServers: ReadonlyArray<ServerRecord>,
    onlyTargets: ReadonlyArray<string> | null | undefined,
): Array<string> {
    const normalizedConfiguredPrefixes = uniqueStrings(configuredPrefixes.map((prefix) => prefix.trim()));

    if (onlyTargets === null || onlyTargets === undefined) {
        return [...normalizedConfiguredPrefixes];
    }

    const normalizedOnlyTargets = uniqueNonEmptyStrings(onlyTargets);
    const selectedPrefixes: Array<string> = [];
    const invalidTargets: Array<string> = [];

    for (const onlyTarget of normalizedOnlyTargets) {
        const environmentTarget = resolveEnvironmentTarget(onlyTarget);
        if (environmentTarget) {
            const environmentPrefixes = registeredServers
                .filter((server) => server.environment === environmentTarget)
                .map((server) => server.tablePrefix);

            if (environmentPrefixes.length === 0) {
                invalidTargets.push(onlyTarget);
                continue;
            }

            pushUnique(selectedPrefixes, environmentPrefixes);
            continue;
        }

        const matchingServer = registeredServers.find((server) => server.name.toLowerCase() === onlyTarget.toLowerCase());
        if (matchingServer) {
            pushUnique(selectedPrefixes, [matchingServer.tablePrefix]);
            continue;
        }

        if (normalizedConfiguredPrefixes.includes(onlyTarget)) {
            pushUnique(selectedPrefixes, [onlyTarget]);
            continue;
        }

        invalidTargets.push(onlyTarget);
    }

    if (invalidTargets.length > 0) {
        throw new DatabaseError(
            spaceTrim(`
                Invalid migration targets specified in \`--only\`: ${invalidTargets.map((target) => `\`${target}\``).join(', ')}.

                Available groups: \`${MIGRATION_TARGET_PRODUCTION}\`, \`${MIGRATION_TARGET_PREVIEW}\`
                Available servers: ${formatAvailableValues(registeredServers.map((server) => server.name))}
                Available prefixes: ${formatAvailableValues(normalizedConfiguredPrefixes)}
            `),
        );
    }

    return selectedPrefixes;
}

/**
 * Maps one `--only` token to a supported server environment.
 *
 * @param target - Raw CLI target.
 * @returns Matching environment or `null`.
 */
function resolveEnvironmentTarget(target: string): ServerEnvironment | null {
    const normalizedTarget = target.trim().toLowerCase();
    if (normalizedTarget === MIGRATION_TARGET_PRODUCTION) {
        return SERVER_ENVIRONMENT.PRODUCTION;
    }
    if (normalizedTarget === MIGRATION_TARGET_PREVIEW) {
        return SERVER_ENVIRONMENT.PREVIEW;
    }
    return null;
}

/**
 * Returns unique non-empty strings while preserving input order.
 *
 * @param values - Raw string values.
 * @returns Trimmed ordered unique values.
 */
function uniqueNonEmptyStrings(values: ReadonlyArray<string>): Array<string> {
    const result: Array<string> = [];

    for (const value of values) {
        const normalizedValue = value.trim();
        if (!normalizedValue || result.includes(normalizedValue)) {
            continue;
        }
        result.push(normalizedValue);
    }

    return result;
}

/**
 * Returns unique strings while preserving input order.
 *
 * @param values - Raw string values.
 * @returns Ordered unique values.
 */
function uniqueStrings(values: ReadonlyArray<string>): Array<string> {
    const result: Array<string> = [];

    for (const value of values) {
        if (result.includes(value)) {
            continue;
        }
        result.push(value);
    }

    return result;
}

/**
 * Adds values to target array only when they are not already present.
 *
 * @param target - Mutable result array.
 * @param values - Values to append.
 */
function pushUnique(target: Array<string>, values: ReadonlyArray<string>): void {
    for (const value of values) {
        if (!target.includes(value)) {
            target.push(value);
        }
    }
}

/**
 * Formats a list of values for diagnostics.
 *
 * @param values - Available values.
 * @returns Backticked list or fallback placeholder.
 */
function formatAvailableValues(values: ReadonlyArray<string>): string {
    if (values.length === 0) {
        return '_none_';
    }

    return values.map((value) => `\`${value || '<default>'}\``).join(', ');
}
