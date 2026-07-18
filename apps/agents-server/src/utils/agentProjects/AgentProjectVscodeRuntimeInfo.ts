/**
 * Theme values accepted by browser VS Code project sessions.
 */
export const AGENT_PROJECT_VSCODE_THEMES = ['LIGHT', 'DARK'] as const;

/**
 * Theme value used to keep code-server aligned with the Agents Server UI.
 */
export type AgentProjectVscodeTheme = (typeof AGENT_PROJECT_VSCODE_THEMES)[number];

/**
 * Runtime statuses shown by browser VS Code sessions.
 */
export const AGENT_PROJECT_VSCODE_RUNTIME_STATUSES = ['starting', 'running', 'stopped'] as const;

/**
 * Runtime status of one browser VS Code process.
 */
export type AgentProjectVscodeRuntimeStatus = (typeof AGENT_PROJECT_VSCODE_RUNTIME_STATUSES)[number];

/**
 * Serializable metadata of one browser VS Code process assigned to an agent project.
 */
export type AgentProjectVscodeRuntimeInfo = {
    /**
     * Process-local id of the VS Code runtime record.
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
     * Local TCP port used by code-server.
     */
    readonly port: number;

    /**
     * Direct local URL for development without the standalone VPS Nginx proxy.
     */
    readonly localUrl: string;

    /**
     * Same-origin proxy path used by the standalone VPS Nginx configuration.
     */
    readonly proxyPath: string;

    /**
     * Process id of the code-server process, or `null` when unavailable.
     */
    readonly processId: number | null;

    /**
     * Current runtime status.
     */
    readonly status: AgentProjectVscodeRuntimeStatus;

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
