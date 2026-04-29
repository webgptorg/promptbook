import { describe, expect, it } from '@jest/globals';
import { createBasicAgentModelRequirements } from '../_base/createEmptyAgentModelRequirements';
import { TemplateCommitmentDefinition } from './TEMPLATE';

describe('TEMPLATE commitment', () => {
    it('marks the legacy template commitment as deprecated while keeping runtime behavior', () => {
        const commitment = new TemplateCommitmentDefinition();

        expect(commitment.type).toBe('TEMPLATE');
        expect(commitment.description).toBe(
            'Deprecated legacy template commitment. Prefer `WRITING SAMPLE` and `WRITING RULES` for new books.',
        );
        expect(commitment.deprecation).toEqual({
            message: 'Use `WRITING SAMPLE` and `WRITING RULES` instead.',
            replacedBy: ['WRITING SAMPLE', 'WRITING RULES'],
        });
        expect(commitment.icon).toBeTruthy();
        expect(commitment.documentation).toContain('Deprecated legacy commitment for response structure and templates.');
        expect(commitment.documentation).toContain('WRITING SAMPLE');
        expect(commitment.documentation).toContain('WRITING RULES');
        expect(commitment.requiresContent).toBe(false);
    });

    it('should work without content (template mode)', () => {
        const commitment = new TemplateCommitmentDefinition();
        const initialRequirements = createBasicAgentModelRequirements('Test Agent');

        const result = commitment.applyToAgentModelRequirements(initialRequirements, '');

        expect(result.systemMessage).toContain('structured template format');
    });

    it('should work with content (specific template)', () => {
        const commitment = new TemplateCommitmentDefinition();
        const initialRequirements = createBasicAgentModelRequirements('Test Agent');
        const templateContent = 'Always structure with: 1) Summary, 2) Details, 3) Next steps';

        const result = commitment.applyToAgentModelRequirements(initialRequirements, templateContent);

        expect(result.systemMessage).toContain('Response Template:');
        expect(result.systemMessage).toContain(templateContent);
    });

    it('should accumulate multiple templates', () => {
        const commitment = new TemplateCommitmentDefinition();
        let requirements = createBasicAgentModelRequirements('Test Agent');

        requirements = commitment.applyToAgentModelRequirements(requirements, 'Template 1');
        requirements = commitment.applyToAgentModelRequirements(requirements, 'Template 2');

        expect(requirements._metadata?.templates).toHaveLength(2);
        expect(requirements._metadata?.templates).toContain('Template 1');
        expect(requirements._metadata?.templates).toContain('Template 2');
    });

    it('should support TEMPLATES alias', () => {
        const commitment = new TemplateCommitmentDefinition('TEMPLATES');

        expect(commitment.type).toBe('TEMPLATES');
    });
});
