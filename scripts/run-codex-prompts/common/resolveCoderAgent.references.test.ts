import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { spaceTrim } from 'spacetrim';
import { NotFoundError } from '../../../src/errors/NotFoundError';
import { ParseError } from '../../../src/errors/ParseError';
import { resolveCoderAgent } from './resolveCoderAgent';

/** Primary agent path used to distinguish book-relative paths from project-relative paths. */
const PRIMARY_AGENT_PATH = 'agents/coding/pavol-workshops.book';

/** Original network implementation restored after every test. */
const ORIGINAL_FETCH = global.fetch;

describe('coder agent reference resolution', () => {
    let projectPath: string;

    /** Writes a fixture without assuming that its parent directories already exist. */
    async function writeBook(relativePath: string, source: string): Promise<void> {
        const filePath = join(projectPath, relativePath);
        await mkdir(dirname(filePath), { recursive: true });
        await writeFile(filePath, spaceTrim(source), 'utf-8');
    }

    /** Compiles the real coder prompt after choosing the fixture's primary book. */
    async function compileAgent(commitment: string): Promise<string> {
        await writeBook(
            PRIMARY_AGENT_PATH,
            spaceTrim(`
            Pavol Workshops
            ${commitment}
            RULE Workshop-specific guidance.
        `),
        );
        return (await resolveCoderAgent(PRIMARY_AGENT_PATH, projectPath))!.systemMessage;
    }

    beforeEach(async () => {
        projectPath = await mkdtemp(join(tmpdir(), 'promptbook-coder-references-'));
        await writeBook(
            'agents/coding/.core/adam.book',
            spaceTrim(`
            Adam
            FROM @Null
            RULE Shared Adam guidance.
        `),
        );
        global.fetch = jest.fn().mockRejectedValue(new Error('Unexpected network request'));
    });

    afterEach(async () => {
        global.fetch = ORIGINAL_FETCH;
        await rm(projectPath, { recursive: true, force: true });
    });

    it.each(['FROM', 'IMPORT', 'TEAM'])('resolves %s names recursively from first-line titles', async (commitment) => {
        await writeBook(
            'agents/coding/nested/not-the-agent-name.book',
            spaceTrim(`
            Pavol
            PERSONA Mentor for workshop preparation.
            RULE Inherited workshop guidance.
        `),
        );
        for (const reference of ['@Pavol', '{Pavol}']) {
            const systemMessage = await compileAgent(`${commitment} ${reference}`);
            expect(systemMessage).toContain('Mentor for workshop preparation.');
            expect(systemMessage).toContain('Workshop-specific guidance.');
            if (commitment !== 'TEAM') {
                expect(systemMessage).toContain('Inherited workshop guidance.');
            }
        }
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it.each(['FROM', 'IMPORT', 'TEAM'])('resolves each supported local path form in %s', async (commitment) => {
        const references = [
            ['./foo/bar/agent.book', 'agents/coding/foo/bar/agent.book'],
            ['../foo/bar/agent.book', 'agents/foo/bar/agent.book'],
            ['foo/agent.book', 'foo/agent.book'],
        ] as const;

        for (const [reference, filePath] of references) {
            await writeBook(
                filePath,
                spaceTrim(`
                Mentor ${reference}
                FROM @Null
                PERSONA Guidance from ${reference}.
            `),
            );
            const systemMessage = await compileAgent(`${commitment} {${reference}}`);
            expect(systemMessage).toContain(`Guidance from ${reference}.`);
        }
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it.each(['FROM', 'IMPORT', 'TEAM'])('loads HTTP book references in %s', async (commitment) => {
        global.fetch = jest.fn().mockResolvedValue(
            new Response(
                spaceTrim(`
            Remote Mentor
            FROM @void
            PERSONA Remote workshop guidance.
        `),
                { headers: { 'content-type': 'text/plain' } },
            ),
        );
        expect(await compileAgent(`${commitment} {http://example.com/agent.book}`)).toContain(
            'Remote workshop guidance.',
        );
        expect(global.fetch).toHaveBeenCalledWith('http://example.com/agent.book');
    });

    it.each(['@null', '{null}', '@void', '{void}'])('disables inheritance with FROM %s', async (reference) => {
        await rm(join(projectPath, 'agents/coding/.core/adam.book'));
        const systemMessage = await compileAgent(`FROM ${reference}`);
        expect(systemMessage).not.toContain('Shared Adam guidance.');
        expect(systemMessage).toContain('Workshop-specific guidance.');
        expect(global.fetch).not.toHaveBeenCalled();
        await expect(readFile(join(projectPath, 'agents/coding/.core/adam.book'))).rejects.toMatchObject({
            code: 'ENOENT',
        });
    });

    it('inherits the local Adam by default and keeps project-owned Adam unchanged', async () => {
        const adamPath = join(projectPath, 'agents/coding/.core/adam.book');
        const originalAdamSource = await readFile(adamPath, 'utf-8');
        expect(await compileAgent('')).toContain('Shared Adam guidance.');
        expect(await readFile(adamPath, 'utf-8')).toBe(originalAdamSource);
    });

    it('creates a missing Adam from the same bundled source as the server', async () => {
        await rm(join(projectPath, 'agents/coding/.core/adam.book'));
        const systemMessage = await compileAgent('');
        const bundledAdamSource = await readFile(join(process.cwd(), 'agents/default/.core/adam.book'), 'utf-8');
        expect(await readFile(join(projectPath, 'agents/coding/.core/adam.book'), 'utf-8')).toBe(bundledAdamSource);
        expect(systemMessage).toContain('You are a helpful, honest, and intelligent AI assistant.');
    });

    it('uses an existing Adam outside .core without creating a second Adam', async () => {
        await rm(join(projectPath, 'agents/coding/.core/adam.book'));
        await writeBook('agents/coding/shared/foundation.book', 'Adam\nFROM @Null\nRULE Custom foundation.');
        expect(await compileAgent('')).toContain('Custom foundation.');
        await expect(readFile(join(projectPath, 'agents/coding/.core/adam.book'))).rejects.toMatchObject({
            code: 'ENOENT',
        });
    });

    it('resolves nested inheritance, imports and multiline TEAM paths from each declaring book', async () => {
        await writeBook(
            'agents/coding/mentors/pavol.book',
            spaceTrim(`
            Pavol
            FROM {../foundation.book}
            IMPORT {./rules.book}
            TEAM Ask the reviewer about changes:
            {./reviewer.book}
        `),
        );
        await writeBook('agents/coding/foundation.book', 'Foundation\nRULE Foundation guidance.');
        await writeBook('agents/coding/mentors/rules.book', 'Rules\nRULE Imported guidance.');
        await writeBook('agents/coding/mentors/reviewer.book', 'Reviewer\nPERSONA Reviews workshop materials.');
        const systemMessage = await compileAgent('FROM @Pavol');
        expect(systemMessage).toContain('Shared Adam guidance.');
        expect(systemMessage).toContain('Foundation guidance.');
        expect(systemMessage).toContain('Imported guidance.');
        expect(systemMessage).toContain('Reviews workshop materials.');
    });

    it('resolves nested direct URL books before compiling the coder prompt', async () => {
        global.fetch = jest.fn(
            async (url: string) =>
                new Response(
                    url.endsWith('/parent.book')
                        ? 'Remote Parent\nFROM {./base.book}\nRULE Remote parent guidance.'
                        : 'Remote Base\nFROM @null\nRULE Remote base guidance.',
                ),
        ) as typeof fetch;
        const systemMessage = await compileAgent('FROM {https://example.com/books/parent.book}');
        expect(systemMessage).toContain('Remote parent guidance.');
        expect(systemMessage).toContain('Remote base guidance.');
        expect(global.fetch).toHaveBeenCalledWith('https://example.com/books/base.book');
    });

    it('resolves a teammate profile through the teammate own inheritance chain', async () => {
        await writeBook('agents/coding/pavol.book', 'Pavol\nPERSONA Experienced workshop mentor.');
        await writeBook('agents/coding/reviewer.book', 'Reviewer\nFROM @Pavol');
        expect(await compileAgent('TEAM @Reviewer')).toContain('Experienced workshop mentor.');
    });

    it('accepts IMPORTS and tab-separated references', async () => {
        await writeBook('agents/coding/pavol.book', 'Pavol\nFROM @null\nRULE Imported guidance.');
        expect(await compileAgent('FROM\t@null\nIMPORTS\t{./pavol.book}')).toContain('Imported guidance.');
    });

    it('reports a missing relative book with the resolved path', async () => {
        await expect(compileAgent('FROM {./missing.book}')).rejects.toThrow(
            join(projectPath, 'agents/coding/missing.book'),
        );
    });

    it('only resolves the last FROM and follows the server behavior for inheritance cycles', async () => {
        await writeBook('agents/coding/pavol.book', 'Pavol\nFROM {Pavol Workshops}\nRULE Parent guidance.');
        const systemMessage = await compileAgent('FROM @Missing\nFROM @Pavol');
        expect(systemMessage).toContain('Parent guidance.');
        expect(systemMessage).not.toContain('Shared Adam guidance.');
    });

    it('rejects cyclic imports instead of recursing indefinitely', async () => {
        await writeBook('agents/coding/pavol.book', 'Pavol\nFROM @null\nIMPORT {Pavol Workshops}');
        await expect(compileAgent('FROM @null\nIMPORT @Pavol')).rejects.toBeInstanceOf(ParseError);
    });

    it.each(['FROM', 'IMPORT', 'TEAM'])(
        'reports missing %s names without silently dropping instructions',
        async (commitment) => {
            await expect(compileAgent(`${commitment} @Missing`)).rejects.toBeInstanceOf(NotFoundError);
        },
    );

    it('reports duplicate titles and allows an explicit path to disambiguate them', async () => {
        await writeBook('agents/coding/one.book', 'Pavol\nFROM @null\nRULE First parent.');
        await writeBook('agents/coding/two.book', 'Pavol\nFROM @null\nRULE Second parent.');
        await expect(compileAgent('FROM @Pavol')).rejects.toThrow('ambiguous');
        expect(await compileAgent('FROM {./two.book}')).toContain('Second parent.');
    });

    it('does not resolve example commitments inside code fences', async () => {
        const systemMessage = await compileAgent(
            spaceTrim(`
            FROM @null
            RULE Preserve this example:
            \`\`\`book
            IMPORT @Missing
            TEAM {Unknown}
            \`\`\`
        `),
        );
        expect(systemMessage).toContain('IMPORT @Missing');
    });
});
