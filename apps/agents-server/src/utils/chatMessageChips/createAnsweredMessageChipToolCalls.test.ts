import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { AGENT_PROJECTS_DIRECTORY_PATH } from '../../../../../src/book-3.0/agentFolderPaths';
import { getToolCallChipletInfo } from '../../../../../src/book-components/Chat/utils/getToolCallChipletInfo';
import type { AgentMessageProjectChange } from '../../../../../src/utils/agent-message-runtime/AgentMessageProjectChange';
import { createLocalAgentDirectoryName } from '../localChatRunner/ensureLocalAgentFolder';
import { PTBK_AGENTS_SERVER_AGENT_ROOT_ENV } from '../localChatRunner/localChatRunnerConstants';
import { createAnsweredMessageChipToolCalls } from './createAnsweredMessageChipToolCalls';

/**
 * Original local agent root environment value restored after filesystem tests.
 */
const ORIGINAL_AGENT_ROOT = process.env[PTBK_AGENTS_SERVER_AGENT_ROOT_ENV];

/**
 * Permanent id of the agent owning the fixture projects.
 */
const AGENT_PERMANENT_ID = 'Agent1234';

describe('createAnsweredMessageChipToolCalls', () => {
    let temporaryDirectory: string | null = null;

    afterEach(async () => {
        if (temporaryDirectory) {
            await rm(temporaryDirectory, { recursive: true, force: true });
            temporaryDirectory = null;
        }

        if (ORIGINAL_AGENT_ROOT === undefined) {
            delete process.env[PTBK_AGENTS_SERVER_AGENT_ROOT_ENV];
        } else {
            process.env[PTBK_AGENTS_SERVER_AGENT_ROOT_ENV] = ORIGINAL_AGENT_ROOT;
        }
    });

    it('creates no chips for an answer that planned nothing and touched nothing', async () => {
        temporaryDirectory = await createAgentRootWithProject('my-website');

        await expect(
            createAnsweredMessageChipToolCalls({
                agentPermanentId: AGENT_PERMANENT_ID,
                appliedPlannedMessageCommands: [],
                touchedProjectNames: [],
                touchedExternalSources: [],
            }),
        ).resolves.toEqual([]);
    });

    it('creates one project chip carrying the human-readable project name and link', async () => {
        temporaryDirectory = await createAgentRootWithProject('my-website');

        const chipToolCalls = await createAnsweredMessageChipToolCalls({
            agentPermanentId: AGENT_PERMANENT_ID,
            appliedPlannedMessageCommands: [],
            touchedProjectNames: ['my-website'],
            touchedExternalSources: [],
        });

        expect(chipToolCalls).toHaveLength(1);
        expect(chipToolCalls[0]!.name).toBe('agent_project_touched');
        expect(chipToolCalls[0]!.result).toMatchObject({
            projectName: 'my-website',
            displayName: 'My Website',
            projectHref: '/agents/Agent1234/projects/my-website',
        });
        expect(getToolCallChipletInfo(chipToolCalls[0]!).text).toBe('📁 My Website');
    });

    it('carries the project status and the changes the message committed', async () => {
        temporaryDirectory = await createAgentRootWithProject('my-website');

        const chipToolCalls = await createAnsweredMessageChipToolCalls({
            agentPermanentId: AGENT_PERMANENT_ID,
            appliedPlannedMessageCommands: [],
            touchedProjectNames: ['my-website'],
            projectChanges: [createProjectChange('my-website')],
            touchedExternalSources: [],
        });

        expect(chipToolCalls[0]!.result).toMatchObject({
            projectName: 'my-website',
            isRunning: false,
            runtimeStatusLabel: 'Not running',
            fileCount: 1,
            isGitRepository: false,
            change: {
                commitHash: '6f1c0de2b7a94e5c1c2b3d4e5f60718293a4b5c6',
                insertionCount: 12,
                deletionCount: 3,
                changedFiles: [{ path: 'index.html', insertionCount: 12, deletionCount: 3 }],
                isDiffTruncated: false,
            },
        });
    });

    it('creates a chip for a project the message changed even when the harness log named none', async () => {
        temporaryDirectory = await createAgentRootWithProject('my-website');

        const chipToolCalls = await createAnsweredMessageChipToolCalls({
            agentPermanentId: AGENT_PERMANENT_ID,
            appliedPlannedMessageCommands: [],
            touchedProjectNames: [],
            projectChanges: [createProjectChange('my-website')],
            touchedExternalSources: [],
        });

        expect(chipToolCalls.map((chipToolCall) => chipToolCall.arguments)).toEqual([{ projectName: 'my-website' }]);
    });

    it('creates only one chip for a project that was both touched and changed', async () => {
        temporaryDirectory = await createAgentRootWithProject('my-website');

        const chipToolCalls = await createAnsweredMessageChipToolCalls({
            agentPermanentId: AGENT_PERMANENT_ID,
            appliedPlannedMessageCommands: [],
            touchedProjectNames: ['my-website', 'My-Website'],
            projectChanges: [createProjectChange('my-website')],
            touchedExternalSources: [],
        });

        expect(chipToolCalls).toHaveLength(1);
    });

    it('skips projects that no longer exist and unsafe project names', async () => {
        temporaryDirectory = await createAgentRootWithProject('my-website');

        const chipToolCalls = await createAnsweredMessageChipToolCalls({
            agentPermanentId: AGENT_PERMANENT_ID,
            appliedPlannedMessageCommands: [],
            touchedProjectNames: ['deleted-project', '../secrets', 'my-website'],
            touchedExternalSources: [],
        });

        expect(chipToolCalls.map((chipToolCall) => chipToolCall.arguments)).toEqual([{ projectName: 'my-website' }]);
    });

    it('creates one chip per external source the answer touched', async () => {
        temporaryDirectory = await createAgentRootWithProject('my-website');

        const chipToolCalls = await createAnsweredMessageChipToolCalls({
            agentPermanentId: AGENT_PERMANENT_ID,
            appliedPlannedMessageCommands: [],
            touchedProjectNames: [],
            touchedExternalSources: [
                { kind: 'integration', name: 'Gmail' },
                { kind: 'website', name: 'ptbk.io', url: 'https://ptbk.io/pricing' },
                { kind: 'search', name: 'promptbook pricing' },
            ],
        });

        expect(chipToolCalls.map((chipToolCall) => chipToolCall.name)).toEqual([
            'external_source_touched',
            'external_source_touched',
            'external_source_touched',
        ]);
        expect(chipToolCalls.map((chipToolCall) => getToolCallChipletInfo(chipToolCall).text)).toEqual([
            '🔌 Gmail',
            '🌐 ptbk.io',
            '🔎 promptbook pricing',
        ]);
    });

    it('creates one timeout chip for the wake-up the answer planned', async () => {
        temporaryDirectory = await createAgentRootWithProject('my-website');

        const chipToolCalls = await createAnsweredMessageChipToolCalls({
            agentPermanentId: AGENT_PERMANENT_ID,
            appliedPlannedMessageCommands: [
                {
                    command: { action: 'set', milliseconds: 3_600_000, message: 'Re-check the projects.' },
                    result: {
                        action: 'set',
                        status: 'set',
                        timeoutId: 'tmo_f7xazzVMmhbPqE',
                        dueAt: '2026-08-14T18:21:29.024Z',
                        message: 'Re-check the projects.',
                        intervalMs: 3_600_000,
                    },
                },
            ],
            touchedProjectNames: [],
            touchedExternalSources: [],
        });

        expect(chipToolCalls).toHaveLength(1);
        expect(chipToolCalls[0]).toMatchObject({
            name: 'set_timeout',
            arguments: { milliseconds: 3_600_000, message: 'Re-check the projects.' },
            state: 'COMPLETE',
        });
        // Note: The chip label is rendered by the shared timeout presentation of `<Chat/>`
        expect(getToolCallChipletInfo(chipToolCalls[0]!).text).toMatch(/^⏱️ /u);
    });

    it('creates one timeout chip for a cancelled wake-up', async () => {
        temporaryDirectory = await createAgentRootWithProject('my-website');

        const chipToolCalls = await createAnsweredMessageChipToolCalls({
            agentPermanentId: AGENT_PERMANENT_ID,
            appliedPlannedMessageCommands: [
                {
                    command: { action: 'cancel', timeoutId: 'tmo_f7xazzVMmhbPqE' },
                    result: { action: 'cancel', status: 'cancelled', timeoutId: 'tmo_f7xazzVMmhbPqE' },
                },
            ],
            touchedProjectNames: [],
            touchedExternalSources: [],
        });

        expect(chipToolCalls).toHaveLength(1);
        expect(chipToolCalls[0]).toMatchObject({
            name: 'cancel_timeout',
            arguments: { timeoutId: 'tmo_f7xazzVMmhbPqE' },
        });
    });
});

