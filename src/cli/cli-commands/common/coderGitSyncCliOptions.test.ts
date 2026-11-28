import { Command } from 'commander';
import { addCoderGitSyncOptions, normalizeCoderGitSyncCliOptions } from './coderGitSyncCliOptions';
import type { CoderGitSyncCliOptions } from './coderGitSyncCliOptions';

/**
 * Parses the shared git synchronization flags exactly like a `ptbk coder` command does.
 */
function parseCoderGitSyncOptions(args: ReadonlyArray<string>): CoderGitSyncCliOptions {
    const command = new Command('generate-boilerplates');
    command.exitOverride();
    addCoderGitSyncOptions(command);
    command.parse([...args], { from: 'user' });
    return command.opts() as CoderGitSyncCliOptions;
}

describe('addCoderGitSyncOptions', () => {
    it('keeps git untouched when no flag is used', () => {
        expect(parseCoderGitSyncOptions([])).toMatchObject({
            commit: false,
            autoPush: false,
            autoPull: false,
        });
    });

    it('enables committing, pushing and pulling when all flags are used', () => {
        expect(parseCoderGitSyncOptions(['--commit', '--auto-push', '--auto-pull'])).toMatchObject({
            commit: true,
            autoPush: true,
            autoPull: true,
        });
    });
});

describe('normalizeCoderGitSyncCliOptions', () => {
    it('normalizes the Commander flags into git synchronization options', () => {
        expect(
            normalizeCoderGitSyncCliOptions(parseCoderGitSyncOptions(['--commit', '--auto-push', '--auto-pull'])),
        ).toEqual({
            isCommitEnabled: true,
            isAutoPushEnabled: true,
            isAutoPullEnabled: true,
        });
    });

    it('allows pulling without committing', () => {
        expect(normalizeCoderGitSyncCliOptions(parseCoderGitSyncOptions(['--auto-pull']))).toEqual({
            isCommitEnabled: false,
            isAutoPushEnabled: false,
            isAutoPullEnabled: true,
        });
    });

    it('throws a branded NotAllowed error for `--auto-push` without `--commit`', () => {
        expect(() => normalizeCoderGitSyncCliOptions(parseCoderGitSyncOptions(['--auto-push']))).toThrow(
            expect.objectContaining({ name: 'NotAllowed' }),
        );
    });
});
