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
     * Public runtime URL when the project has been assigned a runtime, otherwise `null`.
     */
    readonly projectUrl?: string | null;
};
