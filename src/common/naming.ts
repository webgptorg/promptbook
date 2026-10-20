/**
 * Comparison key of a fixed system-defined enum value, tolerant to case and separators (`yes-and-fail`,
 * `Yes And Fail` and `YES_AND_FAIL` share the key `YES_AND_FAIL`).
 *
 * @private configuration naming contract
 */
export function enumKey(raw: string): string {
    return raw
        .trim()
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

/**
 * Canonical saved spelling (SCREAMING_SNAKE_CASE) of an internal kebab-case enum value (`yes-and-fail` →
 * `YES_AND_FAIL`, `openai-codex` → `OPENAI_CODEX`).
 *
 * @private configuration naming contract
 */
export function canonicalEnumValue(value: string): string {
    return value.toUpperCase().replace(/-/g, '_');
}

/**
 * Resolves a tolerant spelling to one allowed value (case and separator differences only); `undefined` when the
 * spelling matches no allowed value or is ambiguous.
 *
 * @private configuration naming contract
 */
export function matchEnum<T extends string>(raw: unknown, allowed: readonly T[]): T | undefined {
    if (typeof raw !== 'string' || !raw.trim()) return undefined;
    const exact = allowed.find((value) => value === raw);
    if (exact) return exact;
    const key = enumKey(raw);
    const matches = allowed.filter((value) => enumKey(value) === key);
    return matches.length === 1 ? matches[0] : undefined;
}

/**
 * Pattern of a canonical user-defined configuration identifier (lowercase kebab-case).
 *
 * @private configuration naming contract
 */
export const KEBAB_IDENTIFIER = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Canonical kebab-case identifier of a tolerant spelling (`Work Browser` → `work-browser`, `codex_company` →
 * `codex-company`); `undefined` when nothing usable remains.
 *
 * @private configuration naming contract
 */
export function kebabIdentifier(raw: string): string | undefined {
    const value = raw
        .trim()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return value || undefined;
}

/**
 * Comparison key of a JSON property name, tolerant to case and separators (`is-enabled`, `IsEnabled` and
 * `is_enabled` all compare equal to `isEnabled`).
 *
 * @private configuration naming contract
 */
export function propertyKey(raw: string): string {
    return raw.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Finds the canonical property among known names for a tolerant spelling.
 *
 * @private configuration naming contract
 */
export function matchProperty(raw: string, known: readonly string[]): string | undefined {
    if (known.includes(raw)) return raw;
    const key = propertyKey(raw);
    const matches = known.filter((name) => propertyKey(name) === key);
    return matches.length === 1 ? matches[0] : undefined;
}

/**
 * Pattern of a supported environment-variable name.
 *
 * @private configuration naming contract
 */
export const ENVIRONMENT_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
