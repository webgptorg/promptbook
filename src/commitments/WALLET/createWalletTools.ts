import type { TODO_any } from '../../_packages/types.index';
import type { LlmToolDefinition } from '../../types/LlmToolDefinition';
import { WalletToolNames } from './WalletToolNames';

/**
 * Creates tool definitions required by WALLET commitment.
 *
 * @private function of WalletCommitmentDefinition
 */
export function createWalletTools(existingTools: ReadonlyArray<LlmToolDefinition> | undefined): LlmToolDefinition[] {
    const tools: LlmToolDefinition[] = [...(existingTools || [])];

    addWalletToolIfMissing(tools, {
        name: WalletToolNames.retrieve,
        description: 'Retrieve wallet records relevant to the current task.',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Optional text query used to filter wallet records.' },
                recordType: {
                    type: 'string',
                    description: 'Optional record type filter (USERNAME_PASSWORD, SESSION_COOKIE, ACCESS_TOKEN).',
                },
                service: { type: 'string', description: 'Optional service filter, for example github.' },
                key: { type: 'string', description: 'Optional wallet key filter.' },
                limit: { type: 'integer', description: 'Optional maximum number of records (default 5, max 20).' },
            },
            required: [],
        },
    });

    addWalletToolIfMissing(tools, {
        name: WalletToolNames.store,
        description: 'Store one wallet record.',
        parameters: {
            type: 'object',
            properties: {
                recordType: {
                    type: 'string',
                    description: 'Record type: USERNAME_PASSWORD, SESSION_COOKIE, ACCESS_TOKEN.',
                },
                service: { type: 'string', description: 'Service identifier, for example github.' },
                key: { type: 'string', description: 'Logical credential key.' },
                username: { type: 'string', description: 'Username for USERNAME_PASSWORD.' },
                password: { type: 'string', description: 'Password for USERNAME_PASSWORD.' },
                secret: { type: 'string', description: 'Token/API key for ACCESS_TOKEN.' },
                cookies: { type: 'string', description: 'Cookie header/json for SESSION_COOKIE.' },
                isUserScoped: { type: 'boolean', description: 'Set true to scope this record to current user.' },
                isGlobal: { type: 'boolean', description: 'Set true to make this record global.' },
            },
            required: ['recordType', 'service'],
        },
    });

    addWalletToolIfMissing(tools, {
        name: WalletToolNames.update,
        description: 'Update one existing wallet record.',
        parameters: {
            type: 'object',
            properties: {
                walletId: { type: 'string', description: 'Wallet record id to update.' },
                recordType: {
                    type: 'string',
                    description: 'Record type: USERNAME_PASSWORD, SESSION_COOKIE, ACCESS_TOKEN.',
                },
                service: { type: 'string', description: 'Service identifier, for example github.' },
                key: { type: 'string', description: 'Logical credential key.' },
                username: { type: 'string', description: 'Username for USERNAME_PASSWORD.' },
                password: { type: 'string', description: 'Password for USERNAME_PASSWORD.' },
                secret: { type: 'string', description: 'Token/API key for ACCESS_TOKEN.' },
                cookies: { type: 'string', description: 'Cookie header/json for SESSION_COOKIE.' },
                isUserScoped: { type: 'boolean', description: 'Set true to scope this record to current user.' },
                isGlobal: { type: 'boolean', description: 'Set true to make this record global.' },
            },
            required: ['walletId', 'recordType', 'service'],
        },
    });

    addWalletToolIfMissing(tools, {
        name: WalletToolNames.delete,
        description: 'Delete one wallet record.',
        parameters: {
            type: 'object',
            properties: {
                walletId: { type: 'string', description: 'Wallet record id to delete.' },
            },
            required: ['walletId'],
        },
    });

    addWalletToolIfMissing(tools, {
        name: WalletToolNames.request,
        description: 'Request missing credential from user via popup.',
        parameters: {
            type: 'object',
            properties: {
                recordType: {
                    type: 'string',
                    description: 'Requested record type: USERNAME_PASSWORD, SESSION_COOKIE, ACCESS_TOKEN.',
                },
                service: { type: 'string', description: 'Service identifier.' },
                key: { type: 'string', description: 'Logical credential key.' },
                message: { type: 'string', description: 'Optional UI message for user.' },
                isUserScoped: {
                    type: 'boolean',
                    description: 'Set true when record should be scoped to current user.',
                },
                isGlobal: { type: 'boolean', description: 'Set true when record should be global.' },
            },
            required: [],
        },
    });

    return tools;
}

/**
 * Registers one wallet tool when missing in current tool list.
 *
 * @private function of WalletCommitmentDefinition
 */
function addWalletToolIfMissing(
    tools: Array<{ name: string } & Record<string, TODO_any>>,
    tool: { name: string } & Record<string, TODO_any>,
): void {
    if (!tools.some((existingTool) => existingTool.name === tool.name)) {
        tools.push(tool);
    }
}
