import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
    listAgentProjectRuntimeDesiredStates,
    resolveAgentProjectRuntimeDesiredState,
    setAgentProjectRuntimeDesiredState,
} from './agentProjectRuntimeDesiredState';
import { PTBK_AGENT_PROJECT_RUNTIME_DESIRED_STATE_FILE_ENV } from './agentProjectRuntimePaths';

describe('agentProjectRuntimeDesiredState', () => {
    let temporaryDirectory: string | null = null;
    let desiredStateFilePath = '';
    const originalDesiredStateFile = process.env[PTBK_AGENT_PROJECT_RUNTIME_DESIRED_STATE_FILE_ENV];

    beforeEach(async () => {
        temporaryDirectory = await mkdtemp(join(tmpdir(), 'promptbook-project-desired-state-'));
        desiredStateFilePath = join(temporaryDirectory, 'desired-states.json');
        process.env[PTBK_AGENT_PROJECT_RUNTIME_DESIRED_STATE_FILE_ENV] = desiredStateFilePath;
    });

    afterEach(async () => {
        if (temporaryDirectory) {
            await rm(temporaryDirectory, { recursive: true, force: true });
            temporaryDirectory = null;
        }

        if (originalDesiredStateFile === undefined) {
            delete process.env[PTBK_AGENT_PROJECT_RUNTIME_DESIRED_STATE_FILE_ENV];
        } else {
            process.env[PTBK_AGENT_PROJECT_RUNTIME_DESIRED_STATE_FILE_ENV] = originalDesiredStateFile;
        }
    });

    it('expects a project nobody ever stopped to be running', async () => {
        await expect(
            resolveAgentProjectRuntimeDesiredState({ agentPermanentId: 'abc123', projectName: 'website' }),
        ).resolves.toBe('running');
        await expect(listAgentProjectRuntimeDesiredStates()).resolves.toEqual([]);
    });

    it('writes nothing when a project is only confirmed to be in its default state', async () => {
        await setAgentProjectRuntimeDesiredState({
            agentPermanentId: 'abc123',
            projectName: 'website',
            desiredState: 'running',
        });

        await expect(readFile(desiredStateFilePath, 'utf-8')).rejects.toMatchObject({ code: 'ENOENT' });
    });

    it('remembers an explicit stop and forgets it when the project is started again', async () => {
        await setAgentProjectRuntimeDesiredState({
            agentPermanentId: 'abc123',
            projectName: 'website',
            desiredState: 'stopped',
        });

        await expect(
            resolveAgentProjectRuntimeDesiredState({ agentPermanentId: 'abc123', projectName: 'website' }),
        ).resolves.toBe('stopped');

        await setAgentProjectRuntimeDesiredState({
            agentPermanentId: 'abc123',
            projectName: 'website',
            desiredState: 'running',
        });

        await expect(
            resolveAgentProjectRuntimeDesiredState({ agentPermanentId: 'abc123', projectName: 'website' }),
        ).resolves.toBe('running');
        await expect(listAgentProjectRuntimeDesiredStates()).resolves.toHaveLength(1);
    });

    it('keeps one record per project regardless of letter casing', async () => {
        await setAgentProjectRuntimeDesiredState({
            agentPermanentId: 'abc123',
            projectName: 'website',
            desiredState: 'stopped',
        });
        await setAgentProjectRuntimeDesiredState({
            agentPermanentId: 'ABC123',
            projectName: 'Website',
            desiredState: 'running',
        });

        await expect(listAgentProjectRuntimeDesiredStates()).resolves.toHaveLength(1);
        await expect(
            resolveAgentProjectRuntimeDesiredState({ agentPermanentId: 'abc123', projectName: 'website' }),
        ).resolves.toBe('running');
    });

    it('does not decide anything for other projects of the same agent', async () => {
        await setAgentProjectRuntimeDesiredState({
            agentPermanentId: 'abc123',
            projectName: 'website',
            desiredState: 'stopped',
        });

        await expect(
            resolveAgentProjectRuntimeDesiredState({ agentPermanentId: 'abc123', projectName: 'landing' }),
        ).resolves.toBe('running');
    });

    it('ignores invalid persisted rows instead of failing', async () => {
        await writeFile(
            desiredStateFilePath,
            JSON.stringify({
                version: 1,
                projects: [
                    { agentPermanentId: 'abc123', projectName: 'website', desiredState: 'nonsense' },
                    { agentPermanentId: 'abc123', desiredState: 'stopped' },
                    { agentPermanentId: 'abc123', projectName: 'landing', desiredState: 'stopped' },
                ],
            }),
            'utf-8',
        );

        await expect(listAgentProjectRuntimeDesiredStates()).resolves.toEqual([
            expect.objectContaining({ projectName: 'landing', desiredState: 'stopped' }),
        ]);
    });
});
