import spaceTrim from 'spacetrim';
// TODO: [🏳‍🌈] Finally take pick of .json vs .ts
import PipelineCollection from '../../../../promptbook-collection/index.json';
// import PipelineCollection from '../../../../promptbook-collection/promptbook-collection';
import { createCollectionFromJson } from '../../../collection/constructors/createCollectionFromJson';
import { assertsExecutionSuccessful } from '../../../execution/assertsExecutionSuccessful';
import { createPipelineExecutor } from '../../../execution/createPipelineExecutor';
import type { LlmExecutionTools } from '../../../execution/LlmExecutionTools';
import type { KnowledgeJson } from '../../../types/PipelineJson/KnowledgeJson';
import type { PipelineJson } from '../../../types/PipelineJson/PipelineJson';
import type { string_href } from '../../../types/typeAliases';
import type { string_markdown } from '../../../types/typeAliases';
import type { string_markdown_text } from '../../../types/typeAliases';
import type { string_model_name } from '../../../types/typeAliases';
import type { string_name } from '../../../types/typeAliases';
import type { string_keyword } from '../../../utils/normalization/IKeywords';
import { normalizeToKebabCase } from '../../../utils/normalization/normalize-to-kebab-case';

type PrepareKnowledgeFromMarkdownOptions = {
    /**
     * The source of the knowledge in markdown format
     */
    content: string_markdown /* <- TODO: [🖖] Always the file */;

    /**
     * The LLM tools to use for the conversion and extraction of knowledge
     */
    llmTools: LlmExecutionTools;

    /**
     * If true, the preaparation of knowledge logs additional information
     *
     * @default false
     */
    isVerbose?: boolean;
};

export async function prepareKnowledgeFromMarkdown(
    options: PrepareKnowledgeFromMarkdownOptions,
): Promise<KnowledgeJson> {
    const { content, llmTools, isVerbose = false } = options;

    // TODO: [🌼] In future use `ptbk make` and maked getPipelineCollection
    const collection = createCollectionFromJson(...(PipelineCollection as Array<PipelineJson>));

    const prepareKnowledgeFromMarkdownExecutor = createPipelineExecutor({
        pipeline: await collection.getPipelineByUrl(
            'https://promptbook.studio/promptbook/prepare-knowledge-from-markdown.ptbk.md',
        ),
        tools: {
            llm: llmTools,
            script: [
                /* <- TODO: Allow to just keep script undefined */
            ],
        },
    });

    const prepareTitleExecutor = createPipelineExecutor({
        pipeline: await collection.getPipelineByUrl(
            'https://promptbook.studio/promptbook/prepare-knowledge-title.ptbk.md',
        ),
        tools: {
            llm: llmTools,
            script: [
                /* <- TODO: Allow to just keep script undefined */
            ],
        },
    });

    const prepareKeywordsExecutor = createPipelineExecutor({
        pipeline: await collection.getPipelineByUrl(
            'https://promptbook.studio/promptbook/prepare-knowledge-keywords.ptbk.md',
        ),
        tools: {
            llm: llmTools,
            script: [
                /* <- TODO: Allow to just keep script undefined */
            ],
        },
    });

    const result = await prepareKnowledgeFromMarkdownExecutor({ content });

    assertsExecutionSuccessful(result);

    const { outputParameters } = result;
    const { knowledge: knowledgeRaw } = outputParameters;

    const knowledgeTextPieces = (knowledgeRaw || '').split('\n---\n');

    if (isVerbose) {
        console.info('knowledgeTextPieces:', knowledgeTextPieces);
    }

    const knowledge = await Promise.all(
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
            const sources: Array<{ title: string_markdown_text; href: string_href }> = [];

            try {
                const titleResult = await prepareTitleExecutor({ content });
                const { title: titleRaw = 'Untitled' } = titleResult.outputParameters;
                title = spaceTrim(titleRaw) /* <- TODO: Maybe do in pipeline */;
                name = normalizeToKebabCase(title);

                // --- Keywords
                const keywordsResult = await prepareKeywordsExecutor({ content });
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

                index.push({
                    modelName: 'fake-model',
                    position: new Array(25).fill(0).map(() => Math.random() * 2 - 1),
                });

                // TODO: [🖖] !!!! Make system for sources and identification of sources
            } catch (error) {
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

    return knowledge;
}

/**
 * 11:11
 */
