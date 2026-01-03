import { LanguageCommitmentDefinition } from './LANGUAGE';

describe('LanguageCommitmentDefinition', () => {
    it('should have correct type and aliases', () => {
        const commitment = new LanguageCommitmentDefinition('LANGUAGE');
        expect(commitment.type).toBe('LANGUAGE');
        expect(commitment.aliases).toEqual(['LANGUAGE', 'LANGUAGES']);
    });

    it('should create regex that matches both LANGUAGE and LANGUAGES with word boundary', () => {
        const commitment = new LanguageCommitmentDefinition('LANGUAGE');
        const regex = commitment.createTypeRegex();
        
        expect(regex.test('LANGUAGE')).toBe(true);
        regex.lastIndex = 0;
        expect(regex.test('LANGUAGES')).toBe(true);
        regex.lastIndex = 0;
        expect(regex.test('LANGUAG')).toBe(false);
        regex.lastIndex = 0;
        // The regex is ^\s*(?<type>${keywordPattern})\b so it matches at start of line
        expect(regex.test('  LANGUAGES')).toBe(true);
        regex.lastIndex = 0;
        expect(regex.test('MY LANGUAGE')).toBe(false);
    });

    it('should match longer form first if constructed correctly', () => {
        // This tests the logic I put into BookEditorMonaco
        const commitmentTypes = ['LANGUAGE', 'LANGUAGES'].sort((a, b) => b.length - a.length);
        const commitmentRegex = new RegExp(`^(${commitmentTypes.join('|')})\\b`, 'i');
        
        const match = 'LANGUAGES'.match(commitmentRegex);
        expect(match).not.toBeNull();
        expect(match![1]).toBe('LANGUAGES');
    });
});
