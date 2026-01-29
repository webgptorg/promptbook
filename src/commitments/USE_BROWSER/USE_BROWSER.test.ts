import { describe, expect, it } from '@jest/globals';
import { createBasicAgentModelRequirements } from '../_base/createEmptyAgentModelRequirements';
import { UseBrowserCommitmentDefinition } from './USE_BROWSER';

describe('USE BROWSER commitment', () => {
    const commitment = new UseBrowserCommitmentDefinition();
    const basicRequirements = createBasicAgentModelRequirements('test-agent');

    it('has correct type and aliases', () => {
        expect(commitment.type).toBe('USE BROWSER');
        expect(commitment.aliases).toEqual(['BROWSER']);
    });

    it('has description and documentation', () => {
        expect(commitment.description).toBeTruthy();
        expect(commitment.documentation).toBeTruthy();
        expect(commitment.icon).toBe('🌐');
    });

    it('creates regex that matches USE BROWSER', () => {
        // createRegex requires content after the commitment type
        // Note: The regex has 'g' flag, so we create fresh instances to avoid lastIndex issues
        expect(commitment.createRegex().test('USE BROWSER some content')).toBe(true);
        expect(commitment.createRegex().test('use browser some content')).toBe(true);
        expect(commitment.createRegex().test('Use Browser content here')).toBe(true);
        expect(commitment.createRegex().test('BROWSER some content')).toBe(true);

        // createTypeRegex matches just the commitment type (without content requirement)
        expect(commitment.createTypeRegex().test('USE BROWSER')).toBe(true);
        expect(commitment.createTypeRegex().test('USE BROWSER some content')).toBe(true);
        expect(commitment.createTypeRegex().test('BROWSER')).toBe(true);
        expect(commitment.createTypeRegex().test('use browser')).toBe(true);
        expect(commitment.createTypeRegex().test('Use Browser')).toBe(true);

        // createRegex matches standalone commitment
        expect(commitment.createRegex().test('USE BROWSER')).toBe(true);
        expect(commitment.createRegex().test('BROWSER')).toBe(true);
    });

    it('sets useBrowser flag in metadata', () => {
        const result = commitment.applyToAgentModelRequirements(basicRequirements, '');

        expect(result.metadata?.useBrowser).toBe(true);
    });

    it('adds fetch_url_content and run_browser tools', () => {
        const result = commitment.applyToAgentModelRequirements(basicRequirements, '');

        expect(result.tools).toBeDefined();
        expect(result.tools?.some((tool) => tool.name === 'fetch_url_content')).toBe(true);
        expect(result.tools?.some((tool) => tool.name === 'run_browser')).toBe(true);
    });

    it('provides tool functions for both browser tools', () => {
        const toolFunctions = commitment.getToolFunctions();

        expect(toolFunctions.fetch_url_content).toBeDefined();
        expect(typeof toolFunctions.fetch_url_content).toBe('function');
        expect(toolFunctions.run_browser).toBeDefined();
        expect(typeof toolFunctions.run_browser).toBe('function');
    });

    it('provides human-readable tool titles', () => {
        const toolTitles = commitment.getToolTitles();

        expect(toolTitles.fetch_url_content).toBe('Fetch URL content');
        expect(toolTitles.run_browser).toBe('Run browser');
    });

    /*
    TODO: [0] Re-enable
    it('adds browser to tools array in metadata', () => {
        const result = commitment.applyToAgentModelRequirements(basicRequirements, '');

        expect(result.metadata?.tools).toContain('browser');
    });
    */

    it('ignores content after USE BROWSER', () => {
        const resultWithContent = commitment.applyToAgentModelRequirements(
            basicRequirements,
            'This content should be ignored',
        );
        const resultWithoutContent = commitment.applyToAgentModelRequirements(basicRequirements, '');

        // Both should have the same metadata
        expect(resultWithContent.metadata?.useBrowser).toBe(true);
        expect(resultWithoutContent.metadata?.useBrowser).toBe(true);
    });

    it('does not duplicate browser tools when applied multiple times', () => {
        let result = commitment.applyToAgentModelRequirements(basicRequirements, '');
        result = commitment.applyToAgentModelRequirements(result, '');
        result = commitment.applyToAgentModelRequirements(result, '');

        expect(result.tools!.filter((tool) => tool.name === 'fetch_url_content').length).toBe(1);
        expect(result.tools!.filter((tool) => tool.name === 'run_browser').length).toBe(1);
    });

    it('preserves existing metadata', () => {
        const requirementsWithMetadata = {
            ...basicRequirements,
            metadata: {
                existingKey: 'existingValue',
            },
        };

        const result = commitment.applyToAgentModelRequirements(requirementsWithMetadata, '');

        expect(result.metadata?.existingKey).toBe('existingValue');
        expect(result.metadata?.useBrowser).toBe(true);
    });

    /*
    TODO: [0] Re-enable, tools are not in metadata anymore
    it('preserves existing tools in metadata', () => {
        const requirementsWithTools = {
            ...basicRequirements,
            metadata: {
                tools: ['existingTool'],
            },
        };

        const result = commitment.applyToAgentModelRequirements(requirementsWithTools, '');

        const tools = result.metadata?.tools as string[];
        expect(tools).toContain('existingTool');
        expect(tools).toContain('browser');
    });
    */

    /*
    TODO: !!!! Re-enable
    it('does not modify system message', () => {
        const requirementsWithMessage = {
            ...basicRequirements,
            systemMessage: 'Original system message',
        };

        const result = commitment.applyToAgentModelRequirements(requirementsWithMessage, '');

        expect(result.systemMessage).toBe('Original system message');
    });
    */
});
