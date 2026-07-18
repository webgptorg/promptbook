/**
 * Host used for browser VS Code project runtimes.
 */
export const AGENT_PROJECT_VSCODE_HOST = '127.0.0.1';

/**
 * Default executable used to start browser VS Code.
 */
export const AGENT_PROJECT_VSCODE_DEFAULT_COMMAND = 'code-server';

/**
 * Optional environment variable overriding the browser VS Code executable.
 */
export const PTBK_AGENT_PROJECT_VSCODE_COMMAND_ENV = 'PTBK_AGENT_PROJECT_VSCODE_COMMAND';

/**
 * Same-origin path prefix proxied by standalone VPS Nginx to project code-server instances.
 */
export const AGENT_PROJECT_VSCODE_PROXY_PATH_PREFIX = '/agent-project-vscode';

/**
 * Request header returned by the Agents Server Nginx auth endpoint with the code-server port to proxy.
 */
export const AGENT_PROJECT_VSCODE_PROXY_PORT_HEADER = 'x-promptbook-agent-project-vscode-port';

/**
 * Request header set by Nginx auth subrequests with the original browser path.
 */
export const AGENT_PROJECT_VSCODE_ORIGINAL_URI_HEADER = 'x-original-uri';

/**
 * Search parameter used to pass the currently resolved Agents Server theme into VS Code.
 */
export const AGENT_PROJECT_VSCODE_THEME_SEARCH_PARAM = 'theme';

/**
 * Time spent waiting for a freshly spawned code-server process to start listening.
 */
export const AGENT_PROJECT_VSCODE_START_TIMEOUT_MS = 30_000;

/**
 * Polling interval while waiting for a freshly spawned code-server process to bind its port.
 */
export const AGENT_PROJECT_VSCODE_START_POLL_INTERVAL_MS = 250;

/**
 * Idle timeout passed to code-server so abandoned browser VS Code sessions stop themselves.
 */
export const AGENT_PROJECT_VSCODE_IDLE_TIMEOUT_SECONDS = 30 * 60;
