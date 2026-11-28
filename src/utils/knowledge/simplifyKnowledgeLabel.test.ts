import { describe, expect, it } from '@jest/globals';
import { isHumanOrID, simplifyKnowledgeLabel } from './simplifyKnowledgeLabel';

describe('simplifyKnowledgeLabel', () => {
    it('removes trailing CDN-like ID and truncates to 20 characters', () => {
        expect(
            simplifyKnowledgeLabel('finance-policy-asset-management-guide-LongMixedCaseTokenWithDigits12345.pdf'),
        ).toBe('finance-policy-asset...');
    });

    it('removes trailing ID even when source has no extension', () => {
        expect(simplifyKnowledgeLabel('project-bid-specification-document-LongMixedCaseTokenWithDigits12345')).toBe(
            'project-bid-specific...',
        );
    });

    it('extracts filename from URL-like input before simplification', () => {
        expect(
            simplifyKnowledgeLabel(
                'https://ptbk.io/k/records-retention-policy-manual-LongMixedCaseTokenWithDigits12345.pdf?download=1',
            ),
        ).toBe('records-retention-po...');
    });

    it('keeps short human-readable labels intact', () => {
        expect(simplifyKnowledgeLabel('policy-2024.pdf')).toBe('policy-2024');
    });
});

describe('isHumanOrID', () => {
    it('classifies mixed-case alphanumeric hashes as IDs', () => {
        expect(isHumanOrID('LongMixedCaseTokenWithDigits12345')).toBe('ID');
    });

    it('classifies slug-like names as human', () => {
        expect(isHumanOrID('finance-policy-asset-management-guide')).toBe('HUMAN');
    });

    it('returns unknown for empty values', () => {
        expect(isHumanOrID('   ')).toBe('UNKNOWN');
    });
});
