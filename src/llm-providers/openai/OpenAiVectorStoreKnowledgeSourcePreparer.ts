import { assertsError } from '../../errors/assertsError';
import { serializeError } from '../../errors/utils/serializeError';
import { isDataUrlKnowledgeSource, parseDataUrlKnowledgeSource } from '../../utils/knowledge/inlineKnowledgeSource';

/**
 * Prepared knowledge-source files together with skipped-source bookkeeping.
 *
 * @private internal utility of `OpenAiVectorStoreKnowledgeSourcePreparer`
 */
type PreparedKnowledgeSourceFiles = {
    readonly files: File[];
    readonly skippedSources: Array<{ source: string; reason: string }>;
    readonly totalBytes: number;
};

/**
 * One successfully prepared knowledge source file.
 *
 * @private internal utility of `OpenAiVectorStoreKnowledgeSourcePreparer`
 */
type PreparedKnowledgeSourceFile = {
    readonly file: File;
    readonly sizeBytes: number;
};

/**
 * Prepares vector-store knowledge sources for upload.
 *
 * @private helper of `OpenAiVectorStoreHandler`
 */
export class OpenAiVectorStoreKnowledgeSourcePreparer {
    /**
     * Creates one knowledge-source preparer instance.
     */
    public constructor(private readonly options: { readonly isVerbose: boolean }) {}

    /**
     * Resolves supported knowledge sources into uploadable `File` objects.
     */
    public async prepareKnowledgeSourceFiles(options: {
        readonly knowledgeSources: ReadonlyArray<string>;
        readonly downloadTimeoutMs: number;
        readonly logLabel: string;
    }): Promise<PreparedKnowledgeSourceFiles> {
        const { knowledgeSources, downloadTimeoutMs, logLabel } = options;
        const files: File[] = [];
        const skippedSources: Array<{ source: string; reason: string }> = [];
        let totalBytes = 0;
        const processingStartedAtMs = Date.now();

        for (const [index, source] of knowledgeSources.entries()) {
            const isDataUrl = isDataUrlKnowledgeSource(source);
            const isHttp = source.startsWith('http://') || source.startsWith('https://');
            const sourceType = isDataUrl ? 'data_url' : isHttp ? 'url' : 'file';

            if (this.options.isVerbose) {
                console.info('[🤰]', 'Processing knowledge source', {
                    index: index + 1,
                    total: knowledgeSources.length,
                    source,
                    sourceType,
                    logLabel,
                });
            }

            try {
                const preparedFile = await this.prepareKnowledgeSourceFile({
                    source,
                    sourceType,
                    downloadTimeoutMs,
                    logLabel,
                });

                if ('file' in preparedFile) {
                    files.push(preparedFile.file);
                    totalBytes += preparedFile.sizeBytes;
                } else {
                    skippedSources.push({ source, reason: preparedFile.skippedReason });
                }
            } catch (error) {
                assertsError(error);
                skippedSources.push({ source, reason: 'processing_error' });
                console.error('[🤰]', 'Error processing knowledge source', {
                    source,
                    logLabel,
                    error: serializeError(error),
                });
            }
        }

        if (this.options.isVerbose) {
            console.info('[🤰]', 'Finished processing knowledge sources', {
                total: knowledgeSources.length,
                downloadedCount: files.length,
                skippedCount: skippedSources.length,
                totalBytes,
                elapsedMs: Date.now() - processingStartedAtMs,
                skippedSamples: skippedSources.slice(0, 3),
                logLabel,
            });
        }

        return {
            files,
            skippedSources,
            totalBytes,
        };
    }

    /**
     * Converts one knowledge source into a `File` or a skip reason.
     */
    private async prepareKnowledgeSourceFile(options: {
        readonly source: string;
        readonly sourceType: 'data_url' | 'url' | 'file';
        readonly downloadTimeoutMs: number;
        readonly logLabel: string;
    }): Promise<PreparedKnowledgeSourceFile | { readonly skippedReason: string }> {
        const { source, sourceType, downloadTimeoutMs, logLabel } = options;

        if (sourceType === 'data_url') {
            const parsed = parseDataUrlKnowledgeSource(source);

            if (!parsed) {
                if (this.options.isVerbose) {
                    console.info('[🤰]', 'Skipping knowledge source (invalid data URL)', {
                        source,
                        sourceType,
                        logLabel,
                    });
                }

                return { skippedReason: 'invalid_data_url' };
            }

            return {
                file: new File([parsed.buffer], parsed.filename, {
                    type: parsed.mimeType,
                }),
                sizeBytes: parsed.buffer.length,
            };
        }

        if (sourceType === 'url') {
            const downloadResult = await this.downloadKnowledgeSourceFile({
                source,
                timeoutMs: downloadTimeoutMs,
                logLabel,
            });

            if (!downloadResult) {
                return { skippedReason: 'download_failed' };
            }

            return {
                file: downloadResult.file,
                sizeBytes: downloadResult.sizeBytes,
            };
        }

        if (this.options.isVerbose) {
            console.info('[🤰]', 'Skipping knowledge source (unsupported type)', {
                source,
                sourceType,
                logLabel,
            });
        }

        return { skippedReason: 'unsupported_source_type' };
    }

    /**
     * Downloads one knowledge source URL into a `File`.
     */
    private async downloadKnowledgeSourceFile(options: {
        readonly source: string;
        readonly timeoutMs: number;
        readonly logLabel: string;
    }): Promise<{ readonly file: File; readonly sizeBytes: number } | null> {
        const { source, timeoutMs, logLabel } = options;
        const startedAtMs = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        if (this.options.isVerbose) {
            console.info('[🤰]', 'Downloading knowledge source', {
                source,
                timeoutMs,
                logLabel,
            });
        }

        try {
            const response = await fetch(source, { signal: controller.signal });
            const contentType = response.headers.get('content-type') ?? undefined;

            if (!response.ok) {
                console.error('[🤰]', 'Failed to download knowledge source', {
                    source,
                    status: response.status,
                    statusText: response.statusText,
                    contentType,
                    elapsedMs: Date.now() - startedAtMs,
                    logLabel,
                });
                return null;
            }

            const buffer = await response.arrayBuffer();
            let filename = source.split('/').pop() || 'downloaded-file';

            try {
                const url = new URL(source);
                filename = url.pathname.split('/').pop() || filename;
            } catch {
                // Keep the fallback filename derived above.
            }

            const file = new File([buffer], filename, contentType ? { type: contentType } : undefined);
            const sizeBytes = buffer.byteLength;

            if (this.options.isVerbose) {
                console.info('[🤰]', 'Downloaded knowledge source', {
                    source,
                    filename,
                    sizeBytes,
                    contentType,
                    elapsedMs: Date.now() - startedAtMs,
                    logLabel,
                });
            }

            return {
                file,
                sizeBytes,
            };
        } catch (error) {
            assertsError(error);
            console.error('[🤰]', 'Error downloading knowledge source', {
                source,
                elapsedMs: Date.now() - startedAtMs,
                logLabel,
                error: serializeError(error),
            });
            return null;
        } finally {
            clearTimeout(timeoutId);
        }
    }
}
