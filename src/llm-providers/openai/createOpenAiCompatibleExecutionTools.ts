import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { AvailableModel } from '../../execution/AvailableModel';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { LlmExecutionToolsConstructor } from '../../execution/LlmExecutionToolsConstructor';
import type { Usage } from '../../execution/Usage';
import { UNCERTAIN_ZERO_VALUE } from '../../execution/utils/usage-constants';
import type { string_markdown, string_markdown_text, string_model_name, string_title } from '../../types/typeAliases';
import { $isRunningInBrowser } from '../../utils/environment/$isRunningInBrowser';
import { $isRunningInWebWorker } from '../../utils/environment/$isRunningInWebWorker';
import { RemoteLlmExecutionTools } from '../remote/RemoteLlmExecutionTools';
import { computeOpenAiUsage } from './computeOpenAiUsage';
import { OpenAiCompatibleExecutionTools } from './OpenAiCompatibleExecutionTools';
import type {
    OpenAiCompatibleExecutionToolsNonProxiedOptions,
    OpenAiCompatibleExecutionToolsOptions,
} from './OpenAiCompatibleExecutionToolsOptions';

/**
 * Execution Tools for calling OpenAI compatible API
 *
 * Note: This can be used for any OpenAI compatible APIs
 *
 * @public exported from `@promptbook/openai`
 */
export const createOpenAiCompatibleExecutionTools = Object.assign(
    (
        options: OpenAiCompatibleExecutionToolsOptions & {
            /**
             * The model name to use for all operations
             *
             * This will be the only model available through this LLM provider and it will be a chat model.
             * Other variants won't be available for now.
             */
            defaultModelName: string_model_name;
        },
    ): OpenAiCompatibleExecutionTools | RemoteLlmExecutionTools => {
        if (options.isProxied) {
            return new RemoteLlmExecutionTools({
                ...options,
                identification: {
                    isAnonymous: true,
                    llmToolsConfiguration: [
                        {
                            title: 'OpenAI Compatible (proxied)',
                            packageName: '@promptbook/openai',
                            className: 'OpenAiCompatibleExecutionTools',
                            options: {
                                ...options,
                                isProxied: false,
                            },
                        },
                    ],
                },
            });
        }

        if (($isRunningInBrowser() || $isRunningInWebWorker()) && !options.dangerouslyAllowBrowser) {
            options = { ...options, dangerouslyAllowBrowser: true };
        }

        return new HardcodedOpenAiCompatibleExecutionTools(options.defaultModelName, options);
    },
    {
        packageName: '@promptbook/openai',
        className: 'OpenAiCompatibleExecutionTools',
    },
) satisfies LlmExecutionToolsConstructor;

/**
 * Execution Tools for calling ONE SPECIFIC PRECONFIGURED OpenAI compatible provider
 *
 * @private for `createOpenAiCompatibleExecutionTools`
 */
export class HardcodedOpenAiCompatibleExecutionTools
    extends OpenAiCompatibleExecutionTools
    implements LlmExecutionTools
{
    /**
     * Creates OpenAI compatible Execution Tools.
     *
     * @param options which are relevant are directly passed to the OpenAI compatible client
     */
    public constructor(
        private readonly defaultModelName: string_model_name,
        protected readonly options: OpenAiCompatibleExecutionToolsNonProxiedOptions,
    ) {
        super(options);
    }

    public get title(): string_title & string_markdown_text {
        return `${this.defaultModelName} on ${this.options.baseURL}`;
    }

    public get description(): string_markdown {
        return `OpenAI compatible connected to "${this.options.baseURL}" model "${this.defaultModelName}"`;
    }

    /**
     * List all available models (non dynamically)
     *
     * Note: Purpose of this is to provide more information about models than standard listing from API
     */
    protected get HARDCODED_MODELS(): ReadonlyArray<AvailableModel> {
        return [
            {
                modelName: this.defaultModelName,
                modelVariant: 'CHAT',
                modelDescription: '', // <- TODO: What is the best value here, maybe `this.description`?
            },
        ];
    }

    /**
     * Computes the usage
     */
    protected computeUsage(...args: Parameters<typeof computeOpenAiUsage>): Usage {
        return {
            ...computeOpenAiUsage(...args),
            price: UNCERTAIN_ZERO_VALUE, // <- TODO: Maybe in future pass this counting mechanism, but for now, we dont know
        };
    }

    /**
     * Default model for chat variant.
     */
    protected getDefaultChatModel(): AvailableModel {
        return this.getDefaultModel(this.defaultModelName);
    }

    /**
     * Default model for completion variant.
     */
    protected getDefaultCompletionModel(): AvailableModel {
        throw new PipelineExecutionError(`${this.title} does not support COMPLETION model variant`);
    }

    /**
     * Default model for completion variant.
     */
    protected getDefaultEmbeddingModel(): AvailableModel {
        throw new PipelineExecutionError(`${this.title} does not support EMBEDDING model variant`);
    }

    /**
     * Default model for completion variant.
     */
    protected getDefaultImageGenerationModel(): AvailableModel {
        throw new PipelineExecutionError(`${this.title} does not support IMAGE_GENERATION model variant`);
    }

    // <- Note: [🤖] getDefaultXxxModel
}

/**
 * TODO: [🦺] Is there some way how to put `packageName` and `className` on top and function definition on bottom?
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
