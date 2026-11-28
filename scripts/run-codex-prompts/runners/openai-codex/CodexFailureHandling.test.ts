import { NotAllowed } from '../../../../src/errors/NotAllowed';
import {
    buildCreditsDisallowedError,
    classifyCodexFailure,
    extractCodexFailureDetails,
    limitErrorDetails,
} from './CodexFailureHandling';

describe('CodexFailureHandling', () => {
    it('classifies credit-required errors before generic rate-limit errors', () => {
        const details = 'Usage limit exceeded. Visit https://github.com/settings/billing/codex to top up.';
        expect(classifyCodexFailure(details)).toBe('credits-required');
    });

    it('classifies standard rate-limit errors for retries', () => {
        const details = 'Rate limit exceeded. Try again in 60s.';
        expect(classifyCodexFailure(details)).toBe('rate-limit');
    });

    it('returns other for non-limit errors', () => {
        const details = 'Command "bash script.sh" failed: syntax error near unexpected token';
        expect(classifyCodexFailure(details)).toBe('other');
    });

    it('creates branded disallowed-credit error with rerun hint', () => {
        const error = buildCreditsDisallowedError('usage limit exceeded');
        expect(error).toBeInstanceOf(NotAllowed);
        expect(error.message).toContain('--allow-credits');
    });

    it('extracts details from Error and non-Error values', () => {
        const errorDetails = extractCodexFailureDetails(new Error('boom'));
        const valueDetails = extractCodexFailureDetails({ foo: 'bar' });

        expect(errorDetails).toContain('boom');
        expect(valueDetails).toContain('[object Object]');
    });

    it('truncates long error details', () => {
        const details = `A${'B'.repeat(20)}`;
        const limited = limitErrorDetails(details, 10);
        expect(limited).toContain('...[truncated]');
    });
});
