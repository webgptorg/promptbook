import { mkdir, unlink, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { buildAgentGitConfigArgs, buildAgentGitEnv, getAgentGitIdentity } from './agentGitIdentity';
import { $execCommand } from '../../../src/utils/execCommand/$execCommand';

/**
 * Commits staged changes with the provided message using the configured agent Git identity.
 */
export async function commitChanges(message: string): Promise<void> {
    const commitMessagePath = join(process.cwd(), '.tmp', 'codex-prompts', `COMMIT_MESSAGE_${Date.now()}.txt`);
    await mkdir(dirname(commitMessagePath), { recursive: true });
    await writeFile(commitMessagePath, message, 'utf-8');
    const agentIdentity = getAgentGitIdentity();

    try {
        await $execCommand({
            command: 'git add .',
        });

        await $execCommand({
            command: 'git',
            args: [...buildAgentGitConfigArgs(agentIdentity), 'commit', '--file', commitMessagePath],
            env: buildAgentGitEnv(agentIdentity),
        });
    } finally {
        await unlink(commitMessagePath).catch(() => undefined);
    }
}
