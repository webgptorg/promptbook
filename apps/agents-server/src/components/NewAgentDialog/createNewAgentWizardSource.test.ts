import { describe, expect, it } from '@jest/globals';
import { createAgentModelRequirements } from '../../../../../src/book-2.0/agent-source/createAgentModelRequirements';
import { parseAgentSource } from '../../../../../src/book-2.0/agent-source/parseAgentSource';
import { createNewAgentWizardSource } from './createNewAgentWizardSource';

describe('createNewAgentWizardSource', () => {
    it('builds a traceable agent source from wizard inputs', async () => {
        const agentSource = createNewAgentWizardSource({
            agentName: 'Recipe Helper',
            description: 'Answers cooking questions',
            goal: 'Help users cook with confidence using practical kitchen advice.',
            personaTraits: ['helpful', 'analytical', 'strong at practical kitchen advice'],
            teamReferences: ['https://example.com/agents/legal-reviewer'],
            isOpenToLearning: true,
            rules: ['Use a professional tone in every response.', 'Prefer concrete next steps.'],
            capabilityCommitments: ['USE BROWSER', 'USE SEARCH ENGINE', 'USE EMAIL'],
            writingStyleTraits: ['professional', 'concise'],
            writingRules: ['Use a professional tone.', 'Keep responses concise.'],
            writingSamples: ['Happy to help. Start by preheating the oven and measuring everything before you begin.'],
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
        expect(agentSource).toContain('- Goal: Help users cook with confidence using practical kitchen advice.');
        expect(agentSource).toContain('- Personality: helpful, analytical, strong at practical kitchen advice');
        expect(agentSource).toContain('- Learning: Open to learning');
        expect(agentSource).toContain('- Capabilities: USE BROWSER, USE SEARCH ENGINE, USE EMAIL');
        expect(agentSource).toContain('- Team: legal reviewer');
        expect(agentSource).toContain('- Writing style: professional, concise');
        expect(agentSource).toContain('META DESCRIPTION Answers cooking questions');
        expect(agentSource).not.toContain('PERSONA ');
        expect(agentSource).toContain(
            'GOAL Help users cook with confidence using practical kitchen advice. Work as a helpful, analytical, strong at practical kitchen advice assistant.',
        );
        expect(agentSource).toContain('OPEN');
        expect(agentSource.indexOf('OPEN')).toBeGreaterThan(agentSource.indexOf('KNOWLEDGE https://example.com/faq'));
        expect(agentSource).toContain('USE BROWSER');
        expect(agentSource).toContain('USE SEARCH ENGINE');
        expect(agentSource).toContain('USE EMAIL');
        expect(agentSource).toContain('TEAM https://example.com/agents/legal-reviewer');
        expect(agentSource).not.toContain('STYLE ');
        expect(agentSource).toContain('WRITING RULES Use a professional tone.');
        expect(agentSource).toContain('WRITING RULES Keep responses concise.');
        expect(agentSource).toContain(
            'WRITING SAMPLE Happy to help. Start by preheating the oven and measuring everything before you begin.',
        );
        expect(agentSource).toContain('RULE Use a professional tone in every response.');
        expect(agentSource).toContain('RULE Prefer concrete next steps.');
        expect(agentSource).toContain('KNOWLEDGE https://ptbk.io/k/recipes.pdf');
        expect(agentSource).toContain('KNOWLEDGE https://example.com/faq');

        const parsedAgent = parseAgentSource(agentSource);
        expect(parsedAgent.agentName).toBe('recipe-helper');
        expect(parsedAgent.meta.fullname).toBe('Recipe Helper');
        expect(parsedAgent.meta.description).toBe('Answers cooking questions');
        expect(parsedAgent.personaDescription).toBe(
            'Help users cook with confidence using practical kitchen advice. Work as a helpful, analytical, strong at practical kitchen advice assistant.',
        );
        expect(parsedAgent.knowledgeSources).toHaveLength(2);

        const requirements = await createAgentModelRequirements(agentSource);
        expect(requirements.systemMessage).not.toContain('Style: ');
        expect(requirements.systemMessage).toContain('## Writing rules');
        expect(requirements.systemMessage).toContain('## Writing sample');
        expect(requirements.systemMessage).toContain('Use a professional tone.');
        expect(requirements.systemMessage).toContain(
            'Happy to help. Start by preheating the oven and measuring everything before you begin.',
        );
    });

    it('uses safe fallback summaries when optional fields are omitted', () => {
        const agentSource = createNewAgentWizardSource({
            agentName: 'Minimal Agent',
            goal: '',
            personaTraits: [],
            teamReferences: [],
            isOpenToLearning: false,
            rules: [],
            capabilityCommitments: [],
            writingStyleTraits: [],
            writingRules: [],
            writingSamples: [],
            knowledgeItems: [],
        });

        expect(agentSource).toContain('- Goal: Guided default goal');
        expect(agentSource).toContain('- Learning: Fixed after creation');
        expect(agentSource).toContain('- Capabilities: None selected');
        expect(agentSource).toContain('- Team: No teammates');
        expect(agentSource).toContain('- Writing style: Default guided writing style');
        expect(agentSource).toContain('- Rules: None specified');
        expect(agentSource).toContain('- Knowledge: No knowledge uploaded');
        expect(agentSource).toContain('GOAL Work as a helpful, concise, and professional assistant.');
        expect(agentSource).not.toContain('PERSONA ');
        expect(agentSource).toContain('CLOSED');
        expect(agentSource.trimEnd().endsWith('CLOSED')).toBe(true);
    });

    it('emits compact TEAM references when wizard teammates are provided', () => {
        const agentSource = createNewAgentWizardSource({
            agentName: 'Escalation Coordinator',
            goal: 'Route complex requests to the right specialists.',
            personaTraits: ['organized'],
            teamReferences: ['{Legal Reviewer}', '{User}'],
            isOpenToLearning: true,
            rules: [],
            capabilityCommitments: [],
            writingStyleTraits: [],
            writingRules: [],
            writingSamples: [],
            knowledgeItems: [],
        });

        expect(agentSource).toContain('- Team: Legal Reviewer, User');
        expect(agentSource).toContain('TEAM {Legal Reviewer}');
        expect(agentSource).toContain('TEAM {User}');
    });
});
