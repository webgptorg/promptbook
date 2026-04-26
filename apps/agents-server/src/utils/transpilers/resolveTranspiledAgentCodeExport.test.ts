import { describe, expect, it } from '@jest/globals';
import { findBookTranspilerForExport, listBookTranspilersForExport } from './resolveTranspiledAgentCodeExport';

describe('resolveTranspiledAgentCodeExport', () => {
    it('registers the AgentOS transpiler for the export page', () => {
        const transpilerNames = listBookTranspilersForExport().map((transpiler) => transpiler.name);

        expect(transpilerNames).toEqual(expect.arrayContaining(['agent-os']));
        expect(findBookTranspilerForExport('agent-os')).toEqual(
            expect.objectContaining({
                name: 'agent-os',
                title: 'AgentOS',
            }),
        );
    });
});
