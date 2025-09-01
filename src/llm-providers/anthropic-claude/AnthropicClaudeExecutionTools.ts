import type { ClientOptions } from '@anthropic-ai/sdk';
import Anthropic from '@anthropic-ai/sdk';
import type { MessageCreateParamsNonStreaming } from '@anthropic-ai/sdk/resources';
import Bottleneck from 'bottleneck';
import colors from 'colors'; // <- TODO: [🔶] Make system to put color and style to both node and browser
import spaceTrim from 'spacetrim';
import { DEFAULT_MAX_REQUESTS_PER_MINUTE } from '../../config';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { AvailableModel } from '../../execution/AvailableModel';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult } from '../../execution/PromptResult';
import type { Prompt } from '../../types/Prompt';
import type { string_date_iso8601 } from '../../types/typeAliases';
import type { string_markdown } from '../../types/typeAliases';
import type { string_markdown_text } from '../../types/typeAliases';
import type { string_model_name } from '../../types/typeAliases';
import type { string_title } from '../../types/typeAliases';
import { $getCurrentDate } from '../../utils/$getCurrentDate';
import type { really_any } from '../../utils/organization/really_any';
import { templateParameters } from '../../utils/parameters/templateParameters';
import { exportJson } from '../../utils/serialization/exportJson';
import { LLM_PROVIDER_PROFILES } from '../_common/profiles/llmProviderProfiles';
import { ANTHROPIC_CLAUDE_MODELS } from './anthropic-claude-models';
import type { AnthropicClaudeExecutionToolsNonProxiedOptions } from './AnthropicClaudeExecutionToolsOptions';
import { computeAnthropicClaudeUsage } from './computeAnthropicClaudeUsage';

/**
 * Execution Tools for calling Anthropic Claude API.
 *
 * @public exported from `@promptbook/anthropic-claude`
 * @deprecated use `createAnthropicClaudeExecutionTools` instead
 */
export class AnthropicClaudeExecutionTools implements LlmExecutionTools /* <- TODO: [🍚] `, Destroyable` */ {
    /**
     * Anthropic Claude API client.
     */
    private client: Anthropic | null = null;
    private limiter: Bottleneck;

    /**
     * Creates Anthropic Claude Execution Tools.
     *
     * @param options which are relevant are directly passed to the Anthropic Claude client
     */
    public constructor(
        protected readonly options: AnthropicClaudeExecutionToolsNonProxiedOptions = { isProxied: false },
    ) {
        const rate = this.options.maxRequestsPerMinute || DEFAULT_MAX_REQUESTS_PER_MINUTE;
        this.limiter = new Bottleneck({ minTime: 60000 / rate });
    }

    public get title(): string_title & string_markdown_text {
        return 'Anthropic Claude';
    }

    public get description(): string_markdown {
        return 'Use all models provided by Anthropic Claude';
    }

    public get profile() {
        return LLM_PROVIDER_PROFILES.ANTHROPIC;
    }

    public async getClient(): Promise<Anthropic> {
        if (this.client === null) {
            // Note: Passing only Anthropic Claude relevant options to Anthropic constructor
            const anthropicOptions: ClientOptions = { ...this.options };
            delete (anthropicOptions as really_any).isVerbose;
            delete (anthropicOptions as really_any).isProxied;
            this.client = new Anthropic(anthropicOptions);
        }

        return this.client;
    }

    /**
     * Check the `options` passed to `constructor`
     */
    public async checkConfiguration(): Promise<void> {
        await this.getClient();
        // TODO: [🎍] Do here a real check that API is online, working and API key is correct
    }

    /**
     * List all available Anthropic Claude models that can be used
     */
    public listModels(): ReadonlyArray<AvailableModel> {
        return ANTHROPIC_CLAUDE_MODELS;
    }

