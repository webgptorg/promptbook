/**
 * Metadata key controlling which login methods are available on the Agents Server.
 *
 * @public exported from `apps/agents-server`
 */
export const AUTHENTICATION_METHODS_METADATA_KEY = 'AUTHENTICATION_METHODS';

/**
 * Built-in authentication method identifiers accepted by `AUTHENTICATION_METHODS`.
 *
 * @public exported from `apps/agents-server`
 */
export const AUTHENTICATION_METHOD_VALUES = ['PASSWORD', 'SHIBBOLETH'] as const;

/**
 * Built-in authentication method identifier.
 *
 * @public exported from `apps/agents-server`
 */
export type AuthenticationMethod = (typeof AUTHENTICATION_METHOD_VALUES)[number];

/**
 * Default login methods used when metadata is not configured.
 *
 * @public exported from `apps/agents-server`
 */
export const DEFAULT_AUTHENTICATION_METHODS = ['PASSWORD'] as const satisfies ReadonlyArray<AuthenticationMethod>;

/**
 * Default metadata value for `AUTHENTICATION_METHODS`.
 *
 * @public exported from `apps/agents-server`
 */
export const DEFAULT_AUTHENTICATION_METHODS_METADATA_VALUE = DEFAULT_AUTHENTICATION_METHODS.join(',');

/**
 * Parses the comma-separated metadata value into known login methods.
 *
 * @param value - Raw metadata value.
 * @returns Ordered list of enabled methods.
 *
 * @public exported from `apps/agents-server`
 */
export function parseAuthenticationMethods(value: string | null | undefined): ReadonlyArray<AuthenticationMethod> {
    const rawTokens = (value || DEFAULT_AUTHENTICATION_METHODS_METADATA_VALUE)
        .split(/[,\s;]+/u)
        .map((token) => token.trim().toUpperCase())
        .filter(Boolean);
    const methods: AuthenticationMethod[] = [];

    for (const rawToken of rawTokens) {
        if (
            AUTHENTICATION_METHOD_VALUES.includes(rawToken as AuthenticationMethod) &&
            !methods.includes(rawToken as AuthenticationMethod)
        ) {
            methods.push(rawToken as AuthenticationMethod);
        }
    }

    return methods.length > 0 ? methods : [...DEFAULT_AUTHENTICATION_METHODS];
}

/**
 * Checks whether one login method is enabled in the metadata value.
 *
 * @param value - Raw metadata value.
 * @param method - Login method to check.
 * @returns `true` when the method is enabled.
 *
 * @public exported from `apps/agents-server`
 */
export function isAuthenticationMethodEnabled(value: string | null | undefined, method: AuthenticationMethod): boolean {
    return parseAuthenticationMethods(value).includes(method);
}
