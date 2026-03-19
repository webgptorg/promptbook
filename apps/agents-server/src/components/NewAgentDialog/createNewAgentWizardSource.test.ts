import { describe, expect, it } from '@jest/globals';
import { parseAgentSource } from '../../../../../src/book-2.0/agent-source/parseAgentSource';
import { createNewAgentWizardSource } from './createNewAgentWizardSource';

describe('createNewAgentWizardSource', () => {
    it('builds a traceable agent source from wizard inputs', () => {
        const agentSource = createNewAgentWizardSource({
            agentName: 'Recipe Helper',
            description: 'Answers cooking questions',
            personaTraits: ['helpful', 'concise', 'professional'],
            customTraitText: 'strong at practical kitchen advice',
            rules: ['Use a professional tone in every response.'],
            customInstructions: 'Prefer concrete next steps.',
            knowledgeItems: [
                {
                    label: 'recipes.pdf',
                    source: 'https://ptbk.io/k/recipes.pdf',
                },
                {
                    label: 'faq',
                    source: 'https://example.com/faq',
                },
            ],
        });

        expect(agentSource).toContain('NOTE This agent was created via the NEW_AGENT_WIZZARD flow');
        expect(agentSource).toContain('- Personality: helpful, concise, professional, strong at practical kitchen advice');
        expect(agentSource).toContain('META DESCRIPTION Answers cooking questions');
        expect(agentSource).toContain('PERSONA You are a helpful, concise, professional, strong at practical kitchen advice assistant');
        expect(agentSource).toContain('RULE Use a professional tone in every response.');
        expect(agentSource).toContain('RULE Prefer concrete next steps.');
        expect(agentSource).toContain('KNOWLEDGE https://ptbk.io/k/recipes.pdf');
        expect(agentSource).toContain('KNOWLEDGE https://example.com/faq');

        const parsedAgent = parseAgentSource(agentSource);
        expect(parsedAgent.agentName).toBe('recipe-helper');
        expect(parsedAgent.meta.fullname).toBe('Recipe Helper');
        expect(parsedAgent.meta.description).toBe('Answers cooking questions');
        expect(parsedAgent.knowledgeSources).toHaveLength(2);
    });

    it('uses safe fallback summaries when optional fields are omitted', () => {
        const agentSource = createNewAgentWizardSource({
            agentName: 'Minimal Agent',
            personaTraits: [],
            rules: [],
            knowledgeItems: [],
        });

        expect(agentSource).toContain('- Rules: None specified');
        expect(agentSource).toContain('- Knowledge: No knowledge uploaded');
        expect(agentSource).toContain('PERSONA You are a helpful, concise, and professional assistant');
    });
});
