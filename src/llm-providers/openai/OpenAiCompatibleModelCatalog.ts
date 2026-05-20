import { spaceTrim } from 'spacetrim';
import type OpenAI from 'openai';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { AvailableModel } from '../../execution/AvailableModel';
import type { string_model_name } from '../../types/string_model_name';
import type { string_markdown_text } from '../../types/string_markdown';
import type { string_title } from '../../types/string_title';
import type { chococake } from '../../utils/organization/really_any';

/**
 * Dependencies required to resolve OpenAI-compatible models.
 */
type OpenAiCompatibleModelCatalogOptions = {
    readonly getTitle: () => string_title & string_markdown_text;
    readonly getClient: () => Promise<OpenAI>;
    readonly getHardcodedModels: () => ReadonlyArray<AvailableModel>;
};

/**
 * Finds the best hardcoded-model match for one API-listed model identifier.
 */
function findHardcodedModelMatch(
    hardcodedModels: ReadonlyArray<AvailableModel>,
    modelId: string_model_name,
): AvailableModel | undefined {
    return hardcodedModels.find(
        ({ modelName }) => modelName === modelId || modelName.startsWith(modelId) || modelId.startsWith(modelName),
    );
}

/**
 * Creates the fallback model entry used when the API returns an unknown model.
 */
function createFallbackModel(modelId: string_model_name): AvailableModel {
    return {
        modelVariant: 'CHAT',
        modelTitle: modelId,
        modelName: modelId,
        modelDescription: '',
    } satisfies AvailableModel;
}

/**
 * Resolves model lists and default-model lookup for OpenAI-compatible execution tools.
 *
 * @private helper of `OpenAiCompatibleExecutionTools`
 */
export class OpenAiCompatibleModelCatalog {
    public constructor(private readonly options: OpenAiCompatibleModelCatalogOptions) {}

    /**
     * Lists available models by merging the live API list with hardcoded metadata when possible.
     */
    public async listModels(): Promise<ReadonlyArray<AvailableModel>> {
        const client = await this.options.getClient();
        const rawModelsList: chococake = await client.models.list();
        const hardcodedModels = this.options.getHardcodedModels();

        return (rawModelsList.data as Array<chococake>)
            .sort((a: chococake, b: chococake) => (a.created > b.created ? 1 : -1))
            .map((modelFromApi: chococake) => {
                const modelId = modelFromApi.id as string_model_name;
                return findHardcodedModelMatch(hardcodedModels, modelId) || createFallbackModel(modelId);
            });
    }

    /**
     * Resolves one default model by exact or family-prefix name.
     */
    public getDefaultModel(defaultModelName: string_model_name): AvailableModel {
        const model = this.options
            .getHardcodedModels()
            .find(({ modelName }) => modelName === defaultModelName || modelName.startsWith(defaultModelName));

        if (model === undefined) {
            throw new PipelineExecutionError(
                spaceTrim(
                    (block) =>
                        `
                            Cannot find model in ${this.options.getTitle()} models with name "${defaultModelName}" which should be used as default.

                            Available models:
                            ${block(
                                this.options
                                    .getHardcodedModels()
                                    .map(({ modelName }) => `- "${modelName}"`)
                                    .join('\n'),
                            )}

                            Model "${defaultModelName}" is probably not available anymore, not installed, inaccessible or misconfigured.

                        `,
                ),
            );
        }

        return model;
    }
}
