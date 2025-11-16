import { $execCommand } from '../_packages/node.index';
import { TODO_any } from '../_packages/types.index';
import { number_port } from '../types/typeAliases';

type AgentsServerOptions = {
    /**
     * !!!
     *
     * @default 4440
     */
    port: number_port;
};

/**
 * !!!!!
 * Remote server is a proxy server that uses its execution tools internally and exposes the executor interface externally.
 *
 * You can simply use `RemoteExecutionTools` on client-side javascript and connect to your remote server.
 * This is useful to make all logic on browser side but not expose your API keys or no need to use customer's GPU.
 *
 * @see https://github.com/webgptorg/promptbook#remote-server
 * @public exported from `@promptbook/remote-server`
 * <- TODO: !!!! Maybe change to `@promptbook/agent-server`
 */
export async function startAgentServer(options: AgentsServerOptions): Promise<TODO_any> {
    const { port = 4440 } = options;

    // TODO: !!!! [🌕]

    await $execCommand({
        cwd: './apps/agents-server',
        command: `next dev --port ${port} `,
        isVerbose: true,
    });
}
