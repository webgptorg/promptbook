import { describe, expect, it } from '@jest/globals';
import { book } from '../../../../../src/_packages/core.index';
import { createTranspiledAgentExportWarnings } from './createTranspiledAgentExportWarnings';

describe('createTranspiledAgentExportWarnings', () => {
    it('returns no warnings for a closed agent without unsupported commitments', () => {
        const warnings = createTranspiledAgentExportWarnings(book`
            Agent

            PERSONA You help people answer questions.
            CLOSED
        `);

        expect(warnings).toEqual([]);
    });

    it('warns about open behavior when CLOSED is missing', () => {
        const warnings = createTranspiledAgentExportWarnings(book`
            Agent

            PERSONA You help people answer questions.
        `);

        expect(warnings).toEqual([
            expect.objectContaining({
                commitmentType: 'OPEN',
            }),
        ]);
    });

    it('warns about model, location, and privacy commitments while keeping CLOSED agents closed', () => {
        const warnings = createTranspiledAgentExportWarnings(book`
            Agent

            PERSONA You help people answer questions.
            MODEL gpt-4
            USE USER LOCATION
            USE PRIVACY
            CLOSED
        `);

        expect(warnings.map((warning) => warning.commitmentType)).toEqual([
            'MODEL',
            'USE USER LOCATION',
            'USE PRIVACY',
        ]);
    });

    it('deduplicates repeated unsupported commitments', () => {
        const warnings = createTranspiledAgentExportWarnings(book`
            Agent

            MODEL gpt-4
            MODEL gpt-4o
            USE PRIVACY
            USE PRIVACY
            CLOSED
        `);

        expect(warnings.map((warning) => warning.commitmentType)).toEqual(['MODEL', 'USE PRIVACY']);
    });
});
