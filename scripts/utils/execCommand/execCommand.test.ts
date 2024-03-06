import { describe, expect, it } from '@jest/globals';
import { execCommand } from './execCommand';

describe('basic usage of execCommand', () => {
    it(`should pass on simple command`, () =>
        expect(
            execCommand({
                command: `whoami`,
            }),
        ).resolves.not.toThrowError());

    it(`should crash on unknown command`, () =>
        expect(
            execCommand({
                command: `unknown-command`,
            }),
        ).rejects.toThrowError(/Command "unknown-command" failed/i));
});
