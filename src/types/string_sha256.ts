/**
 * Branded type for UUIDs version 4
 * This will not allow to pass some random string where should be only a valid UUID
 *
 * Use utils:
 *   - `randomUuid` to generate
 *   - `isValidUuid  to check validity
 *
 * For example `"5a0a153d-7be9-4018-9eda-e0e2e2b89bd9"`
 * TODO: [🥬] Make some system for hashes and ids of promptbook
 */
export type string_uuid = string & {
    readonly _type: 'uuid' /* <- TODO: [🏟] What is the best shape of the additional object in branded types */;
};

/**
 * Semantic helper
 *
 * For example `"b126926439c5fcb83609888a11283723c1ef137c0ad599a77a1be81812bd221d"`
 */
export type string_sha256 = string;

/**
 * Semantic helper
 *
 * For example `"4JmF3b2J5dGVz"`
 */
export type string_base_58 = string;

/**
 * Semantic helper
 *
 * For example `"4.2.4"`
 */
export type string_semantic_version = string;

/**
 * Semantic helper
 *
 * For example `"^4.2.4"`
 */
export type string_version_dependency = string;

/**
 * Semantic helper
 *
 * For example `"png"`
 */
export type string_file_extension = string;
