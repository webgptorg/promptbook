import { join } from 'path';

// Note: [💞] Ignore a discrepancy between file name and entity name

/**
 * Relative path to the local agent source used by the agent folder convention.
 *
 * @public exported from `@promptbook/node`
 */
export const AGENT_BOOK_FILE_PATH = 'agent.book';

/**
 * Relative path to the message queue root used by the agent folder convention.
 *
 * @public exported from `@promptbook/node`
 */
export const AGENT_MESSAGES_DIRECTORY_PATH = 'messages';

/**
 * Relative path to queued user messages consumed by the agent runner.
 *
 * @public exported from `@promptbook/node`
 */
export const AGENT_QUEUED_MESSAGES_DIRECTORY_PATH = join(AGENT_MESSAGES_DIRECTORY_PATH, 'queued');

/**
 * Relative path to answered messages written by the agent runner.
 *
 * @public exported from `@promptbook/node`
 */
export const AGENT_FINISHED_MESSAGES_DIRECTORY_PATH = join(AGENT_MESSAGES_DIRECTORY_PATH, 'finished');

/**
 * Relative path to messages that the agent runner stopped retrying.
 *
 * @public exported from `@promptbook/node`
 */
export const AGENT_FAILED_MESSAGES_DIRECTORY_PATH = join(AGENT_MESSAGES_DIRECTORY_PATH, 'failed');

/**
 * Relative path to the agent-owned projects root used by the agent folder convention.
 *
 * Each direct child directory is one project — an isolated folder the agent fully controls
 * (files, scripts, optionally its own git repository).
 *
 * @private internal constant of the agent folder convention, used by agent runners and the Agents Server
 */
export const AGENT_PROJECTS_DIRECTORY_PATH = 'projects';