    /**
     * Calls Anthropic Claude API to use a chat model.
     */
    public async callChatModel(
        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>,
    ): Promise<ChatPromptResult> {
        if (this.options.isVerbose) {
            console.info('💬 Anthropic Claude callChatModel call');
        }

        const { content, parameters, modelRequirements } = prompt;

        const client = await this.getClient();

        // TODO: [☂] Use here more modelRequirements
        if (modelRequirements.modelVariant !== 'CHAT') {
            throw new PipelineExecutionError('Use callChatModel only for CHAT variant');
        }

        const modelName = modelRequirements.modelName || this.getDefaultChatModel().modelName;

        const rawPromptContent = templateParameters(content, { ...parameters, modelName });
        const rawRequest: MessageCreateParamsNonStreaming = {
            model: modelRequirements.modelName || this.getDefaultChatModel().modelName,
            max_tokens: modelRequirements.maxTokens || 8192,
            temperature: modelRequirements.temperature,
            system: modelRequirements.systemMessage,
            messages: [
                {
                    role: 'user',
                    content: rawPromptContent,
                    // <- TODO: [🧠][♏] Maybe if expecting JSON and its not specified in prompt content, append the instructions
                    //    @see https://docs.anthropic.com/en/docs/test-and-evaluate/strengthen-guardrails/increase-consistency#specify-the-desired-output-format
                },
            ],
        };
        const start: string_date_iso8601 = $getCurrentDate();

        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawRequest'), JSON.stringify(rawRequest, null, 4));
        }
        const rawResponse = await this.limiter
            .schedule(() => client.messages.create(rawRequest))
            .catch((error) => {
                if (this.options.isVerbose) {
                    console.info(colors.bgRed('error'), error);
                }
                throw error;
            });

        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawResponse'), JSON.stringify(rawResponse, null, 4));
        }

        if (!rawResponse.content[0]) {
            throw new PipelineExecutionError('No content from Anthropic Claude');
        }

        if (rawResponse.content.length > 1) {
            throw new PipelineExecutionError('More than one content blocks from Anthropic Claude');
        }

        const contentBlock = rawResponse.content[0];

        if (contentBlock.type !== 'text') {
            throw new PipelineExecutionError(`Returned content is not "text" type but "${contentBlock.type}"`);
        }

        const resultContent = contentBlock.text;

        const complete = $getCurrentDate();
        const usage = computeAnthropicClaudeUsage(rawPromptContent || '', resultContent || '', rawResponse);

        return exportJson({
            name: 'promptResult',
            message: `Result of \`AnthropicClaudeExecutionTools.callChatModel\``,
            order: [],
            value: {
                content: resultContent,
                modelName: rawResponse.model,
                timing: {
                    start,
                    complete,
                },
                usage,
                rawPromptContent,
                rawRequest,
                rawResponse,
                // <- [🗯]
            },
        });
    }

    // <- Note: [🤖] callXxxModel

    /**
     * Get the model that should be used as default
     */
    private getDefaultModel(defaultModelName: string_model_name): AvailableModel {
        const model = ANTHROPIC_CLAUDE_MODELS.find(({ modelName }) => modelName.startsWith(defaultModelName));
        if (model === undefined) {
            throw new UnexpectedError(
                spaceTrim(
                    (block) =>
                        `
                          Cannot find model in Anthropic Claude models with name "${defaultModelName}" which should be used as default.

                          Available models:
                          ${block(ANTHROPIC_CLAUDE_MODELS.map(({ modelName }) => `- "${modelName}"`).join('\n'))}

                      `,
                ),
            );
        }
        return model;
    }

    /**
     * Default model for chat variant.
     */
    private getDefaultChatModel(): AvailableModel {
        return this.getDefaultModel('claude-sonnet-4-20250514');
    }

    // <- Note: [🤖] getDefaultXxxModel
}

/**
 * TODO:  [🍆] JSON mode
 * TODO: [🧠] Maybe handle errors via transformAnthropicError (like transformAzureError)
 * TODO: Maybe Create some common util for callChatModel and callCompletionModel
 * TODO: Maybe make custom OpenAiError
 * TODO: [🧠][🈁] Maybe use `isDeterministic` from options
 * TODO: [🧠][🌰] Allow to pass `title` for tracking purposes
 * TODO: [📅] Maybe instead of `RemoteLlmExecutionToolsOptions` use `proxyWithAnonymousRemoteServer` (if implemented)
 */
