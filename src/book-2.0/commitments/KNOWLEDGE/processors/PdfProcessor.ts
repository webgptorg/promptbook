import pdf from 'pdf-parse';
import type { string_url } from '../../../../utils/typeAliases';
import type { KnowledgeChunk } from '../types';
import type { KnowledgeSourceMetadata } from '../types';
import { BaseKnowledgeProcessor } from './BaseKnowledgeProcessor';

/**
 * PDF knowledge source processor
 * Handles extraction and chunking of PDF documents
 */
export class PdfProcessor extends BaseKnowledgeProcessor {
    readonly supportedFormat = 'pdf' as const;

    /**
     * Process PDF buffer and extract text content
     */
    async processBuffer(buffer: Buffer, sourceUrl: string_url): Promise<KnowledgeChunk[]> {
        try {
            const pdfData = await pdf(buffer);
            const fullText = pdfData.text;

            if (!fullText.trim()) {
                throw new Error('PDF contains no extractable text');
            }

            const metadata: KnowledgeSourceMetadata = {
                url: sourceUrl,
                format: 'pdf',
                title: this.extractTitleFromText(fullText),
                lastFetched: new Date(),
                contentHash: this.generateContentHash(fullText),
            };

            // Split into chunks based on pages and content
            const chunks = this.createChunksFromText(fullText, sourceUrl, {
                totalPages: pdfData.numpages,
            });

            return chunks;
        } catch (error) {
            throw new Error(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Extract title from PDF text (first meaningful line)
     */
    private extractTitleFromText(text: string): string {
        const lines = text
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        // Look for the first substantial line that could be a title
        for (const line of lines.slice(0, 10)) {
            // Check first 10 non-empty lines
            if (line.length > 10 && line.length < 200 && !line.includes('http')) {
                return line;
            }
        }

        return 'Untitled PDF Document';
    }

    /**
     * Create chunks from PDF text with page awareness
     */
    protected createChunksFromText(
        text: string,
        sourceUrl: string_url,
        pdfInfo: { totalPages: number },
    ): KnowledgeChunk[] {
        // Use base class method with additional PDF-specific metadata
        const baseChunks = super.createChunksFromText(text, sourceUrl);

        // Add page number estimation to each chunk
        return baseChunks.map((chunk, index) => {
            const estimatedPage = Math.ceil(((index + 1) / baseChunks.length) * pdfInfo.totalPages);
            return {
                ...chunk,
                metadata: {
                    ...chunk.metadata,
                    pageNumber: estimatedPage,
                },
            };
        });
    }
}
