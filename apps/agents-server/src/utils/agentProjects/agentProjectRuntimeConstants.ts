/**
 * Host used for local project runtimes.
 */
export const AGENT_PROJECT_RUNTIME_HOST = '127.0.0.1';

/**
 * Command used to run a project that declares an npm `dev` script.
 */
export const AGENT_PROJECT_RUNTIME_DEFAULT_DEV_COMMAND = 'npm run dev';

/**
 * Time spent waiting for a freshly spawned dev command to start listening.
 */
export const AGENT_PROJECT_RUNTIME_START_TIMEOUT_MS = 15_000;

/**
 * Polling interval while waiting for a freshly spawned dev command to bind its port.
 */
export const AGENT_PROJECT_RUNTIME_START_POLL_INTERVAL_MS = 250;

/**
 * Maximum time spent waiting for a terminated runtime port to close.
 */
export const AGENT_PROJECT_RUNTIME_STOP_TIMEOUT_MS = 5_000;

/**
 * Polling interval while waiting for a terminated runtime port to close.
 */
export const AGENT_PROJECT_RUNTIME_STOP_POLL_INTERVAL_MS = 100;

/**
 * Environment variable containing the local Agents Server origin for local agent runners.
 */
export const PTBK_AGENTS_SERVER_URL_ENV = 'PTBK_AGENTS_SERVER_URL';

/**
 * Environment variable containing the internal worker token for local agent runners.
 */
export const PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN_ENV = 'PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN';

/**
 * Header used by internal local-runner routes.
 */
export const USER_CHAT_WORKER_TOKEN_HEADER = 'x-user-chat-worker-token';

/**
 * Header emitted by the project-runtime auth route with the approved local runtime port.
 */
export const AGENT_PROJECT_RUNTIME_AUTH_RESPONSE_PORT_HEADER = 'X-Promptbook-Agent-Project-Port';
