import type { string_url } from '../../../../utils/typeAliases';
import type { KnowledgeChunk } from '../types';
import { BaseKnowledgeProcessor } from './BaseKnowledgeProcessor';

/**
 * Text knowledge source processor
 * Handles plain text documents
 */
export class TextProcessor extends BaseKnowledgeProcessor {
    readonly supportedFormat = 'text' as const;

    /**
     * Process text buffer and extract content
     */
    async processBuffer(buffer: Buffer, sourceUrl: string_url): Promise<KnowledgeChunk[]> {
        try {
            const text = buffer.toString('utf-8');

            if (!text.trim()) {
                throw new Error('Text document is empty');
            }

            // Create chunks from the text content
            const chunks = this.createChunksFromText(text, sourceUrl);

            return chunks;
        } catch (error) {
            throw new Error(`Failed to process text: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
