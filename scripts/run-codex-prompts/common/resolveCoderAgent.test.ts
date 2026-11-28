import filesystem, { mkdtemp, mkdir, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { CODER_DEFAULT_AGENT_BOOK_PATHS } from '../../../src/cli/cli-commands/coder/coderAgentRole';
import { NotAllowed } from '../../../src/errors/NotAllowed';
import { NotFoundError } from '../../../src/errors/NotFoundError';
import { ParseError } from '../../../src/errors/ParseError';
import { spaceTrim } from '../../../src/utils/organization/spaceTrim';
import { isPromptCompatibleWithRunner } from '../prompts/isPromptCompatibleWithRunner';
import { parsePromptFile } from '../prompts/parsePromptFile';
import { resolveCoderAgent, resolveCoderAgentBook } from './resolveCoderAgent';

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

        const resolvedAgentBook = await resolveCoderAgentBook('agents/coding/developer.book', temporaryDirectoryPath);

        expect(resolvedAgentBook?.agentReferences).toEqual(
            expect.arrayContaining([
                'agents/coding/developer.book',
                'developer.book',
                'developer',
                'developer-foo-bar',
            ]),
        );
    });

    it('exposes the human-readable agent name reported in prompt status lines', async () => {
        await writeFile(
            join(temporaryDirectoryPath, 'developer.book'),
            'Developer Foo bar\n\nRULE Keep the implementation maintainable.\n',
            'utf-8',
        );

        const resolvedAgentBook = await resolveCoderAgentBook('developer.book', temporaryDirectoryPath);

        expect(resolvedAgentBook?.agentName).toBe('Developer Foo bar');
    });

    it('prefers the META FULLNAME of the Book over its title line', async () => {
        await writeFile(
            join(temporaryDirectoryPath, 'developer.book'),
            'Developer Foo bar\n\nMETA FULLNAME Developer\n\nRULE Keep the implementation maintainable.\n',
            'utf-8',
        );

        const resolvedAgentBook = await resolveCoderAgentBook('developer.book', temporaryDirectoryPath);

        expect(resolvedAgentBook?.agentName).toBe('Developer');
    });
});

