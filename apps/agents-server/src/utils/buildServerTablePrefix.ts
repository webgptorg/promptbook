/**
 * Identifier pattern accepted by the create-server wizard.
 *
 * @private Shared helper constant for same-instance server identifiers.
 */
const SERVER_IDENTIFIER_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Derives the canonical table prefix for one safe server identifier.
 *
 * @param identifier - Safe slug entered in the create-server wizard.
 * @returns Table prefix such as `server_MyServer_`.
 */
export function buildServerTablePrefix(identifier: string): string {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    if (!SERVER_IDENTIFIER_PATTERN.test(normalizedIdentifier)) {
        throw new Error('Server identifier must contain only lowercase letters, numbers, and hyphens.');
    }

    const pascalCaseIdentifier = normalizedIdentifier
        .split('-')
        .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
        .join('');

    return `server_${pascalCaseIdentifier}_`;
}
