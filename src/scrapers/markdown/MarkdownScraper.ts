import spaceTrim from 'spacetrim';
import type { KnowledgePiecePreparedJson } from '../../pipeline/PipelineJson/KnowledgePieceJson';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import type { Scraper, ScraperSourceHandler } from '../_common/Scraper';
// TODO: [🏳‍🌈] Finally take pick of .json vs .ts
import PipelineCollection from '../../../books/index.json';
// import PipelineCollection from '../../../books/books';
import type { WritableDeep } from 'type-fest';
import { createCollectionFromJson } from '../../collection/pipeline-collection/constructors/createCollectionFromJson';
import { DEFAULT_IS_VERBOSE, DEFAULT_MAX_PARALLEL_COUNT } from '../../config';
import { MissingToolsError } from '../../errors/MissingToolsError';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import { createPipelineExecutor } from '../../execution/createPipelineExecutor/00-createPipelineExecutor';
import type { ExecutionTools } from '../../execution/ExecutionTools';
import { getSingleLlmExecutionTools } from '../../llm-providers/_multiple/getSingleLlmExecutionTools';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';
import { titleToName } from '../../utils/normalization/titleToName';
import type { TODO_any } from '../../utils/organization/TODO_any';
import type { ScraperAndConverterMetadata } from '../_common/register/ScraperAndConverterMetadata';
import { markdownScraperMetadata } from './register-metadata';

/**
 * Scraper for markdown files
 *
 * @see `documentationUrl` for more details
 * @public exported from `@promptbook/markdown-utils`
 */
export class MarkdownScraper implements Scraper {
    /**
     * Metadata of the scraper which includes title, mime types, etc.
     */
    public get metadata(): ScraperAndConverterMetadata {
        return markdownScraperMetadata;
    }

    public constructor(
        private readonly tools: Pick<ExecutionTools, 'llm'>,
        private readonly options: PrepareAndScrapeOptions,
    ) {}

    /**
     * Scrapes the markdown file and returns the knowledge pieces or `null` if it can't scrape it
     */
    public async scrape(
        source: ScraperSourceHandler,
    ): Promise<ReadonlyArray<Omit<KnowledgePiecePreparedJson, 'sources' | 'preparationIds'>> | null> {
        const { maxParallelCount = DEFAULT_MAX_PARALLEL_COUNT, isVerbose = DEFAULT_IS_VERBOSE } = this.options;
        const { llm } = this.tools;

        if (llm === undefined) {
            throw new MissingToolsError('LLM tools are required for scraping external files');
            // <- Note: This scraper is used in all other scrapers, so saying "external files" not "markdown files"
        }

        const llmTools = getSingleLlmExecutionTools(llm);

        TODO_USE(maxParallelCount); // <- [🪂]

        // TODO: [🌼] In future use `ptbk make` and made getPipelineCollection
        const collection = createCollectionFromJson(...(PipelineCollection as TODO_any as ReadonlyArray<PipelineJson>));

        const prepareKnowledgeFromMarkdownExecutor = createPipelineExecutor({
            pipeline: await collection.getPipelineByUrl(
                'https://promptbook.studio/promptbook/prepare-knowledge-from-markdown.book',
            ),
            tools: {
                llm: llm,
            },
        });

        const prepareTitleExecutor = createPipelineExecutor({
            pipeline: await collection.getPipelineByUrl(
                'https://promptbook.studio/promptbook/prepare-knowledge-title.book',
            ),
            tools: {
                llm: llm,
            },
        });

        const prepareKeywordsExecutor = createPipelineExecutor({
            pipeline: await collection.getPipelineByUrl(
                'https://promptbook.studio/promptbook/prepare-knowledge-keywords.book',
            ),
            tools: {
                llm: llm,
            },
        });

        const knowledgeContent = await source.asText();

        const result = await prepareKnowledgeFromMarkdownExecutor({ knowledgeContent }).asPromise({
            isCrashedOnError: true,
        });

        const { outputParameters } = result;
        const { knowledgePieces: knowledgePiecesRaw } = outputParameters;

        const knowledgeTextPieces = (knowledgePiecesRaw || '').split('\n---\n');
        //                                                               <- TODO: [main] Smarter split and filter out empty pieces

        if (isVerbose) {
            console.info('knowledgeTextPieces:', knowledgeTextPieces);
        }

        // const usage = ;

        const knowledge = await Promise.all(
            // TODO: [🪂] Do not send all at once but in chunks
            knowledgeTextPieces.map(async (knowledgeTextPiece, i) => {
                // Note: These are just default values, they will be overwritten by the actual values:
                let name: KnowledgePiecePreparedJson['name'] = `piece-${i}`;
                let title: KnowledgePiecePreparedJson['title'] = spaceTrim(knowledgeTextPiece.substring(0, 100));
                const knowledgePieceContent: KnowledgePiecePreparedJson['content'] = spaceTrim(knowledgeTextPiece);
                let keywords: KnowledgePiecePreparedJson['keywords'] = [];
                const index: WritableDeep<KnowledgePiecePreparedJson['index']> = [];

                /*
              TODO: [☀] Track line and column of the source
              const sources: KnowledgePiecePreparedJson['sources'] = [
              ];
              */

                try {
                    const titleResult = await prepareTitleExecutor({ knowledgePieceContent }).asPromise({
                        isCrashedOnError: true,
                    });
                    const { title: titleRaw = 'Untitled' } = titleResult.outputParameters;
                    title = spaceTrim(titleRaw) /* <- TODO: Maybe do in pipeline */;
                    name = titleToName(title);

                    // --- Keywords
                    const keywordsResult = await prepareKeywordsExecutor({ knowledgePieceContent }).asPromise({
                        isCrashedOnError: true,
                    });
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
                        // TODO: [🟥] Detect browser / node and make it colorful
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
                            position: [...embeddingResult.content],
                            // <- TODO: [🪓] Here should be no need for spreading new array, just `position: embeddingResult.content`
                        });
                    }
                } catch (error) {
                    // Note: Here is expected error:
                    //     > PipelineExecutionError: You have not provided any `LlmExecutionTools` that support model variant "EMBEDDING
                    if (!(error instanceof PipelineExecutionError)) {
                        throw error;
                    }

                    // TODO: [🟥] Detect browser / node and make it colorful
                    console.error(
                        error,
                        "<- Note: This error is not critical to prepare the pipeline, just knowledge pieces won't have embeddings",
                    );
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
}

/**
 * TODO: [🪂] Do it in parallel 11:11
 * Note: No need to aggregate usage here, it is done by intercepting the llmTools
 */
