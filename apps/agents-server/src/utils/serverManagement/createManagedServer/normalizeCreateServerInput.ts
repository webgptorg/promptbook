import { spaceTrim } from 'spacetrim';
import { DatabaseError } from '../../../../../../src/errors/DatabaseError';
import { buildServerTablePrefix } from '../../buildServerTablePrefix';
import type { ServerEnvironment } from '../../serverRegistry';
import { ManagedServerInputNormalizer, type NormalizedServerSeedUser } from '../ManagedServerInputNormalizer';
import type { CreateServerInput } from '../createManagedServer';
import { buildServerMetadataSeedEntries, type ServerMetadataSeedEntry } from './buildServerMetadataSeedEntries';

/**
 * Normalized create-server payload ready for bootstrap.
 *
 * @private type of createManagedServer
 */
export type NormalizedCreateServerInput = {
    /**
     * Friendly unique server name.
     */
    readonly name: string;

    /**
     * Stable identifier used for the derived table prefix.
     */
    readonly identifier: string;

    /**
     * Environment group used by migrations and operations.
     */
    readonly environment: ServerEnvironment;

    /**
     * Normalized public domain.
     */
    readonly domain: string;

    /**
     * Validated server table prefix.
     */
    readonly tablePrefix: string;

    /**
     * Optional uploaded server icon URL.
     */
    readonly iconUrl: string | null;

    /**
     * Users inserted during bootstrap.
     */
    readonly users: ReadonlyArray<NormalizedServerSeedUser>;

    /**
     * Initial metadata rows inserted during bootstrap.
     */
    readonly metadataEntries: ReadonlyArray<ServerMetadataSeedEntry>;
};

/**
 * Normalizes and validates the create-server payload.
 *
 * @param input - Raw API payload.
 * @returns Validated payload ready for transactional bootstrap.
 *
 * @private function of createManagedServer
 */
export function normalizeCreateServerInput(input: CreateServerInput): NormalizedCreateServerInput {
    const name = ManagedServerInputNormalizer.normalizeNonEmptyText(input.name, 'name');
    const identifier = ManagedServerInputNormalizer.normalizeServerIdentifier(input.identifier);
    const tablePrefix = ManagedServerInputNormalizer.validateServerTablePrefix(input.tablePrefix);
    const expectedTablePrefix = buildServerTablePrefix(identifier);

    if (tablePrefix !== expectedTablePrefix) {
        throw new DatabaseError(
            spaceTrim(`
                Table prefix \`${tablePrefix}\` does not match identifier \`${identifier}\`.

                Expected \`${expectedTablePrefix}\`.
            `),
        );
    }

    const language = ManagedServerInputNormalizer.normalizeNonEmptyText(input.initialSettings.language, 'initialSettings.language');
    const iconUrl = ManagedServerInputNormalizer.normalizeOptionalText(input.iconUrl);
    const users = [
        ManagedServerInputNormalizer.normalizeSeedUser(input.adminUser, 'admin user', true),
        ...(input.additionalUsers || []).map((user, index) =>
            ManagedServerInputNormalizer.normalizeSeedUser(user, `additional user ${index + 1}`, false),
        ),
    ];

    ManagedServerInputNormalizer.assertUniqueSeedUsernames(users);

    return {
        name,
        identifier,
        environment: ManagedServerInputNormalizer.normalizeServerEnvironment(input.environment),
        domain: ManagedServerInputNormalizer.normalizeRequiredServerDomain(input.domain),
        tablePrefix,
        iconUrl,
        users,
        metadataEntries: buildServerMetadataSeedEntries({
            name,
            language,
            homepageMessage: ManagedServerInputNormalizer.normalizeOptionalText(input.initialSettings.homepageMessage) || '',
            iconUrl,
            initialSettings: input.initialSettings,
        }),
    };
}
