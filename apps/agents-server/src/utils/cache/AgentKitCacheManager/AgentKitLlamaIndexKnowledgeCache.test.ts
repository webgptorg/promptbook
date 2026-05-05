import { describe, expect, it } from '@jest/globals';
import type { AgentKitLlamaIndexKnowledgeBase } from './AgentKitLlamaIndexKnowledgeBase';
import { AgentKitLlamaIndexKnowledgeCache } from './AgentKitLlamaIndexKnowledgeCache';

describe('AgentKitLlamaIndexKnowledgeCache', () => {
    it('deduplicates pending LlamaIndex knowledge-base creation', async () => {
        const cache = new AgentKitLlamaIndexKnowledgeCache();
        const knowledgeBase = {} as AgentKitLlamaIndexKnowledgeBase;
        let createdCount = 0;
        const createKnowledgeBase = async () => {
            createdCount++;
            return knowledgeBase;
        };

        const [firstResult, secondResult] = await Promise.all([
            cache.getOrCreate({
                knowledgeBaseHash: 'pending-dedupe-test',
                createKnowledgeBase,
            }),
            cache.getOrCreate({
                knowledgeBaseHash: 'pending-dedupe-test',
                createKnowledgeBase,
            }),
        ]);

        expect(createdCount).toBe(1);
        expect(firstResult.knowledgeBase).toBe(knowledgeBase);
        expect(secondResult.knowledgeBase).toBe(knowledgeBase);
    });

    it('marks subsequent reads as cache hits', async () => {
        const cache = new AgentKitLlamaIndexKnowledgeCache();
        const knowledgeBase = {} as AgentKitLlamaIndexKnowledgeBase;

        const firstResult = await cache.getOrCreate({
            knowledgeBaseHash: 'cache-hit-test',
            createKnowledgeBase: async () => knowledgeBase,
        });
        const secondResult = await cache.getOrCreate({
            knowledgeBaseHash: 'cache-hit-test',
            createKnowledgeBase: async () => {
                throw new Error('Should not recreate cached knowledge base.');
            },
        });

        expect(firstResult.fromCache).toBe(false);
        expect(secondResult.fromCache).toBe(true);
        expect(secondResult.knowledgeBase).toBe(knowledgeBase);
    });
});
