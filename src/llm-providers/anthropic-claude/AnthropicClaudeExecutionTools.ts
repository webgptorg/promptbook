import type { ClientOptions } from '@anthropic-ai/sdk';
import Anthropic from '@anthropic-ai/sdk';
import type { MessageCreateParamsNonStreaming } from '@anthropic-ai/sdk/resources';
import colors from 'colors';
import spaceTrim from 'spacetrim';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { AvailableModel } from '../../execution/AvailableModel';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult } from '../../execution/PromptResult';
import type { Prompt } from '../../types/Prompt';
import type {
    string_date_iso8601,
    string_markdown,
    string_markdown_text,
    string_model_name,
    string_title,
} from '../../types/typeAliases';
import { getCurrentIsoDate } from '../../utils/getCurrentIsoDate';
import type { really_any } from '../../utils/organization/really_any';
import { replaceParameters } from '../../utils/replaceParameters';
import { ANTHROPIC_CLAUDE_MODELS } from './anthropic-claude-models';
import type { AnthropicClaudeExecutionToolsDirectOptions } from './AnthropicClaudeExecutionToolsOptions';
import { computeAnthropicClaudeUsage } from './computeAnthropicClaudeUsage';

/**
 * Execution Tools for calling Anthropic Claude API.
 *
 * @public exported from `@promptbook/anthropic-claude`
 * @deprecated use `createAnthropicClaudeExecutionTools` instead
 */
export class AnthropicClaudeExecutionTools implements LlmExecutionTools {
    /**
     * Anthropic Claude API client.
     */
    private readonly client: Anthropic;

    /**
     * Creates Anthropic Claude Execution Tools.
     *
     * @param options which are relevant are directly passed to the Anthropic Claude client
     */
    public constructor(private readonly options: AnthropicClaudeExecutionToolsDirectOptions = { isProxied: false }) {
        // Note: Passing only Anthropic Claude relevant options to Anthropic constructor
        const anthropicOptions: ClientOptions = { ...options };
        delete (anthropicOptions as really_any).isVerbose;
        delete (anthropicOptions as really_any).isProxied;
        this.client = new Anthropic(anthropicOptions);
        // <- TODO: !!!!!! Lazy-load client
    }

    public get title(): string_title & string_markdown_text {
        return 'Anthropic Claude';
    }

    public get description(): string_markdown {
        return 'Use all models provided by Anthropic Claude';
    }

    /**
     * List all available Anthropic Claude models that can be used
     */
    public listModels(): Array<AvailableModel> {
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

        // TODO: [☂] Use here more modelRequirements
        if (modelRequirements.modelVariant !== 'CHAT') {
            throw new PipelineExecutionError('Use callChatModel only for CHAT variant');
        }

        const modelName = modelRequirements.modelName || this.getDefaultChatModel().modelName;

        const rawPromptContent = replaceParameters(content, { ...parameters, modelName });
        const rawRequest: MessageCreateParamsNonStreaming = {
            model: modelRequirements.modelName || this.getDefaultChatModel().modelName,
            max_tokens: modelRequirements.maxTokens || 4096,
            //                                            <- TODO: [🌾] Make some global max cap for maxTokens
            temperature: modelRequirements.temperature,
            system: modelRequirements.systemMessage,

            // <- TODO: [🈁] Use `seed` here AND/OR use is `isDeterministic` for entire execution tools
            // <- Note: [🧆]
            messages: [
                {
                    role: 'user',
                    content: rawPromptContent,
                },
            ],
            // TODO: Is here some equivalent of user identification?> user: this.options.user,
        };
        const start: string_date_iso8601 = getCurrentIsoDate();
        let complete: string_date_iso8601;

        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawRequest'), JSON.stringify(rawRequest, null, 4));
        }
        const rawResponse = await this.client.messages.create(rawRequest);
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

        // eslint-disable-next-line prefer-const
        complete = getCurrentIsoDate();
        const usage = computeAnthropicClaudeUsage(content, '', rawResponse);

        return {
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
        };
    }

    /*
    TODO: [👏]
    public async callCompletionModel(
        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>,
    ): Promise<PromptCompletionResult> {

        if (this.options.isVerbose) {
            console.info('🖋 Anthropic Claude callCompletionModel call');
        }

        const { content, parameters, modelRequirements } = prompt;

        // TODO: [☂] Use here more modelRequirements
        if (modelRequirements.modelVariant !== 'COMPLETION') {
            throw new PipelineExecutionError('Use callCompletionModel only for COMPLETION variant');
        }

        const modelName = modelRequirements.modelName || this.getDefaultChatModel().modelName;
        const modelSettings = {
            model: modelName,
            max_tokens: modelRequirements.maxTokens || 2000, // <- Note: 2000 is for lagacy reasons
            //                                                  <- TODO: [🌾] Make some global max cap for maxTokens
            // <- TODO: Use here `systemMessage`, `temperature` and `seed`
        };

        const rawRequest: xxxx.Completions.CompletionCreateParamsNonStreaming = {
            ...modelSettings,
            prompt: rawPromptContent,
            user: this.options.user,
        };
        const start: string_date_iso8601 = getCurrentIsoDate();
        let complete: string_date_iso8601;

        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawRequest'), JSON.stringify(rawRequest, null, 4));
        }
        const rawResponse = await this.client.completions.create(rawRequest);
        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawResponse'), JSON.stringify(rawResponse, null, 4));
        }

        if (!rawResponse.choices[0]) {
            throw new PipelineExecutionError('No choises from Anthropic Claude');
        }

        if (rawResponse.choices.length > 1) {
            // TODO: This should be maybe only warning
            throw new PipelineExecutionError('More than one choise from Anthropic Claude');
        }

        const resultContent = rawResponse.choices[0].text;
        // eslint-disable-next-line prefer-const
        complete = getCurrentIsoDate();
        const usage = { price: 'UNKNOWN', inputTokens: 0, outputTokens: 0 /* <- TODO: [🐞] Compute usage * / } satisfies PromptResultUsage;



        return {
            content: resultContent,
            modelName: rawResponse.model || model,
            timing: {
                start,
                complete,
            },
            usage,
            rawResponse,
            // <- [🗯]
        };
    }
    */

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
                          Cannot find model in OpenAI models with name "${defaultModelName}" which should be used as default.

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
        return this.getDefaultModel('claude-3-opus');
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