describe('coder execution role defaults', () => {
    let projectPath: string;

    beforeEach(async () => {
        projectPath = await mkdtemp(join(tmpdir(), 'coder project with spaces '));
        await mkdir(join(projectPath, 'agents/.core'), { recursive: true });
        await writeFile(join(projectPath, 'agents/.core/adam.book'), 'Adam\nFROM @Null\nRULE Local Adam guidance.');
        await writeFile(join(projectPath, 'agents/rules.book'), 'Rules\nRULE Imported project guidance.');
        await writeFile(join(projectPath, 'agents/reviewer.book'), 'Reviewer\nPERSONA Reviews project decisions.');
        for (const [role, path] of Object.entries(CODER_DEFAULT_AGENT_BOOK_PATHS)) {
            await writeFile(
                join(projectPath, path),
                spaceTrim(`
                    Project ${role}
                    META FULLNAME Local ${role}
                    PERSONA Customized ${role} persona.
                    IMPORT {./rules.book}
                    TEAM {./reviewer.book}
                `),
            );
        }
    });

    afterEach(async () => {
        jest.restoreAllMocks();
        await rm(projectPath, { recursive: true, force: true });
    });

    it.each(['developer', 'planner'] as const)(
        'compiles the local %s with inheritance, imports, TEAM and identity',
        async (defaultRole) => {
            const agent = await resolveCoderAgent(undefined, projectPath, {
                defaultRole,
                isInitializationAllowed: false,
            });
            expect(agent?.agentName).toBe(`Local ${defaultRole}`);
            expect(agent?.systemMessage).toContain(`Customized ${defaultRole} persona.`);
            expect(agent?.systemMessage).toContain('Local Adam guidance.');
            expect(agent?.systemMessage).toContain('Imported project guidance.');
            expect(agent?.systemMessage).toContain('Reviews project decisions.');
            expect(agent?.createdAgentBookPaths).toEqual([]);
            expect(agent?.agentReferences).toEqual(
                expect.arrayContaining([
                    CODER_DEFAULT_AGENT_BOOK_PATHS[defaultRole],
                    `${defaultRole}.book`,
                    defaultRole,
                    `project-${defaultRole}`,
                ]),
            );
            for (const reference of agent!.agentReferences) {
                const prompt = parsePromptFile('routed.md', `[ ] use agent \`${reference}\`\n\nImplement a task.`);
                expect(
                    isPromptCompatibleWithRunner(prompt, prompt.sections[0]!, {
                        agentReferences: agent!.agentReferences,
                    }),
                ).toBe(true);
            }
            const sourcePath = join(projectPath, CODER_DEFAULT_AGENT_BOOK_PATHS[defaultRole]);
            await writeFile(sourcePath, `${await readFile(sourcePath, 'utf-8')}\nRULE New local instruction.`);
            expect((await resolveCoderAgent(undefined, projectPath, { defaultRole }))?.systemMessage).toContain(
                'New local instruction.',
            );
        },
    );

    it.each(['developer', 'planner'] as const)(
        'allows relative and absolute custom paths with spaces to override %s',
        async (defaultRole) => {
            const customReference = 'agents/custom role.book';
            await writeFile(
                join(projectPath, customReference),
                spaceTrim(`
            Custom role
            META FULLNAME My specialist
            FROM {./${defaultRole}.book}
            RULE Explicit custom instruction.
        `),
            );
            for (const reference of [customReference, `./${customReference}`, join(projectPath, customReference)]) {
                const agent = await resolveCoderAgent(reference, projectPath, {
                    defaultRole,
                    isInitializationAllowed: false,
                });
                expect(agent?.agentName).toBe('My specialist');
                expect(agent?.systemMessage).toContain('Explicit custom instruction.');
                expect(agent?.systemMessage).toContain('Local Adam guidance.');
                expect(agent?.systemMessage).toContain('Imported project guidance.');
                expect(agent?.systemMessage).toContain('Reviews project decisions.');
                expect(agent?.agentReferences).toEqual(
                    expect.arrayContaining([
                        reference,
                        customReference,
                        'custom role.book',
                        'custom role',
                        'custom-role',
                    ]),
                );
            }
        },
    );

    it.each(['developer', 'planner'] as const)(
        'explains missing %s defaults without creating them or choosing another role',
        async (defaultRole) => {
            const path = CODER_DEFAULT_AGENT_BOOK_PATHS[defaultRole];
            await rm(join(projectPath, path));
            await expect(resolveCoderAgent(undefined, projectPath, { defaultRole })).rejects.toThrow(NotFoundError);
            await expect(resolveCoderAgent(undefined, projectPath, { defaultRole })).rejects.toThrow(
                join(projectPath, path),
            );
            await expect(resolveCoderAgent(undefined, projectPath, { defaultRole })).rejects.toThrow('ptbk coder init');
            await expect(readFile(join(projectPath, path))).rejects.toMatchObject({ code: 'ENOENT' });
            // An override remains usable when the role's default is absent.
            expect((await resolveCoderAgent('agents/rules.book', projectPath, { defaultRole }))?.agentName).toBe(
                'Rules',
            );
        },
    );

    it.each(['developer', 'planner'] as const)(
        'never falls back to %s after an explicit missing, empty or invalid selection',
        async (defaultRole) => {
            await expect(resolveCoderAgent('agents/missing.book', projectPath, { defaultRole })).rejects.toThrow(
                'explicit `--agent` path',
            );
            await expect(resolveCoderAgent('   ', projectPath, { defaultRole })).rejects.toThrow(NotAllowed);
            await writeFile(join(projectPath, 'agents/invalid.book'), '');
            await expect(resolveCoderAgent('agents/invalid.book', projectPath, { defaultRole })).rejects.toThrow(
                ParseError,
            );
            await writeFile(join(projectPath, 'agents/invalid.book'), 'Invalid\nFROM @Absent');
            await expect(resolveCoderAgent('agents/invalid.book', projectPath, { defaultRole })).rejects.toThrow(
                'Absent',
            );
            await expect(resolveCoderAgent('agents', projectPath, { defaultRole })).rejects.toThrow();
        },
    );

    it('reports an unreadable explicit Book with an actionable path', async () => {
        jest.spyOn(filesystem, 'readFile').mockRejectedValueOnce(
            Object.assign(new Error('Permission denied'), { code: 'EACCES' }),
        );
        await expect(
            resolveCoderAgent('agents/private.book', projectPath, { defaultRole: 'developer' }),
        ).rejects.toThrow('Check the file permissions');
    });

    it.each(['developer', 'planner'] as const)(
        'does not initialize Adam while previewing the %s role',
        async (defaultRole) => {
            const adamPath = join(projectPath, 'agents/.core/adam.book');
            await rm(adamPath);
            await expect(
                resolveCoderAgent(undefined, projectPath, { defaultRole, isInitializationAllowed: false }),
            ).rejects.toThrow('ptbk coder init');
            await expect(readFile(adamPath)).rejects.toMatchObject({ code: 'ENOENT' });
        },
    );
});
