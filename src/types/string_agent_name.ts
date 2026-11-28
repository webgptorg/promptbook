import type { string_agent_hash_private } from './string_agent_hash_private';
import type { string_agent_name_in_book_private } from './string_agent_name_in_book_private';
import type { string_agent_name_private } from './string_agent_name_private';
import type { string_agent_permanent_id_private } from './string_agent_permanent_id_private';

/**
 * Semantic helper
 *
 * For example `"My AI Assistant"`
 *
 * TODO: !!!! Brand the type
 */
export type string_agent_name = string_agent_name_private;

/**
 * Semantic helper
 *
 * For example `"My AI Assistant"`
 */
export type string_agent_name_in_book = string_agent_name_in_book_private;

/**
 * Semantic helper
 *
 * For example `"b126926439c5fcb83609888a11283723c1ef137c0ad599a77a1be81812bd221d"`
 */
export type string_agent_hash = string_agent_hash_private;

/**
 * Semantic helper
 *
 * For example `"3mJr7AoUXx2Wqd"`
 *
 * TODO: !!!! Brand the type
 */
export type string_agent_permanent_id = string_agent_permanent_id_private;
