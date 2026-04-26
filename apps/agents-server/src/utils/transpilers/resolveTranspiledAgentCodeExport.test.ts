import { describe, expect, it } from '@jest/globals';
import { findBookTranspilerForExport, listBookTranspilersForExport } from './resolveTranspiledAgentCodeExport';

describe('resolveTranspiledAgentCodeExport', () => {
    it('registers the AgentOS transpiler for the export page', () => {
        const transpilerNames = listBookTranspilersForExport().map((transpiler) => transpiler.name);

        expect(transpilerNames).toEqual(expect.arrayContaining(['agent-os', 'anthropic-claude-managed']));
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
    });
});
