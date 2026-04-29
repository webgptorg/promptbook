import { describe, expect, it } from '@jest/globals';
import { createBasicAgentModelRequirements } from '../_base/createEmptyAgentModelRequirements';
import { FormatCommitmentDefinition } from './FORMAT';

describe('FORMAT commitment', () => {
    it('marks the legacy format commitment as deprecated while keeping runtime behavior', () => {
        const commitment = new FormatCommitmentDefinition();

        expect(commitment.type).toBe('FORMAT');
        expect(commitment.description).toBe(
            'Deprecated legacy formatting commitment. Prefer `WRITING SAMPLE` and `WRITING RULES` for new books.',
        );
        expect(commitment.deprecation).toEqual({
            message: 'Use `WRITING SAMPLE` and `WRITING RULES` instead.',
            replacedBy: ['WRITING SAMPLE', 'WRITING RULES'],
        });
        expect(commitment.icon).toBeTruthy();
        expect(commitment.documentation).toContain('Deprecated legacy commitment for output formatting and response structure.');
        expect(commitment.documentation).toContain('WRITING SAMPLE');
        expect(commitment.documentation).toContain('WRITING RULES');

        const initialRequirements = createBasicAgentModelRequirements('Test Agent');
        const updatedRequirements = commitment.applyToAgentModelRequirements(initialRequirements, 'Use markdown headings.');

        expect(updatedRequirements.systemMessage).toContain('Output Format: Use markdown headings.');
    });

    it('should support FORMATS alias', () => {
        const commitment = new FormatCommitmentDefinition('FORMATS');

        expect(commitment.type).toBe('FORMATS');
    });
});
