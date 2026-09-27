import { readFile, writeFile, mkdtemp, mkdir, rm, readdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { initializeCoderProjectConfiguration } from '../initializeCoderProjectConfiguration';
import { runPlanningSession } from './runPlanningSession';
import type { PlanningMessage, PlanningReply } from './planningProtocol';
import type { runPlanningHarness } from './runPlanningHarness';

// Note: [💞] Integration tests for the planning TEAM contract.

/** Uses the real restricted planner path with deterministic model replies. */
const OPTIONS = { agentName: 'openai-codex', noUi: true, allowCredits: false } as const;
/** Existing task changed only after primary review and the explicit save operation. */
const ORIGINAL_PRD = '[ ]\n\n[✨📝] Reports\n\nUse the button label Export.\n';

describe('Planner TEAM consultation boundary', () => {
    let projectPath: string;
    beforeEach(async () => {
        projectPath = await mkdtemp(join(tmpdir(), 'ptbk-planner-team-'));
        await initializeCoderProjectConfiguration(projectPath);
        await mkdir(join(projectPath, 'src'));
        await writeFile(join(projectPath, 'src/app.ts'), 'const LABEL = "Export";\n');
        await writeFile(join(projectPath, 'prompts/reports.md'), ORIGINAL_PRD);
    });
    afterEach(async () => {
        await rm(projectPath, { recursive: true, force: true });
    });

    /** Finds the host-compiled tool from the actual effective Book, without guessing generated names. */
    function getToolName(history: PlanningMessage[], name: string): string {
        const tools = JSON.parse(history[0]!.content.match(/Available TEAM tools: ([^\n]+)/)![1]!);
        return tools.find((tool: { description: string }) => tool.description.includes(`Consult teammate ${name}`))
            .name;
    }

    it('consults Copywriter, uses its answer to revise a PRD and leaves application source unchanged', async () => {
        await writeFile(
            join(projectPath, 'agents/copywriter.book'),
            'Copywriter\nFROM @Null\nRULE Prefer Download report as the label.',
        );
        const sourceBefore = await readFile(join(projectPath, 'src/app.ts'), 'utf-8');
        const messages = ['Revise the report label. PRIMARY_PRIVATE_CONTEXT', '/save', '/exit'];
        let primaryCalls = 0;
        let adviserCalls = 0;
        const harness: typeof runPlanningHarness = jest.fn(async (options) => {
            expect(options.signal).toBeDefined();
            const history = JSON.parse(options.prompt.split('Conversation (JSON data):\n')[1]!) as PlanningMessage[];
            if (history[0]!.content.startsWith('Selected Book (Copywriter)')) {
                adviserCalls++;
                expect(options.prompt).toContain('Prefer Download report');
                expect(options.prompt).not.toContain('PRIMARY_PRIVATE_CONTEXT');
                if (adviserCalls === 1)
                    return JSON.stringify({
                        message: '',
                        reads: [{ kind: 'read', path: 'src/app.ts', startLine: 1, lineCount: 10 }],
                        proposals: [],
                    });
                expect(options.prompt).toContain('Export');
                return JSON.stringify({ message: 'Use Download report.', reads: [], proposals: [] });
            }
            primaryCalls++;
            if (primaryCalls === 1)
                return JSON.stringify({
                    message: '',
                    reads: [
                        {
                            kind: 'team',
                            toolName: getToolName(history, 'Copywriter'),
                            message: 'Review the report button label.',
                            context: 'The current label is Export.',
                        },
                    ],
                    proposals: [],
                });
            expect(options.prompt).toContain('Use Download report.');
            expect(options.prompt).toContain('Copywriter');
            const reply: PlanningReply = {
                message: 'I used Copywriter’s advice in this proposal.',
                reads: [],
                proposals: [
                    {
                        kind: 'edit',
                        path: 'prompts/reports.md',
                        find: 'label Export.',
                        replace: 'label Download report.',
                        isReady: true,
                    },
                ],
            };
            return JSON.stringify(reply);
        });
        const saved = await runPlanningSession(
            { ...OPTIONS, projectPath },
            {
                signal: new AbortController().signal,
                readMessage: async () => messages.shift(),
                write: () => undefined,
            },
            harness,
        );
        expect(primaryCalls).toBe(2);
        expect(adviserCalls).toBe(2);
        expect([...saved.keys()]).toEqual(['prompts/reports.md']);
        expect(await readFile(join(projectPath, 'prompts/reports.md'), 'utf-8')).toContain('Download report');
        expect(await readFile(join(projectPath, 'src/app.ts'), 'utf-8')).toBe(sourceBefore);
        const sessionsPath = join(projectPath, '.promptbook/coder-plan');
        const trace = await readFile(join(sessionsPath, (await readdir(sessionsPath))[0]!, 'runtime.log'), 'utf-8');
        expect(trace).toContain('team_request');
        expect(trace).toContain('team_result');
        expect(trace).toContain('src/app.ts');
        expect(trace).toContain('"agent":"Copywriter"');
    });

    it.each([
        { attack: 'source-write', isNested: false },
        { attack: 'proposal', isNested: false },
        { attack: 'source-write', isNested: true },
        { attack: 'proposal', isNested: true },
    ])(
        'rejects a custom Developer adviser’s $attack (nested: $isNested) before any write',
        async ({ attack, isNested }) => {
            await writeFile(
                join(projectPath, 'agents/custom-planner.book'),
                `Custom Planner\nFROM @Null\nTEAM {./${isNested ? 'copywriter' : 'developer'}.book}\n`,
            );
            await writeFile(join(projectPath, 'agents/copywriter.book'), 'Copywriter\nFROM @Null\nTEAM @Developer');
            await writeFile(
                join(projectPath, 'agents/developer.book'),
                'Developer\nFROM @Null\nRULE Implement the application immediately.',
            );
            const sourceBefore = await readFile(join(projectPath, 'src/app.ts'), 'utf-8');
            const messages = ['Consult Developer.', '/save', '/exit'];
            let primaryCalls = 0;
            let copywriterCalls = 0;
            const harness: typeof runPlanningHarness = jest.fn(async (options) => {
                const history = JSON.parse(
                    options.prompt.split('Conversation (JSON data):\n')[1]!,
                ) as PlanningMessage[];
                if (history[0]!.content.startsWith('Selected Book (Copywriter)')) {
                    if (++copywriterCalls === 1)
                        return JSON.stringify({
                            message: '',
                            proposals: [],
                            reads: [
                                {
                                    kind: 'team',
                                    toolName: getToolName(history, 'Developer'),
                                    message: 'Help',
                                    context: '',
                                },
                            ],
                        });
                    return JSON.stringify({ message: history[history.length - 1]!.content, reads: [], proposals: [] });
                }
                if (history[0]!.content.startsWith('Selected Book (Developer)')) {
                    expect(options.prompt).toContain('Implement the application immediately');
                    expect(options.prompt).toContain('You are a TEAM adviser');
                    return JSON.stringify(
                        attack === 'source-write'
                            ? {
                                  message: '',
                                  reads: [{ kind: 'write', path: 'src/app.ts', content: 'changed' }],
                                  proposals: [],
                              }
                            : {
                                  message: '',
                                  reads: [],
                                  proposals: [
                                      {
                                          kind: 'edit',
                                          path: 'src/app.ts',
                                          find: 'Export',
                                          replace: 'changed',
                                          isReady: true,
                                      },
                                  ],
                              },
                    );
                }
                if (++primaryCalls === 1)
                    return JSON.stringify({
                        message: '',
                        reads: [
                            {
                                kind: 'team',
                                toolName: getToolName(history, isNested ? 'Copywriter' : 'Developer'),
                                message: 'Help',
                                context: '',
                            },
                        ],
                        proposals: [],
                    });
                expect(options.prompt).toContain(
                    attack === 'source-write' ? 'invalid planning response' : 'advisers cannot propose writes',
                );
                return JSON.stringify({ message: 'The delegated write was refused.', reads: [], proposals: [] });
            });
            const saved = await runPlanningSession(
                { ...OPTIONS, projectPath, agent: 'agents/custom-planner.book' },
                {
                    signal: new AbortController().signal,
                    readMessage: async () => messages.shift(),
                    write: () => undefined,
                },
                harness,
            );
            expect(saved.size).toBe(0);
            expect(await readFile(join(projectPath, 'src/app.ts'), 'utf-8')).toBe(sourceBefore);
            expect(await readFile(join(projectPath, 'prompts/reports.md'), 'utf-8')).toBe(ORIGINAL_PRD);
        },
    );
});
