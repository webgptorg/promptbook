import type { MarkdownInlineReference } from '@promptbook-local/types';
import type { AgentProjectReferenceInfo } from './AgentProjectReferenceInfo';
import { buildAgentProjectFileHref, buildAgentProjectProfileHref } from './agentProjectHrefs';
import { createAgentProjectInitials } from './createAgentProjectInitials';

/**
 * Stable action id used by a stopped project's open-and-start menu option.
 */
const OPEN_AGENT_PROJECT_ACTION_ID = 'open-agent-project';

/**
 * Stable action id used by a project runtime start menu option.
 */
const START_AGENT_PROJECT_ACTION_ID = 'start-agent-project';

/**
 * Stable action id used by a project runtime stop menu option.
 */
const STOP_AGENT_PROJECT_ACTION_ID = 'stop-agent-project';

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

    /**
     * Opens a project, starting its runtime first when needed.
     */
    readonly onOpenProject?: (project: AgentProjectMarkdownReferenceInfo) => void | Promise<void>;

    /**
     * Starts or stops one project runtime.
     */
    readonly onChangeProjectRuntime?: (
        project: AgentProjectMarkdownReferenceInfo,
        isRunning: boolean,
    ) => void | Promise<void>;
};

/**
 * Project fields required to create a chat markdown reference.
 */
export type AgentProjectMarkdownReferenceInfo = Pick<
    AgentProjectReferenceInfo,
    'projectName' | 'displayName' | 'description' | 'faviconRelativePath' | 'isRunning' | 'projectUrl'
>;

/**
 * One menu option belonging to a project markdown reference.
 */
type AgentProjectMarkdownReferenceMenuOption = NonNullable<AgentProjectMarkdownReference['menu']>['options'][number];

/**
 * Creates markdown references rendering every mention of one project as a project chip.
 *
 * One project is mentioned either by its display name in chat prose, its `[[project-name]]` token,
 * a link into its project page or files, or its public project URL. All of them render the same chip
 * showing the project name together with its running state.
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
        const label = project.displayName || project.projectName;
        const faviconHref = project.faviconRelativePath
            ? buildAgentProjectFileHref(options.agentPermanentId, project.projectName, project.faviconRelativePath)
            : null;

        return {
            reference: project.projectName,
            sourceTextAliases: [label],
            label,
            href: projectProfileHref,
            sourceHrefPrefixes: [projectProfileHref, ...(projectUrl ? [projectUrl] : [])],
            title: project.description || label,
            icon: {
                src: faviconHref,
                fallbackText: createAgentProjectInitials(project.projectName),
            },
            menu: {
                status: {
                    label: project.isRunning ? 'Project is running' : 'Project is not running',
                    isActive: project.isRunning ?? false,
                },
                options: [
                    createOpenAgentProjectMenuOption(project, options.onOpenProject),
                    {
                        label: 'Open the project page in a new tab',
                        href: projectProfileHref,
                        title: 'Open the project page in a new tab',
                    },
                    ...(options.onChangeProjectRuntime
                        ? [createChangeAgentProjectRuntimeMenuOption(project, options.onChangeProjectRuntime)]
                        : []),
                ],
            },
        };
    });
}

/**
 * Creates the project destination option, using a client action when the runtime must be started.
 *
 * @param project - Project represented by the menu.
 * @param onOpenProject - Optional open-and-start callback.
 * @returns Project destination menu option.
 */
function createOpenAgentProjectMenuOption(
    project: AgentProjectMarkdownReferenceInfo,
    onOpenProject: CreateAgentProjectMarkdownReferencesOptions['onOpenProject'],
): AgentProjectMarkdownReferenceMenuOption {
    const projectUrl = project.projectUrl || null;

    if (project.isRunning && projectUrl) {
        return {
            label: 'Open the project in a new tab',
            href: projectUrl,
            title: 'Open the project in a new tab',
        };
    }

    if (onOpenProject) {
        return {
            label: 'Open the project in a new tab',
            href: null,
            title: 'Start the project and open it in a new tab',
            action: {
                id: OPEN_AGENT_PROJECT_ACTION_ID,
                onSelect: () => onOpenProject(project),
            },
        };
    }

    return {
        label: 'Open the project in a new tab',
        href: null,
        title: 'The project must run before it can be opened.',
    };
}

/**
 * Creates the start or stop action matching a project's current runtime state.
 *
 * @param project - Project represented by the menu.
 * @param onChangeProjectRuntime - Runtime state callback.
 * @returns Start or stop project menu option.
 */
function createChangeAgentProjectRuntimeMenuOption(
    project: AgentProjectMarkdownReferenceInfo,
    onChangeProjectRuntime: NonNullable<CreateAgentProjectMarkdownReferencesOptions['onChangeProjectRuntime']>,
): AgentProjectMarkdownReferenceMenuOption {
    const isRunning = project.isRunning === true;
    const actionId = isRunning ? STOP_AGENT_PROJECT_ACTION_ID : START_AGENT_PROJECT_ACTION_ID;
    const label = isRunning ? 'Stop the project' : 'Start the project';

    return {
        label,
        href: null,
        title: label,
        action: {
            id: actionId,
            onSelect: () => onChangeProjectRuntime(project, !isRunning),
        },
    };
}
