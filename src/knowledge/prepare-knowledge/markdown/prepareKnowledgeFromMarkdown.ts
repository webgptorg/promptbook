import spaceTrim from 'spacetrim';
// TODO: [🏳‍🌈] Finally take pick of .json vs .ts
import PipelineCollection from '../../../../promptbook-collection/index.json';
// import PipelineCollection from '../../../../promptbook-collection/promptbook-collection';
import { createCollectionFromJson } from '../../../collection/constructors/createCollectionFromJson';
import { titleToName } from '../../../conversion/utils/titleToName';
import { assertsExecutionSuccessful } from '../../../execution/assertsExecutionSuccessful';
import { createPipelineExecutor } from '../../../execution/createPipelineExecutor';
import type { LlmExecutionTools } from '../../../execution/LlmExecutionTools';
import { KnowledgePiecePreparedJson } from '../../../types/PipelineJson/KnowledgePieceJson';
import type { PipelineJson } from '../../../types/PipelineJson/PipelineJson';
import type {
    string_href,
    string_markdown,
    string_markdown_text,
    string_model_name,
    string_name,
} from '../../../types/typeAliases';
import type { string_keyword } from '../../../utils/normalization/IKeywords';

type PrepareKnowledgeFromMarkdownOptions = {
    /**
     * The source of the knowledge in markdown format
     */
    content: string_markdown /* <- TODO: [🖖] Always the file */;

    /**
     * The LLM tools to use for the conversion and extraction of knowledge
     *
     * Note: If you want to use multiple LLMs, you can use `joinLlmExecutionTools` to join them first
     */
    llmTools: LlmExecutionTools;

    /**
     * If true, the preaparation of knowledge logs additional information
     *
     * @default false
     */
    isVerbose?: boolean;
};

/**
 * @@@
 */
export async function prepareKnowledgeFromMarkdown(
    options: PrepareKnowledgeFromMarkdownOptions,
): Promise<Omit<KnowledgePiecePreparedJson, 'source'>> {
    const { content, llmTools, isVerbose = false } = options;

    // TODO: [🌼] In future use `ptbk make` and maked getPipelineCollection
    const collection = createCollectionFromJson(...(PipelineCollection as Array<PipelineJson>));

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

    const result = await prepareKnowledgeFromMarkdownExecutor({ content });
    // TODO: [0] !!! Aggeregate usage

    assertsExecutionSuccessful(result);

    const { outputParameters } = result;
    const { knowledge: knowledgeRaw } = outputParameters;

    const knowledgeTextPieces = (knowledgeRaw || '').split('\n---\n');

    if (isVerbose) {
        console.info('knowledgeTextPieces:', knowledgeTextPieces);
    }

    // TODO: [0] !!! Aggeregate usage
    // const usage = ;

    const knowledge = await Promise.all(
        // TODO: !!! Do not send all at once but in chunks
        knowledgeTextPieces.map(async (knowledgeTextPiece, i) => {
            // Note: Theese are just default values, they will be overwritten by the actual values:
            let name: string_name = `piece-${i}`;
            let title: string_markdown_text = spaceTrim(knowledgeTextPiece.substring(0, 100));
            const content: string_markdown = spaceTrim(knowledgeTextPiece);
            let keywords: Array<string_keyword> = [];
            const index: Array<{
                modelName: string_model_name;
                position: Array<number>;
            }> = [];
            const sources: Array<{ title: string_markdown_text; href: string_href }> = [
                {
                    title: 'Markdown document' /* <- TODO: !!! Unhardcode */,
                    href: '#' /* <- TODO: !!! Unhardcode */,
                },
            ];

            try {
                const titleResult = await prepareTitleExecutor({ content });
                // TODO: [0] !!! Aggeregate usage
                const { title: titleRaw = 'Untitled' } = titleResult.outputParameters;
                title = spaceTrim(titleRaw) /* <- TODO: Maybe do in pipeline */;
                name = titleToName(title);

                // --- Keywords
                const keywordsResult = await prepareKeywordsExecutor({ content });
                // TODO: [0] !!! Aggeregate usage
                const { keywords: keywordsRaw = '' } = keywordsResult.outputParameters;
                keywords = (keywordsRaw || '')
                    .split(',')
                    .map((keyword) => keyword.trim())
                    .filter((keyword) => keyword !== '');
                if (isVerbose) {
                    console.info(`Keywords for "${title}":`, keywords);
                }
                // ---

                // TODO: !!!! Index through LLM model
                if (!llmTools.callEmbeddingModel) {
                    // TODO: [🟥] Detect browser / node and make it colorfull
                    console.error('No callEmbeddingModel function provided');
                } else {
                    // TODO: [🧠][🎛] Embedding via multiple models

                    const embeddingResult = await llmTools.callEmbeddingModel({
                        title: `Embedding for ${title}` /* <- Note: No impact on embedding result itself, just for logging */,
                        parameters: {},
                        content,
                        modelRequirements: {
                            modelVariant: 'EMBEDDING',
                        },
                    });

                    // TODO: [0] !!! Aggeregate usage embeddingResult.usage

                    index.push({
                        modelName: embeddingResult.modelName,
                        position: embeddingResult.content,
                    });
                }

                // TODO: [🖖] !!!! Make system for sources and identification of sources
            } catch (error) {
                // TODO: [🟥] Detect browser / node and make it colorfull
                console.error(error);
            }

            return {
                name,
                title,
                content,
                keywords,
                index,
                sources,
            };
        }),
    );

    if (isVerbose) {
        // TODO: [0] !!! Log usage
    }

    return knowledge;
}

/**
 * 11:11
 */
