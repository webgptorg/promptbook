import { describe, expect, it } from '@jest/globals';
import { formatAgentKitLlamaIndexKnowledgeSearchResults } from './AgentKitLlamaIndexKnowledgeBase';

describe('formatAgentKitLlamaIndexKnowledgeSearchResults', () => {
    it('formats LlamaIndex knowledge results with reusable citation markers', () => {
        const formattedResults = formatAgentKitLlamaIndexKnowledgeSearchResults([
            {
                content: 'Refunds are available within 30 days with proof of purchase.',
                citationMarker: '[1:0 support-policy.pdf]',
                citationSource: 'support-policy.pdf',
                source: 'https://example.com/support-policy.pdf',
                score: 0.87654,
            },
        ]);

        expect(formattedResults).toContain('Citation: [1:0 support-policy.pdf]');
        expect(formattedResults).toContain('Source: support-policy.pdf');
        expect(formattedResults).toContain('Score: 0.8765');
        expect(formattedResults).toContain('Refunds are available within 30 days');
    });

    it('returns an explicit empty-search message', () => {
        expect(formatAgentKitLlamaIndexKnowledgeSearchResults([])).toBe(
            'No matching knowledge was found in the indexed KNOWLEDGE sources.',
        );
    });
});
