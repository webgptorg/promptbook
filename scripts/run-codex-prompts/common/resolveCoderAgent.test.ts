import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { resolveCoderAgentBook } from './resolveCoderAgent';

describe('resolveCoderAgentBook', () => {
    let temporaryDirectoryPath: string;

    beforeEach(async () => {
        temporaryDirectoryPath = await mkdtemp(join(tmpdir(), 'promptbook-coder-agent-'));
    });

    afterEach(async () => {
        await rm(temporaryDirectoryPath, { recursive: true, force: true });
    });

    it('returns undefined when no agent book is selected', async () => {
        await expect(resolveCoderAgentBook(undefined, temporaryDirectoryPath)).resolves.toBeUndefined();
    });

    it('exposes the path, filename, stem and Book-title aliases for prompt routing', async () => {
        const agentBookDirectoryPath = join(temporaryDirectoryPath, 'agents', 'coding');
        await mkdir(agentBookDirectoryPath, { recursive: true });
        await writeFile(
            join(agentBookDirectoryPath, 'developer.book'),
            'Developer Foo bar\n\nRULE Keep the implementation maintainable.\n',
            'utf-8',
        );

        const resolvedAgentBook = await resolveCoderAgentBook(
            'agents/coding/developer.book',
            temporaryDirectoryPath,
        );

        expect(resolvedAgentBook?.agentReferences).toEqual(
            expect.arrayContaining([
                'agents/coding/developer.book',
                'developer.book',
                'developer',
                'developer-foo-bar',
            ]),
        );
    });
});
