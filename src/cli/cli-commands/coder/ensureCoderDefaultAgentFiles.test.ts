import filesystem from 'fs/promises';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { spaceTrim } from 'spacetrim';
import { createAgentModelRequirements } from '../../../book-2.0/agent-source/createAgentModelRequirements';
import { parseAgentSourceWithCommitments } from '../../../book-2.0/agent-source/parseAgentSourceWithCommitments';
import type { string_book } from '../../../book-2.0/agent-source/string_book';
import { resolveBundledAgentBookPath } from '../common/resolveBundledAgentBookPath';
import { resolveLocalAgentSource } from '../common/resolveLocalAgentSource';
import { ensureCoderDefaultAgentFiles } from './ensureCoderDefaultAgentFiles';
import { getDefaultCoderPackageJsonScripts } from './getDefaultCoderPackageJsonScripts';
import { getDefaultCoderVscodeSettings } from './getDefaultCoderVscodeSettings';
import { initializeCoderProjectConfiguration } from './initializeCoderProjectConfiguration';
import { printInitializationSummary } from './printInitializationSummary';

/** All standard Books, including the shared ancestor, whose independent initialization is required. */
const DEFAULT_BOOKS = ['developer.book', 'planner.book', 'lawyer.book', 'copywriter.book', '.core/adam.book'] as const;
/** Network access is forbidden while initializing or resolving this local team. */
const ORIGINAL_FETCH = global.fetch;

