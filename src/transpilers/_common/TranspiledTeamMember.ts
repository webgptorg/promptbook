import { spaceTrim } from 'spacetrim';
import type { PseudoAgentKind } from '../../book-2.0/agent-source/pseudoAgentReferences';
import type { LlmToolDefinition } from '../../types/LlmToolDefinition';

/**
 * One teammate entry baked into generated transpiled code.
 *
 * The same structure is used both for the runtime code scaffold and for the
 * export-page team hierarchy preview.
 *
 * @private internal helper of transpiled TEAM exports
 */
export type TranspiledTeamMember = {
    /**
     * Human-readable agent name, usually derived from the teammate profile or the Book source.
     */
    readonly agentName: string;

    /**
     * Display label used in the TEAM tool and export-page hierarchy.
     */
    readonly label: string;

    /**
     * Canonical teammate URL.
     */
    readonly url: string;

    /**
     * Stable TEAM tool name derived from the teammate label.
     */
    readonly toolName: string;

    /**
     * Instructions from the TEAM commitment body.
     */
    readonly instructions: string;

    /**
     * Optional persona text resolved from the teammate profile.
     */
    readonly personaDescription: string | null;

    /**
     * Optional pseudo-agent kind used for synthetic TEAM entries.
     */
    readonly pseudoAgentKind?: PseudoAgentKind;

    /**
     * Nested team members belonging to this teammate.
     */
    readonly teamMembers: ReadonlyArray<TranspiledTeamMember>;
};

/**
 * Recursively flattens a team hierarchy into a stable pre-order list.
 *
 * Duplicate URLs are skipped so recursive team graphs cannot loop forever.
 *
 * @param teamMembers - Root team hierarchy.
 * @returns Flattened unique teammates in source order.
 *
 * @private internal helper of transpiled TEAM exports
 */
export function collectTranspiledTeamMembers(
    teamMembers: ReadonlyArray<TranspiledTeamMember>,
): Array<TranspiledTeamMember> {
    return collectTranspiledTeamMembersRecursively(teamMembers, new Set<string>());
}

/**
 * Creates model-facing tool definitions for every unique TEAM member in the hierarchy.
 *
 * The generated definitions are reusable across transpilers and keep the hierarchy ordered
 * in the same pre-order traversal used by the runtime scaffold.
 *
 * @param teamMembers - Root team hierarchy.
 * @returns Tool definitions for every unique teammate.
 *
 * @private internal helper of transpiled TEAM exports
 */
export function createTranspiledTeamToolDefinitions(
    teamMembers: ReadonlyArray<TranspiledTeamMember>,
): Array<LlmToolDefinition> {
    return collectTranspiledTeamMembers(teamMembers).map((teamMember) => createTranspiledTeamToolDefinition(teamMember));
}

/**
 * Builds the Markdown preview used by the export page for one TEAM hierarchy.
 *
 * @param teamMembers - Root team hierarchy.
 * @returns Markdown fragment describing the resolved teammates.
 *
 * @private internal helper of transpiled TEAM exports
 */
export function createTranspiledTeamMarkdownSection(teamMembers: ReadonlyArray<TranspiledTeamMember>): string {
    if (teamMembers.length === 0) {
        return '';
    }

    return spaceTrim(
        (block) => `
            ## Team

            ${block(renderTranspiledTeamMarkdownList(teamMembers))}
        `,
    );
}

/**
 * Builds the runtime and object-member source used by transpiled TEAM exports.
 *
 * @param teamMembers - Root team hierarchy.
 * @returns Import block, runtime helper source, and object-member source for TEAM tools.
 *
 * @private internal helper of transpiled TEAM exports
 */
export function createTranspiledTeamSection(teamMembers: ReadonlyArray<TranspiledTeamMember>): {
    readonly importSource: string;
    readonly memberDataSource: string;
    readonly toolMembersSource: string;
} {
    if (teamMembers.length === 0) {
        return {
            importSource: '',
            memberDataSource: '',
            toolMembersSource: '',
        };
    }

    const flattenedTeamMembers = collectTranspiledTeamMembers(teamMembers);
    const toolMembersSource = flattenedTeamMembers
        .map((teamMember) => `${JSON.stringify(teamMember.toolName)}: createPromptbookTeamToolImplementation(${JSON.stringify(teamMember.toolName)}),`)
        .join('\n');

    return {
        importSource: "import { RemoteAgent } from '@promptbook/core';",
        memberDataSource: buildTeamMemberDataSource(teamMembers),
        toolMembersSource,
    };
}

/**
 * Recursively flattens a team hierarchy into a stable pre-order list.
 *
 * Duplicate URLs are skipped so recursive team graphs cannot loop forever.
 *
 * @param teamMembers - Current hierarchy branch.
 * @param seenTeamMemberUrls - Deduplication cache shared across the recursion.
 * @returns Flattened unique teammates in source order.
 *
 * @private internal helper of transpiled TEAM exports
 */
