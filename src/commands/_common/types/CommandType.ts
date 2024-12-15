import type { Command } from './Command';

/**
 * Command is one piece of the book file section which adds some logic to the task or the whole pipeline.
 * It is parsed from the markdown from ul/ol items - one command per one item.
 *
 * This is a type of the command like "KNOWLEDGE" or "PERSONA"
 */
export type CommandType = Command['type'];

/**
 * Command is one piece of the book file section which adds some logic to the task or the whole pipeline.
 * It is parsed from the markdown from ul/ol items - one command per one item.
 *
 * This is a type of the command like "KNOWLEDGE" or "PERSONA"
 *
export type CommandTypeOrAlias = Command['type'] | Command['aliasNames'] | Command['deprecatedNames'];
// <- TODO: [🧘] Implement
*/
