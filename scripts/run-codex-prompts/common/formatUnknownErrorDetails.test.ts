import { AuthenticationError } from '../../../src/errors/AuthenticationError';
import { formatUnknownErrorDetails } from './formatUnknownErrorDetails';

describe('formatUnknownErrorDetails', () => {
    it('keeps the stack of an ordinary failure', () => {
        expect(formatUnknownErrorDetails(new Error('Boom'))).toContain('formatUnknownErrorDetails.test.ts');
    });

    it('reports re-authentication instructions without the stack which would bury them', () => {
        const details = formatUnknownErrorDetails(new AuthenticationError('Sign in again by running `claude`.'));

        expect(details).toBe('Sign in again by running `claude`.');
    });
});
