import { spaceTrim } from 'spacetrim';
import { forTime } from 'waitasecond';
import type { ChatParticipant } from '../../book-components/Chat/types/ChatParticipant';
import type { AvailableModel } from '../../execution/AvailableModel';
import type { CommonToolsOptions } from '../../execution/CommonToolsOptions';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult, CompletionPromptResult } from '../../execution/PromptResult';
import { ZERO_USAGE } from '../../execution/utils/usage-constants';
import type { ChatPrompt, Prompt } from '../../types/Prompt';
import type { string_markdown, string_markdown_text, string_name, string_title } from '../../types/typeAliases';
import { $getCurrentDate } from '../../utils/misc/$getCurrentDate';
import { templateParameters } from '../../utils/parameters/templateParameters';
import { exportJson } from '../../utils/serialization/exportJson';

/**
 * Profile for Mocked Echo provider
 */
const MOCKED_ECHO_PROVIDER_PROFILE: ChatParticipant = {
    name: 'MOCKED_ECHO' as string_name,
    fullname: 'Echo (Test)',
    color: '#8b5cf6',
} as const;

/**
 * Mocked execution Tools for just echoing the requests for testing purposes.
 *
 * @public exported from `@promptbook/fake-llm`
 */
export class MockedEchoLlmExecutionTools implements LlmExecutionTools /* <- TODO: [🍚] `, Destroyable` */ {
    public constructor(protected readonly options: CommonToolsOptions = {}) {}

    public get title(): string_title & string_markdown_text {
        return 'Mocked echo';
    }

    public get description(): string_markdown {
        return 'What you say is whay you get - just for testing';
    }

    public get profile() {
        return MOCKED_ECHO_PROVIDER_PROFILE;
    }

    /**
     * Does nothing, just to implement the interface
     */
    public checkConfiguration(): void {}

    /**
     * List all available mocked-models that can be used
     */
    public listModels(): ReadonlyArray<AvailableModel> {
        return [
            {
                modelTitle: 'Echo chat',
                modelName: 'mocked-echo',
                modelVariant: 'CHAT',
                modelDescription:
                    'Mocked chat model that echoes back the input prompt for testing purposes. Simply returns what was sent to it.',
            },
            {
                modelTitle: 'Echo completion',
                modelName: 'mocked-echo',
                modelVariant: 'COMPLETION',
                modelDescription:
                    'Mocked completion model that echoes back the input prompt for testing purposes. Returns the input with minor additions.',
            },
            // <- Note: [🤖]
        ];
    }

    /**
     * Mocks chat model
     */
    public async callChatModel(
        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>,
    ): Promise<ChatPromptResult> {
        if (this.options.isVerbose) {
            console.info('💬 Mocked callChatModel call');
        }

        const start = $getCurrentDate();

        await forTime((1 + Math.random() * 4) * 1000);

        const complete = $getCurrentDate();

        const modelName = 'mocked-echo';
        const rawPromptContent = templateParameters(prompt.content, { ...prompt.parameters, modelName });

        const duration = {
            value: (new Date(complete).getTime() - new Date(start).getTime()) / 1000,
        };

        const usage = { ...ZERO_USAGE, duration };
        //      <- TODO: [🧠] Compute here at least words, characters,... etc

        const thread = (prompt as ChatPrompt) /* <- [🩱] */.thread;

        return exportJson({
            name: 'promptResult',
            message: `Result of \`MockedEchoLlmExecutionTools.callChatModel\``,
            order: [],
            value: {
                // Note: The „quotes“ are intentional to test AI humanization and Promptbookification
                content: spaceTrim(
                    (block) => `
                    You said:
                    „${block(rawPromptContent)}“${thread ? ` +${thread.length} other messages` : ''}

                    [1️⃣ Say that again!](?message=${encodeURIComponent(rawPromptContent)})
                    [2️⃣ Say that twice!](?message=${encodeURIComponent(rawPromptContent).repeat(2)})
                    [3️⃣ Say that thrice!](?message=${encodeURIComponent(rawPromptContent).repeat(3)})
                `,
                ),
                modelName,
                timing: {
                    start,
                    complete,
                },
                usage,
                rawPromptContent,
                rawRequest: null,
                rawResponse: {
                    note: 'This is mocked echo',
                },
                // <- [🗯]
            },
        });
    }

    /**
     * Mocks completion model
     */
    public async callCompletionModel(
        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>,
    ): Promise<CompletionPromptResult> {
        if (this.options.isVerbose) {
            console.info('🖋 Mocked callCompletionModel call');
        }

        const start = $getCurrentDate();

        await forTime((1 + Math.random() * 4) * 1000);

        const complete = $getCurrentDate();

        const modelName = 'mocked-echo';
        const rawPromptContent = templateParameters(prompt.content, { ...prompt.parameters, modelName });

        const duration = {
            value: (new Date(complete).getTime() - new Date(start).getTime()) / 1000,
        };

        const usage = { ...ZERO_USAGE, duration };
        //      <- TODO: [🧠] Compute here at least words, characters,... etc

        return exportJson({
            name: 'promptResult',
            message: `Result of \`MockedEchoLlmExecutionTools.callCompletionModel\``,
            order: [],
            value: {
                content: spaceTrim(
                    (block) => `
                    ${block(rawPromptContent)}
                    And so on...
                `,
                ),
                modelName,
                timing: {
                    start,
                    complete,
                },
                usage,
                rawPromptContent,
                rawRequest: null,
                rawResponse: {
                    note: 'This is mocked echo',
                },
                // <- [🗯]
            },
        });
    }

    // <- Note: [🤖] callXxxModel
}

/**
 * TODO: [🧠][🈁] Maybe use `isDeterministic` from options
 * TODO: Allow in spaceTrim: nesting with > ${block(prompt.request)}, same as replace params
 */
