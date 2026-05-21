import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
    createLocalAgentRunnerFileIfMissing,
    readLocalAgentRunnerFile,
    upsertLocalAgentRunnerFile,
} from './LocalAgentRunnerFileClient';

describe('LocalAgentRunnerFileClient', () => {
    let projectPath: string;

    beforeEach(async () => {
        projectPath = await mkdtemp(join(tmpdir(), 'agents-server-local-runner-'));
    });

    afterEach(async () => {
        await rm(projectPath, { recursive: true, force: true });
    });

    it('writes queued messages and reads finished messages from one local runner project', async () => {
        await upsertLocalAgentRunnerFile({
            projectPath,
            path: 'messages/queued/thread.book',
            content: 'MESSAGE @User hello',
        });
        await upsertLocalAgentRunnerFile({
            projectPath,
            path: 'messages/finished/thread.book',
            content: 'MESSAGE @Agent hi',
        });

        await expect(readLocalAgentRunnerFile(projectPath, 'messages/queued/thread.book')).resolves.toEqual({
            content: 'MESSAGE @User hello',
        });
        await expect(readLocalAgentRunnerFile(projectPath, 'messages/finished/thread.book')).resolves.toEqual({
            content: 'MESSAGE @Agent hi',
        });
    });

    it('does not replace existing marker files', async () => {
        await createLocalAgentRunnerFileIfMissing({
            projectPath,
            path: 'messages/queued/.gitkeep',
            content: 'first',
        });
        await createLocalAgentRunnerFileIfMissing({
            projectPath,
            path: 'messages/queued/.gitkeep',
            content: 'second',
        });

        await expect(readLocalAgentRunnerFile(projectPath, 'messages/queued/.gitkeep')).resolves.toEqual({
            content: 'first',
        });
    });
});
