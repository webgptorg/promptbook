'use client';

import type { ChatMessage, MarkdownInlineReference } from '@promptbook-local/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { $refreshAgentProjectChatReferencesAction } from '../../app/agents/[agentName]/projectReferenceActions';
import {
    $startAgentProjectRuntimeAction,
    $stopAgentProjectRuntimeAction,
} from '../../app/agents/[agentName]/projectRuntimeActions';
import type { AgentProjectReferenceInfo } from '../../utils/agentProjects/AgentProjectReferenceInfo';
import type { AgentProjectRuntimeActionResult } from '../../utils/agentProjects/AgentProjectRuntimeActionResult';
import {
    createAgentProjectMarkdownReferences,
    type AgentProjectMarkdownReferenceInfo,
} from '../../utils/agentProjects/createAgentProjectMarkdownReferences';
import { notifyError } from '../Notifications/notifications';
import { resolveLatestCompletedAgentMessageKey } from './resolveLatestCompletedAgentMessageKey';

/**
 * Options used to build interactive project references for an Agents Server chat.
 */
type UseAgentProjectMarkdownReferencesOptions = {
    /**
     * Permanent id of the agent owning the projects.
     */
    readonly agentPermanentId: string;

    /**
     * Initial browser-safe project references loaded by the server page.
     */
    readonly projects: ReadonlyArray<AgentProjectReferenceInfo>;

    /**
     * Messages currently rendered in the chat.
     *
     * They are watched only to notice that the agent finished an answer, which is when a project it just
     * created must become a chip without waiting for a page reload.
     */
    readonly messages?: ReadonlyArray<ChatMessage>;
};

/**
 * Creates interactive project chips and keeps their runtime state current after menu actions.
 *
 * @param options - Owning agent and initial projects.
 * @returns Markdown references consumed by the shared chat renderer.
 */
export function useAgentProjectMarkdownReferences(
    options: UseAgentProjectMarkdownReferencesOptions,
): ReadonlyArray<MarkdownInlineReference> {
    const { agentPermanentId, projects, messages } = options;
    const [currentProjects, setCurrentProjects] = useState<ReadonlyArray<AgentProjectReferenceInfo>>(projects);
    const previousProjectsRef = useRef(projects);

    useEffect(() => {
        if (areAgentProjectReferencesEqual(previousProjectsRef.current, projects)) {
            return;
        }

        previousProjectsRef.current = projects;
        setCurrentProjects(projects);
    }, [projects]);

    useRefreshedAgentProjectReferences({
        agentPermanentId,
        currentProjects,
        messages,
        setCurrentProjects,
    });

    /**
     * Merges one action result into the local project reference state.
     */
    const updateProjectRuntimeState = useCallback(
        (projectName: string, result: AgentProjectRuntimeActionResult): void => {
            setCurrentProjects((currentProjectReferences) =>
                currentProjectReferences.map((project) =>
                    project.projectName === projectName
                        ? {
                              ...project,
                              isRunning: result.isRunning,
                              projectUrl: result.projectUrl || project.projectUrl || null,
                          }
                        : project,
                ),
            );
        },
        [],
    );

    /**
     * Starts or stops one project from its chip menu.
     */
    const changeProjectRuntime = useCallback(
        async (project: AgentProjectMarkdownReferenceInfo, isRunning: boolean): Promise<void> => {
            try {
                const result = isRunning
                    ? await $startAgentProjectRuntimeAction(agentPermanentId, project.projectName)
                    : await $stopAgentProjectRuntimeAction(agentPermanentId, project.projectName);

                updateProjectRuntimeState(project.projectName, result);

                if (isRunning && !result.isRunning) {
                    notifyError(`Project \`${project.displayName}\` did not start.`);
                }
            } catch (error) {
                const actionName = isRunning ? 'start' : 'stop';
                notifyError(resolveProjectRuntimeErrorMessage(error, `Failed to ${actionName} the project.`), {
                    details: error,
                });
            }
        },
        [agentPermanentId, updateProjectRuntimeState],
    );

    /**
     * Starts a stopped project and transfers an already-opened browser tab to its public URL.
     */
    const openProject = useCallback(
        async (project: AgentProjectMarkdownReferenceInfo): Promise<void> => {
            const projectWindow = window.open('about:blank', '_blank');

            if (!projectWindow) {
                notifyError('The browser blocked the new project tab.');
                return;
            }

            projectWindow.opener = null;

            try {
                const result = await $startAgentProjectRuntimeAction(agentPermanentId, project.projectName);
                updateProjectRuntimeState(project.projectName, result);

                if (!result.isRunning || !result.projectUrl) {
                    projectWindow.close();
                    notifyError(`Project \`${project.displayName}\` did not start.`);
                    return;
                }

                projectWindow.location.href = result.projectUrl;
            } catch (error) {
                projectWindow.close();
                notifyError(resolveProjectRuntimeErrorMessage(error, 'Failed to start and open the project.'), {
                    details: error,
                });
            }
        },
        [agentPermanentId, updateProjectRuntimeState],
    );

    return useMemo(
        () =>
            createAgentProjectMarkdownReferences({
                agentPermanentId,
                projects: currentProjects,
                onOpenProject: openProject,
                onChangeProjectRuntime: changeProjectRuntime,
            }),
        [agentPermanentId, changeProjectRuntime, currentProjects, openProject],
    );
}

