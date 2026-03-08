/**
 * Normalizes optional text argument to `string | null`.
 *
 * @private function of UseProjectCommitmentDefinition
 */
export function normalizeOptionalToolText(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

/**
 * Normalizes required text argument and throws when missing.
 *
 * @private function of UseProjectCommitmentDefinition
 */
export function normalizeRequiredToolText(value: unknown, fieldName: string): string {
    const normalized = normalizeOptionalToolText(value);
    if (!normalized) {
        throw new Error(`Tool argument "${fieldName}" is required.`);
    }

    return normalized;
}
