import { describe, expect, it } from '@jest/globals';
import { $execCommand } from './$execCommand';

describe('basic usage of execCommand', () => {
    it(`should pass on simple command`, () =>
        expect(
            $execCommand({
                command: `whoami`,
            }),
        ).resolves.not.toThrowError());

    it(`should crash on unknown command`, () =>
        expect(
            $execCommand({
                command: `unknown-command`,
            }),
        ).rejects.toThrowError(
            /unknown-command/i,
            /*
              <- Note: There is a difference in the error message:
                - On Linux: Command "unknown-command" failed
                - On Windows: 'unknown-command' is not recognized as an internal or external command, operable program or batch file.
            */
        ));
});
