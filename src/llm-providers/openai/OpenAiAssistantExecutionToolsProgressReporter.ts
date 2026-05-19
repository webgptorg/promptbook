import colors from 'colors'; // <- TODO: [🔶] Make system to put color and style to both node and browser
import type { ChatPromptResult } from '../../execution/PromptResult';
import type { Usage } from '../../execution/Usage';
import { uncertainNumber } from '../../execution/utils/uncertainNumber';
import { UNCERTAIN_USAGE } from '../../execution/utils/usage-constants';
import type { Prompt } from '../../types/Prompt';
import type { string_markdown } from '../../types/string_markdown';
import type { string_date_iso8601 } from '../../types/string_token';
import { $getCurrentDate } from '../../utils/misc/$getCurrentDate';
import type { chococake } from '../../utils/organization/really_any';
import { exportJson } from '../../utils/serialization/exportJson';

/**
 * Handles progress emission, verbose logging, and final result assembly.
 *
 * @private helper of `OpenAiAssistantExecutionTools`
 */
export class OpenAiAssistantExecutionToolsProgressReporter {
    /**
     * Creates one reporter instance.
     */
    public constructor(private readonly options: { readonly isVerbose: boolean }) {}

    /**
     * Logs one assistant chat call when verbose output is enabled.
     */
    public logAssistantChatCall(prompt: Prompt): void {
        if (this.options.isVerbose) {
            console.info('💬 OpenAI callChatModel call', { prompt });
        }
    }

    /**
     * Logs one assistant request payload when verbose output is enabled.
     */
    public logVerboseAssistantRequest(label: string, rawRequest: unknown): void {
        if (this.options.isVerbose) {
            console.info(colors.bgWhite(label), JSON.stringify(rawRequest, null, 4));
        }
    }

    /**
     * Emits one assistant progress chunk with shared timing and prompt metadata.
     */
    public emitAssistantProgress(options: {
        readonly start: string_date_iso8601;
        readonly rawPromptContent: string;
        readonly onProgress: (chunk: ChatPromptResult) => void;
        readonly content?: string;
        readonly rawRequest?: chococake;
        readonly rawResponse?: chococake;
        readonly toolCalls?: ChatPromptResult['toolCalls'];
    }): void {
        options.onProgress({
            content: options.content || '',
            modelName: 'assistant',
            timing: {
                start: options.start,
                complete: $getCurrentDate(),
            },
            usage: UNCERTAIN_USAGE,
            rawPromptContent: options.rawPromptContent,
            rawRequest: options.rawRequest ?? (null as chococake),
            rawResponse: options.rawResponse ?? (null as chococake),
            toolCalls: options.toolCalls,
        });
    }

    /**
     * Creates the final assistant prompt result with uncertain usage plus measured duration.
     */
    public createAssistantPromptResult(options: {
        readonly content: string_markdown;
        readonly start: string_date_iso8601;
        readonly complete: string_date_iso8601;
        readonly rawPromptContent: string;
        readonly rawRequest: chococake;
        readonly rawResponse: chococake;
        readonly toolCalls?: ChatPromptResult['toolCalls'];
    }): ChatPromptResult {
        return {
            content: options.content,
            modelName: 'assistant',
            timing: {
                start: options.start,
                complete: options.complete,
            },
            usage: this.createAssistantUsage({
                start: options.start,
                complete: options.complete,
            }),
            rawPromptContent: options.rawPromptContent,
            rawRequest: options.rawRequest,
            rawResponse: options.rawResponse,
            toolCalls: options.toolCalls,
        };
    }

    /**
     * Wraps the final assistant prompt result in the standard exported JSON envelope.
     */
    public exportAssistantPromptResult(options: {
        readonly result: ChatPromptResult;
        readonly isWithTools: boolean;
    }): ChatPromptResult {
        return exportJson({
            name: 'promptResult',
            message: options.isWithTools
                ? `Result of \`OpenAiAssistantExecutionTools.callChatModelStream\` (with tools)`
                : `Result of \`OpenAiAssistantExecutionTools.callChatModelStream\``,
            order: [],
            value: options.result,
        });
    }

    /**
     * Computes the usage payload for assistant responses.
     */
    private createAssistantUsage(options: {
        readonly start: string_date_iso8601;
        readonly complete: string_date_iso8601;
    }): Usage {
        return {
            ...UNCERTAIN_USAGE,
            duration: uncertainNumber((new Date(options.complete).getTime() - new Date(options.start).getTime()) / 1000),
        };
    }
}
