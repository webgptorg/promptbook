import colors from 'colors'; // <- TODO: [🔶] Make system to put color and style to both node and browser
import OpenAI from 'openai';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { ChatPromptResult } from '../../execution/PromptResult';
import type { Prompt } from '../../types/Prompt';
import type { string_date_iso8601, string_token } from '../../types/string_token';
import { $getCurrentDate } from '../../utils/misc/$getCurrentDate';
import type { chococake } from '../../utils/organization/really_any';
import type { TODO_any } from '../../utils/organization/TODO_any';
import { OpenAiAssistantExecutionToolsProgressReporter } from './OpenAiAssistantExecutionToolsProgressReporter';
import { mapToolsToOpenAi } from './utils/mapToolsToOpenAi';

/**
 * Shared context for one assistant chat call after prompt preparation finishes.
 *
 * @private helper of `OpenAiAssistantExecutionToolsStreamRunner`
 */
type AssistantChatCallContext = {
    readonly client: OpenAI;
    readonly prompt: Prompt;
    readonly rawPromptContent: string;
    readonly threadMessages: ReadonlyArray<OpenAI.Beta.ThreadCreateAndRunParams.Thread.Message>;
    readonly start: string_date_iso8601;
    readonly onProgress: (chunk: ChatPromptResult) => void;
};

/**
 * Runs streaming assistant requests that do not require hosted tool execution.
 *
 * @private helper of `OpenAiAssistantExecutionTools`
 */
export class OpenAiAssistantExecutionToolsStreamRunner {
    /**
     * Creates one stream runner instance.
     */
    public constructor(
        private readonly options: {
            readonly assistantId: string_token;
            readonly isVerbose: boolean;
            readonly progressReporter: OpenAiAssistantExecutionToolsProgressReporter;
        },
    ) {}

    /**
     * Runs assistant calls without tools through the streaming Assistants API.
     */
    public async callChatModelStreamWithoutTools(context: AssistantChatCallContext): Promise<ChatPromptResult> {
        const rawRequest = this.createAssistantStreamingRequest(context);
        this.options.progressReporter.logVerboseAssistantRequest('rawRequest (streaming)', rawRequest);

        const stream = await context.client.beta.threads.createAndRunStream(rawRequest);
        this.attachAssistantStreamListeners({
            stream,
            start: context.start,
            rawPromptContent: context.rawPromptContent,
            rawRequest,
            onProgress: context.onProgress,
        });

        // TODO: [🐱‍🚀] Handle tool calls in assistants
        // Note: OpenAI Assistant streaming with tool calls requires special handling.
        // The stream will pause when a tool call is needed, and we need to:
        // 1. Wait for the run to reach 'requires_action' status
        // 2. Execute the tool calls
        // 3. Submit tool outputs via a separate API call (not on the stream)
        // 4. Continue the run
        // This requires switching to non-streaming mode or using the Runs API directly.
        // For now, tools with assistants should use the non-streaming chat completions API instead.

        const rawResponse = await stream.finalMessages();

        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawResponse'), JSON.stringify(rawResponse, null, 4));
        }

        const resultContent = await this.resolveAssistantStreamingResultContent({
            client: context.client,
            rawResponse,
        });
        const complete = $getCurrentDate();

        if (resultContent === null) {
            throw new PipelineExecutionError('No response message from OpenAI');
        }

