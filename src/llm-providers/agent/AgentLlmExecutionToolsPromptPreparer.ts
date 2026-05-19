import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import type { ChatPrompt, Prompt } from '../../types/Prompt';
import type { string_prompt } from '../../types/string_prompt';
import type { string_title } from '../../types/string_title';
import { appendChatAttachmentContextWithContent } from '../../utils/chat/chatAttachments/appendChatAttachmentContextWithContent';
import { normalizeChatAttachments } from '../../utils/chat/chatAttachments/normalizeChatAttachments';
import { keepUnused } from '../../utils/organization/keepUnused';

/**
 * Agent model requirements stripped of prompt-only bookkeeping before forwarding to runtime tools.
 */
type SanitizedAgentModelRequirements = Omit<AgentModelRequirements, '_metadata' | 'promptSuffix'>;

/**
 * Merges the agent's predefined knowledge sources with user-provided attachment URLs.
 */
function mergeKnowledgeSourcesWithAttachments(
    baseSources: ReadonlyArray<string> | undefined,
    attachmentUrls: ReadonlyArray<string>,
): Array<string> {
    const combined: Array<string> = [];

    if (baseSources && baseSources.length > 0) {
        combined.push(...baseSources.filter((value) => typeof value === 'string' && value.trim() !== ''));
    }

    for (const url of attachmentUrls) {
        const trimmed = String(url ?? '').trim();
        if (trimmed !== '') {
            combined.push(trimmed);
        }
    }

    return Array.from(new Set(combined));
}

/**
 * Merges tool definitions coming from commitments and runtime prompt overrides.
 */
function mergePromptTools(
    ...toolLists: Array<ReadonlyArray<NonNullable<ChatPrompt['tools']>[number]> | undefined>
): Array<NonNullable<ChatPrompt['tools']>[number]> {
    const mergedTools: Array<NonNullable<ChatPrompt['tools']>[number]> = [];
    const seenToolNames = new Set<string>();

    for (const toolList of toolLists) {
        if (!toolList) {
            continue;
        }

        for (const tool of toolList) {
            if (!tool || seenToolNames.has(tool.name)) {
                continue;
            }

            mergedTools.push(tool);
            seenToolNames.add(tool.name);
        }
    }

    return mergedTools;
}

/**
 * Detects whether one optional tool list contains runtime tools.
 */
function hasPromptTools(tools: ReadonlyArray<NonNullable<ChatPrompt['tools']>[number]> | undefined): boolean {
    return Array.isArray(tools) && tools.length > 0;
}

/**
 * Builds the prompt forwarded to the underlying LLM tools after agent requirements are merged in.
 */
function createPromptWithAgentModelRequirements(options: {
    /**
     * Original runtime chat prompt.
     */
    readonly chatPrompt: ChatPrompt;

    /**
     * Agent requirements safe to forward to runtime LLM tools.
     */
    readonly sanitizedRequirements: SanitizedAgentModelRequirements;

    /**
     * Optional suffix appended after attachment context.
     */
    readonly promptSuffix: AgentModelRequirements['promptSuffix'];

    /**
     * Prompt content after attachment context was inlined.
     */
    readonly chatPromptContentWithAttachments: string;

    /**
     * Tool list merged from commitments and runtime prompt overrides.
     */
    readonly mergedTools: Array<NonNullable<ChatPrompt['tools']>[number]>;

    /**
     * Knowledge sources forwarded to agent-capable backends.
     */
    readonly knowledgeSourcesForAgent?: Array<string>;
}): ChatPrompt {
    const chatPromptContentWithSuffix: string_prompt = options.promptSuffix
        ? (`${options.chatPromptContentWithAttachments}\n\n${options.promptSuffix}` as string_prompt)
        : (options.chatPromptContentWithAttachments as string_prompt);

    return {
        ...options.chatPrompt,
        content: chatPromptContentWithSuffix,
        modelRequirements: {
            ...options.chatPrompt.modelRequirements,
            ...options.sanitizedRequirements,
            tools: options.mergedTools.length > 0 ? options.mergedTools : undefined,
            // Spread knowledgeSources to convert readonly array to mutable
            knowledgeSources: options.knowledgeSourcesForAgent,
            // Prepend agent system message to existing system message
            systemMessage:
                options.sanitizedRequirements.systemMessage +
                (options.chatPrompt.modelRequirements.systemMessage
                    ? `\n\n${options.chatPrompt.modelRequirements.systemMessage}`
                    : ''),
        } as unknown as ChatPrompt['modelRequirements'], // Cast to avoid readonly mismatch from spread
    };
}

