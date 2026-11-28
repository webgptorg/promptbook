import { describe, expect, it } from '@jest/globals';
import { findBookTranspilerForExport, listBookTranspilersForExport } from './resolveTranspiledAgentCodeExport';

describe('resolveTranspiledAgentCodeExport', () => {
    it('registers the available transpilers for the export page', () => {
        const transpilerNames = listBookTranspilersForExport().map((transpiler) => transpiler.name);

        expect(transpilerNames).toEqual(
            expect.arrayContaining(['agent-os', 'anthropic-claude-managed', 'e2b', 'openai-agents']),
        );
        expect(findBookTranspilerForExport('agent-os')).toEqual(
            expect.objectContaining({
                name: 'agent-os',
                title: 'AgentOS',
            }),
        );
        expect(findBookTranspilerForExport('anthropic-claude-managed')).toEqual(
            expect.objectContaining({
                name: 'anthropic-claude-managed',
                title: 'Anthropic Claude Managed',
            }),
        );
        expect(findBookTranspilerForExport('e2b')).toEqual(
            expect.objectContaining({
                name: 'e2b',
                title: 'E2B',
            }),
        );
        expect(findBookTranspilerForExport('openai-agents')).toEqual(
            expect.objectContaining({
                name: 'openai-agents',
                title: 'OpenAI Agents SDK',
            }),
        );
    });
});
