import { spaceTrim } from 'spacetrim';
import { PSEUDO_AGENT_USER_URL, PSEUDO_AGENT_VOID_URL, resolvePseudoAgentKindFromUrl, type PseudoAgentKind } from '../../book-2.0/agent-source/pseudoAgentReferences';

/**
 * Shared TEAM member metadata used by transpiler options and generated harnesses.
 */
type TranspiledTeamMemberBase = {
    /**
     * Canonical teammate URL.
     */
    readonly url: string;

    /**
     * Human-readable teammate label.
     */
    readonly label: string;

    /**
     * Deterministic TEAM tool name generated from the teammate label.
     */
    readonly toolName: string;

    /**
     * Optional human-readable teammate instructions.
     */
    readonly instructions: string;

    /**
     * Optional pseudo-agent kind used by `{User}` and `{Void}` teammates.
     */
    readonly pseudoAgentKind?: PseudoAgentKind;
};

/**
 * Recursive TEAM member payload accepted by transpiler options and server export helpers.
 *
 * @private shared between transpilers and Agents Server export helpers
 */
export type TranspiledTeamMemberInput = TranspiledTeamMemberBase & {
    /**
     * Nested teammates available to the teammate itself.
     */
    readonly teammates?: ReadonlyArray<TranspiledTeamMemberInput>;
};

/**
 * Normalized recursive TEAM member payload used inside generated harnesses.
 *
 * @private shared between transpilers and Agents Server export helpers
 */
export type TranspiledTeamMember = TranspiledTeamMemberBase & {
    /**
     * Nested teammates available to the teammate itself.
     */
    readonly teammates: ReadonlyArray<TranspiledTeamMember>;
};

/**
 * Normalizes a TEAM hierarchy into a fully recursive structure with guaranteed child arrays.
 *
 * @param teamHierarchy - TEAM members to normalize.
 * @returns Deep-cloned recursive hierarchy safe for generated code.
 *
 * @private shared between transpilers and Agents Server export helpers
 */
export function normalizeTranspiledTeamHierarchy(
    teamHierarchy: ReadonlyArray<TranspiledTeamMemberInput>,
): Array<TranspiledTeamMember> {
    return teamHierarchy.map((teamMember) => ({
        url: teamMember.url,
        label: teamMember.label,
        toolName: teamMember.toolName,
        instructions: teamMember.instructions || '',
        pseudoAgentKind: teamMember.pseudoAgentKind || resolvePseudoAgentKindFromUrl(teamMember.url) || undefined,
        teammates: normalizeTranspiledTeamHierarchy(teamMember.teammates || []),
    }));
}

/**
 * Creates JavaScript runtime scaffolding that embeds the full TEAM hierarchy into generated harnesses.
 *
 * @param options - Current agent name and recursive TEAM hierarchy.
 * @returns Self-contained JavaScript source for reusable TEAM runtime helpers.
 *
 * @private shared between transpilers
 */