function collectTranspiledTeamMembersRecursively(
    teamMembers: ReadonlyArray<TranspiledTeamMember>,
    seenTeamMemberUrls: Set<string>,
): Array<TranspiledTeamMember> {
    const flattenedTeamMembers: Array<TranspiledTeamMember> = [];

    for (const teamMember of teamMembers) {
        const normalizedTeamMemberUrl = normalizeTranspiledTeamMemberUrl(teamMember.url);
        if (!normalizedTeamMemberUrl || seenTeamMemberUrls.has(normalizedTeamMemberUrl)) {
            continue;
        }

        seenTeamMemberUrls.add(normalizedTeamMemberUrl);
        flattenedTeamMembers.push(teamMember);

        if (teamMember.teamMembers.length > 0) {
            flattenedTeamMembers.push(
                ...collectTranspiledTeamMembersRecursively(teamMember.teamMembers, seenTeamMemberUrls),
            );
        }
    }

    return flattenedTeamMembers;
}

/**
 * Normalizes one teammate URL for deduplication and runtime lookup.
 *
 * @param teamMemberUrl - Raw teammate URL.
 * @returns Normalized teammate URL or an empty string when the value is not usable.
 *
 * @private internal helper of transpiled TEAM exports
 */
function normalizeTranspiledTeamMemberUrl(teamMemberUrl: string): string {
    return teamMemberUrl.trim().replace(/\/+$/g, '');
}

/**
 * Creates one model-facing TEAM tool definition for a transpiled teammate.
 *
 * @param teamMember - Baked teammate descriptor.
 * @returns Reusable tool definition consumed by SDK transpilers.
 *
 * @private internal helper of transpiled TEAM exports
 */
function createTranspiledTeamToolDefinition(teamMember: TranspiledTeamMember): LlmToolDefinition {
    return {
        name: teamMember.toolName,
        description: createTranspiledTeamToolDescription(teamMember),
        parameters: {
            type: 'object',
            properties: {
                message: {
                    type: 'string',
                    description: `Question to ask ${teamMember.label}.`,
                },
                context: {
                    type: 'string',
                    description: `Optional background context for ${teamMember.label}.`,
                },
            },
            required: ['message'],
        },
    };
}

/**
 * Formats the human-readable tool description used by transpiled TEAM members.
 *
 * @param teamMember - Baked teammate descriptor.
 * @returns Multi-line tool description visible to the model.
 *
 * @private internal helper of transpiled TEAM exports
 */
function createTranspiledTeamToolDescription(teamMember: TranspiledTeamMember): string {
    const descriptionLines = [`Consult teammate ${teamMember.label}`];

    if (teamMember.instructions.trim()) {
        descriptionLines.push(`TEAM instructions: ${teamMember.instructions.trim()}`);
    }

    if (teamMember.personaDescription?.trim()) {
        descriptionLines.push(`Profile: ${teamMember.personaDescription.trim()}`);
    }

    return descriptionLines.join('\n');
}

/**
 * Builds the top-level TEAM hierarchy source section used by transpiled runtime code.
 *
 * @param teamMembers - Root team hierarchy.
 * @returns JavaScript source with the baked team registry and helper functions.
 *
 * @private internal helper of transpiled TEAM exports
 */
