/**
 * Modes supported by agent project runtimes.
 */
export const AGENT_PROJECT_RUNTIME_MODES = ['assigned-port', 'static-server', 'dev-server'] as const;

/**
 * Runtime mode of one agent project port.
 */
export type AgentProjectRuntimeMode = (typeof AGENT_PROJECT_RUNTIME_MODES)[number];

/**
 * Runtime statuses shown in project pages and the resource monitor.
 */
export const AGENT_PROJECT_RUNTIME_STATUSES = ['assigned', 'starting', 'running', 'stopped'] as const;

/**
 * Runtime status of one agent project port.
 */
export type AgentProjectRuntimeStatus = (typeof AGENT_PROJECT_RUNTIME_STATUSES)[number];

/**
 * Serializable metadata of one assigned or running project runtime.
 */
export type AgentProjectRuntimeInfo = {
    /**
     * Process-local id of the runtime record.
     */
    readonly id: string;

    /**
     * Permanent id of the agent owning the project.
     */
    readonly agentPermanentId: string;

    /**
     * Directory name of the project inside the agent `projects/` folder.
     */
    readonly projectName: string;

    /**
     * Absolute project directory path on the Agents Server disk.
     */
    readonly projectPath: string;

    /**
     * Runtime mode.
     */
    readonly mode: AgentProjectRuntimeMode;

    /**
     * Local TCP port assigned to the project.
     */
    readonly port: number;

    /**
     * Browser URL for the runtime.
     *
     * In production this is the public project subdomain. In local development it
     * falls back to the loopback URL.
     */
    readonly url: string;

    /**
     * Local loopback URL assigned to the project runtime.
     */
    readonly localUrl: string;

    /**
     * Public browser URL assigned to the project runtime.
     */
    readonly publicUrl: string;

    /**
     * Public project domain, or `null` when no routable server domain is configured.
     */
    readonly domain: string | null;

    /**
     * Agents Server project page URL path.
     */
    readonly projectHref: string;

    /**
     * Shell command used for server-owned dev runtimes, or `null` for static/assigned ports.
     */
    readonly command: string | null;

    /**
     * Process id of the server-owned dev process, or `null` when no child process is owned.
     */
    readonly processId: number | null;

    /**
     * pm2 process name for server-owned runtimes, or `null` when the runtime is local-only.
     */
    readonly pm2ProcessName: string | null;

    /**
     * Current runtime status.
     */
    readonly status: AgentProjectRuntimeStatus;

    /**
     * Whether a TCP listener is currently available on the assigned port.
     */
    readonly isRunning: boolean;

    /**
     * ISO timestamp when this runtime was assigned.
     */
    readonly startedAt: string;

    /**
     * ISO timestamp of the latest status update.
     */
    readonly updatedAt: string;
};
