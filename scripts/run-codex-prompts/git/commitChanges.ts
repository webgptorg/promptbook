import { mkdir, unlink, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { buildAgentGitConfigArgs, buildAgentGitEnv, getAgentGitIdentity } from './agentGitIdentity';
import { $execCommand } from '../../../src/utils/execCommand/$execCommand';
import { buildAgentGitEnv, buildAgentGitSigningFlag } from './agentGitIdentity';

/**
 * Commits staged changes with the provided message using the configured agent identity and signing key.
 */
export async function commitChanges(message: string): Promise<void> {
    const commitMessagePath = join(process.cwd(), '.tmp', 'codex-prompts', `COMMIT_MESSAGE_${Date.now()}.txt`);
    await mkdir(dirname(commitMessagePath), { recursive: true });
    await writeFile(commitMessagePath, message, 'utf-8');
    const agentIdentity = getAgentGitIdentity();

    try {
        const agentEnv = buildAgentGitEnv();
        await $execCommand({
            command: 'git add .',
            env: agentEnv,
        });

        await $execCommand({
            command: `git commit ${buildAgentGitSigningFlag()} --file "${commitMessagePath}"`,
            env: agentEnv,
        });
    } finally {
        await unlink(commitMessagePath).catch(() => undefined);
    }
}