function buildTeamMemberDataSource(teamMembers: ReadonlyArray<TranspiledTeamMember>): string {
    return spaceTrim(
        (block) => `
            // ---- TEAM ----
            const PROMPTBOOK_TEAM_MEMBERS = ${block(JSON.stringify(teamMembers, null, 4))};

            const PROMPTBOOK_TEAM_MEMBER_BY_TOOL_NAME = new Map(
                flattenPromptbookTeamMembers(PROMPTBOOK_TEAM_MEMBERS).map((teamMember) => [
                    teamMember.toolName,
                    teamMember,
                ]),
            );

            const PROMPTBOOK_TEAM_REMOTE_AGENT_CACHE = new Map();

            /**
             * Flattens the baked team hierarchy into a unique list of teammates.
             *
             * @param sourceTeamMembers - Team members to flatten.
             * @param seenTeamMemberUrls - Deduplication cache used to prevent recursive loops.
             * @returns Unique teammates in source order.
             */
            function flattenPromptbookTeamMembers(sourceTeamMembers, seenTeamMemberUrls = new Set()) {
                const flattenedTeamMembers = [];

                for (const teamMember of sourceTeamMembers) {
                    if (!teamMember) {
                        continue;
                    }

                    const normalizedTeamMemberUrl = normalizePromptbookTeamMemberUrl(teamMember.url);
                    if (!normalizedTeamMemberUrl || seenTeamMemberUrls.has(normalizedTeamMemberUrl)) {
                        continue;
                    }

                    seenTeamMemberUrls.add(normalizedTeamMemberUrl);
                    flattenedTeamMembers.push({
                        ...teamMember,
                        url: normalizedTeamMemberUrl,
                        teamMembers: Array.isArray(teamMember.teamMembers) ? teamMember.teamMembers : [],
                    });

                    if (Array.isArray(teamMember.teamMembers) && teamMember.teamMembers.length > 0) {
                        flattenedTeamMembers.push(
                            ...flattenPromptbookTeamMembers(teamMember.teamMembers, seenTeamMemberUrls),
                        );
                    }
                }

                return flattenedTeamMembers;
            }

            /**
             * Normalizes a teammate URL for runtime lookup.
             *
             * @param teamMemberUrl - Raw teammate URL.
             * @returns Trimmed teammate URL without trailing slashes.
             */
            function normalizePromptbookTeamMemberUrl(teamMemberUrl) {
                if (typeof teamMemberUrl !== 'string') {
                    return '';
                }

                return teamMemberUrl.trim().replace(/\\/+$/g, '');
            }

            /**
             * Returns the baked teammate descriptor for one tool name.
             *
             * @param toolName - TEAM tool name.
             * @returns Baked teammate data or `null` when the tool is missing.
             */
            function getPromptbookTeamMember(toolName) {
                return PROMPTBOOK_TEAM_MEMBER_BY_TOOL_NAME.get(toolName) || null;
            }

            /**
             * Resolves one cached remote teammate connection.
             *
             * @param agentUrl - Canonical teammate URL.
             * @returns Connected remote agent instance.
             */
            async function getPromptbookTeamRemoteAgent(agentUrl) {
                const normalizedAgentUrl = normalizePromptbookTeamMemberUrl(agentUrl);
                if (!normalizedAgentUrl) {
                    throw new Error('Team member URL is required.');
                }

                const cachedRemoteAgent = PROMPTBOOK_TEAM_REMOTE_AGENT_CACHE.get(normalizedAgentUrl);
                if (cachedRemoteAgent) {
                    return cachedRemoteAgent;
                }

                const connection = RemoteAgent.connect({ agentUrl: normalizedAgentUrl });
                PROMPTBOOK_TEAM_REMOTE_AGENT_CACHE.set(normalizedAgentUrl, connection);

                try {
                    return await connection;
                } catch (error) {
                    PROMPTBOOK_TEAM_REMOTE_AGENT_CACHE.delete(normalizedAgentUrl);
                    throw error;
                }
            }

            /**
             * Builds the metadata returned from TEAM tool results.
             *
             * @param teamMember - Baked teammate descriptor.
             * @param toolName - TEAM tool name requested by the model.
             * @returns Serializable teammate metadata.
             */
            function buildPromptbookTeamMemberMetadata(teamMember, toolName) {
                if (!teamMember) {
                    return {
                        agentName: toolName,
                        label: toolName,
                        url: '',
                        instructions: '',
                        toolName,
                    };
                }

                return {
                    agentName: teamMember.agentName,
                    label: teamMember.label,
                    url: teamMember.url,
                    instructions: teamMember.instructions,
                    toolName: teamMember.toolName,
                    ...(teamMember.pseudoAgentKind ? { pseudoAgentKind: teamMember.pseudoAgentKind } : {}),
                };
            }

            /**
             * Builds the request text sent to a teammate.
             *
             * @param message - Main question for the teammate.
             * @param context - Optional extra context from the tool call.
             * @returns Joined teammate request text.
             */
            function buildPromptbookTeamRequest(message, context) {
                return context ? \`\${message}\\n\\nContext:\\n\${context}\` : message;
            }

            /**
             * Creates a synthetic TEAM result for `{User}` pseudo-agent calls.
             *
             * @param teamMember - Baked teammate descriptor.
             * @param request - Final teammate request text.
             * @returns Serializable pseudo-user team result.
             */
            function createPromptbookPseudoUserTeamToolResult(teamMember, request) {
                const teammateMetadata = buildPromptbookTeamMemberMetadata(teamMember, teamMember.toolName);

                return {
                    teammate: teammateMetadata,
                    request,
                    response: 'User response is pending in the UI modal.',
                    interaction: {
                        kind: 'PSEUDO_USER_SINGLE_MESSAGE',
                        prompt: request,
                    },
                    conversation: [
                        {
                            sender: 'AGENT',
                            name: AGENT_NAME,
                            content: request,
                        },
                        {
                            sender: 'TEAMMATE',
                            name: teamMember.label,
                            content: 'Waiting for one user reply.',
                        },
                    ],
                };
            }

            /**
             * Creates a synthetic TEAM result for `{Void}` pseudo-agent calls.
             *
             * @param teamMember - Baked teammate descriptor.
             * @param request - Final teammate request text.
             * @returns Serializable pseudo-void team result.
             */
            function createPromptbookPseudoVoidTeamToolResult(teamMember, request) {
                const teammateMetadata = buildPromptbookTeamMemberMetadata(teamMember, teamMember.toolName);

                return {
                    teammate: teammateMetadata,
                    request,
                    response: 'The void remained silent.',
                    conversation: [
                        {
                            sender: 'AGENT',
                            name: AGENT_NAME,
                            content: request,
                        },
                        {
                            sender: 'TEAMMATE',
                            name: teamMember.label,
                            content: '...',
                        },
                    ],
                };
            }

            /**
             * Creates one TEAM tool implementation bound to a baked teammate descriptor.
             *
             * @param toolName - TEAM tool name.
             * @returns Async tool function callable by the generated harness.
             */
            function createPromptbookTeamToolImplementation(toolName) {
                return async function promptbookTeamToolImplementation(args) {
                    const teamMember = getPromptbookTeamMember(toolName);
                    const teammateMetadata = buildPromptbookTeamMemberMetadata(teamMember, toolName);
                    const message = String((args && (args.message || args.question || '')) || '').trim();

                    if (!teamMember) {
                        return JSON.stringify({
                            error: \`Team member "\${toolName}" is not registered in the exported harness.\`,
                            teammate: teammateMetadata,
                        });
                    }

                    if (!message) {
                        return JSON.stringify({
                            error: 'Message is required to contact teammate.',
                            teammate: teammateMetadata,
                        });
                    }

                    const request = buildPromptbookTeamRequest(message, args && args.context);

                    if (teamMember.pseudoAgentKind === 'USER') {
                        return JSON.stringify(createPromptbookPseudoUserTeamToolResult(teamMember, request));
                    }

                    if (teamMember.pseudoAgentKind === 'VOID') {
                        return JSON.stringify(createPromptbookPseudoVoidTeamToolResult(teamMember, request));
                    }

                    let response = '';
                    let error = null;
                    let toolCalls;

                    try {
                        const remoteAgent = await getPromptbookTeamRemoteAgent(teamMember.url);
                        const teammateResult = await remoteAgent.callChatModel({
                            title: 'Teammate consultation',
                            modelRequirements: {
                                modelVariant: 'CHAT',
                            },
                            content: request,
                            parameters: {},
                        });

                        response = teammateResult.content || '';
                        toolCalls =
                            'toolCalls' in teammateResult && Array.isArray(teammateResult.toolCalls)
                                ? teammateResult.toolCalls
                                : undefined;
                    } catch (err) {
                        error = err instanceof Error ? err.message : String(err);
                    }

                    const teammateReply =
                        response || (error ? \`Unable to reach teammate. Error: \${error}\` : 'No response received.');

                    const result = {
                        teammate: teammateMetadata,
                        request,
                        response: teammateReply,
                        toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
                        error,
                        conversation: [
                            {
                                sender: 'AGENT',
                                name: AGENT_NAME,
                                content: request,
                            },
                            {
                                sender: 'TEAMMATE',
                                name: teamMember.label,
                                content: teammateReply,
                            },
                        ],
                    };

                    return JSON.stringify(result);
                };
            }
        `,
    );
}

