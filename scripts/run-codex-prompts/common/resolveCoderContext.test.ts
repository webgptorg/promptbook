import { spaceTrim } from 'spacetrim';
import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import filesystem from 'fs/promises';
import { NotFoundError } from '../../../src/errors/NotFoundError';
import { resolveCoderContext } from './resolveCoderContext';

describe('resolveCoderContext', () => {
    let temporaryDirectoryPath: string;

    beforeEach(async () => {
        temporaryDirectoryPath = await mkdtemp(join(tmpdir(), 'promptbook-coder-context-'));
        jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(async () => {
        jest.restoreAllMocks();
        await rm(temporaryDirectoryPath, { recursive: true, force: true });
    });

    it('continues with a concise diagnostic when implicit AGENTS.md is missing', async () => {
        await expect(resolveCoderContext(undefined, temporaryDirectoryPath)).resolves.toBeUndefined();
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('AGENTS.md` is missing'));
        expect(await filesystem.readdir(temporaryDirectoryPath)).toEqual([]);
    });

    it('reads the actual UTF-8 default contents and preserves an empty default file', async () => {
        const contextPath = join(temporaryDirectoryPath, 'AGENTS.md');
        for (const content of ['Rules for this project: Příliš žluťoučký kůň.\n', '']) {
            await writeFile(contextPath, content);
            expect(await resolveCoderContext(undefined, temporaryDirectoryPath)).toBe(content);
            expect(await resolveCoderContext('./AGENTS.md', temporaryDirectoryPath)).toBe(content);
        }
        expect(console.warn).not.toHaveBeenCalled();
    });

    it.each(['', '   '])('keeps intentional empty context %j instead of loading the default', async (context) => {
        await writeFile(join(temporaryDirectoryPath, 'AGENTS.md'), 'Must not be included');
        expect(await resolveCoderContext(context, temporaryDirectoryPath)).toBeUndefined();
        expect(console.warn).not.toHaveBeenCalled();
    });

    it('replaces the default with inline instructions, long text or a project-relative file', async () => {
        await writeFile(join(temporaryDirectoryPath, 'AGENTS.md'), 'Default instructions');
        await mkdir(join(temporaryDirectoryPath, 'context files'));
        await writeFile(join(temporaryDirectoryPath, 'context files', 'override.md'), 'Override contents');
        expect(await resolveCoderContext('./context files/override.md', temporaryDirectoryPath)).toBe('Override contents');
        expect(await resolveCoderContext(join('context files', 'override.md'), temporaryDirectoryPath)).toBe('Override contents');
        expect(await resolveCoderContext('Use inline instructions', temporaryDirectoryPath)).toBe('Use inline instructions');
        const longText = 'Use these instructions.\n'.repeat(1000);
        expect(await resolveCoderContext(longText, temporaryDirectoryPath)).toBe(longText.trim());
    });

    it.each(['./missing.md', 'missing.txt', join('context', 'missing.md')])('rejects an explicit missing file %s', async (reference) => {
        await expect(resolveCoderContext(reference, temporaryDirectoryPath)).rejects.toThrow('--context');
    });

    it.each([undefined, './AGENTS.md'])('reports unreadable existing context for %s', async (reference) => {
        await writeFile(join(temporaryDirectoryPath, 'AGENTS.md'), 'Unreadable rules');
        jest.spyOn(filesystem, 'readFile').mockRejectedValueOnce(Object.assign(new Error('Access denied'), { code: 'EACCES' }));
        await expect(resolveCoderContext(reference, temporaryDirectoryPath)).rejects.toThrow('permissions');
        expect(console.warn).not.toHaveBeenCalled();
    });

    it('returns inline context when the referenced file does not exist', async () => {
        await expect(resolveCoderContext('Inline instructions', temporaryDirectoryPath)).resolves.toBe(
            'Inline instructions',
        );
    });

    it('reads context content from an existing file', async () => {
        const contextFilePath = join(temporaryDirectoryPath, 'AGENTS.md');
        await writeFile(contextFilePath, spaceTrim(`
            ## Rules
            - Keep it DRY
        `), 'utf-8');

        await expect(resolveCoderContext('AGENTS.md', temporaryDirectoryPath)).resolves.toBe(
            spaceTrim(`
                ## Rules
                - Keep it DRY
            `),
        );
    });

    it('rejects directories referenced as context files', async () => {
        await mkdir(join(temporaryDirectoryPath, 'context-directory'));

        await expect(resolveCoderContext('context-directory', temporaryDirectoryPath)).rejects.toBeInstanceOf(
            NotFoundError,
        );
    });
});
