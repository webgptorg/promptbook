/**
 * Metadata of one agent-owned project folder.
 *
 * A project is one direct child directory of the agent's `projects/` folder which the agent
 * fully controls — it can create, read, modify, and delete any file inside it, run scripts
 * there, and optionally turn the folder into a git repository.
 */
export type AgentProjectInfo = {
    /**
     * Directory name of the project inside the agent `projects/` folder.
     */
    readonly projectName: string;

    /**
     * User-facing name of the project, resolved from the README heading when available.
     */
    readonly displayName: string;

    /**
     * Short project description resolved from the first README paragraph.
     */
    readonly description: string;

    /**
     * Original README filename used for the project profile, or `null` when there is no README.
     */
    readonly readmeFileName: string | null;

    /**
     * Path of the project relative to the agent folder root, for example `projects/my-website`.
     */
    readonly relativePath: string;

    /**
     * Absolute path of the project directory on the Agents Server disk.
     */
    readonly absolutePath: string;

    /**
     * Total size of all files inside the project in bytes.
     */
    readonly sizeBytes: number;

    /**
     * Total count of files inside the project.
     */
    readonly fileCount: number;

    /**
     * Whether the project folder is a git repository (contains a `.git` directory).
     */
    readonly isGitRepository: boolean;

    /**
     * ISO timestamp of the most recently modified file inside the project, or `null` for empty projects.
     */
    readonly latestModifiedAt: string | null;
};

/**
 * Identification of the agent owning one projects folder.
 */
export type AgentProjectsOwner = {
    /**
     * Permanent id of the agent owning the projects.
     */
    readonly agentPermanentId: string;

    /**
     * Display name of the agent, or `null` when the agent row no longer exists in the database.
     */
    readonly agentName: string | null;

    /**
     * Local agent runner directory name, for example `agent-1dkmraaikkd8yp`.
     */
    readonly agentDirectoryName: string;
};

/**
 * All projects of one agent together with aggregated totals.
 */
export type AgentProjectsSummary = AgentProjectsOwner & {
    /**
     * Projects of the agent ordered by project name.
     */
    readonly projects: ReadonlyArray<AgentProjectInfo>;

    /**
     * Total size of all projects of the agent in bytes.
     */
    readonly totalSizeBytes: number;

    /**
     * Total count of files across all projects of the agent.
     */
    readonly totalFileCount: number;
};

/**
 * Server-wide report of all agent projects used by the admin dashboard and the resource monitor.
 */
export type AllAgentProjectsReport = {
    /**
     * Absolute path of the local agent root that was scanned.
     */
    readonly rootPath: string;

    /**
     * Count of scanned local agent directories (including agents without any project).
     */
    readonly scannedAgentDirectoryCount: number;

    /**
     * Per-agent project summaries for agents that have at least one project, ordered by total size descending.
     */
    readonly summaries: ReadonlyArray<AgentProjectsSummary>;

    /**
     * Total size of all projects of all agents in bytes.
     */
    readonly totalSizeBytes: number;

    /**
     * Total count of projects across all agents.
     */
    readonly totalProjectCount: number;

    /**
     * Total count of files across all projects of all agents.
     */
    readonly totalFileCount: number;

    /**
     * ISO timestamp when the report was generated.
     */
    readonly generatedAt: string;
};
