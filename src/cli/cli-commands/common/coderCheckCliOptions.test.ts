import { Command } from 'commander';
import { addCoderCheckOptions, normalizeCheckCommandOption } from './coderCheckCliOptions';

// cspell:ignore Brien

describe('shared Coder check options', () => {
    it.each([true, false])(
        'accepts and normalizes check commands (preflight supported: %s)',
        async (isCheckBeforeSupported) => {
            const command = new Command().exitOverride();
            addCoderCheckOptions(command, isCheckBeforeSupported);
            const execute = jest.fn();
            command.action((options) => execute(normalizeCheckCommandOption(options.check)));
            const check = 'npm run lint -- --fix && npm run build && node --test "test files/a.test.js"';
            await command.parseAsync(['--check', check], { from: 'user' });
            expect(execute).toHaveBeenCalledWith(check);
            expect(command.helpInformation()).not.toContain('--test');
        },
    );

    it.each(['--test', '--test-before', '--test=npm test', '--test-before=yes-and-fix'])(
        'rejects %s with migration guidance before execution',
        async (flag) => {
            const command = new Command().exitOverride().configureOutput({ writeErr: () => undefined });
            addCoderCheckOptions(command, true);
            const execute = jest.fn();
            command.action(execute);
            await expect(command.parseAsync([flag], { from: 'user' })).rejects.toThrow(/renamed to `--check/);
            expect(execute).not.toHaveBeenCalled();
        },
    );

    it('preserves spaced argument boundaries while retaining intentional shell composition', () => {
        expect(
            normalizeCheckCommandOption([
                'node',
                'tools/check project.cjs',
                '--label',
                'two words',
                '&&',
                'npm',
                'test',
            ]),
        ).toBe("node 'tools/check project.cjs' --label 'two words' && npm test");
    });

    it.each(['', '  ', [], ['', 'npm'], ['--check-before', 'no'], ['--dry-run']])(
        'rejects an empty command: %s',
        (value) => {
            expect(() => normalizeCheckCommandOption(value)).toThrow(/non-empty/);
        },
    );

    it.each(['--test', '--test-before'])('rejects a retired flag consumed as a missing command value: %s', (flag) => {
        expect(() => normalizeCheckCommandOption([flag, 'npm test'])).toThrow(/renamed to `--check/);
    });

    it('preserves an intentionally empty argument in a tokenized command', () => {
        expect(normalizeCheckCommandOption(['node', 'check.cjs', '--label', ''])).toBe("node check.cjs --label ''");
    });

    it('keeps literal quotes and backslashes in tokenized arguments', () => {
        expect(normalizeCheckCommandOption(['node', 'check.cjs', "O'Brien", '"quoted"', 'path\\file'])).toBe(
            "node check.cjs 'O'\\''Brien' '\"quoted\"' 'path\\file'",
        );
    });

    it('keeps literal shell metacharacters inside argument values', () => {
        expect(
            normalizeCheckCommandOption(['node', 'check.cjs', '$LITERAL', 'one;two', '`literal`', 'a|b', 'x>y']),
        ).toBe("node check.cjs '$LITERAL' 'one;two' '`literal`' 'a|b' 'x>y'");
    });

    it('rejects invalid preflight modes and preserves the no default during registration', async () => {
        const command = new Command().exitOverride().configureOutput({ writeErr: () => undefined });
        addCoderCheckOptions(command, true);
        expect(command.opts().checkBefore).toBe('no');
        await expect(command.parseAsync(['--check-before', 'sometimes'], { from: 'user' })).rejects.toThrow(
            'Allowed choices are no, yes-and-fail, yes-and-fix',
        );
    });
});
