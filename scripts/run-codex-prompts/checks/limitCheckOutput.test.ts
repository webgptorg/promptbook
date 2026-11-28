import { limitCheckOutput } from './limitCheckOutput';

describe('check diagnostics included in repair instructions', () => {
    it('preserves useful failure details while removing common credential formats', () => {
        const output = limitCheckOutput(
            [
                'Lint failed in source.ts:12',
                'Authorization: Bearer private-access-value',
                'API_KEY=private-key-value',
                'PASSWORD: private-password-value',
                '{"api_key": "private-json-key-value", "password": "private password with spaces"}',
                "secret='private quoted secret with spaces'",
                'sk-01234567890123456789',
                'ghp_01234567890123456789',
                'https://username:password@example.com/check',
                'Expected 2, received 1',
            ].join('\n'),
        );
        expect(output).toContain('Lint failed in source.ts:12');
        expect(output).toContain('Expected 2, received 1');
        expect(output).toContain('[REDACTED]');
        for (const credential of [
            'private-access-value',
            'private-key-value',
            'private-password-value',
            'private-json-key-value',
            'private password with spaces',
            'private quoted secret with spaces',
            'sk-01234567890123456789',
            'ghp_01234567890123456789',
            'username:password',
        ])
            expect(output).not.toContain(credential);
    });

    it('bounds noisy diagnostics while retaining the final failure summary', () => {
        const output = limitCheckOutput(
            `start of verbose output\n${'diagnostic line\n'.repeat(2000)}Build failed: type mismatch`,
        );
        expect(output).toContain('check output truncated');
        expect(output).not.toContain('start of verbose output');
        expect(output.endsWith('Build failed: type mismatch')).toBe(true);
        expect(output.length).toBeLessThan(13_000);
    });

    it('keeps short ordinary diagnostics intact', () => {
        expect(limitCheckOutput('  Test failed: expected 2, received 1\n')).toBe('Test failed: expected 2, received 1');
    });
});
