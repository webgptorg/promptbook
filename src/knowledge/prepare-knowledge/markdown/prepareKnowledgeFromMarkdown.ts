import spaceTrim from 'spacetrim';
// TODO: [🏳‍🌈] Finally take pick of .json vs .ts
import promptbookLibrary from '../../../../promptbook-library/index.json';
// import promptbookLibrary from '../../../../promptbook-library/promptbook-library';
import { assertsExecutionSuccessful } from '../../../execution/assertsExecutionSuccessful';
import { createPromptbookExecutor } from '../../../execution/createPromptbookExecutor';
import type { LlmExecutionTools } from '../../../execution/LlmExecutionTools';
import { createLibraryFromJson } from '../../../library/constructors/createLibraryFromJson';
import type { KnowledgeJson } from '../../../types/PromptbookJson/KnowledgeJson';
import type { PromptbookJson } from '../../../types/PromptbookJson/PromptbookJson';
import type {
    string_href,
    string_markdown,
    string_markdown_text,
    string_model_name,
    string_name,
} from '../../../types/typeAliases';
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

    // TODO: [🌼] In future use `promptbook make` and maked getPromptbookLibrary
    const library = createLibraryFromJson(...(promptbookLibrary as Array<PromptbookJson>));
    const prepareKnowledgeFromMarkdownPromptbook = await library.getPromptbookByUrl(
        'https://promptbook.studio/promptbook/prepare-knowledge-from-markdown.ptbk.md',
    );

    const prepareKnowledgeFromMarkdownExecutor = createPromptbookExecutor({
        promptbook: prepareKnowledgeFromMarkdownPromptbook,
        tools: {
            llm: llmTools,
            script: [
                /* <- TODO: Allow to just keep script undefined */
            ],
        },
    });

    const prepareKeywordsPromptbook = await library.getPromptbookByUrl(
        'https://promptbook.studio/promptbook/prepare-keywords.ptbk.md',
    );

    const prepareKeywordsExecutor = createPromptbookExecutor({
        promptbook: prepareKeywordsPromptbook,
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
                // TODO: !!!! Summarize name and title from the content
                title = spaceTrim(knowledgeTextPiece.substring(0, 30));
                name = normalizeToKebabCase(title);

                // --- Keywords
                const result = await prepareKeywordsExecutor({ content });
                const { outputParameters = {} } = result;
                const { keywords: keywordsRaw } = outputParameters;
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
