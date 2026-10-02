import { mkdir, mkdtemp, realpath, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { $resolveWorkspaceRepository } from '../../../../src/cli/cli-commands/common/workspaceRepository';
import { PROMPTBOOK_RUNTIME_IGNORE_RULES } from '../../../../src/utils/filesystem/promptbookRuntimeArtifacts';
import { LocalSqliteSupabaseClient } from '../../../../apps/agents-server/src/database/sqlite/localSqliteSupabase/LocalSqliteSupabaseClient';
import {
    $provideSqliteDatabaseAtPath,
    $closeAgentsServerSqliteDatabases,
} from '../../../../apps/agents-server/src/database/sqlite/$provideAgentsServerSqliteDatabase';
import { executeWorkspaceGit } from '../../git/workspaceMutation';
import { WorkspaceState } from '../WorkspaceState';
import { AgentCollectionInWorkspace } from '../AgentCollectionInWorkspace';
import { ensureAdamAgentBook } from '../../../../src/cli/cli-commands/common/ensureAdamAgentBook';
import { parseRunOptions } from '../../cli/parseRunOptions';

/** Creates a deterministic real Git/SQLite fixture with no remote/model credentials or paid calls. */
export async function createWorkspaceFixture(
    sources: Record<string, string> = { 'developer.book': 'Developer\nGOAL Implement the selected task.\n' },
) {
    const root = await realpath(await mkdtemp(join(tmpdir(), 'ptbk-workspace-')));
    await executeWorkspaceGit(root, ['init', '--initial-branch=main']);
    await executeWorkspaceGit(root, ['config', 'user.name', 'Workspace Test']);
    await executeWorkspaceGit(root, ['config', 'user.email', 'workspace@example.test']);
    await executeWorkspaceGit(root, ['config', 'commit.gpgsign', 'false']);
    await mkdir(join(root, 'agents'));
    await mkdir(join(root, 'prompts'));
    await writeFile(join(root, '.gitignore'), PROMPTBOOK_RUNTIME_IGNORE_RULES.join('\n') + '\n');
    for (const [path, source] of Object.entries(sources)) {
        await mkdir(join(root, 'agents', path, '..'), { recursive: true });
        await writeFile(join(root, 'agents', path), source);
    }
    await ensureAdamAgentBook(join(root, 'agents'));
    await executeWorkspaceGit(root, ['add', '--', '.gitignore', 'agents', 'prompts']);
    await executeWorkspaceGit(root, ['commit', '-m', 'Fixture baseline']);
    const workspace = await $resolveWorkspaceRepository(root);
    const databasePath = join(root, '.promptbook', 'servers', 'default.sqlite');
    const state = new WorkspaceState(databasePath);
    const client = new LocalSqliteSupabaseClient((name) => ({
        database: $provideSqliteDatabaseAtPath(databasePath),
        localTableName: name,
    })) as unknown as SupabaseClient;
    const collection = new AgentCollectionInWorkspace(workspace, client, state);
    await collection.reconcile();
    const options = {
        ...parseRunOptions(['--harness', 'openai-codex', '--no-ui', '--no-normalize-line-endings']),
        workspace,
        waitAfterError: 0,
        waitAfterPrompt: 0,
        waitBetweenPrompts: 0,
        priorityFilter: {},
        autoPull: true,
        autoPush: true,
    };
    return {
        root,
        workspace,
        databasePath,
        state,
        client,
        collection,
        options,
        dispose: async () => {
            $closeAgentsServerSqliteDatabases([databasePath]);
            await rm(root, { recursive: true, force: true });
        },
    };
}

// Note: [⚫] Test fixture is never packaged.
