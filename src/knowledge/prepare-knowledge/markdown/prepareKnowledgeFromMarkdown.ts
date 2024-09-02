import spaceTrim from 'spacetrim';
// TODO: [🏳‍🌈] Finally take pick of .json vs .ts
import PipelineCollection from '../../../../promptbook-collection/index.json';
// import PipelineCollection from '../../../../promptbook-collection/promptbook-collection';
import { createCollectionFromJson } from '../../../collection/constructors/createCollectionFromJson';
import { IS_VERBOSE } from '../../../config';
import { MAX_PARALLEL_COUNT } from '../../../config';
import { titleToName } from '../../../conversion/utils/titleToName';
import { assertsExecutionSuccessful } from '../../../execution/assertsExecutionSuccessful';
import { createPipelineExecutor } from '../../../execution/createPipelineExecutor/createPipelineExecutor';
import type { PrepareOptions } from '../../../prepare/PrepareOptions';
import type { KnowledgePiecePreparedJson } from '../../../types/PipelineJson/KnowledgePieceJson';
import type { PipelineJson } from '../../../types/PipelineJson/PipelineJson';
import type { string_markdown } from '../../../types/typeAliases';
import type { TODO_any } from '../../../utils/organization/TODO_any';
import { TODO_USE } from '../../../utils/organization/TODO_USE';

/**
 * @@@
 *
 * @public exported from `@promptbook/core`
 */
export async function prepareKnowledgeFromMarkdown(
    knowledgeContent: string_markdown /* <- TODO: [🖖] (?maybe not) Always the file */,
    options: PrepareOptions,
): Promise<Array<Omit<KnowledgePiecePreparedJson, 'sources' | 'preparationIds'> /* <- [🕡] */>> {
    const { llmTools, maxParallelCount = MAX_PARALLEL_COUNT, isVerbose = IS_VERBOSE } = options;

    TODO_USE(maxParallelCount); // <- [🪂]

    // TODO: [🌼] In future use `ptbk make` and maked getPipelineCollection
    const collection = createCollectionFromJson(...(PipelineCollection as TODO_any as Array<PipelineJson>));

    const prepareKnowledgeFromMarkdownExecutor = createPipelineExecutor({
        pipeline: await collection.getPipelineByUrl(
            'https://promptbook.studio/promptbook/prepare-knowledge-from-markdown.ptbk.md',
        ),
        tools: {
            llm: llmTools,
        },
    });

    const prepareTitleExecutor = createPipelineExecutor({
        pipeline: await collection.getPipelineByUrl(
            'https://promptbook.studio/promptbook/prepare-knowledge-title.ptbk.md',
        ),
        tools: {
            llm: llmTools,
        },
    });

    const prepareKeywordsExecutor = createPipelineExecutor({
        pipeline: await collection.getPipelineByUrl(
            'https://promptbook.studio/promptbook/prepare-knowledge-keywords.ptbk.md',
        ),
        tools: {
            llm: llmTools,
        },
    });

    const result = await prepareKnowledgeFromMarkdownExecutor({ knowledgeContent });

    assertsExecutionSuccessful(result);

    const { outputParameters } = result;
    const { knowledgePieces: knowledgePiecesRaw } = outputParameters;

    const knowledgeTextPieces = (knowledgePiecesRaw || '').split('\n---\n');
    //                                                               <- TODO: !!!!! Smarter split and filter out empty pieces

    if (isVerbose) {
        console.info('knowledgeTextPieces:', knowledgeTextPieces);
    }

    // const usage = ;

    const knowledge = await Promise.all(
        // TODO: [🪂] !! Do not send all at once but in chunks
        knowledgeTextPieces.map(async (knowledgeTextPiece, i) => {
            // Note: Theese are just default values, they will be overwritten by the actual values:
            let name: KnowledgePiecePreparedJson['name'] = `piece-${i}`;
            let title: KnowledgePiecePreparedJson['title'] = spaceTrim(knowledgeTextPiece.substring(0, 100));
            const knowledgePieceContent: KnowledgePiecePreparedJson['content'] = spaceTrim(knowledgeTextPiece);
            let keywords: KnowledgePiecePreparedJson['keywords'] = [];
            const index: KnowledgePiecePreparedJson['index'] = [];

            /*
            TODO: [☀] Track line and column of the source
            const sources: KnowledgePiecePreparedJson['sources'] = [
            ];
            */

            try {
                const titleResult = await prepareTitleExecutor({ knowledgePieceContent });
                const { title: titleRaw = 'Untitled' } = titleResult.outputParameters;
                title = spaceTrim(titleRaw) /* <- TODO: Maybe do in pipeline */;
                name = titleToName(title);

                // --- Keywords
                const keywordsResult = await prepareKeywordsExecutor({ knowledgePieceContent });
                const { keywords: keywordsRaw = '' } = keywordsResult.outputParameters;
                keywords = (keywordsRaw || '')
                    .split(',')
                    .map((keyword) => keyword.trim())
                    .filter((keyword) => keyword !== '');
                if (isVerbose) {
                    console.info(`Keywords for "${title}":`, keywords);
                }
                // ---

                if (!llmTools.callEmbeddingModel) {
                    // TODO: [🟥] Detect browser / node and make it colorfull
                    console.error('No callEmbeddingModel function provided');
                } else {
                    // TODO: [🧠][🎛] Embedding via multiple models

                    const embeddingResult = await llmTools.callEmbeddingModel({
                        title: `Embedding for ${title}` /* <- Note: No impact on embedding result itself, just for logging */,
                        parameters: {},
                        content: knowledgePieceContent,
                        modelRequirements: {
                            modelVariant: 'EMBEDDING',
                        },
                    });

                    index.push({
                        modelName: embeddingResult.modelName,
                        position: embeddingResult.content,
                    });
                }
            } catch (error) {
                // TODO: [🟥] Detect browser / node and make it colorfull
                console.error(error);
            }

            return {
                name,
                title,
                content: knowledgePieceContent,
                keywords,
                index,
                // <- TODO: [☀] sources,
            };
        }),
    );

    return knowledge;
}

/**
 * TODO: [🐝][🔼] !!! Export via `@promptbook/markdown`
 * TODO: [🪂] Do it in parallel 11:11
 * Note: No need to aggregate usage here, it is done by intercepting the llmTools
 */
