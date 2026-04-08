import type { string_sha256 } from './string_sha256';

/**
 * Semantic helper
 *
 * For example `"b126926439c5fcb83609888a11283723c1ef137c0ad599a77a1be81812bd221d"`
 *
 * @private internal utility of `string_agent_name.ts`
 */
export type string_agent_hash_private = string_sha256;

// <- TODO: [🧠] Maybe only first X characters of SHA-256
