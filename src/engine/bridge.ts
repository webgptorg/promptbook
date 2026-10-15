import { secretToken } from '../common/ids.js';
import { ipcAddress, startIpcServer, type IpcServer } from '../common/ipc.js';
import { engineModule } from '../common/version.js';
import type { McpServerLaunch } from '../harness/types.js';

/**
 * Result of a bridge tool call.
 *
 * @private tool bridge
 */
export type ToolResult = { readonly text: string; readonly isError?: boolean };

/**
 * A tool exposed to harnesses through the ptbk MCP server.
 *
 * @private tool bridge
 */
export type BridgeTool = {
    /** Tool name. */
    readonly name: string;
    /** Description shown to the model. */
    readonly description: string;
    /** JSON Schema of the arguments. */
    readonly inputSchema: Readonly<Record<string, unknown>>;
    /** Implementation. */
    readonly handler: (input: Readonly<Record<string, unknown>>) => Promise<ToolResult>;
};

/**
 * Per-invocation IPC endpoint backing the ptbk MCP server.
 *
 * @private tool bridge
 */
export class ToolBridge {
    /** Whether the harness listed the tools (proof that it loaded the MCP server). */
    public discovered = false;

    private constructor(
        private readonly server: IpcServer,
        private readonly token: string,
    ) {}

    /**
     * Starts a bridge for a set of tools.
     */
    public static async start(tools: readonly BridgeTool[]): Promise<ToolBridge> {
        const token = secretToken(24);
        const address = ipcAddress(`bridge:${token}`);
        let bridge: ToolBridge | undefined;
        const server = await startIpcServer(address, async (request) => {
            const message = request as { token?: string; op?: string; name?: string; arguments?: Record<string, unknown> };
            if (message.token !== token) throw new Error('Unauthorized bridge request.');
            if (message.op === 'list') {
                if (bridge) bridge.discovered = true;
                return tools.map((tool) => ({ name: tool.name, description: tool.description, inputSchema: tool.inputSchema }));
            }
            if (message.op === 'call') {
                const tool = tools.find((candidate) => candidate.name === message.name);
                if (!tool) return { text: `Unknown tool ${String(message.name)}.`, isError: true };
                try {
                    return await tool.handler(message.arguments ?? {});
                } catch (error) {
                    return { text: error instanceof Error ? error.message : String(error), isError: true };
                }
            }
            throw new Error('Unknown bridge operation.');
        });
        bridge = new ToolBridge(server, token);
        return bridge;
    }

    /** Launch configuration of the stdio MCP server for harness configuration. */
    public launch(): McpServerLaunch {
        return { command: process.execPath, args: [engineModule('engine/mcp-server.js')], env: { PTBK_BRIDGE_ADDRESS: this.server.address, PTBK_BRIDGE_TOKEN: this.token } };
    }

    /** Token value (redacted from traces). */
    public get secret(): string {
        return this.token;
    }

    /** Stops the bridge. */
    public async close(): Promise<void> {
        await this.server.close();
    }
}