/**
 * Resolves runtime prompts into the fully enriched prompt shape forwarded by `AgentLlmExecutionTools`.
 *
 * @private internal utility of `AgentLlmExecutionTools`
 */
export class AgentLlmExecutionToolsPromptPreparer {
    public constructor(
        private readonly context: {
            readonly getModelRequirements: () => Promise<AgentModelRequirements>;
            readonly getTitle: () => string_title;
            readonly isVerbose?: boolean;
            readonly hasPrecomputedModelRequirements: () => boolean;
        },
    ) {}

    /**
     * Resolves agent requirements, attachments, and runtime overrides into one forwarded chat prompt.
     */
    public async prepareChatPrompt(prompt: Prompt): Promise<{
        readonly forwardedPrompt: ChatPrompt;
        readonly sanitizedRequirements: SanitizedAgentModelRequirements;
        readonly mergedTools: Array<NonNullable<ChatPrompt['tools']>[number]>;
        readonly knowledgeSourcesForAgent?: Array<string>;
        readonly hasAttachmentSources: boolean;
        readonly hasRuntimePromptTools: boolean;
    }> {
        const chatPrompt = this.requireChatPrompt(prompt);
        const { sanitizedRequirements, promptSuffix } = await this.getSanitizedAgentModelRequirements();
        const attachments = normalizeChatAttachments(chatPrompt.attachments);
        const attachmentUrls = attachments.map((attachment) => attachment.url);
        const mergedTools = mergePromptTools(
            sanitizedRequirements.tools,
            chatPrompt.modelRequirements.tools,
            chatPrompt.tools,
        );
        const hasRuntimePromptTools =
            hasPromptTools(chatPrompt.modelRequirements.tools) || hasPromptTools(chatPrompt.tools);
        const chatPromptContentWithAttachments = await appendChatAttachmentContextWithContent(
            chatPrompt.content,
            attachments,
            {
                allowLocalhost: true,
            },
        );
        const knowledgeSourcesForAgentList = mergeKnowledgeSourcesWithAttachments(
            sanitizedRequirements.knowledgeSources,
            attachmentUrls,
        );
        const knowledgeSourcesForAgent =
            knowledgeSourcesForAgentList.length > 0 ? knowledgeSourcesForAgentList : undefined;
        const forwardedPrompt = createPromptWithAgentModelRequirements({
            chatPrompt,
            sanitizedRequirements,
            promptSuffix,
            chatPromptContentWithAttachments,
            mergedTools,
            knowledgeSourcesForAgent,
        });

        if (this.context.isVerbose) {
            console.info('[🤰]', 'Prepared agent chat prompt', {
                agent: this.context.getTitle(),
                usedPrecomputedModelRequirements: this.context.hasPrecomputedModelRequirements(),
                toolNames: mergedTools.map((tool) => tool.name),
                knowledgeSourcesCount: knowledgeSourcesForAgent?.length ?? 0,
                promptSuffixLength: promptSuffix.length,
                systemMessageLength: sanitizedRequirements.systemMessage.length,
            });
        }

        return {
            forwardedPrompt,
            sanitizedRequirements,
            mergedTools,
            knowledgeSourcesForAgent,
            hasAttachmentSources: attachmentUrls.length > 0,
            hasRuntimePromptTools,
        };
    }

    /**
     * Removes bookkeeping-only properties from compiled agent requirements before forwarding them.
     */
    private async getSanitizedAgentModelRequirements(): Promise<{
        readonly promptSuffix: AgentModelRequirements['promptSuffix'];
        readonly sanitizedRequirements: SanitizedAgentModelRequirements;
    }> {
        const modelRequirements = await this.context.getModelRequirements();
        const { _metadata, promptSuffix, ...sanitizedRequirements } = modelRequirements;

        keepUnused(_metadata);

        return {
            promptSuffix,
            sanitizedRequirements,
        };
    }

    /**
     * Ensures the agent wrapper only processes chat prompts.
     */
    private requireChatPrompt(prompt: Prompt): ChatPrompt {
        if (prompt.modelRequirements.modelVariant !== 'CHAT') {
            throw new Error('AgentLlmExecutionTools only supports chat prompts');
        }

        return prompt as ChatPrompt;
    }
}