export function createTranspiledTeamHierarchyRuntimeSource(options: {
    readonly agentName: string;
    readonly teamHierarchy: ReadonlyArray<TranspiledTeamMember>;
}): string {
    const { agentName, teamHierarchy } = options;

    if (teamHierarchy.length === 0) {
        return '';
    }

    return spaceTrim(
        (block) => `
            // ---- TEAM ----
            const PROMPTBOOK_AGENT_NAME = ${block(JSON.stringify(agentName))};
            const PROMPTBOOK_TEAM_HIERARCHY = ${block(JSON.stringify(teamHierarchy, null, 4))};
            const PROMPTBOOK_TEAM_MEMBER_BY_TOOL_NAME = {};
            const PROMPTBOOK_TEAM_MEMBER_BY_URL = {};
            const PROMPTBOOK_TEAM_TOOL_IMPLEMENTATIONS = {};
            const PROMPTBOOK_REMOTE_TEAMMATE_AGENTS = new Map();

            registerPromptbookTeamMembers(PROMPTBOOK_TEAM_HIERARCHY);

            /**
             * Registers team members recursively so the exported harness keeps one reusable
             * implementation map for the whole hierarchy.
             *
             * @param teamMembers - Current level of team members to register.
             */
            function registerPromptbookTeamMembers(teamMembers) {
                for (const teamMember of teamMembers) {
                    PROMPTBOOK_TEAM_MEMBER_BY_TOOL_NAME[teamMember.toolName] = teamMember;
                    PROMPTBOOK_TEAM_MEMBER_BY_URL[teamMember.url] = teamMember;
                    PROMPTBOOK_TEAM_TOOL_IMPLEMENTATIONS[teamMember.toolName] = createPromptbookTeamToolFunction(
                        teamMember,
                    );

                    if (teamMember.teammates.length > 0) {
                        registerPromptbookTeamMembers(teamMember.teammates);
                    }
                }
            }

            /**
             * Creates one reusable TEAM tool implementation bound to one teammate descriptor.
             *
             * @param teamMember - Teammate metadata embedded into the exported harness.
             * @returns TEAM tool implementation used by the runtime harness.
             */
            function createPromptbookTeamToolFunction(teamMember) {
                return async (args) => {
                    const message = String(args.message || args.question || '').trim();
                    const teammateMetadata = buildPromptbookTeamTeammateMetadata(teamMember);

                    if (!message) {
                        return JSON.stringify({
                            error: 'Message is required to contact teammate.',
                            teammate: teammateMetadata,
                        });
                    }

                    const request = buildPromptbookTeamRequest(message, args.context);
                    const pseudoAgentKind = resolvePromptbookTeamPseudoAgentKind(teamMember.url);

                    if (pseudoAgentKind === 'USER') {
                        return JSON.stringify(createPromptbookPseudoUserTeamToolResult(teamMember, request));
                    }

                    if (pseudoAgentKind === 'VOID') {
                        return JSON.stringify(createPromptbookPseudoVoidTeamToolResult(teamMember, request));
                    }

                    let response = '';
                    let error = null;
                    let toolCalls;

                    try {
                        const remoteAgent = await getPromptbookRemoteTeammateAgent(teamMember.url);
                        const prompt = buildPromptbookTeamPrompt(request);
                        const teammateResult = await remoteAgent.callChatModel(prompt);
                        response = teammateResult.content || '';
                        toolCalls =
                            'toolCalls' in teammateResult && Array.isArray(teammateResult.toolCalls)
                                ? teammateResult.toolCalls
                                : undefined;
                    } catch (caughtError) {
                        error = caughtError instanceof Error ? caughtError.message : String(caughtError);
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
                                name: PROMPTBOOK_AGENT_NAME,
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

            /**
             * Returns a stable runtime metadata object for a teammate.
             *
             * @param teamMember - Teammate metadata embedded into the exported harness.
             * @returns Serializable teammate metadata used in tool-call results.
             */
            function buildPromptbookTeamTeammateMetadata(teamMember) {
                return {
                    url: teamMember.url,
                    label: teamMember.label,
                    instructions: teamMember.instructions,
                    toolName: teamMember.toolName,
                    pseudoAgentKind: teamMember.pseudoAgentKind || resolvePromptbookTeamPseudoAgentKind(teamMember.url) || undefined,
                };
            }

            /**
             * Builds the teammate request text, optionally including extra context.
             *
             * @param message - Raw teammate question.
             * @param context - Optional background context.
             * @returns Final teammate request text.
             */
            function buildPromptbookTeamRequest(message, context) {
                return context ? \`\${message}\\n\\nContext:\\n\${context}\` : message;
            }

            /**
             * Builds a minimal prompt object for teammate calls.
             *
             * @param request - Request text passed to the teammate.
             * @returns Prompt payload consumed by `RemoteAgent.callChatModel`.
             */
            function buildPromptbookTeamPrompt(request) {
                return {
                    title: 'Teammate consultation',
                    modelRequirements: {
                        modelVariant: 'CHAT',
                    },
                    content: request,
                };
            }

            /**
             * Returns a TEAM tool result for the `{User}` pseudo-agent.
             *
             * @param teamMember - Teammate metadata embedded into the exported harness.
             * @param request - Request text sent to the pseudo-teammate.
             * @returns Serialized pseudo-user TEAM tool result.
             */
            function createPromptbookPseudoUserTeamToolResult(teamMember, request) {
                const teammateMetadata = buildPromptbookTeamTeammateMetadata(teamMember);

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
                            name: PROMPTBOOK_AGENT_NAME,
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
             * Returns a TEAM tool result for the `{Void}` pseudo-agent.
             *
             * @param teamMember - Teammate metadata embedded into the exported harness.
             * @param request - Request text sent to the pseudo-teammate.
             * @returns Serialized pseudo-void TEAM tool result.
             */
            function createPromptbookPseudoVoidTeamToolResult(teamMember, request) {
                const teammateMetadata = buildPromptbookTeamTeammateMetadata(teamMember);

                return {
                    teammate: teammateMetadata,
                    request,
                    response: 'The void remained silent.',
                    conversation: [
                        {
                            sender: 'AGENT',
                            name: PROMPTBOOK_AGENT_NAME,
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
             * Resolves or reuses one remote agent connection for a teammate URL.
             *
             * @param agentUrl - Canonical teammate URL.
             * @returns Connected remote agent wrapper.
             */
            async function getPromptbookRemoteTeammateAgent(agentUrl) {
                const cachedConnection = PROMPTBOOK_REMOTE_TEAMMATE_AGENTS.get(agentUrl);
                if (cachedConnection) {
                    return cachedConnection;
                }

                const connection = (async () => RemoteAgent.connect({ agentUrl }))();
                PROMPTBOOK_REMOTE_TEAMMATE_AGENTS.set(agentUrl, connection);

                try {
                    return await connection;
                } catch (error) {
                    PROMPTBOOK_REMOTE_TEAMMATE_AGENTS.delete(agentUrl);
                    throw error;
                }
            }

            /**
             * Resolves the pseudo-agent kind from a teammate URL.
             *
             * @param agentUrl - Canonical teammate URL.
             * @returns Pseudo-agent kind or `null` when the URL points to a real teammate.
             */
            function resolvePromptbookTeamPseudoAgentKind(agentUrl) {
                if (agentUrl === ${block(JSON.stringify(PSEUDO_AGENT_USER_URL))}) {
                    return 'USER';
                }

                if (agentUrl === ${block(JSON.stringify(PSEUDO_AGENT_VOID_URL))}) {
                    return 'VOID';
                }

                return null;
            }
        `,
    );
}

