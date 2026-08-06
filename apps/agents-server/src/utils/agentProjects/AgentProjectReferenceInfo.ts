import type { AgentProjectInfo } from './AgentProjectInfo';

/**
 * Browser-safe project metadata reused by project lists and chat references.
 */
export type AgentProjectReferenceInfo = Pick<
    AgentProjectInfo,
    'projectName' | 'displayName' | 'description' | 'sizeBytes'
> & {
    /**
     * Whether the project currently accepts requests on its assigned runtime port.
     */
    readonly isRunning?: boolean;

    /**
     * Stable public project URL when the project has an assigned runtime or domain, otherwise `null`.
     *
     * The URL stays the same while the project is stopped so that the project stays recognizable
     * wherever it is referenced.
     */
    readonly projectUrl?: string | null;
};
