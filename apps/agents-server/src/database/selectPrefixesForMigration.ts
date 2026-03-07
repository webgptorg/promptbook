/**
 * Selects prefixes to migrate and validates `onlyPrefixes` filter.
 *
 * @param configuredPrefixes Prefixes configured for migration.
 * @param onlyPrefixes Optional filter from CLI.
 * @returns Prefixes selected for this run.
 * @private function of runDatabaseMigrations
 */
export function selectPrefixesForMigration(
    configuredPrefixes: ReadonlyArray<string>,
    onlyPrefixes: ReadonlyArray<string> | null | undefined,
): Array<string> {
    const normalizedConfiguredPrefixes = configuredPrefixes
        .map((prefix) => prefix.trim())
        .filter((prefix) => prefix !== '');

    if (onlyPrefixes === null || onlyPrefixes === undefined) {
        return [...normalizedConfiguredPrefixes];
    }

    const normalizedOnlyPrefixes = onlyPrefixes.map((prefix) => prefix.trim()).filter((prefix) => prefix !== '');
    const invalidPrefixes = normalizedOnlyPrefixes.filter((prefix) => !normalizedConfiguredPrefixes.includes(prefix));
    if (invalidPrefixes.length > 0) {
        throw new Error(
            `❌ Invalid prefixes specified in --only: ${invalidPrefixes.join(
                ', ',
            )}. Available prefixes: ${normalizedConfiguredPrefixes.join(', ')}`,
        );
    }

    return normalizedOnlyPrefixes;
}