/**
 * Creates a readable markdown section that shows the full recursive TEAM hierarchy.
 *
 * @param teamHierarchy - Recursive teammate tree embedded into the transpiled export.
 * @returns Markdown fragment with nested bullets for each teammate.
 *
 * @private shared between transpilers
 */
export function createTranspiledTeamHierarchyMarkdownSource(
    teamHierarchy: ReadonlyArray<TranspiledTeamMember>,
): string {
    if (teamHierarchy.length === 0) {
        return '';
    }

    return spaceTrim(
        (block) => `
            ## TEAM hierarchy

            ${block(teamHierarchy.map((teamMember) => formatTeamMemberMarkdown(teamMember)).join('\n'))}
        `,
    );
}

/**
 * Formats one recursive TEAM member as a nested markdown bullet list.
 *
 * @param teamMember - Team member to render.
 * @param indentation - Current bullet indentation.
 * @returns Markdown lines for the current teammate and its descendants.
 */
function formatTeamMemberMarkdown(teamMember: TranspiledTeamMember, indentation = ''): string {
    const lines = [
        `${indentation}- \`${escapeMarkdownInline(teamMember.label)}\` (\`${escapeMarkdownInline(teamMember.toolName)}\`)`,
        `${indentation}  - \`url\`: \`${escapeMarkdownInline(teamMember.url)}\``,
    ];

    if (teamMember.pseudoAgentKind) {
        lines.push(`${indentation}  - \`pseudoAgentKind\`: \`${teamMember.pseudoAgentKind}\``);
    }

    if (teamMember.instructions.trim()) {
        lines.push(
            `${indentation}  - \`instructions\`: ${escapeMarkdownInline(normalizeInlineText(teamMember.instructions))}`,
        );
    }

    if (teamMember.teammates.length > 0) {
        lines.push(`${indentation}  - teammates:`);
        for (const teammate of teamMember.teammates) {
            lines.push(formatTeamMemberMarkdown(teammate, `${indentation}    `));
        }
    }

    return lines.join('\n');
}

/**
 * Removes markdown control characters from one inline snippet.
 *
 * @param text - Raw text to render inline.
 * @returns Sanitized inline markdown text.
 */
function escapeMarkdownInline(text: string): string {
    return normalizeInlineText(text).replace(/`/g, "'");
}

/**
 * Collapses a multi-line text value into a compact single-line snippet.
 *
 * @param text - Raw text value.
 * @returns Normalized single-line text.
 */
function normalizeInlineText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
}
