import { describe, expect, it } from '@jest/globals';
import { parseAgentSource } from '../../../../../src/book-2.0/agent-source/parseAgentSource';
import { createFinalManGoWizardSource, createManGoWizardSource } from './createManGoWizardSource';

describe('createManGoWizardSource', () => {
    it('builds a validated source from manGo wizard assignment values', () => {
        const agentSource = createManGoWizardSource({
            agentName: 'Support Agent',
            agentBrief: 'Help support operators answer customer requests from company knowledge.',
            knowledgeItems: [
                {
                    label: 'Help center',
                    source: 'https://example.com/help',
                },
            ],
        });

        expect(agentSource).toContain('NOTE This agent was created via the NEW_AGENT_WIZARD manGo wizard flow');
        expect(agentSource).toContain(
            'META DESCRIPTION Help support operators answer customer requests from company knowledge.',
        );
        expect(agentSource).toContain(
            'GOAL Help support operators answer customer requests from company knowledge. Work as a business-focused, practical, clear with next steps assistant.',
        );
        expect(agentSource).toContain('RULE Ask a clarifying question');
        expect(agentSource).toContain('WRITING RULES Use concise business language.');
        expect(agentSource).toContain('KNOWLEDGE https://example.com/help');
        expect(agentSource.trimEnd().endsWith('CLOSED')).toBe(true);

        const parsedAgent = parseAgentSource(agentSource);
        expect(parsedAgent.agentName).toBe('support-agent');
        expect(parsedAgent.meta.fullname).toBe('Support Agent');
    });

    it('preserves edited books while appending missing knowledge before CLOSED', () => {
        const agentSource = createFinalManGoWizardSource({
            agentName: 'Edited Agent',
            agentBrief: 'Use the edited source.',
            bookSource: [
                'Edited Agent',
                '',
                'GOAL Use the edited source.',
                'RULE Preserve this custom rule.',
                'CLOSED',
            ].join('\n'),
            knowledgeItems: [
                {
                    label: 'Guide',
                    source: 'https://example.com/guide',
                },
            ],
        });

        expect(agentSource).toContain('RULE Preserve this custom rule.');
        expect(agentSource).toContain('KNOWLEDGE https://example.com/guide\nCLOSED');
    });

    it('does not duplicate existing knowledge commitments', () => {
        const agentSource = createFinalManGoWizardSource({
            agentName: 'Existing Knowledge Agent',
            agentBrief: 'Use existing knowledge.',
            bookSource: [
                'Existing Knowledge Agent',
                '',
                'GOAL Use existing knowledge.',
                'KNOWLEDGE https://example.com/guide',
                'CLOSED',
            ].join('\n'),
            knowledgeItems: [
                {
                    label: 'Guide',
                    source: 'https://example.com/guide',
                },
            ],
        });

        expect(agentSource.match(/KNOWLEDGE https:\/\/example\.com\/guide/g)).toHaveLength(1);
    });
});
