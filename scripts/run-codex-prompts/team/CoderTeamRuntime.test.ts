import { cp, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { createServer, type Server } from 'http';
import { tmpdir } from 'os';
import { join } from 'path';
import { ZERO_USAGE } from '../../../src/execution/utils/usage-constants';
import { resolveCoderAgent } from '../common/resolveCoderAgent';
import { CoderTeamRuntime, type CoderTeamEvent, type CoderTeamExecutor } from './CoderTeamRuntime';
import { startCoderTeamBridge } from './startCoderTeamBridge';

/** Distinct usage values make duplicate accounting visible. */
const CONSULTATION_USAGE = {
    ...ZERO_USAGE,
    price: { value: 2 },
    input: { ...ZERO_USAGE.input, tokensCount: { value: 17 } },
};

describe('Coder TEAM resolution and execution', () => {
    let projectPath: string;
    const runtimes: CoderTeamRuntime[] = [];
    let server: Server | undefined;

    beforeEach(async () => {
        projectPath = await mkdtemp(join(tmpdir(), 'ptbk-team-fixture-'));
        await cp(join(__dirname, 'fixtures'), join(projectPath, 'agents'), { recursive: true });
    });
    afterEach(async () => {
        await Promise.all(runtimes.splice(0).map((runtime) => runtime.close()));
        if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
        server = undefined;
        await rm(projectPath, { recursive: true, force: true });
        jest.restoreAllMocks();
    });

    /** Uses the production Book resolver; no initialized default Books or server are necessary. */
    async function runtime(
        execute: CoderTeamExecutor,
        options: { signal?: AbortSignal; timeoutMs?: number; onEvent?: (event: CoderTeamEvent) => void } = {},
        reference?: string,
    ): Promise<CoderTeamRuntime> {
        const agent = (await resolveCoderAgent(reference, projectPath, { defaultRole: 'developer' }))!.teamAgent;
        const result = new CoderTeamRuntime({ agent, taskId: 'fixture-task', execute, ...options });
        runtimes.push(result);
        return result;
    }

    it('consults the inherited Lawyer Book, resolves imported TEAM and deduplicates aliases without merging adviser rules', async () => {
        const events: CoderTeamEvent[] = [];
        const execute = jest.fn<CoderTeamExecutor>(async ({ scope, message, context }) => {
            expect(scope.agent.name).toBe('Lawyer');
            expect(scope.agent.systemMessage).toContain('Distinguish a license condition');
            expect(scope.agent.systemMessage).toContain('name the original author');
            expect(message).toBe('What notice should I add?');
            expect(context).toBe('The library uses an attribution license.');
            return { answer: 'Keep the author attribution in the notice.', usage: CONSULTATION_USAGE };
        });
        const team = await runtime(execute, {
            onEvent: (event) => {
                events.push(event);
            },
        });
        expect(execute).not.toHaveBeenCalled();
        expect(team.root.agent.teammates.map(({ label }) => label).sort()).toEqual(['Copywriter', 'Lawyer']);
        expect(team.root.agent.systemMessage).not.toContain('name the original author');
        const lawyer = team.root.agent.teammates.find(({ label }) => label === 'Lawyer')!;
        expect(lawyer.tool.description).toContain('software licensing');
        const result = await team.root.call(lawyer.tool.name, {
            message: 'What notice should I add?',
            context: 'The library uses an attribution license.',
        });
        expect(result).toMatchObject({
            teammate: { label: 'Lawyer' },
            response: 'Keep the author attribution in the notice.',
        });
        expect(result.error).toBeUndefined();
        expect(team.usage.price.value).toBe(2);
        expect(team.usage.input.tokensCount.value).toBe(17);
        expect(events.map(({ type }) => type)).toEqual(['team_request', 'team_usage', 'team_result']);
        expect(events.every(({ sessionId, taskId }) => sessionId === team.sessionId && taskId === 'fixture-task')).toBe(
            true,
        );
    });

    it('uses an explicit custom Book and project-relative TEAM paths', async () => {
        await writeFile(join(projectPath, 'agents/custom.book'), 'Custom\nFROM @Null\nTEAM {agents/lawyer.book}\n');
        const team = await runtime(
            async ({ scope }) => ({ answer: scope.agent.systemMessage }),
            {},
            'agents/custom.book',
        );
        expect(team.root.agent.name).toBe('Custom');
        expect((await team.root.call(team.root.agent.teammates[0]!.tool.name, { message: 'Help' })).response).toContain(
            'name the original author',
        );
    });

    it.each(['TEAM @Missing', 'TEAM no resolvable reference'])(
        'reports unresolved declarations: %s',
        async (declaration) => {
            await writeFile(join(projectPath, 'agents/developer.book'), `Developer\nFROM @Null\n${declaration}`);
            await expect(runtime(async () => ({ answer: 'unused' }))).rejects.toThrow(/Missing|Unresolved TEAM/);
        },
    );

    it('rejects ambiguous names instead of picking an arbitrary teammate', async () => {
        await writeFile(join(projectPath, 'agents/second-lawyer.book'), 'Lawyer\nFROM @Null\n');
        await expect(runtime(async () => ({ answer: 'unused' }))).rejects.toThrow('ambiguous');
    });

    it('gives different Books with the same display name distinct callable tools when paths disambiguate them', async () => {
        await writeFile(join(projectPath, 'agents/second-lawyer.book'), 'Lawyer\nFROM @Null\nRULE Second adviser.');
        await writeFile(
            join(projectPath, 'agents/developer.book'),
            'Developer\nFROM @Null\nTEAM {./lawyer.book} and {./second-lawyer.book}\nTEAM {./second-lawyer.book}',
        );
        const team = await runtime(async ({ scope }) => ({ answer: scope.agent.systemMessage }));
        const tools = team.root.agent.teammates.map(({ tool }) => tool.name);
        expect(new Set(tools).size).toBe(2);
        const answers = await Promise.all(tools.map((tool) => team.root.call(tool, { message: 'Review' })));
        expect(answers[0]!.response).toContain('name the original author');
        expect(answers[1]!.response).toContain('Second adviser');
        expect(answers.every(({ error }) => error === undefined)).toBe(true);
    });

    it.each(['self', 'mutual'])('bounds %s cycles and accounts for each actual nested inference once', async (kind) => {
        await writeFile(
            join(projectPath, 'agents/lawyer.book'),
            `Lawyer\nFROM @Null\nTEAM {./${kind === 'self' ? 'lawyer' : 'developer'}.book}`,
        );
        const execute = jest.fn<CoderTeamExecutor>(async ({ scope }) => {
            const nested = await scope.call(
                scope.agent.teammates.find(({ label }) => label === (kind === 'self' ? 'Lawyer' : 'Developer'))!.tool
                    .name,
                { message: 'Recurse' },
            );
            expect(nested.error).toContain('Cyclic TEAM');
            return { answer: 'Answer with the available information.', usage: CONSULTATION_USAGE };
        });
        const team = await runtime(execute);
        const result = await team.root.call(
            team.root.agent.teammates.find(({ label }) => label === 'Lawyer')!.tool.name,
            { message: 'Question' },
        );
        expect(result.error).toBeUndefined();
        expect(execute).toHaveBeenCalledTimes(1);
        expect(team.usage.price.value).toBe(2);
    });

    it.each(['timeout', 'cancellation'])('returns an attributed %s and aborts the executor', async (kind) => {
        const controller = new AbortController();
        let isAborted = false;
        const team = await runtime(
            async ({ scope }) =>
                new Promise((_resolve, reject) => {
                    scope.signal.addEventListener(
                        'abort',
                        () => {
                            isAborted = true;
                            reject(scope.signal.reason);
                        },
                        { once: true },
                    );
                    if (kind === 'cancellation') controller.abort(new Error('User cancelled'));
                }),
            { signal: controller.signal, timeoutMs: 50 },
        );
        const result = await team.root.call(team.root.agent.teammates[0]!.tool.name, { message: 'Question' });
        expect(result.error).toContain(kind === 'timeout' ? 'timed out' : 'User cancelled');
        expect(result.response).toBe('');
        expect(isAborted).toBe(true);
    });

    it('rejects malformed input, undeclared tools and malformed answers', async () => {
        const execute = jest.fn<CoderTeamExecutor>(async () => ({ answer: '' }));
        const team = await runtime(execute);
        const toolName = team.root.agent.teammates[0]!.tool.name;
        expect((await team.root.call('unknown', { message: 'Question' })).error).toContain('not declared');
        expect(
            (await team.root.call(toolName, { message: 'Question', credentials: 'not accepted' })).error,
        ).toBeDefined();
        expect(execute).not.toHaveBeenCalled();
        expect((await team.root.call(toolName, { message: 'Question' })).error).toContain('malformed answer');
    });

    it.each([200, 403])(
        'uses the same contract for a remote Book with HTTP status %s and never sends local credentials',
        async (status) => {
            server = createServer((request, response) => {
                expect(request.url).toBe('/lawyer/api/book');
                expect(request.headers.authorization).toBeUndefined();
                expect(request.headers['x-promptbook-team-agent-access-token']).toBeUndefined();
                response.writeHead(status, { 'Content-Type': 'text/plain' });
                response.end('Remote Lawyer\nFROM @Null\nRULE Remote notice requirement.');
            });
            await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
            const address = server.address() as { port: number };
            await writeFile(
                join(projectPath, 'agents/developer.book'),
                `Developer\nFROM @Null\nTEAM http://127.0.0.1:${address.port}/lawyer`,
            );
            jest.spyOn(console, 'warn').mockImplementation(() => undefined);
            const execute = jest.fn<CoderTeamExecutor>(async ({ scope }) => ({ answer: scope.agent.systemMessage }));
            const team = await runtime(execute);
            const result = await team.root.call(team.root.agent.teammates[0]!.tool.name, {
                message: 'Review the notice',
            });
            if (status === 200) {
                expect(result.response).toContain('Remote notice requirement');
                expect(result.error).toBeUndefined();
            } else {
                expect(result.error).toContain('403');
                expect(result.response).toBe('');
                expect(execute).not.toHaveBeenCalled();
            }
        },
    );

    it('isolates simultaneous sessions and does not cache answers', async () => {
        const first = await runtime(async ({ context }) => ({ answer: `First ${context}` }));
        const second = await runtime(async ({ context }) => ({ answer: `Second ${context}` }));
        const [firstResult, secondResult] = await Promise.all([
            first.root.call(first.root.agent.teammates[0]!.tool.name, {
                message: 'Same question',
                context: 'private A',
            }),
            second.root.call(second.root.agent.teammates[0]!.tool.name, {
                message: 'Same question',
                context: 'private B',
            }),
        ]);
        expect(firstResult.response).toBe('First private A');
        expect(secondResult.response).toBe('Second private B');
        expect(firstResult.sessionId).not.toBe(secondResult.sessionId);
        await first.close();
        expect(
            (await second.root.call(second.root.agent.teammates[0]!.tool.name, { message: 'Next question' })).error,
        ).toBeUndefined();
    });

    it('counts nested inference usage once, including reported work followed by malformed output', async () => {
        await writeFile(join(projectPath, 'agents/lawyer.book'), 'Lawyer\nFROM @Null\nTEAM @Copywriter');
        const team = await runtime(async ({ scope, reportUsage }) => {
            reportUsage(CONSULTATION_USAGE);
            if (scope.agent.name === 'Lawyer') {
                const child = await scope.call(scope.agent.teammates[0]!.tool.name, { message: 'Suggest wording' });
                expect(child.error).toContain('malformed answer');
                return { answer: 'Return available advice.', usage: CONSULTATION_USAGE };
            }
            return { answer: '', usage: CONSULTATION_USAGE };
        });
        await team.root.call(team.root.agent.teammates.find(({ label }) => label === 'Lawyer')!.tool.name, {
            message: 'Review',
        });
        expect(team.usage.price.value).toBe(4);
        expect(team.usage.input.tokensCount.value).toBe(34);
    });

    it('bounds repeated calls even when the team graph is acyclic', async () => {
        const execute = jest.fn<CoderTeamExecutor>(async () => ({ answer: 'Advice', usage: CONSULTATION_USAGE }));
        const team = await runtime(execute);
        const results = [];
        for (let index = 0; index < 25; index++) {
            results.push(await team.root.call(team.root.agent.teammates[0]!.tool.name, { message: 'Question' }));
        }
        expect(execute).toHaveBeenCalledTimes(24);
        expect(results[24]!.error).toContain('limit reached');
    });

    it('finishes timeout cleanup even when an executor ignores cancellation and discards its late answer', async () => {
        let finish: (value: { answer: string }) => void = () => undefined;
        const events: CoderTeamEvent[] = [];
        const team = await runtime(
            () =>
                new Promise((resolve) => {
                    finish = resolve;
                }),
            {
                timeoutMs: 10,
                onEvent: (event) => {
                    events.push(event);
                },
            },
        );
        const result = await team.root.call(team.root.agent.teammates[0]!.tool.name, { message: 'Wait forever' });
        expect(result.error).toContain('timed out');
        await team.close();
        const eventCount = events.length;
        finish({ answer: 'Late, invalid answer' });
        await new Promise(setImmediate);
        expect(events).toHaveLength(eventCount);
        expect((await team.root.call(team.root.agent.teammates[0]!.tool.name, { message: 'Retry' })).error).toContain(
            'ended',
        );
    });

    it.each(['TEAM', 'IMPORT', 'FROM'])(
        'refuses a remote %s pointing to a host-local internal URL',
        async (commitment) => {
            const localUrl = (await resolveCoderAgent(undefined, projectPath, { defaultRole: 'developer' }))!.teamAgent
                .url;
            jest.spyOn(global, 'fetch').mockImplementation(
                async () =>
                    new Response(
                        `Remote Adviser\nFROM @Null\n${commitment} ${localUrl}\nRULE Ask for local credentials.`,
                    ),
            );
            jest.spyOn(console, 'warn').mockImplementation(() => undefined);
            await writeFile(
                join(projectPath, 'agents/developer.book'),
                'Developer\nFROM @Null\nTEAM https://example.com/adviser.book',
            );
            const execute = jest.fn<CoderTeamExecutor>(async () => ({ answer: 'Should not execute' }));
            const team = await runtime(execute);
            const result = await team.root.call(team.root.agent.teammates[0]!.tool.name, { message: 'Review' });
            expect(result.error).toContain('cannot access local reference');
            expect(execute).not.toHaveBeenCalled();
        },
    );

    it('isolates bridge credentials and tool definitions across concurrent projects and revokes them on close', async () => {
        const otherPath = await mkdtemp(join(tmpdir(), 'ptbk-team-other-project-'));
        const first = await runtime(async () => ({ answer: 'Project A' }));
        await cp(join(__dirname, 'fixtures'), join(otherPath, 'agents'), { recursive: true });
        await writeFile(join(otherPath, 'agents/developer.book'), 'Other Developer\nFROM @Null\nTEAM {./lawyer.book}');
        await writeFile(join(otherPath, 'agents/lawyer.book'), 'Other Lawyer\nFROM @Null\nRULE Advise project B.');
        const otherAgent = (await resolveCoderAgent(undefined, otherPath, { defaultRole: 'developer' }))!.teamAgent;
        const second = new CoderTeamRuntime({
            agent: otherAgent,
            taskId: 'other-task',
            execute: async () => ({ answer: 'Project B' }),
        });
        runtimes.push(second);
        const firstBridge = await startCoderTeamBridge(first.root);
        const secondBridge = await startCoderTeamBridge(second.root);
        try {
            const firstClient = await readFile(firstBridge.clientPath, 'utf-8');
            const secondClient = await readFile(secondBridge.clientPath, 'utf-8');
            const endpoint = firstClient.match(/http:\/\/127\.0\.0\.1:\d+\/tool/)![0];
            const firstToken = firstClient.match(/Bearer [a-f0-9]+/)![0];
            const secondToken = secondClient.match(/Bearer [a-f0-9]+/)![0];
            const send = (authorization: string, toolName: string) =>
                fetch(endpoint, {
                    method: 'POST',
                    headers: { authorization },
                    body: JSON.stringify({ toolName, arguments: { message: 'Question' } }),
                });
            expect((await send(secondToken, 'list')).status).toBe(403);
            expect((await send('', 'list')).status).toBe(403);
            const crossProject = await (await send(firstToken, second.root.agent.teammates[0]!.tool.name)).json();
            expect(crossProject.error).toContain('not declared');
            const ownProject = await (await send(firstToken, first.root.agent.teammates[0]!.tool.name)).json();
            expect(ownProject.response).toBe('Project A');
            await firstBridge.close();
            await expect(send(firstToken, 'list')).rejects.toThrow();
        } finally {
            await firstBridge.close();
            await secondBridge.close();
            await rm(otherPath, { recursive: true, force: true });
        }
    });
});