describe('Coder default team initialization', () => {
    let projectPath: string;

    beforeEach(async () => {
        projectPath = await mkdtemp(join(tmpdir(), 'ptbk default team '));
        global.fetch = jest.fn().mockRejectedValue(new Error('Unexpected network request'));
    });

    afterEach(async () => {
        global.fetch = ORIGINAL_FETCH;
        jest.restoreAllMocks();
        await rm(projectPath, { recursive: true, force: true });
    });

    /** Writes a project artifact, including its parent directories. */
    async function writeProjectFile(relativePath: string, content: string | Buffer): Promise<void> {
        await mkdir(dirname(join(projectPath, relativePath)), { recursive: true });
        await writeFile(join(projectPath, relativePath), content);
    }

    /** Compiles the initialized role through the normal local resolver without contacting an Agents Server. */
    async function compileRole(role: string) {
        const resolved = await resolveLocalAgentSource(join(projectPath, `agents/${role}.book`), projectPath, {
            isInitializationAllowed: false,
        });
        return createAgentModelRequirements(resolved.agentSource, undefined, undefined, undefined, {
            agentReferenceResolver: resolved.agentReferenceResolver,
            teammateProfileResolver: {
                resolveTeammateProfile: resolved.agentReferenceResolver.resolveTeammateProfile!,
            },
        });
    }

    /** Captures bytes of all standard Books for idempotence and content-preservation assertions. */
    async function snapshotBooks(): Promise<Buffer[]> {
        return Promise.all(DEFAULT_BOOKS.map((asset) => readFile(join(projectPath, 'agents', asset))));
    }

    it('creates every bundled Book and two distinct local helper tools for each primary role', async () => {
        const summary = await initializeCoderProjectConfiguration(projectPath);
        expect(summary.adamAgentFileStatus).toBe('created');
        for (const asset of DEFAULT_BOOKS) {
            expect(await readFile(join(projectPath, 'agents', asset))).toEqual(
                await readFile(await resolveBundledAgentBookPath(`agents/default/${asset}`)),
            );
        }
        for (const role of ['developer', 'planner']) {
            const requirements = await compileRole(role);
            expect(requirements.isClosed).toBe(true);
            expect(requirements.tools?.filter(({ name }) => name.startsWith('team_'))).toHaveLength(2);
            expect(requirements.systemMessage).toContain('legal or compliance');
            expect(requirements.systemMessage).toContain('user-facing copy');
            expect(requirements.systemMessage).toContain('helpful, honest, and intelligent');
        }
        const before = await snapshotBooks();
        const repeated = await initializeCoderProjectConfiguration(projectPath);
        expect(await snapshotBooks()).toEqual(before);
        expect(
            repeated.referencedArtifactStatuses.filter(({ relativeFilePath }) => relativeFilePath.endsWith('.book')),
        ).toEqual(
            expect.arrayContaining(
                ['developer', 'planner', 'lawyer', 'copywriter'].map((role) => ({
                    relativeFilePath: `agents/${role}.book`,
                    status: 'unchanged',
                })),
            ),
        );
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it.each(Array.from({ length: 32 }, (_, index) => index))(
        'fills exactly the missing Books and TEAM references for default-Book subset %i with all scripts present',
        async (subset) => {
            const originalBooks = new Map<string, string>();
            for (const [index, asset] of DEFAULT_BOOKS.entries()) {
                if ((subset & (1 << index)) === 0) continue;
                const name = asset === '.core/adam.book' ? 'Adam' : asset.replace('.book', '');
                const source = `${name}\r\n\r\n${
                    name === 'Adam' ? 'FROM @Null\r\n' : ''
                }PERSONA Custom ${name} persona.\r\nRULE Preserve this project rule.\r\n\r\nCLOSED\r\n`;
                originalBooks.set(asset, source);
                await writeProjectFile(`agents/${asset}`, source);
            }
            const preservedArtifacts = {
                'package.json': JSON.stringify({ scripts: getDefaultCoderPackageJsonScripts() }, null, 4),
                '.vscode/settings.json': JSON.stringify({ ...getDefaultCoderVscodeSettings(), 'editor.tabSize': 3 }),
                'AGENTS.md': '# Custom project context\n',
                'prompts/existing.md': '[ ]\n\nExisting PRD requirements.\n',
            };
            for (const [path, content] of Object.entries(preservedArtifacts)) await writeProjectFile(path, content);

            const summary = await initializeCoderProjectConfiguration(projectPath);
            expect(summary.addedPackageJsonScriptNames).toEqual([]);
            for (const asset of DEFAULT_BOOKS) {
                const source = await readFile(join(projectPath, 'agents', asset), 'utf-8');
                const originalSource = originalBooks.get(asset);
                const isPrimary = ['developer.book', 'planner.book'].includes(asset);
                const status =
                    asset === '.core/adam.book'
                        ? summary.adamAgentFileStatus
                        : summary.referencedArtifactStatuses.find(
                              ({ relativeFilePath }) => relativeFilePath === `agents/${asset}`,
                          )?.status;
                expect(status).toBe(originalSource ? (isPrimary ? 'augmented' : 'unchanged') : 'created');
                if (originalSource && !isPrimary) expect(source).toBe(originalSource);
                if (originalSource && isPrimary) {
                    expect(source).toContain(`PERSONA Custom ${asset.replace('.book', '')} persona.\r\n`);
                    expect(source).toContain('RULE Preserve this project rule.\r\n');
                    expect(source.endsWith('CLOSED\r\n')).toBe(true);
                }
            }
            for (const [path, content] of Object.entries(preservedArtifacts)) {
                expect(await readFile(join(projectPath, path), 'utf-8')).toBe(content);
            }
            const before = await snapshotBooks();
            await initializeCoderProjectConfiguration(projectPath);
            expect(await snapshotBooks()).toEqual(before);
        },
    );

    it.each(['@Lawyer', '{LAWYER}', '{./lawyer.book}', '{../agents/lawyer.book}', '{agents/lawyer.book}', 'absolute'])(
        'recognizes equivalent helper reference %s and preserves unrelated teammates',
        async (reference) => {
            await ensureCoderDefaultAgentFiles(projectPath);
            await writeProjectFile('agents/reviewer.book', 'Reviewer\nPERSONA Review accessibility.\n');
            const lawyerReference =
                reference === 'absolute' ? `{${join(projectPath, 'agents/lawyer.book')}}` : reference;
            const source = `Developer\nPERSONA My developer.\nTEAM Ask ${lawyerReference} about legal issues and @Reviewer about accessibility.\nRULE My rule.\nCLOSED\n`;
            await writeProjectFile('agents/developer.book', source);
            const result = await ensureCoderDefaultAgentFiles(projectPath);
            expect(result.find(({ relativeFilePath }) => relativeFilePath === 'agents/developer.book')?.status).toBe(
                'augmented',
            );
            const updated = await readFile(join(projectPath, 'agents/developer.book'), 'utf-8');
            expect(updated).toContain(
                `TEAM Ask ${lawyerReference} about legal issues and @Reviewer about accessibility.`,
            );
            expect(updated).not.toContain('TEAM Consult {./lawyer.book}');
            const requirements = await compileRole('developer');
            expect(requirements.tools?.filter(({ name }) => name.startsWith('team_'))).toHaveLength(3);
            expect(requirements.systemMessage).toContain('My rule.');
            expect(requirements.systemMessage).toContain('Review accessibility.');
            await ensureCoderDefaultAgentFiles(projectPath);
            expect(await readFile(join(projectPath, 'agents/developer.book'), 'utf-8')).toBe(updated);
        },
    );

    it('does not add declarations or tools for already present helper aliases', async () => {
        await ensureCoderDefaultAgentFiles(projectPath);
        const source =
            'Planner\nTEAM @Lawyer and {./lawyer.book}\nTEAM @Copywriter\nTEAM {agents/copywriter.book}\nCLOSED\n';
        await writeProjectFile('agents/planner.book', source);
        const result = await ensureCoderDefaultAgentFiles(projectPath);
        expect(result.find(({ relativeFilePath }) => relativeFilePath === 'agents/planner.book')?.status).toBe(
            'unchanged',
        );
        expect(await readFile(join(projectPath, 'agents/planner.book'), 'utf-8')).toBe(source);
        expect((await compileRole('planner')).tools?.filter(({ name }) => name.startsWith('team_'))).toHaveLength(2);
    });

    it('reports distinct Books that would collide with a default helper tool', async () => {
        await ensureCoderDefaultAgentFiles(projectPath);
        await writeProjectFile(
            'agents/specialist.book',
            'Specialist\nMETA FULLNAME Lawyer\nPERSONA A custom adviser.\n',
        );
        const source = 'Developer\nTEAM {./specialist.book}\nRULE Preserve this rule.\nCLOSED\n';
        await writeProjectFile('agents/developer.book', source);
        const result = await ensureCoderDefaultAgentFiles(projectPath);
        expect(result.find(({ relativeFilePath }) => relativeFilePath === 'agents/developer.book')).toMatchObject({
            status: 'unresolved',
            diagnostic: expect.stringContaining('team_chat_lawyer'),
        });
        expect(await readFile(join(projectPath, 'agents/developer.book'), 'utf-8')).toBe(source);
    });

    it.each([
        'Custom role',
        'Custom role\nRULE Existing rule.\nCLOSED',
        'Custom role\nRULE Existing rule.\nOPEN\n',
        '\ufeff\r\nCustom role\r\nPERSONA Keep my persona.\r\n\r\nCLOSED\r\n',
        spaceTrim(`
            Custom role
            NOTE Preserve this example:
            \`\`\`book
            TEAM @Lawyer
            CLOSED
            \`\`\`
            ---
            RULE Preserve this rule.
            CLOSED
        `),
        'Custom role\nRULE Preserve this rule.\n---\nCUSTOM EXTENSION Keep this unknown block.\n',
        'Custom role\nTEAM {./lawyer.book}\nDELETE {./lawyer.book}\nCLOSED\n',
    ])('inserts at a valid block boundary while preserving structural content: %s', async (source) => {
        await ensureCoderDefaultAgentFiles(projectPath);
        await writeProjectFile('agents/planner.book', source);
        const before = parseAgentSourceWithCommitments(source as string_book);
        const result = await ensureCoderDefaultAgentFiles(projectPath);
        expect(result.find(({ relativeFilePath }) => relativeFilePath === 'agents/planner.book')?.status).toBe(
            'augmented',
        );
        const updated = await readFile(join(projectPath, 'agents/planner.book'), 'utf-8');
        const after = parseAgentSourceWithCommitments(updated as string_book);
        for (const { type, content } of before.commitments) {
            expect(after.commitments).toEqual(expect.arrayContaining([expect.objectContaining({ type, content })]));
        }
        for (const { type, source: unknownSource } of before.unknownCommitments) {
            expect(after.unknownCommitments).toEqual(
                expect.arrayContaining([expect.objectContaining({ type, source: unknownSource })]),
            );
        }
        const requirements = await compileRole('planner');
        expect(requirements.tools?.filter(({ name }) => name.startsWith('team_'))).toHaveLength(2);
        if (source.trim().endsWith('CLOSED')) expect(requirements.isClosed).toBe(true);
        await ensureCoderDefaultAgentFiles(projectPath);
        expect(await readFile(join(projectPath, 'agents/planner.book'), 'utf-8')).toBe(updated);
    });

    it.each([
        '',
        'Developer\nRULE\nCLOSED\n',
        'Developer\nNOTE Example\n```book\nCLOSED\n',
        'Developer\n<<<<<<< ours\nRULE One\n=======\nRULE Two\n>>>>>>> theirs\n',
        Buffer.from([0xff, 0xfe, 0x00]),
    ])('reports an invalid primary Book without replacing it: %s', async (source) => {
        await writeProjectFile('agents/developer.book', source);
        const result = await ensureCoderDefaultAgentFiles(projectPath);
        expect(result.find(({ relativeFilePath }) => relativeFilePath === 'agents/developer.book')).toMatchObject({
            status: 'unresolved',
            diagnostic: expect.any(String),
        });
        expect(await readFile(join(projectPath, 'agents/developer.book'))).toEqual(Buffer.from(source));
        expect(result.find(({ relativeFilePath }) => relativeFilePath === 'agents/planner.book')?.status).toBe(
            'created',
        );
    });

    it.each(['TEAM @Missing', 'TEAM ./lawyer.book', 'TEAM @Lawyer'])(
        'preserves primary Books when a reference cannot be safely augmented: %s',
        async (team) => {
            await ensureCoderDefaultAgentFiles(projectPath);
            if (team === 'TEAM @Lawyer')
                await writeProjectFile('agents/other-lawyer.book', 'Lawyer\nPERSONA Another lawyer.');
            const source = `Developer\n${team}\nCLOSED\n`;
            await writeProjectFile('agents/developer.book', source);
            const result = await ensureCoderDefaultAgentFiles(projectPath);
            expect(result.find(({ relativeFilePath }) => relativeFilePath === 'agents/developer.book')).toMatchObject({
                status: 'unresolved',
                diagnostic: expect.stringContaining('TEAM'),
            });
            expect(await readFile(join(projectPath, 'agents/developer.book'), 'utf-8')).toBe(source);
            expect(result.find(({ relativeFilePath }) => relativeFilePath === 'agents/planner.book')?.status).toBe(
                'unchanged',
            );
        },
    );

    it.each(['lawyer.book', 'copywriter.book', '.core/adam.book'])(
        'reports conflicting %s targets and the affected TEAM declarations',
        async (asset) => {
            await mkdir(join(projectPath, 'agents', asset), { recursive: true });
            await writeProjectFile(`agents/${asset}/keep.txt`, 'Keep directory contents.');
            const summary = await initializeCoderProjectConfiguration(projectPath);
            const artifact =
                asset === '.core/adam.book'
                    ? { status: summary.adamAgentFileStatus }
                    : summary.referencedArtifactStatuses.find(
                          ({ relativeFilePath }) => relativeFilePath === `agents/${asset}`,
                      );
            expect(artifact?.status).toBe('unresolved');
            expect(await readFile(join(projectPath, `agents/${asset}/keep.txt`), 'utf-8')).toBe(
                'Keep directory contents.',
            );
            expect(
                summary.referencedArtifactStatuses.find(
                    ({ relativeFilePath }) => relativeFilePath === 'agents/planner.book',
                ),
            ).toMatchObject({ status: 'unresolved', diagnostic: expect.stringContaining(`agents/${asset}`) });
            const output = jest.spyOn(console, 'info').mockImplementation(() => undefined);
            printInitializationSummary(summary);
            expect(output.mock.calls.flat().join('\n')).toContain('unresolved');
            expect(output.mock.calls.flat().join('\n')).toContain('TEAM');
        },
    );

    it('reports unreadable helpers without overwriting them or changing existing primary Books', async () => {
        await ensureCoderDefaultAgentFiles(projectPath);
        const before = await snapshotBooks();
        const originalReadFile = filesystem.readFile;
        const readSpy = jest.spyOn(filesystem, 'readFile').mockImplementation(((
            ...argumentsList: Parameters<typeof readFile>
        ) => {
            if (String(argumentsList[0]) === join(projectPath, 'agents/lawyer.book')) {
                return Promise.reject(Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' }));
            }
            return originalReadFile(...argumentsList);
        }) as typeof filesystem.readFile);
        const result = await ensureCoderDefaultAgentFiles(projectPath);
        readSpy.mockRestore();
        expect(result.find(({ relativeFilePath }) => relativeFilePath === 'agents/lawyer.book')).toMatchObject({
            status: 'unresolved',
            diagnostic: expect.stringContaining('EACCES'),
        });
        expect(await snapshotBooks()).toEqual(before);
    });
});
