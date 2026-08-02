import type { MarkdownInlineReference } from '@promptbook-local/types';
import type { AgentProjectReferenceInfo } from './AgentProjectReferenceInfo';
import { buildAgentProjectFilesHrefPrefix, buildAgentProjectProfileHref } from './agentProjectHrefs';

/**
 * Markdown inline reference data consumed by chat markdown rendering.
 */
export type AgentProjectMarkdownReference = MarkdownInlineReference;

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
type AgentProjectMarkdownReferenceInfo = Pick<
    AgentProjectReferenceInfo,
    'projectName' | 'displayName' | 'description' | 'isRunning' | 'projectUrl'
>;

/**
 * Creates markdown references that render known `[[project-name]]` tokens as project profile chips.
 *
 * @param options - Agent and project metadata.
 * @returns Inline markdown references for the shared chat renderer.
 */
export function createAgentProjectMarkdownReferences(
    options: CreateAgentProjectMarkdownReferencesOptions,
): ReadonlyArray<AgentProjectMarkdownReference> {
    return options.projects.map((project) => {
        const projectProfileHref = buildAgentProjectProfileHref(options.agentPermanentId, project.projectName);
        const projectUrl = project.projectUrl || null;

        return {
            reference: project.projectName,
            label: project.displayName || project.projectName,
            href: projectProfileHref,
            sourceHrefPrefixes: [
                projectProfileHref,
                buildAgentProjectFilesHrefPrefix(options.agentPermanentId, project.projectName),
                ...(projectUrl ? [projectUrl] : []),
            ],
            title: project.description || project.displayName || project.projectName,
            menu: {
                status: {
                    label: project.isRunning ? 'Project is running' : 'Project is not running',
                    isActive: project.isRunning ?? false,
                },
                options: [
                    {
                        label: 'Open the project in a new tab',
                        href: project.isRunning ? projectUrl : null,
                        title:
                            project.isRunning && projectUrl
                                ? 'Open the project in a new tab'
                                : 'The project must run before it can be opened.',
                    },
                    {
                        label: 'Open the project page in a new tab',
                        href: projectProfileHref,
                        title: 'Open the project page in a new tab',
                    },
                ],
            },
        };
    });
}
