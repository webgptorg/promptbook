import { describe, expect, it } from '@jest/globals';
import { MetaLinkCommitmentDefinition } from './META_LINK';

describe('MetaLinkCommitmentDefinition', () => {
    let commitment: MetaLinkCommitmentDefinition;

    beforeEach(() => {
        commitment = new MetaLinkCommitmentDefinition();
    });

    it('should have correct type', () => {
        expect(commitment.type).toBe('META LINK');
    });

    it('should create correct regex pattern', () => {
        const regex = commitment.createRegex();
        
        // Test valid META LINK patterns
        expect(regex.test('META LINK https://twitter.com/username')).toBe(true);
        expect(regex.test('META LINK https://linkedin.com/in/profile')).toBe(true);
        expect(regex.test('META LINK https://github.com/username')).toBe(true);
        
        // Test invalid patterns
        expect(regex.test('METALINK https://twitter.com/username')).toBe(false);
        expect(regex.test('META_LINK https://twitter.com/username')).toBe(false);
        expect(regex.test('META IMAGE https://twitter.com/username')).toBe(false);
    });

    it('should create correct type regex pattern', () => {
        const typeRegex = commitment.createTypeRegex();
        
        // Test valid type patterns
        expect(typeRegex.test('META LINK')).toBe(true);
        expect(typeRegex.test('META LINK https://twitter.com/username')).toBe(true);
        
        // Test invalid patterns
        expect(typeRegex.test('METALINK')).toBe(false);
        expect(typeRegex.test('META_LINK')).toBe(false);
        expect(typeRegex.test('META IMAGE')).toBe(false);
    });

    it('should not modify agent model requirements', () => {
        const requirements = {
            systemMessage: 'Test system message',
            modelName: 'test-model',
        };

        const result = commitment.applyToAgentModelRequirements(requirements, 'https://twitter.com/username');
        
        // META LINK should not modify the system message
        expect(result).toEqual(requirements);
        expect(result.systemMessage).toBe('Test system message');
    });

    it('should extract profile link URL correctly', () => {
        expect(commitment.extractProfileLinkUrl('https://twitter.com/username')).toBe('https://twitter.com/username');
        expect(commitment.extractProfileLinkUrl('  https://linkedin.com/in/profile  ')).toBe('https://linkedin.com/in/profile');
        expect(commitment.extractProfileLinkUrl('')).toBe('');
        expect(commitment.extractProfileLinkUrl('   ')).toBe('');
    });

    it('should validate URLs correctly', () => {
        expect(commitment.isValidUrl('https://twitter.com/username')).toBe(true);
        expect(commitment.isValidUrl('http://example.com')).toBe(true);
        expect(commitment.isValidUrl('https://linkedin.com/in/profile')).toBe(true);
        
        expect(commitment.isValidUrl('not-a-url')).toBe(false);
        expect(commitment.isValidUrl('')).toBe(false);
        expect(commitment.isValidUrl('twitter.com/username')).toBe(false); // Missing protocol
    });
});