        return this.options.progressReporter.exportAssistantPromptResult({
            result: this.options.progressReporter.createAssistantPromptResult({
                content: resultContent,
                start: context.start,
                complete,
                rawPromptContent: context.rawPromptContent,
                rawRequest: rawRequest as TODO_any,
                rawResponse: rawResponse as TODO_any,
            }),
            isWithTools: false,
        });
    }

    /**
     * Builds the streaming assistant request payload used when no tool execution flow is needed.
     */
    private createAssistantStreamingRequest(
        context: AssistantChatCallContext,
    ): OpenAI.Beta.ThreadCreateAndRunStreamParams {
        return {
            // TODO: [👨‍👨‍👧‍👧] ...modelSettings,
            // TODO: [👨‍👨‍👧‍👧][🧠] What about system message for assistants, does it make sense - combination of OpenAI assistants with Promptbook Personas

            assistant_id: this.options.assistantId, // <- [🙎]
            thread: {
                messages: [...context.threadMessages],
            },
            tools:
                context.prompt.modelRequirements.tools === undefined
                    ? undefined
                    : mapToolsToOpenAi(context.prompt.modelRequirements.tools),

            // <- TODO: Add user identification here> user: this.options.user,
        };
    }

    /**
     * Registers verbose stream diagnostics plus incremental text progress forwarding.
     */
    private attachAssistantStreamListeners(options: {
        readonly stream: OpenAI.Beta.Threads.AssistantStream;
        readonly start: string_date_iso8601;
        readonly rawPromptContent: string;
        readonly rawRequest: OpenAI.Beta.ThreadCreateAndRunStreamParams;
        readonly onProgress: (chunk: ChatPromptResult) => void;
    }): void {
        options.stream.on('connect', () => {
            if (this.options.isVerbose) {
                console.info('connect', options.stream.currentEvent);
            }
        });

        options.stream.on('textDelta', (textDelta, snapshot) => {
            if (this.options.isVerbose && textDelta.value) {
                console.info('textDelta', textDelta.value);
            }

            this.options.progressReporter.emitAssistantProgress({
                content: snapshot.value,
                start: options.start,
                rawPromptContent: options.rawPromptContent,
                rawRequest: options.rawRequest as TODO_any,
                rawResponse: snapshot as chococake,
                onProgress: options.onProgress,
            });
        });

        options.stream.on('messageCreated', (message) => {
            if (this.options.isVerbose) {
                console.info('messageCreated', message);
            }
        });

        options.stream.on('messageDone', (message) => {
            if (this.options.isVerbose) {
                console.info('messageDone', message);
            }
        });
    }

    /**
     * Resolves the final visible assistant text from a streaming response.
     */
    private async resolveAssistantStreamingResultContent(options: {
        readonly client: OpenAI;
        readonly rawResponse: Array<OpenAI.Beta.Threads.Message>;
    }): Promise<string | null> {
        const textContent = this.extractSingleAssistantTextContentBlock(options.rawResponse);

        return this.replaceAssistantFileCitationMarkers({
            client: options.client,
            textContent,
            resultContent: textContent.text.value,
        });
    }

    /**
     * Extracts the single text content block returned by the assistant stream.
     */
    private extractSingleAssistantTextContentBlock(
        rawResponse: Array<OpenAI.Beta.Threads.Message>,
    ): OpenAI.Beta.Threads.TextContentBlock {
        if (rawResponse.length !== 1) {
            throw new PipelineExecutionError(`There is NOT 1 BUT ${rawResponse.length} finalMessages from OpenAI`);
        }

        if (rawResponse[0]!.content.length !== 1) {
            throw new PipelineExecutionError(
                `There is NOT 1 BUT ${rawResponse[0]!.content.length} finalMessages content from OpenAI`,
            );
        }

        if (rawResponse[0]!.content[0]?.type !== 'text') {
            throw new PipelineExecutionError(
                `There is NOT 'text' BUT ${rawResponse[0]!.content[0]?.type} finalMessages content type from OpenAI`,
            );
        }

        return rawResponse[0]!.content[0];
    }

    /**
     * Rewrites file citation markers to use retrieved filenames instead of generic source labels.
     */
    private async replaceAssistantFileCitationMarkers(options: {
        readonly client: OpenAI;
        readonly textContent: OpenAI.Beta.Threads.TextContentBlock;
        readonly resultContent: string | null;
    }): Promise<string | null> {
        let resultContent = options.resultContent;
        const annotations = options.textContent.text.annotations;

        if (!annotations) {
            return resultContent;
        }

        const fileIdToName = new Map<string, string>();

        for (const annotation of annotations) {
            if (annotation.type !== 'file_citation') {
                continue;
            }

            const filename = await this.retrieveAssistantCitationFilename({
                client: options.client,
                fileId: annotation.file_citation.file_id,
                fileIdToName,
            });

            if (filename && resultContent) {
                const newText = annotation.text.replace(/†.*?】/, `†${filename}】`);
                resultContent = resultContent.replace(annotation.text, newText);
            }
        }

        return resultContent;
    }

    /**
     * Returns one citation filename, caching OpenAI file lookups across annotations.
     */
    private async retrieveAssistantCitationFilename(options: {
        readonly client: OpenAI;
        readonly fileId: string;
        readonly fileIdToName: Map<string, string>;
    }): Promise<string> {
        const cachedFilename = options.fileIdToName.get(options.fileId);

        if (cachedFilename) {
            return cachedFilename;
        }

        try {
            const file = await options.client.files.retrieve(options.fileId);
            options.fileIdToName.set(options.fileId, file.filename);
            return file.filename;
        } catch (error) {
            console.error(`Failed to retrieve file info for ${options.fileId}`, error);
            return 'Source';
        }
    }
}