/**
 * Builds the Markdown bullet list used on the export page.
 *
 * @param teamMembers - Team hierarchy to render.
 * @param depth - Current indentation depth.
 * @returns Markdown bullets that preserve the nested hierarchy.
 *
 * @private internal helper of transpiled TEAM exports
 */
function renderTranspiledTeamMarkdownList(
    teamMembers: ReadonlyArray<TranspiledTeamMember>,
    depth: number = 0,
): string {
    const indentation = '  '.repeat(depth);
    const lines: Array<string> = [];

    for (const teamMember of teamMembers) {
        const details: Array<string> = [];

        details.push(`${indentation}- **${teamMember.label}** (\`${teamMember.toolName}\`)`);
        details.push(`${indentation}  - \`${teamMember.url}\``);

        if (teamMember.instructions.trim()) {
            details.push(`${indentation}  - ${teamMember.instructions.trim()}`);
        }

        if (teamMember.personaDescription?.trim()) {
            details.push(`${indentation}  - ${teamMember.personaDescription.trim()}`);
        }

        if (teamMember.teamMembers.length > 0) {
            details.push(renderTranspiledTeamMarkdownList(teamMember.teamMembers, depth + 1));
        }

        lines.push(details.join('\n'));
    }

    return lines.join('\n');
}

// Note: [💞] Ignore a discrepancy between file name and entity name
