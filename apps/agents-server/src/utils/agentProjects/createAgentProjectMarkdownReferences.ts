import type { MarkdownInlineReference } from '@promptbook-local/types';
import type { AgentProjectReferenceInfo } from './AgentProjectReferenceInfo';
import { buildAgentProjectProfileHref } from './agentProjectHrefs';
import { humanizeAgentProjectName } from './humanizeAgentProjectName';

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
 * Resolves the human-readable project name shown inside one project chip.
 *
 * A display name resolved from the project README wins, a plain project directory name is humanized
 * so that `prague-murders-map` reads as `Prague Murders Map`.
 *
 * @param project - Project metadata.
 * @returns Project chip label.
 */
function resolveAgentProjectChipLabel(project: AgentProjectMarkdownReferenceInfo): string {
    if (project.displayName && project.displayName !== project.projectName) {
        return project.displayName;
    }

    return humanizeAgentProjectName(project.projectName);
}

/**
 * Creates markdown references rendering every mention of one project as a project chip.
 *
 * One project is mentioned either by its `[[project-name]]` token, by a link into its project page
 * or files, or by its public project URL. All of them render the same chip showing the project name
 * together with its running state.
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
        const label = resolveAgentProjectChipLabel(project);

        return {
            reference: project.projectName,
            label,
            href: projectProfileHref,
            sourceHrefPrefixes: [projectProfileHref, ...(projectUrl ? [projectUrl] : [])],
            title: project.description || label,
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