/**
 * Options of the refresh keeping chat project references current while the chat stays open.
 *
 * @private type of `useAgentProjectMarkdownReferences`
 */
type UseRefreshedAgentProjectReferencesOptions = {
    /**
     * Permanent id of the agent owning the projects.
     */
    readonly agentPermanentId: string;

    /**
     * Project references the chat currently renders.
     */
    readonly currentProjects: ReadonlyArray<AgentProjectReferenceInfo>;

    /**
     * Messages currently rendered in the chat.
     */
    readonly messages: ReadonlyArray<ChatMessage> | undefined;

    /**
     * Replaces the project references the chat renders.
     */
    readonly setCurrentProjects: (projects: ReadonlyArray<AgentProjectReferenceInfo>) => void;
};

/**
 * Reloads the project references after each finished agent answer which could have created a project.
 *
 * The server renders a chat with the projects existing at that moment, so an agent creating a project
 * during the conversation would otherwise reference it as a plain link until the page is reloaded. The
 * messages already present when the chat thread opens arrive together with their projects and never
 * trigger a reload, and the server skips rebuilding the references while the agent owns the very same
 * projects.
 *
 * @param options - Owning agent, current references, and the messages the chat renders.
 *
 * @private function of `useAgentProjectMarkdownReferences`
 */
function useRefreshedAgentProjectReferences({
    agentPermanentId,
    currentProjects,
    messages,
    setCurrentProjects,
}: UseRefreshedAgentProjectReferencesOptions): void {
    const currentProjectsRef = useRef(currentProjects);
    const isLatestCompletedAgentMessageKeyKnownRef = useRef(false);
    const refreshedAgentMessageKeyRef = useRef<string | null>(null);
    const hasRenderedChatMessages = messages !== undefined && messages.length > 0;
    const latestCompletedAgentMessageKey = resolveLatestCompletedAgentMessageKey(messages);

    useEffect(() => {
        currentProjectsRef.current = currentProjects;
    }, [currentProjects]);

    useEffect(() => {
        if (!hasRenderedChatMessages) {
            // Note: An empty thread is also the state of a chat whose history is still being loaded
            return undefined;
        }

        if (!isLatestCompletedAgentMessageKeyKnownRef.current) {
            // Note: The messages rendered when the chat opens were listed together with the server projects
            isLatestCompletedAgentMessageKeyKnownRef.current = true;
            refreshedAgentMessageKeyRef.current = latestCompletedAgentMessageKey;
            return undefined;
        }

        if (refreshedAgentMessageKeyRef.current === latestCompletedAgentMessageKey) {
            return undefined;
        }

        refreshedAgentMessageKeyRef.current = latestCompletedAgentMessageKey;
        let isDisposed = false;

        void (async () => {
            const knownProjectNames = currentProjectsRef.current.map((project) => project.projectName);

            try {
                const refreshedProjects = await $refreshAgentProjectChatReferencesAction(
                    agentPermanentId,
                    knownProjectNames,
                );

                if (isDisposed || refreshedProjects === null) {
                    return;
                }

                setCurrentProjects(refreshedProjects);
            } catch (error) {
                // Note: A chat stays usable without fresh projects, the chip then appears after the next answer
                console.error('[agents-server:agent-projects] Failed to refresh chat project references', {
                    agentPermanentId,
                    error,
                });
            }
        })();

        return () => {
            isDisposed = true;
        };
    }, [agentPermanentId, hasRenderedChatMessages, latestCompletedAgentMessageKey, setCurrentProjects]);
}

/**
 * Selects a useful server-action error message without assuming a particular serialized error type.
 *
 * @param error - Unknown action failure.
 * @param fallbackMessage - Message used when the action exposes no details.
 * @returns User-facing error message.
 */
function resolveProjectRuntimeErrorMessage(error: unknown, fallbackMessage: string): string {
    return error instanceof Error && error.message.trim() ? error.message : fallbackMessage;
}

/**
 * Compares the project fields which affect a rendered chat reference.
 *
 * @param firstProjects - Previously received project references.
 * @param secondProjects - Newly received project references.
 * @returns Whether both collections render and behave identically in project chips.
 */
function areAgentProjectReferencesEqual(
    firstProjects: ReadonlyArray<AgentProjectReferenceInfo>,
    secondProjects: ReadonlyArray<AgentProjectReferenceInfo>,
): boolean {
    return (
        firstProjects.length === secondProjects.length &&
        firstProjects.every((firstProject, projectIndex) => {
            const secondProject = secondProjects[projectIndex];

            return (
                secondProject !== undefined &&
                firstProject.projectName === secondProject.projectName &&
                firstProject.displayName === secondProject.displayName &&
                firstProject.description === secondProject.description &&
                firstProject.faviconRelativePath === secondProject.faviconRelativePath &&
                firstProject.isRunning === secondProject.isRunning &&
                firstProject.projectUrl === secondProject.projectUrl
            );
        })
    );
}
