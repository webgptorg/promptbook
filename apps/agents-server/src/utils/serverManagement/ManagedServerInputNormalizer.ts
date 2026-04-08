import { spaceTrim } from 'spacetrim';
import { ConflictError } from '../../../../../src/errors/ConflictError';
import { DatabaseError } from '../../../../../src/errors/DatabaseError';
import { buildServerTablePrefix } from '../buildServerTablePrefix';
import {
    isServerEnvironment,
    normalizeServerDomain,
    type ServerEnvironment,
} from '../serverRegistry';

const SERVER_TABLE_PREFIX_PATTERN = /^[A-Za-z][A-Za-z0-9_]*_$/;

/**
 * Normalized user row inserted during bootstrap.
 *
 * @private type of serverManagement
 */
export type NormalizedServerSeedUser = {
    /**
     * Username stored in the spawned server.
     */
    readonly username: string;

    /**
     * Plain-text password validated before hashing.
     */
    readonly password: string;

    /**
     * Whether the user should be created as an admin.
     */
    readonly isAdmin: boolean;
};

/**
 * Shared validation helpers for managed-server create/update payloads.
 *
 * @private utility of serverManagement
 */
export class ManagedServerInputNormalizer {
    /**
     * Normalizes a required text field.
     *
     * @param value - Raw field value.
     * @param fieldName - Human-readable field name for diagnostics.
     * @returns Trimmed non-empty text.
     */
    public static normalizeNonEmptyText(value: string, fieldName: string): string {
        const normalizedValue = typeof value === 'string' ? value.trim() : '';

        if (normalizedValue === '') {
            throw new DatabaseError(
                spaceTrim(`
                    Field \`${fieldName}\` is required.
                `),
            );
        }

        return normalizedValue;
    }

    /**
     * Normalizes an optional text field.
     *
     * @param value - Raw field value.
     * @returns Trimmed text or `null` when empty.
     */
    public static normalizeOptionalText(value: string | null | undefined): string | null {
        if (typeof value !== 'string') {
            return null;
        }

        const normalizedValue = value.trim();
        return normalizedValue === '' ? null : normalizedValue;
    }

    /**
     * Validates a create-server identifier.
     *
     * @param identifier - Raw identifier from the wizard.
     * @returns Normalized safe identifier.
     */
    public static normalizeServerIdentifier(identifier: string): string {
        const normalizedIdentifier = this.normalizeNonEmptyText(identifier, 'identifier').toLowerCase();

        try {
            buildServerTablePrefix(normalizedIdentifier);
        } catch {
            throw new DatabaseError(
                spaceTrim(`
                    Field \`identifier\` must contain only lowercase letters, numbers, and hyphens.

                    Example: \`support-eu\`
                `),
            );
        }

        return normalizedIdentifier;
    }

    /**
     * Validates a manual table prefix.
     *
     * @param tablePrefix - Raw prefix value.
     * @returns Trimmed validated table prefix.
     */
    public static validateServerTablePrefix(tablePrefix: string): string {
        const normalizedTablePrefix = this.normalizeNonEmptyText(tablePrefix, 'tablePrefix');

        if (!SERVER_TABLE_PREFIX_PATTERN.test(normalizedTablePrefix)) {
            throw new DatabaseError(
                spaceTrim(`
                    Field \`tablePrefix\` must start with a letter, contain only letters, numbers, and underscores, and end with an underscore.

                    Example: \`server_MyServer_\`
                `),
            );
        }

        return normalizedTablePrefix;
    }

    /**
     * Validates and normalizes one server environment value.
     *
     * @param environment - Raw environment value.
     * @returns Normalized supported environment.
     */
    public static normalizeServerEnvironment(environment: string): ServerEnvironment {
        const normalizedEnvironment = typeof environment === 'string' ? environment.trim().toUpperCase() : '';

        if (!isServerEnvironment(normalizedEnvironment)) {
            throw new DatabaseError(
                spaceTrim(`
                    Field \`environment\` must be one of \`PRODUCTION\`, \`PREVIEW\`, \`LTS\` or \`LIVE\`.
                `),
            );
        }

        return normalizedEnvironment;
    }

    /**
     * Validates and normalizes one required server domain.
     *
     * @param domain - Raw domain value.
     * @returns Normalized host or `host:port`.
     */
    public static normalizeRequiredServerDomain(domain: string): string {
        const normalizedDomain = normalizeServerDomain(this.normalizeNonEmptyText(domain, 'domain'));

        if (!normalizedDomain) {
            throw new DatabaseError(
                spaceTrim(`
                    Field \`domain\` must contain a valid host or URL-like domain string.
                `),
            );
        }

        return normalizedDomain;
    }

    /**
     * Normalizes one seed user entered in the create-server wizard.
     *
     * @param user - Raw user row.
     * @param label - Human-readable label for diagnostics.
     * @param forceAdmin - When true, the user is always created as an admin.
     * @returns Normalized seed user.
     */
    public static normalizeSeedUser(
        user: {
            readonly username: string;
            readonly password: string;
            readonly isAdmin?: boolean;
        },
        label: string,
        forceAdmin: boolean,
    ): NormalizedServerSeedUser {
        return {
            username: this.normalizeNonEmptyText(user.username, `${label}.username`),
            password: this.normalizeNonEmptyText(user.password, `${label}.password`),
            isAdmin: forceAdmin || user.isAdmin === true,
        };
    }

    /**
     * Ensures the bootstrap user list does not contain duplicate usernames and includes an admin.
     *
     * @param users - Normalized seed users.
     */
    public static assertUniqueSeedUsernames(users: ReadonlyArray<NormalizedServerSeedUser>): void {
        const seenUsernames = new Set<string>();
        let hasAdmin = false;

        for (const user of users) {
            const normalizedKey = user.username.toLowerCase();

            if (seenUsernames.has(normalizedKey)) {
                throw new ConflictError(
                    spaceTrim(`
                        Duplicate bootstrap username \`${user.username}\` is not allowed.
                    `),
                );
            }

            seenUsernames.add(normalizedKey);
            hasAdmin = hasAdmin || user.isAdmin;
        }

        if (!hasAdmin) {
            throw new DatabaseError(
                spaceTrim(`
                    At least one bootstrap user must have admin access.
                `),
            );
        }
    }
}
