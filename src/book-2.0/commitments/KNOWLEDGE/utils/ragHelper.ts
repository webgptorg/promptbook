import type { string_url } from '../../../../utils/typeAliases';
import type { AgentModelRequirements } from '../../_misc/AgentModelRequirements';
import { FrontendRAGService } from '../FrontendRAGService';

/**
 * Helper utilities for RAG processing in chat systems
 */
export class RAGHelper {
    /**
     * Initialize knowledge sources from agent requirements
     * This should be called when starting a chat session
     */
    static async initializeKnowledgeSources(requirements: AgentModelRequirements): Promise<FrontendRAGService | null> {
        const knowledgeSources = requirements.metadata?.knowledgeSources as string_url[] | undefined;
        const ragService = requirements.metadata?.ragService as FrontendRAGService | undefined;

        if (!knowledgeSources || knowledgeSources.length === 0) {
            return null;
        }

        // Use existing RAG service or create a new one
        const service = ragService || new FrontendRAGService();

        // Initialize knowledge sources
        await service.initializeKnowledgeSources(knowledgeSources);

        return service;
    }

    /**
     * Get relevant context for a user query
     * This should be called before sending the query to the AI model
     */
    static async getRelevantContext(ragService: FrontendRAGService | null, userQuery: string): Promise<string> {
        if (!ragService) {
            return '';
        }

        const context = await ragService.getContextForQuery(userQuery);

        if (!context) {
            return '';
        }

        // Format the context to be prepended to the system message
        return `\n\n=== RELEVANT KNOWLEDGE ===\n${context}\n=== END KNOWLEDGE ===\n\n`;
    }

    /**
     * Update system message with relevant context for a query
     */
    static async updateSystemMessageWithContext(
        requirements: AgentModelRequirements,
        ragService: FrontendRAGService | null,
        userQuery: string,
    ): Promise<AgentModelRequirements> {
        const context = await this.getRelevantContext(ragService, userQuery);

        if (!context) {
            return requirements;
        }

        return {
            ...requirements,
            systemMessage: requirements.systemMessage + context,
        };
    }

    /**
     * Get statistics about the knowledge base
     */
    static getKnowledgeStats(
        ragService: FrontendRAGService | null,
    ): { sources: number; chunks: number; isInitialized: boolean } | null {
        if (!ragService) {
            return null;
        }

        const stats = ragService.getStats();
        return {
            sources: stats.sources,
            chunks: stats.chunks,
            isInitialized: stats.isInitialized,
        };
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
