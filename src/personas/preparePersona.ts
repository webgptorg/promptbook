import PipelineCollection from '../../books/index.json';
import { createPipelineCollectionFromJson } from '../collection/pipeline-collection/constructors/createPipelineCollectionFromJson';
import { DEFAULT_IS_VERBOSE } from '../config';
import { MissingToolsError } from '../errors/MissingToolsError';
import { createPipelineExecutor } from '../execution/createPipelineExecutor/00-createPipelineExecutor';
import type { ExecutionTools } from '../execution/ExecutionTools';
import { jsonParse } from '../formats/json/utils/jsonParse';
import { getSingleLlmExecutionTools } from '../llm-providers/_multiple/getSingleLlmExecutionTools';
import type { PersonaPreparedJson } from '../pipeline/PipelineJson/PersonaJson';
import type { PipelineJson } from '../pipeline/PipelineJson/PipelineJson';
import type { PrepareAndScrapeOptions } from '../prepare/PrepareAndScrapeOptions';
import type { string_persona_description } from '../types/typeAliases';
import type { TODO_any } from '../utils/organization/TODO_any';

/**
 * Prepares the persona for the pipeline
 *
 * @see https://github.com/webgptorg/promptbook/discussions/22
 * @public exported from `@promptbook/core`
 */
export async function preparePersona(
    personaDescription: string_persona_description,
    tools: Pick<ExecutionTools, 'llm'>,
    options: PrepareAndScrapeOptions,
): Promise<Pick<PersonaPreparedJson, 'modelsRequirements'>> {
    const { isVerbose = DEFAULT_IS_VERBOSE } = options;

    if (tools === undefined || tools.llm === undefined) {
        throw new MissingToolsError('LLM tools are required for preparing persona');
    }

    // TODO: [🌼] In future use `ptbk make` and made getPipelineCollection
    const collection = createPipelineCollectionFromJson(
        ...(PipelineCollection as TODO_any as ReadonlyArray<PipelineJson>),
    );

    const preparePersonaExecutor = createPipelineExecutor({
        pipeline: await collection.getPipelineByUrl('https://promptbook.studio/promptbook/prepare-persona.book'),
        tools,
    });

    const llmTools = getSingleLlmExecutionTools(tools.llm);

    const availableModels = (await llmTools.listModels())
        .filter(({ modelVariant }) => modelVariant === 'CHAT')
        .map(({ modelName, modelDescription }) => ({
            modelName,
            modelDescription,
            // <- Note: `modelTitle` and `modelVariant` is not relevant for this task
        }));

    const result = await preparePersonaExecutor({
        availableModels /* <- Note: Passing as JSON */,
        personaDescription,
    }).asPromise({ isCrashedOnError: true });

    const { outputParameters } = result;
    const { modelsRequirements: modelsRequirementsJson } = outputParameters;

    let modelsRequirementsUnchecked: Array<TODO_any> = jsonParse(modelsRequirementsJson!);

    if (isVerbose) {
        console.info(`PERSONA ${personaDescription}`, modelsRequirementsUnchecked);
    }

    if (!Array.isArray(modelsRequirementsUnchecked)) {
        // <- TODO: Book should have syntax and system to enforce shape of JSON

        modelsRequirementsUnchecked = [modelsRequirementsUnchecked];
        /*
        throw new UnexpectedError(
            spaceTrim(
                (block) => `
                    Invalid \`modelsRequirements\`:

                    \`\`\`json
                    ${block(JSON.stringify(modelsRequirementsUnchecked, null, 4))}
                    \`\`\`
                `,
            ),
        );
        */
    }

    const modelsRequirements: PersonaPreparedJson['modelsRequirements'] = modelsRequirementsUnchecked.map(
        (modelRequirements) => ({
            modelVariant: 'CHAT',
            ...modelRequirements,
        }),
    );

    return {
        modelsRequirements,
    };
}

/**
 * TODO: [😩] DRY `preparePersona` and `selectBestModelFromAvailable`
 * TODO: [🔃][main] If the persona was prepared with different version or different set of models, prepare it once again
 * TODO: [🏢] Check validity of `modelName` in pipeline
 * TODO: [🏢] Check validity of `systemMessage` in pipeline
 * TODO: [🏢] Check validity of `temperature` in pipeline
 */
