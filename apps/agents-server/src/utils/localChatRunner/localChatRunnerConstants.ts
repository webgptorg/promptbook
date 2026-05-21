/**
 * Provider marker stored on UserChatJob rows handled by the local coding-agent runner.
 */
export const LOCAL_USER_CHAT_JOB_PROVIDER = 'local-agent-runner';

/**
 * Reserved UserChatJob.parameters key used for local runner metadata.
 */
export const LOCAL_USER_CHAT_JOB_PARAMETERS_KEY = '__promptbookLocalRunner';

/**
 * Environment variable containing the absolute local folder root watched by `ptbk agents-server start`.
 */
export const PTBK_AGENTS_SERVER_AGENT_ROOT_ENV = 'PTBK_AGENTS_SERVER_AGENT_ROOT';

/**
 * Expected maximum delay between a local message queue write and runner output.
 */
export const LOCAL_USER_CHAT_JOB_ANSWER_TIMEOUT_MS = 30 * 60_000;
