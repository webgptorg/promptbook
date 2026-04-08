import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { NotFoundError } from '../../../src/errors/NotFoundError';
import { resolveCoderContext } from './resolveCoderContext';

describe('resolveCoderContext', () => {
    let temporaryDirectoryPath: string;

    beforeEach(async () => {
        temporaryDirectoryPath = await mkdtemp(join(tmpdir(), 'promptbook-coder-context-'));
    });

    afterEach(async () => {
        await rm(temporaryDirectoryPath, { recursive: true, force: true });
    });

    it('returns undefined when context is not provided', async () => {
        await expect(resolveCoderContext(undefined, temporaryDirectoryPath)).resolves.toBeUndefined();
    });

    it('returns inline context when the referenced file does not exist', async () => {
        await expect(resolveCoderContext('Inline instructions', temporaryDirectoryPath)).resolves.toBe(
            'Inline instructions',
        );
    });

    it('reads context content from an existing file', async () => {
        const contextFilePath = join(temporaryDirectoryPath, 'AGENTS.md');
        await writeFile(contextFilePath, '## Rules\n- Keep it DRY', 'utf-8');

        await expect(resolveCoderContext('AGENTS.md', temporaryDirectoryPath)).resolves.toBe(
            '## Rules\n- Keep it DRY',
        );
    });

    it('rejects directories referenced as context files', async () => {
        await mkdir(join(temporaryDirectoryPath, 'context-directory'));

        await expect(resolveCoderContext('context-directory', temporaryDirectoryPath)).rejects.toBeInstanceOf(
            NotFoundError,
        );
    });
});
