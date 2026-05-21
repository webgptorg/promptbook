/**
 * AgentExternals type used to link one agent to its runner git repository.
 */
export const EXTERNAL_AGENT_REPOSITORY_TYPE = 'AGENT_RUNNER_GIT_REPOSITORY';

/**
 * Vendor stored in AgentExternals for runner repositories.
 */
export const EXTERNAL_AGENT_REPOSITORY_VENDOR = 'github';

/**
 * Provider marker stored on UserChatJob rows handled by coding-agent runner folders.
 */
export const EXTERNAL_USER_CHAT_JOB_PROVIDER = 'coding-agent-runner';

/**
 * Legacy provider marker stored by the retired GitHub runner backend.
 */
export const LEGACY_EXTERNAL_USER_CHAT_JOB_PROVIDER = 'github-agent-runner';

/**
 * Reserved UserChatJob.parameters key used for coding-agent runner metadata.
 */
export const EXTERNAL_USER_CHAT_JOB_PARAMETERS_KEY = '__promptbookExternalRunner';

/**
 * Expected maximum delay between queue commit and finished/failed runner output.
 */
export const EXTERNAL_USER_CHAT_JOB_ANSWER_TIMEOUT_MS = 5 * 60_000;

/**
 * Timeout for individual GitHub API requests issued by the Agents Server.
 */
export const EXTERNAL_CHAT_RUNNER_GITHUB_REQUEST_TIMEOUT_MS = 12_000;
