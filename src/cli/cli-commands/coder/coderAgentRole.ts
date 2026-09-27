import { CODER_DEVELOPER_AGENT_FILE_PATH } from './ensureCoderDeveloperAgentFile';
import { CODER_PLANNER_AGENT_FILE_PATH } from './ensureCoderRoleAgentFile';

/**
 * Project-owned Book defaults for execution roles, independent of harness and model selection.
 * Commands without an execution role, such as `coder list`, have no default Book filter.
 *
 * @private internal constant of `ptbk coder`
 */
export const CODER_DEFAULT_AGENT_BOOK_PATHS = {
    developer: CODER_DEVELOPER_AGENT_FILE_PATH,
    planner: CODER_PLANNER_AGENT_FILE_PATH,
} as const;

/**
 * Execution role whose editable local Book is selected when `--agent` is omitted.
 *
 * @private internal type of `ptbk coder`
 */
export type CoderAgentRole = keyof typeof CODER_DEFAULT_AGENT_BOOK_PATHS;

// Note: [💞] Ignore a discrepancy between file name and exported helper names
