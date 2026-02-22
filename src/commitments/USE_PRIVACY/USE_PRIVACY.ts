import { spaceTrim } from 'spacetrim';
import { string_javascript_name, TODO_any } from '../../_packages/types.index';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { ToolFunction } from '../../scripting/javascript/JavascriptExecutionToolsOptions';
import type { LlmToolDefinition } from '../../types/LlmToolDefinition';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';
import { formatOptionalInstructionBlock } from '../_base/formatOptionalInstructionBlock';
import { readToolRuntimeContextFromToolArgs } from '../_common/toolRuntimeContext';

/**
 * Tool name used by the USE PRIVACY commitment.
 *
 * @private internal USE PRIVACY constant
 */
const TURN_PRIVACY_ON_TOOL_NAME = 'turn_privacy_on' as string_javascript_name;

/**
 * Status returned when the UI should ask the user to confirm private mode.
 *
 * @private internal USE PRIVACY constant
 */
const PRIVACY_CONFIRMATION_REQUIRED_STATUS = 'confirmation-required';

/**
 * Status returned when private mode is already enabled.
 *
 * @private internal USE PRIVACY constant
 */
const PRIVACY_ALREADY_ENABLED_STATUS = 'already-enabled';

/**
 * Tool arguments used by the privacy tool.
 *
 * @private internal USE PRIVACY types
 */
type TurnPrivacyOnToolArgs = {
    [key: string]: TODO_any;
};

/**
 * Result payload returned by the privacy tool.
 *
 * @private internal USE PRIVACY types
 */
type TurnPrivacyOnToolResult = {
    status: 'confirmation-required' | 'already-enabled';
    message: string;
};

/**
 * Checks whether private mode is already enabled in runtime context.
 *
 * @private utility of USE PRIVACY commitment
 */
function isPrivateModeEnabledInRuntimeContext(args: TurnPrivacyOnToolArgs): boolean {
    const runtimeContext = readToolRuntimeContextFromToolArgs(args);
    return runtimeContext?.memory?.isPrivateMode === true;
}

/**
 * Creates a standard "confirmation required" result payload.
 *
 * @private utility of USE PRIVACY commitment
 */
function createPrivacyConfirmationRequiredResult(): TurnPrivacyOnToolResult {
    return {
        status: PRIVACY_CONFIRMATION_REQUIRED_STATUS,
        message:
            'Private mode requires explicit user confirmation in the UI. Ask the user to confirm the privacy prompt.',
    };
}

/**
 * Creates a standard "already enabled" result payload.
 *
 * @private utility of USE PRIVACY commitment
 */
function createPrivacyAlreadyEnabledResult(): TurnPrivacyOnToolResult {
    return {
        status: PRIVACY_ALREADY_ENABLED_STATUS,
        message: 'Private mode is already enabled for this chat session.',
    };
}

/**
 * USE PRIVACY commitment definition.
 *
 * The `USE PRIVACY` commitment enables an agent to request enabling private mode.
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class UsePrivacyCommitmentDefinition extends BaseCommitmentDefinition<'USE PRIVACY'> {
    public constructor() {
        super('USE PRIVACY', ['PRIVACY']);
    }

    override get requiresContent(): boolean {
        return false;
    }

    /**
     * Short one-line description of USE PRIVACY.
     */
    public get description(): string {
        return 'Enable the agent to request turning private mode on for sensitive conversations.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '🔒';
    }

    /**
     * Markdown documentation for USE PRIVACY commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # USE PRIVACY

            Enables the agent to request turning on private mode in chat.

            ## Key aspects

            - The tool \`turn_privacy_on\` asks the UI to show a confirmation dialog to the user.
            - Private mode is enabled only after explicit user confirmation in the UI.
            - In the current implementation, this reuses existing private mode behavior in chat.
            - While private mode is active, chat persistence, memory persistence, and self-learning are disabled.
            - Proper encryption is planned for future updates, but not implemented by this commitment yet.
            - Optional content after \`USE PRIVACY\` can provide additional privacy instructions.

            ## Examples

            \`\`\`book
            Sensitive Assistant

            PERSONA You help with sensitive topics where privacy is important.
            USE PRIVACY
            \`\`\`

            \`\`\`book
            Compliance Assistant

            PERSONA You assist with legal and HR conversations.
            USE PRIVACY Offer private mode when user asks to avoid storing data.
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const extraInstructions = formatOptionalInstructionBlock('Privacy instructions', content);
        const existingTools = requirements.tools || [];

        const tools: ReadonlyArray<LlmToolDefinition> = existingTools.some(
            (tool) => tool.name === TURN_PRIVACY_ON_TOOL_NAME,
        )
            ? existingTools
            : [
                  ...existingTools,
                  {
                      name: TURN_PRIVACY_ON_TOOL_NAME,
                      description: spaceTrim(`
                          Requests turning private mode on in the chat UI.
                          The user must explicitly confirm the action in a dialog before private mode is enabled.
                          Use this for sensitive topics or when the user asks not to store conversation data.
                      `),
                      parameters: {
                          type: 'object',
                          properties: {},
                          required: [],
                      },
                  },
              ];

        return this.appendToSystemMessage(
            {
                ...requirements,
                tools,
                _metadata: {
                    ...requirements._metadata,
                    usePrivacy: content || true,
                },
            },
            spaceTrim(
                (block) => `
                    Privacy mode:
                    - Use "${TURN_PRIVACY_ON_TOOL_NAME}" when the user asks for a private/sensitive conversation.
                    - This tool requests a UI confirmation dialog. Private mode is enabled only after user confirms.
                    - Current implementation uses the existing chat private mode (no chat persistence, memory persistence, or self-learning while active).
                    - Do not claim that end-to-end encryption is implemented yet.
                    ${block(extraInstructions)}
                `,
            ),
        );
    }

    /**
     * Gets human-readable titles for tool functions provided by this commitment.
     */
    getToolTitles(): Record<string_javascript_name, string> {
        return {
            [TURN_PRIVACY_ON_TOOL_NAME]: 'Turn privacy mode on',
        };
    }

    /**
     * Gets the `turn_privacy_on` tool function implementation.
     */
    getToolFunctions(): Record<string_javascript_name, ToolFunction> {
        return {
            async [TURN_PRIVACY_ON_TOOL_NAME](args: TurnPrivacyOnToolArgs): Promise<string> {
                const result = isPrivateModeEnabledInRuntimeContext(args)
                    ? createPrivacyAlreadyEnabledResult()
                    : createPrivacyConfirmationRequiredResult();

                return JSON.stringify(result);
            },
        };
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
