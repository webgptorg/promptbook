import { link, mkdir, mkdtemp, readFile, readdir, rm, symlink, unlink, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import filesystem from 'fs';
import { join } from 'path';
import { parsePromptFile } from '../../../../../scripts/run-codex-prompts/prompts/parsePromptFile';
import { resolveCoderAgent } from '../../../../../scripts/run-codex-prompts/common/resolveCoderAgent';
import { initializeCoderProjectConfiguration } from '../initializeCoderProjectConfiguration';
import { createPlanningWorkspace } from './createPlanningWorkspace';
import { assertPlanningCommitSafe } from './assertPlanningCommitSafe';
import { preparePlanningChanges } from './preparePlanningChanges';
import { runPlanningSession } from './runPlanningSession';
import { savePlanningChanges } from './savePlanningChanges';
import { createPlanningTerminal } from './createPlanningTerminal';
import { parsePlanningReply, type PlanningReply } from './planningProtocol';
import { readPlanningContext } from './readPlanningContext';
import type { runPlanningHarness } from './runPlanningHarness';
import CONVERSATION from './fixtures/conversation.json';
import { snapshotPlanningProject as snapshot } from './fixtures/snapshotPlanningProject';

/** Native runner options shared by fixture sessions. */
const OPTIONS = { agentName: 'openai-codex', noUi: true, allowCredits: false } as const;
/** A small pending PRD with routing metadata, CRLF, and an unrelated completed task. */
const EXISTING_PRD =
    '[ ] use agent `developer` !!\r\n\r\n[✨🪴] Existing feature\r\n\r\nKeep original behavior.\r\n\r\n## Unrelated context\r\nKeep this context.\r\n\r\n---\r\n\r\n[x] by Developer $1.23\r\n\r\n[✨🎯] Completed feature\r\n\r\nCompleted requirements.\r\n';
/** New task fixture used in failure, cancellation, and draft tests. */
const NEW_TASK: PlanningReply = {
    message: 'Review this task.',
    reads: [],
    proposals: [
        {
            kind: 'create',
            title: 'Feature',
            body: '## Acceptance criteria\nThe behavior works.',
            priority: 0,
            isReady: true,
        },
    ],
};

describe('Planner conversation and write boundary', () => {
    let projectPath: string;
    beforeEach(async () => {
        projectPath = await mkdtemp(join(tmpdir(), 'ptbk planner '));
        await initializeCoderProjectConfiguration(projectPath);
        await mkdir(join(projectPath, 'src'));
        await writeFile(join(projectPath, 'src/app.ts'), 'const ORIGINAL = true;\n');
        await writeFile(join(projectPath, 'prompts/existing.md'), EXISTING_PRD);
    });
    afterEach(async () => {
        await rm(projectPath, { recursive: true, force: true });
    });

    it('discusses two features, splits tasks, remembers answers, and revises the first with only expected PRD changes', async () => {
        const before = await snapshot(projectPath);
        const replies: unknown[] = [];
        let turn = 0;
        const output: string[] = [];
        const harness: typeof runPlanningHarness = jest.fn(async (options) => {
            expect(options.prompt).toContain('Only administrators may export');
            if (turn > 2) expect(options.prompt).toContain('Exclude archived records');
            const paths = (await readdir(join(projectPath, 'prompts'))).filter((path) =>
                path.endsWith('-csv-exports.md'),
            );
            const reply = JSON.stringify(replies.shift()).replace(/\{\{first\}\}/gu, `prompts/${paths[0]}`);
            return reply;
        });
        const saved = await runPlanningSession(
            { ...OPTIONS, projectPath },
            {
                signal: new AbortController().signal,
                write: (message) => output.push(message),
                readMessage: async () => {
                    const entry = CONVERSATION[turn++];
                    if (entry?.reply) replies.push(entry.reply);
                    if (entry?.afterRead) replies.push(entry.afterRead);
                    return entry?.user;
                },
            },
            harness,
        );
        expect(saved.size).toBe(3);
        const paths = [...saved.keys()].sort();
        expect(paths.map((path) => path.match(/-(\d{4})-/u)?.[1])).toEqual(['0000', '0010', '0020']);
        const first = saved.get(paths[0]!)!;
        expect(first).toContain('Administrators and owners');
        expect(first).toContain('Archived records are excluded');
        expect(parsePromptFile(paths[0]!, first).sections[0]).toMatchObject({ status: 'todo', priority: 2 });
        expect(parsePromptFile(paths[2]!, saved.get(paths[2]!)!).sections[0]?.status).toBe('not-ready');
        const after = await snapshot(projectPath);
        expect(
            Object.keys(after)
                .filter((path) => before[path] !== after[path])
                .sort(),
        ).toEqual(paths);
        expect(output.join('\n')).toContain('Edit prompts/');
        expect(harness).toHaveBeenCalledTimes(5);
    });

    it('preserves existing identity, lifecycle, unrelated sections and CRLF', async () => {
        const changes = await preparePlanningChanges(
            projectPath,
            [
                {
                    kind: 'edit',
                    path: 'prompts/existing.md',
                    find: 'Keep original behavior.',
                    replace: 'Revised behavior.',
                    isReady: true,
                },
            ],
            undefined,
        );
        savePlanningChanges(projectPath, await createPlanningWorkspace(projectPath), changes, false);
        expect(await readFile(join(projectPath, 'prompts/existing.md'), 'utf-8')).toBe(
            EXISTING_PRD.replace('Keep original behavior.', 'Revised behavior.'),
        );
    });

    it('rejects two edits targeting the same file through alternate relative spellings', async () => {
        const before = await snapshot(projectPath);
        await expect(
            preparePlanningChanges(
                projectPath,
                ['prompts/existing.md', './prompts/./existing.md'].map((path) => ({
                    kind: 'edit' as const,
                    path,
                    find: 'Keep original behavior.',
                    replace: 'Revised behavior.',
                    isReady: true,
                })),
                undefined,
            ),
        ).rejects.toThrow('one exact replacement per file');
        expect(await snapshot(projectPath)).toEqual(before);
    });

    it('supports existing tasks with an implicit pending status and saves their drafts with a supported marker', async () => {
        const original = '[✨🌳] A task without a checkbox\n\nOriginal requirement.\n';
        await writeFile(join(projectPath, 'prompts/implicit.md'), original);
        const changes = await preparePlanningChanges(
            projectPath,
            [
                {
                    kind: 'edit',
                    path: 'prompts/implicit.md',
                    find: 'Original requirement.',
                    replace: 'Revised requirement.',
                    isReady: false,
                },
            ],
            undefined,
        );
        savePlanningChanges(projectPath, await createPlanningWorkspace(projectPath), changes, false);
        const result = await readFile(join(projectPath, 'prompts/implicit.md'), 'utf-8');
        expect(result).toBe('[-]\n\n' + original.replace('Original requirement.', 'Revised requirement.'));
        expect(parsePromptFile('implicit.md', result).sections[0]?.status).toBe('not-ready');
    });

    it('keeps unfinished parts of a revised draft out of the runnable queue', async () => {
        const original = '  [-] !!\n\n[✨🌳] Unfinished task\n\nOriginal requirement.\n\n@@@ Decide retention.\n';
        await writeFile(join(projectPath, 'prompts/draft.md'), original);
        const proposal = {
            kind: 'edit' as const,
            path: 'prompts/draft.md',
            find: 'Original requirement.',
            replace: 'Revised requirement.',
            isReady: true,
        };
        await expect(preparePlanningChanges(projectPath, [proposal], undefined)).rejects.toThrow(
            'Unresolved placeholders',
        );
        expect(await readFile(join(projectPath, 'prompts/draft.md'), 'utf-8')).toBe(original);
        const changes = await preparePlanningChanges(
            projectPath,
            [
                {
                    ...proposal,
                    find: 'Original requirement.\n\n@@@ Decide retention.',
                    replace: 'Retain records for 30 days.',
                },
            ],
            undefined,
        );
        expect(changes[0]?.after).toBe('  [ ] !!\n\n[✨🌳] Unfinished task\n\nRetain records for 30 days.\n');
        expect(parsePromptFile('draft.md', changes[0]!.after).sections[0]).toMatchObject({
            status: 'todo',
            priority: 2,
        });
    });

    it('rolls back an earlier published file if a later atomic replacement fails', async () => {
        const before = await snapshot(projectPath);
        const changes = await preparePlanningChanges(
            projectPath,
            [
                ...NEW_TASK.proposals,
                {
                    kind: 'edit',
                    path: 'prompts/existing.md',
                    find: 'Keep original behavior.',
                    replace: 'Revised behavior.',
                    isReady: true,
                },
            ],
            undefined,
        );
        const workspace = await createPlanningWorkspace(projectPath);
        const rename = jest.spyOn(filesystem, 'renameSync').mockImplementationOnce(() => {
            throw new Error('Fixture disk failure');
        });
        try {
            expect(() => savePlanningChanges(projectPath, workspace, changes, false)).toThrow('Fixture disk failure');
        } finally {
            rename.mockRestore();
        }
        expect(await snapshot(projectPath)).toEqual(before);
        expect((await readdir(workspace)).filter((path) => path.endsWith('.tmp'))).toEqual([]);
    });

    it('does not write through a linked emoji cache when previewing new PRDs', async () => {
        await createPlanningWorkspace(projectPath);
        await symlink(
            join(projectPath, 'src'),
            join(projectPath, '.promptbook/ptbk-coder'),
            process.platform === 'win32' ? 'junction' : 'dir',
        );
        const before = await readdir(join(projectPath, 'src'));
        await preparePlanningChanges(projectPath, NEW_TASK.proposals, undefined);
        expect(await readdir(join(projectPath, 'src'))).toEqual(before);
    });

    it('rejects redirected staging and commit runtime directories before writing', async () => {
        const workspace = await createPlanningWorkspace(projectPath);
        const changes = await preparePlanningChanges(projectPath, NEW_TASK.proposals, undefined);
        await rm(workspace, { recursive: true });
        await symlink(join(projectPath, 'src'), workspace, process.platform === 'win32' ? 'junction' : 'dir');
        expect(() => savePlanningChanges(projectPath, workspace, changes, false)).toThrow('must not be a link');
        await symlink(
            join(projectPath, 'src'),
            join(projectPath, '.promptbook/ptbk-coder'),
            process.platform === 'win32' ? 'junction' : 'dir',
        );
        expect(() => assertPlanningCommitSafe(projectPath)).toThrow('must not be a link');
        expect(() => assertPlanningCommitSafe(join(projectPath, '$(unsafe)'))).toThrow('without `--commit`');
        expect(await readdir(join(projectPath, 'src'))).toEqual(['app.ts']);
    });

    it('rejects a well-formed source edit proposed through an explicit Developer override', async () => {
        const before = await snapshot(projectPath);
        await expect(
            runPlanningSession(
                { ...OPTIONS, projectPath, agent: 'agents/developer.book' },
                {
                    signal: new AbortController().signal,
                    readMessage: async () => 'Implement now',
                    write: () => undefined,
                },
                async () =>
                    JSON.stringify({
                        message: 'Attempting source edit',
                        reads: [],
                        proposals: [
                            { kind: 'edit', path: 'src/app.ts', find: 'true', replace: 'false', isReady: true },
                        ],
                    }),
            ),
        ).rejects.toThrow('PRD Markdown');
        expect(await snapshot(projectPath)).toEqual(before);
    });

    it.each([
        'src/app.ts',
        'package.json',
        'agents/planner.book',
        'prompts/../src/app.ts',
        'prompts/templates/common.md',
        'prompts/reusable/rules.md',
        'prompts/_templates/style.md',
        'prompts/done/completed.md',
        'prompts/traces/run.md',
        'prompts/AGENTS.md',
        'prompts/claude.md',
        'prompts/README.md',
        'prompts/task$(npm install).md',
        'prompts/task`npm install`.md',
        'prompts/task[ab].md',
        'prompts/NUL.md',
    ])('rejects implementation path %s before writing', async (path) => {
        const before = await snapshot(projectPath);
        await expect(
            preparePlanningChanges(
                projectPath,
                [{ kind: 'edit', path, find: 'original', replace: 'changed', isReady: true }],
                undefined,
            ),
        ).rejects.toThrow();
        expect(await snapshot(projectPath)).toEqual(before);
    });

    it('preserves Markdown context excluded from the queue and refuses ignored new tasks', async () => {
        const content = '<!--ptbk-coder-ignore-->\n\nReusable project instructions.\n';
        await writeFile(join(projectPath, 'prompts/context.md'), content);
        const before = await snapshot(projectPath);
        await expect(
            preparePlanningChanges(
                projectPath,
                [
                    {
                        kind: 'edit',
                        path: 'prompts/context.md',
                        find: 'Reusable project instructions.',
                        replace: 'New instructions.',
                        isReady: true,
                    },
                ],
                undefined,
            ),
        ).rejects.toThrow('excluded from the PRD queue');
        await expect(
            preparePlanningChanges(
                projectPath,
                [{ kind: 'create', title: 'Ignored feature', body: content, priority: 0, isReady: true }],
                undefined,
            ),
        ).rejects.toThrow('queue ignore marker');
        await expect(
            preparePlanningChanges(
                projectPath,
                [
                    {
                        kind: 'edit',
                        path: 'prompts/existing.md',
                        find: 'Keep original behavior.',
                        replace: content,
                        isReady: true,
                    },
                ],
                undefined,
            ),
        ).rejects.toThrow('queue ignore metadata');
        expect(await snapshot(projectPath)).toEqual(before);
    });

    it.each(['shell', 'delegate', 'write', 'run', 'install'])(
        'rejects unsupported %s operations even from a custom implementation Book',
        async (kind) => {
            await writeFile(
                join(projectPath, 'agents/custom-planner.book'),
                'Custom Planner\n\nTEAM {./developer.book}\n\nRULE Delegate implementation to Developer.\n\nCLOSED\n',
            );
            const before = await snapshot(projectPath);
            const harness = jest.fn(async () =>
                JSON.stringify({
                    message: '',
                    reads: [{ kind, command: 'echo changed > src/app.ts', agent: 'Developer' }],
                    proposals: [],
                }),
            );
            await expect(
                runPlanningSession(
                    { ...OPTIONS, projectPath, agent: 'agents/custom-planner.book' },
                    {
                        signal: new AbortController().signal,
                        write: () => undefined,
                        readMessage: async () => 'Implement now using a teammate.',
                    },
                    harness,
                ),
            ).rejects.toThrow('invalid planning response');
            expect(await snapshot(projectPath)).toEqual(before);
        },
    );

    it('rejects directory junctions, symlinked PRDs and hard links before writes', async () => {
        const workspace = await createPlanningWorkspace(projectPath);
        await symlink(
            join(projectPath, 'src'),
            join(projectPath, 'prompts/linked'),
            process.platform === 'win32' ? 'junction' : 'dir',
        );
        await writeFile(join(projectPath, 'src/source.md'), EXISTING_PRD);
        await expect(
            preparePlanningChanges(
                projectPath,
                [
                    {
                        kind: 'edit',
                        path: 'prompts/linked/source.md',
                        find: 'Keep original behavior.',
                        replace: 'Changed.',
                        isReady: true,
                    },
                ],
                undefined,
            ),
        ).rejects.toThrow('linked');
        await link(join(projectPath, 'src/source.md'), join(projectPath, 'prompts/hard.md'));
        await expect(
            preparePlanningChanges(
                projectPath,
                [
                    {
                        kind: 'edit',
                        path: 'prompts/hard.md',
                        find: 'Keep original behavior.',
                        replace: 'Changed.',
                        isReady: true,
                    },
                ],
                undefined,
            ),
        ).rejects.toThrow('linked');
        const changes = await preparePlanningChanges(projectPath, NEW_TASK.proposals, undefined);
        await rm(join(projectPath, 'prompts'), { recursive: true });
        await symlink(
            join(projectPath, 'src'),
            join(projectPath, 'prompts'),
            process.platform === 'win32' ? 'junction' : 'dir',
        );
        expect(() => savePlanningChanges(projectPath, workspace, changes, false)).toThrow('linked');
        expect(await readFile(join(projectPath, 'src/source.md'), 'utf-8')).toBe(EXISTING_PRD);
    });

    it('does not silently reopen completed work or edit metadata', async () => {
        for (const find of ['Completed requirements.', '[ ] use agent `developer` !!', '[✨🪴] Existing feature']) {
            await expect(
                preparePlanningChanges(
                    projectPath,
                    [{ kind: 'edit', path: 'prompts/existing.md', find, replace: 'New work', isReady: true }],
                    undefined,
                ),
            ).rejects.toThrow();
        }
        expect(await readFile(join(projectPath, 'prompts/existing.md'), 'utf-8')).toBe(EXISTING_PRD);
    });

    it('refuses the whole batch if a preview became stale and never overwrites a similarly named new task', async () => {
        const workspace = await createPlanningWorkspace(projectPath);
        const changes = await preparePlanningChanges(projectPath, NEW_TASK.proposals, undefined);
        await writeFile(join(projectPath, changes[0]!.path), 'User-created task');
        expect(() => savePlanningChanges(projectPath, workspace, changes, false)).toThrow('changed since');
        expect(await readFile(join(projectPath, changes[0]!.path), 'utf-8')).toBe('User-created task');
        const next = await preparePlanningChanges(projectPath, NEW_TASK.proposals, undefined);
        expect(next[0]?.path).not.toBe(changes[0]?.path);
    });

    it('keeps casual conversation and EOF out of the runnable queue', async () => {
        const before = await snapshot(projectPath);
        const input = ['Discuss a feature', undefined];
        await runPlanningSession(
            { ...OPTIONS, projectPath },
            {
                signal: new AbortController().signal,
                write: () => undefined,
                readMessage: async () => input.shift(),
            },
            async () => JSON.stringify(NEW_TASK),
        );
        expect(await snapshot(projectPath)).toEqual(before);
    });

    it('preserves saved PRDs on a failed subsequent harness turn', async () => {
        const input = ['Author a feature', '/save', 'Discuss another feature'];
        const harness = jest
            .fn()
            .mockResolvedValueOnce(JSON.stringify(NEW_TASK))
            .mockRejectedValueOnce(new Error('Harness failed'));
        await expect(
            runPlanningSession(
                { ...OPTIONS, projectPath },
                {
                    signal: new AbortController().signal,
                    write: () => undefined,
                    readMessage: async () => input.shift(),
                },
                harness,
            ),
        ).rejects.toThrow('Harness failed');
        const files = Object.keys(await snapshot(projectPath)).filter((path) => path.endsWith('-feature.md'));
        expect(files).toHaveLength(1);
        expect(
            parsePromptFile(files[0]!, await readFile(join(projectPath, files[0]!), 'utf-8')).sections[0]?.status,
        ).toBe('todo');
        expect(await readFile(join(projectPath, 'src/app.ts'), 'utf-8')).toContain('ORIGINAL');
    });

    it('cancels before a save without changing PRDs', async () => {
        const before = await snapshot(projectPath);
        const controller = new AbortController();
        let isFirst = true;
        await runPlanningSession(
            { ...OPTIONS, projectPath },
            {
                signal: controller.signal,
                write: () => undefined,
                readMessage: async () => {
                    if (isFirst) {
                        isFirst = false;
                        return 'Author a task';
                    }
                    controller.abort();
                    return '/save';
                },
            },
            async () => JSON.stringify(NEW_TASK),
        );
        expect(await snapshot(projectPath)).toEqual(before);
    });

    it('uses customized local Planner and Adam without inheriting Developer implementation goals', async () => {
        const defaultPlanner = await resolveCoderAgent(undefined, projectPath, {
            defaultRole: 'planner',
            isInitializationAllowed: false,
        });
        expect(defaultPlanner?.systemMessage).toContain('helpful, honest, and intelligent');
        expect(defaultPlanner?.systemMessage).toContain('Discuss and specify');
        expect(defaultPlanner?.systemMessage).not.toContain('Implement best practices');
        await writeFile(
            join(projectPath, 'agents/.core/adam.book'),
            'Adam\nFROM @Void\nRULE Shared local foundation.\n',
        );
        await writeFile(
            join(projectPath, 'agents/planner.book'),
            'Planner\nGOAL Specify carefully.\nRULE Local planning preference.\n',
        );
        for (const role of ['developer', 'planner']) {
            const agent = await resolveCoderAgent(`agents/${role}.book`, projectPath, {
                isInitializationAllowed: false,
            });
            expect(agent?.systemMessage).toContain('Shared local foundation');
            if (role === 'planner') {
                expect(agent?.systemMessage).toContain('Local planning preference');
                expect(agent?.systemMessage).not.toContain('Implement best practices');
            }
        }
        await unlink(join(projectPath, 'agents/.core/adam.book'));
        await expect(
            resolveCoderAgent('agents/planner.book', projectPath, { isInitializationAllowed: false }),
        ).rejects.toThrow('coder init');
        await expect(readFile(join(projectPath, 'agents/.core/adam.book'))).rejects.toThrow();
    });

    it.each([undefined, 'agents/developer.book', 'agents/custom planner.book'])(
        'uses effective local Book identity and instructions in the planning conversation for %s',
        async (agent) => {
            const selectedPath = agent || 'agents/planner.book';
            await writeFile(
                join(projectPath, selectedPath),
                'Project role\nMETA FULLNAME My planning specialist\nPERSONA Discuss local requirements.',
            );
            await writeFile(join(projectPath, 'agents/.core/adam.book'), 'Adam\nFROM @Null\nRULE Project foundation.');
            const before = await snapshot(projectPath);
            const output: string[] = [];
            const messages = ['Discuss a feature', '/exit'];
            const harness: typeof runPlanningHarness = jest.fn(async (options) => {
                expect(options.agentName).toBe('openai-codex');
                expect(options.prompt).toContain('Selected Book (My planning specialist)');
                expect(options.prompt).toContain('Discuss local requirements.');
                expect(options.prompt).toContain('Project foundation.');
                return JSON.stringify({ message: 'Let us clarify the goal.', reads: [], proposals: [] });
            });
            await runPlanningSession(
                { ...OPTIONS, projectPath, agent },
                {
                    signal: new AbortController().signal,
                    write: (message) => output.push(message),
                    readMessage: async () => messages.shift(),
                },
                harness,
            );
            expect(harness).toHaveBeenCalledTimes(1);
            expect(output.join('\n')).toContain('My planning specialist:');
            expect(output).toContain('My planning specialist is reading and thinking…');
            expect(output).toContain('My planning specialist: Let us clarify the goal.');
            expect(await snapshot(projectPath)).toEqual(before);
        },
    );

    it('rejects a non-interactive terminal immediately', () => {
        const descriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
        Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
        try {
            expect(() => createPlanningTerminal()).toThrow('interactive terminal');
        } finally {
            if (descriptor) Object.defineProperty(process.stdin, 'isTTY', descriptor);
            else Reflect.deleteProperty(process.stdin, 'isTTY');
        }
    });

    it('allows bounded repository reads but refuses hidden paths and arbitrary Git operations', async () => {
        expect(
            await readPlanningContext(projectPath, { kind: 'read', path: 'src/app.ts', startLine: 1, lineCount: 10 }),
        ).toContain('ORIGINAL');
        expect(await readPlanningContext(projectPath, { kind: 'search', path: 'src', query: 'ORIGINAL' })).toContain(
            'src/app.ts:1',
        );
        await expect(
            readPlanningContext(projectPath, { kind: 'read', path: '.env', startLine: 1, lineCount: 10 }),
        ).rejects.toThrow();
        expect(() =>
            parsePlanningReply(
                JSON.stringify({ message: '', reads: [{ kind: 'git', operation: 'reset' }], proposals: [] }),
            ),
        ).toThrow();
    });
});

// Note: [💞] Ignore a discrepancy between file name and entity name.
