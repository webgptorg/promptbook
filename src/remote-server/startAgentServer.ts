import { join } from 'path';
import type { number_port } from '../types/number_positive';
import { $execCommand } from '../utils/execCommand/$execCommand';
import type { TODO_any } from '../utils/organization/TODO_any';

/**
 * Options for agents server.
 */
type AgentsServerOptions = {
    /**
     * !!!
     *
     * @default 4440
     */
    port: number_port;
};

/**
 * [🐱‍🚀]
 * Remote server is a proxy server that uses its execution tools internally and exposes the executor interface externally.
 *
 * You can simply use `RemoteExecutionTools` on client-side javascript and connect to your remote server.
 * This is useful to make all logic on browser side but not expose your API keys or no need to use customer's GPU.
 *
 * TODO: [🐱‍🚀] Change to `@promptbook/agent-server`
 *
 * @see https://github.com/webgptorg/promptbook#remote-server
 *
 * @public exported from `@promptbook/remote-server`
 */
export async function startAgentServer(options: AgentsServerOptions): Promise<TODO_any> {
    const { port = 4440 } = options;

    // TODO: [🐱‍🚀] [🌕]

    const agentsServerRoot = join(__dirname, '../apps/agents-server');

    console.trace(`!!! Starting agents server on port ${port}...`);
    console.log(`!!! cwd`, process.cwd());
    console.log(`!!! __dirname`, __dirname);
    console.log(`!!! agentsServerRoot`, agentsServerRoot);

    await $execCommand({
        cwd: agentsServerRoot,
        command: `next dev --port ${port} `,
        isVerbose: true,
    });
}

// Note: [🟢] Code for Node server bootstrap [startAgentServer](src/remote-server/startAgentServer.ts) should never be published into packages that could be imported into browser environment
