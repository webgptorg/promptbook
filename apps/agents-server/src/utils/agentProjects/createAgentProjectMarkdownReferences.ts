import type { AgentProjectInfo } from './AgentProjectInfo';
import { buildAgentProjectProfileHref } from './agentProjectHrefs';

/**
 * Markdown inline reference data consumed by chat markdown rendering.
 */
export type AgentProjectMarkdownReference = {
    /**
     * Raw project reference text written between `[[` and `]]`.
     */
    readonly reference: string;

    /**
     * User-facing project chip label.
     */
    readonly label: string;

    /**
     * Link target for the project profile page.
     */
    readonly href: string;

    /**
     * Optional hover title for the project chip.
     */
    readonly title?: string;
};

/**
 * Options for creating project markdown references.
 */
type CreateAgentProjectMarkdownReferencesOptions = {
    /**
     * Permanent id of the agent owning the projects.
     */
    readonly agentPermanentId: string;

    /**
     * Project references available to this agent chat.
     */
    readonly projects: ReadonlyArray<AgentProjectMarkdownReferenceInfo>;
};

/**
 * Project fields required to create a chat markdown reference.
 */
type AgentProjectMarkdownReferenceInfo = Pick<AgentProjectInfo, 'projectName' | 'displayName' | 'description'>;

/**
 * Creates markdown references that render known `[[project-name]]` tokens as project profile chips.
 *
 * @param options - Agent and project metadata.
 * @returns Inline markdown references for the shared chat renderer.
 */
export function createAgentProjectMarkdownReferences(
    options: CreateAgentProjectMarkdownReferencesOptions,
): ReadonlyArray<AgentProjectMarkdownReference> {
    return options.projects.map((project) => ({
        reference: project.projectName,
        label: project.displayName || project.projectName,
        href: buildAgentProjectProfileHref(options.agentPermanentId, project.projectName),
        title: project.description || project.displayName || project.projectName,
    }));
}