/**
 * Creates one committed project change as the agent runner reports it.
 */
function createProjectChange(projectName: string): AgentMessageProjectChange {
    return {
        projectName,
        commitHash: '6f1c0de2b7a94e5c1c2b3d4e5f60718293a4b5c6',
        committedAt: '2026-08-17T10:15:00.000Z',
        changedFiles: [{ path: 'index.html', insertionCount: 12, deletionCount: 3 }],
        insertionCount: 12,
        deletionCount: 3,
        diff: '--- a/index.html\n+++ b/index.html\n@@ -1 +1 @@\n-<html></html>\n+<html>Hello</html>\n',
        isDiffTruncated: false,
    };
}

/**
 * Creates one temporary local agent root holding a single project of the fixture agent.
 */
async function createAgentRootWithProject(projectName: string): Promise<string> {
    const agentRootPath = await mkdtemp(join(tmpdir(), 'promptbook-message-chips-'));
    const projectPath = join(
        agentRootPath,
        createLocalAgentDirectoryName(AGENT_PERMANENT_ID),
        AGENT_PROJECTS_DIRECTORY_PATH,
        projectName,
    );

    await mkdir(projectPath, { recursive: true });
    await writeFile(join(projectPath, 'index.html'), '<html></html>', 'utf-8');
    process.env[PTBK_AGENTS_SERVER_AGENT_ROOT_ENV] = agentRootPath;

    return agentRootPath;
}
