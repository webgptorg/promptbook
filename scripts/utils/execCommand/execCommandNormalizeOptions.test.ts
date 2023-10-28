import { describe, expect, it } from '@jest/globals';
import { execCommandNormalizeOptions } from './execCommandNormalizeOptions';

describe('how normalizing exec options works', () => {
    it('can normalize just string command', () => {
        expect(execCommandNormalizeOptions('ls')).toEqual({
            command: 'ls',
            args: [],
            cwd: process.cwd(),
            crashOnError: true,
            humanReadableCommand: 'ls',
            timeout: Infinity,
        });
    });

    it('can normalize single command', () => {
        expect(execCommandNormalizeOptions({ command: 'ls' })).toEqual({
            command: 'ls',
            args: [],
            cwd: process.cwd(),
            crashOnError: true,
            humanReadableCommand: 'ls',
            timeout: Infinity,
        });
    });
    it('can normalize single command and cwd', () => {
        expect(execCommandNormalizeOptions({ command: 'ls', cwd: './' })).toEqual({
            command: 'ls',
            args: [],
            cwd: './',
            crashOnError: true,
            humanReadableCommand: 'ls',
            timeout: Infinity,
        });
    });
    it('can normalize single command and crashOnError', () => {
        expect(execCommandNormalizeOptions({ command: 'ls', crashOnError: false })).toEqual({
            command: 'ls',
            args: [],
            cwd: process.cwd(),
            crashOnError: false,
            humanReadableCommand: 'ls',
            timeout: Infinity,
        });
    });

    it('can normalize single command and array args', () => {
        expect(execCommandNormalizeOptions({ command: 'npm', args: ['run', 'test'] })).toEqual({
            command: 'npm',
            args: ['run', 'test'],
            cwd: process.cwd(),
            crashOnError: true,
            humanReadableCommand: 'run',
            timeout: Infinity,
        });
    });

    it('can normalize single command and string args', () => {
        expect(execCommandNormalizeOptions({ command: 'npm run test' })).toEqual({
            command: 'npm',
            args: ['run', 'test'],
            cwd: process.cwd(),
            crashOnError: true,
            humanReadableCommand: 'run',
            timeout: Infinity,
        });
    });

    it('can normalize single command with args from array and string and also empty args ', () => {
        expect(execCommandNormalizeOptions({ command: ' npm   run ', args: ['test'] })).toEqual({
            command: 'npm',
            args: ['run', 'test'],
            cwd: process.cwd(),
            crashOnError: true,
            humanReadableCommand: 'run',
            timeout: Infinity,
        });
    });

    it('can split arg flags', () => {
        expect(execCommandNormalizeOptions(`git commit -m "Hello world"`)).toEqual({
            command: 'git',
            args: ['commit', '-m', '"Hello world"'],
            cwd: process.cwd(),
            crashOnError: true,
            humanReadableCommand: 'git',
            timeout: Infinity,
        });
    });

    /* TODO:
    it('can normalize multiple commands', async () => {});
    */
});
