import type { string_url } from '../../../../utils/typeAliases';
import { BaseKnowledgeProcessor } from './BaseKnowledgeProcessor';
import type { KnowledgeSourceFormat } from '../types';
import type { RAGConfig } from '../types';
import { PdfProcessor } from './PdfProcessor';
import { TextProcessor } from './TextProcessor';

/**
 * Factory for creating knowledge source processors
 */
export class ProcessorFactory {
    /**
     * Get processor for a specific format
     */
    static getProcessor(format: KnowledgeSourceFormat, config?: Partial<RAGConfig>): BaseKnowledgeProcessor {
        switch (format) {
            case 'pdf':
                return new PdfProcessor(config);
            case 'text':
                return new TextProcessor(config);
            default:
                throw new Error(`No processor available for format: ${format}`);
        }
    }

    /**
     * Detect format from URL
     */
    static detectFormat(url: string_url): KnowledgeSourceFormat {
        const urlLower = url.toLowerCase();

        if (urlLower.endsWith('.pdf')) {
            return 'pdf';
        }

        if (urlLower.endsWith('.txt')) {
            return 'text';
        }

        if (urlLower.endsWith('.md') || urlLower.endsWith('.markdown')) {
            return 'markdown';
        }

        if (urlLower.endsWith('.html') || urlLower.endsWith('.htm')) {
            return 'html';
        }

        // Default to text for unknown formats
        return 'text';
    }

    /**
     * Get all supported formats
     */
    static getSupportedFormats(): KnowledgeSourceFormat[] {
        return ['pdf', 'text'];
    }
}
