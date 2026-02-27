import { spaceTrim } from 'spacetrim';
import { string_javascript_name, TODO_any } from '../../_packages/types.index';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { ToolFunction } from '../../scripting/javascript/JavascriptExecutionToolsOptions';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';
import { formatOptionalInstructionBlock } from '../_base/formatOptionalInstructionBlock';
import { readToolRuntimeContextFromToolArgs } from '../_common/toolRuntimeContext';

/**
 * Supported wallet record types.
 *
 * @private internal WALLET commitment type
 */
export type WalletRecordType = 'USERNAME_PASSWORD' | 'SESSION_COOKIE' | 'ACCESS_TOKEN';

/**
 * Normalized wallet record payload used by runtime adapters.
 *
 * @private internal WALLET commitment type
 */
export type WalletToolRecord = {
    id?: string;
    recordType: WalletRecordType;
    service: string;
    key: string;
    username?: string | null;
    password?: string | null;
    secret?: string | null;
    cookies?: string | null;
    isGlobal: boolean;
    createdAt?: string;
    updatedAt?: string;
};

/**
 * Runtime context for wallet operations.
 *
 * @private internal WALLET commitment type
 */
export type WalletToolRuntimeContext = {
    readonly enabled: boolean;
    readonly userId?: number;
    readonly username?: string;
    readonly agentId?: string;
    readonly agentName?: string;
    readonly isTeamConversation: boolean;
    readonly isPrivateMode: boolean;
};

/**
 * Runtime adapter interface used by wallet tools.
 *
 * @private internal WALLET commitment type
 */
export type WalletToolRuntimeAdapter = {
    retrieveWalletRecords(
        args: {
            query?: string;
            recordType?: WalletRecordType;
            service?: string;
            key?: string;
            limit?: number;
        },
        runtimeContext: WalletToolRuntimeContext,
    ): Promise<WalletToolRecord[]>;
    storeWalletRecord(
        args: WalletToolRecord & {
            username?: string | null;
            password?: string | null;
            secret?: string | null;
            cookies?: string | null;
        },
        runtimeContext: WalletToolRuntimeContext,
    ): Promise<WalletToolRecord>;
    updateWalletRecord(
        args: WalletToolRecord & {
            walletId: string;
            username?: string | null;
            password?: string | null;
            secret?: string | null;
            cookies?: string | null;
        },
        runtimeContext: WalletToolRuntimeContext,
    ): Promise<WalletToolRecord>;
    deleteWalletRecord(args: { walletId: string }, runtimeContext: WalletToolRuntimeContext): Promise<{ id?: string }>;
};

/**
 * Tool name for listing wallet records.
 *
 * @private internal WALLET commitment constant
 */
const RETRIEVE_WALLET_RECORDS_TOOL_NAME = 'retrieve_wallet_records' as string_javascript_name;

/**
 * Tool name for storing one wallet record.
 *
 * @private internal WALLET commitment constant
 */
const STORE_WALLET_RECORD_TOOL_NAME = 'store_wallet_record' as string_javascript_name;

/**
 * Tool name for updating one wallet record.
 *
 * @private internal WALLET commitment constant
 */
const UPDATE_WALLET_RECORD_TOOL_NAME = 'update_wallet_record' as string_javascript_name;

/**
 * Tool name for deleting one wallet record.
 *
 * @private internal WALLET commitment constant
 */
const DELETE_WALLET_RECORD_TOOL_NAME = 'delete_wallet_record' as string_javascript_name;

/**
 * Tool name for requesting a wallet record from the user.
 *
 * @private internal WALLET commitment constant
 */
const REQUEST_WALLET_RECORD_TOOL_NAME = 'request_wallet_record' as string_javascript_name;

/**
 * Arguments accepted by `retrieve_wallet_records`.
 *
 * @private internal WALLET commitment type
 */
type RetrieveWalletRecordsToolArgs = {
    query?: string;
    recordType?: WalletRecordType;
    service?: string;
    key?: string;
    limit?: number;
    [key: string]: TODO_any;
};

/**
 * Arguments accepted by `store_wallet_record`.
 *
 * @private internal WALLET commitment type
 */
type StoreWalletRecordToolArgs = {
    recordType?: WalletRecordType;
    service?: string;
    key?: string;
    username?: string;
    password?: string;
    secret?: string;
    cookies?: string;
    isGlobal?: boolean;
    [key: string]: TODO_any;
};

/**
 * Arguments accepted by `update_wallet_record`.
 *
 * @private internal WALLET commitment type
 */
type UpdateWalletRecordToolArgs = StoreWalletRecordToolArgs & {
    walletId?: string;
};

/**
 * Arguments accepted by `delete_wallet_record`.
 *
 * @private internal WALLET commitment type
 */
type DeleteWalletRecordToolArgs = {
    walletId?: string;
    [key: string]: TODO_any;
};

/**
 * Arguments accepted by `request_wallet_record`.
 *
 * @private internal WALLET commitment type
 */
type RequestWalletRecordToolArgs = {
    recordType?: WalletRecordType;
    service?: string;
    key?: string;
    message?: string;
    isGlobal?: boolean;
    [key: string]: TODO_any;
};

/**
 * Process-wide runtime adapter reference used by wallet tools.
 *
 * @private internal WALLET commitment state
 */
let walletToolRuntimeAdapter: WalletToolRuntimeAdapter | null = null;

/**
 * Sets runtime adapter used by WALLET tools.
 *
 * @private internal runtime wiring for WALLET commitment
 */
export function setWalletToolRuntimeAdapter(adapter: WalletToolRuntimeAdapter | null): void {
    walletToolRuntimeAdapter = adapter;
}

/**
 * WALLET commitment definition.
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class WalletCommitmentDefinition extends BaseCommitmentDefinition<'WALLET' | 'WALLETS'> {
    public constructor(type: 'WALLET' | 'WALLETS' = 'WALLET') {
        super(type);
    }

    override get requiresContent(): boolean {
        return false;
    }

    get description(): string {
        return 'Enable persistent private credential storage (tokens, logins, cookies) scoped per agent or globally.';
    }

    get icon(): string {
        return '👛';
    }

    get documentation(): string {
        return spaceTrim(`
            # ${this.type}

            Enables private credential storage for tokens, usernames/passwords, and session cookies.
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const extraInstructions = formatOptionalInstructionBlock('Wallet instructions', content);
        const existingTools = requirements.tools || [];
        const tools = [...existingTools];

        registerWalletTools(tools);

        return this.appendToSystemMessage(
            {
                ...requirements,
                tools,
                _metadata: {
                    ...requirements._metadata,
                    useWallet: content || true,
                },
            },
            spaceTrim(
                (block) => `
                    Wallet:
                    - Use "${RETRIEVE_WALLET_RECORDS_TOOL_NAME}" before authenticated operations.
                    - Use "${STORE_WALLET_RECORD_TOOL_NAME}" and "${UPDATE_WALLET_RECORD_TOOL_NAME}" to maintain credentials.
                    - Use "${DELETE_WALLET_RECORD_TOOL_NAME}" to remove invalid credentials.
                    - Use "${REQUEST_WALLET_RECORD_TOOL_NAME}" to request missing credentials via UI popup.
                    - Never expose raw credentials in chat responses.
                    ${block(extraInstructions)}
                `,
            ),
        );
    }

    getToolTitles(): Record<string_javascript_name, string> {
        return {
            [RETRIEVE_WALLET_RECORDS_TOOL_NAME]: 'Wallet',
            [STORE_WALLET_RECORD_TOOL_NAME]: 'Store wallet record',
            [UPDATE_WALLET_RECORD_TOOL_NAME]: 'Update wallet record',
            [DELETE_WALLET_RECORD_TOOL_NAME]: 'Delete wallet record',
            [REQUEST_WALLET_RECORD_TOOL_NAME]: 'Request wallet record',
        };
    }

    getToolFunctions(): Record<string_javascript_name, ToolFunction> {
        return createWalletToolFunctions();
    }
}

/**
 * Registers wallet tool definitions when missing.
 *
 * @private utility of WALLET commitment
 */
function registerWalletTools(tools: Array<{ name: string } & Record<string, TODO_any>>): void {
    const addTool = (tool: { name: string } & Record<string, TODO_any>): void => {
        if (!tools.some((existingTool) => existingTool.name === tool.name)) {
            tools.push(tool);
        }
    };

    addTool({
        name: RETRIEVE_WALLET_RECORDS_TOOL_NAME,
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

    addTool({
        name: STORE_WALLET_RECORD_TOOL_NAME,
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
                isGlobal: { type: 'boolean', description: 'Set true to make this record global.' },
            },
            required: ['recordType', 'service'],
        },
    });

    addTool({
        name: UPDATE_WALLET_RECORD_TOOL_NAME,
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
                isGlobal: { type: 'boolean', description: 'Set true to make this record global.' },
            },
            required: ['walletId', 'recordType', 'service'],
        },
    });

    addTool({
        name: DELETE_WALLET_RECORD_TOOL_NAME,
        description: 'Delete one wallet record.',
        parameters: {
            type: 'object',
            properties: {
                walletId: { type: 'string', description: 'Wallet record id to delete.' },
            },
            required: ['walletId'],
        },
    });

    addTool({
        name: REQUEST_WALLET_RECORD_TOOL_NAME,
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
                isGlobal: { type: 'boolean', description: 'Set true when record should be global.' },
            },
            required: [],
        },
    });
}

/**
 * Resolves runtime context from hidden tool arguments.
 *
 * @private utility of WALLET commitment
 */
function resolveWalletRuntimeContext(args: Record<string, TODO_any>): WalletToolRuntimeContext {
    const runtimeContext = readToolRuntimeContextFromToolArgs(args);
    const memoryContext = runtimeContext?.memory;

    return {
        enabled: memoryContext?.enabled === true,
        userId: memoryContext?.userId,
        username: memoryContext?.username,
        agentId: memoryContext?.agentId,
        agentName: memoryContext?.agentName,
        isTeamConversation: memoryContext?.isTeamConversation === true,
        isPrivateMode: memoryContext?.isPrivateMode === true,
    };
}

/**
 * Builds common disabled message for wallet actions.
 *
 * @private utility of WALLET commitment
 */
function getWalletDisabledMessage(runtimeContext: WalletToolRuntimeContext): string {
    if (runtimeContext.isPrivateMode) {
        return 'Wallet is disabled because private mode is active.';
    }
    if (runtimeContext.isTeamConversation) {
        return 'Wallet is disabled for TEAM conversations.';
    }
    return 'Wallet is disabled for unauthenticated users.';
}

/**
 * Creates wallet request payload from tool arguments.
 *
 * @private utility of WALLET commitment
 */
function parseWalletRequestArgs(args: RequestWalletRecordToolArgs): {
    recordType: WalletRecordType;
    service: string;
    key: string;
    message?: string;
    isGlobal: boolean;
} {
    return {
        recordType: parseWalletRecordType(args.recordType, 'ACCESS_TOKEN'),
        service: parseWalletService(args.service),
        key: parseWalletKey(args.key),
        message: normalizeOptionalText(args.message),
        isGlobal: args.isGlobal === true,
    };
}

/**
 * Parses one wallet record id argument.
 *
 * @private utility of WALLET commitment
 */
function parseWalletId(value: unknown): string {
    const walletId = normalizeOptionalText(value);
    if (!walletId) {
        throw new Error('Wallet id is required.');
    }
    return walletId;
}

/**
 * Parses text argument and returns trimmed text when available.
 *
 * @private utility of WALLET commitment
 */
function normalizeOptionalText(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    return trimmed || undefined;
}

/**
 * Parses wallet service argument.
 *
 * @private utility of WALLET commitment
 */
function parseWalletService(value: unknown): string {
    return (normalizeOptionalText(value) || 'generic').toLowerCase();
}

/**
 * Parses wallet key argument.
 *
 * @private utility of WALLET commitment
 */
function parseWalletKey(value: unknown): string {
    return normalizeOptionalText(value) || 'default';
}

/**
 * Parses wallet record type.
 *
 * @private utility of WALLET commitment
 */
function parseWalletRecordType(value: unknown, fallback?: WalletRecordType): WalletRecordType {
    const normalizedType = normalizeOptionalText(value)?.toUpperCase();

    if (normalizedType === 'USERNAME_PASSWORD') {
        return 'USERNAME_PASSWORD';
    }
    if (normalizedType === 'SESSION_COOKIE') {
        return 'SESSION_COOKIE';
    }
    if (normalizedType === 'ACCESS_TOKEN') {
        return 'ACCESS_TOKEN';
    }
    if (fallback) {
        return fallback;
    }

    throw new Error('Unsupported wallet recordType. Expected one of: USERNAME_PASSWORD, SESSION_COOKIE, ACCESS_TOKEN.');
}

/**
 * Parses wallet secret fields according to record type.
 *
 * @private utility of WALLET commitment
 */
function parseWalletSecrets(args: {
    recordType: WalletRecordType;
    username?: unknown;
    password?: unknown;
    secret?: unknown;
    cookies?: unknown;
}): {
    username?: string;
    password?: string;
    secret?: string;
    cookies?: string;
} {
    const username = normalizeOptionalText(args.username);
    const password = normalizeOptionalText(args.password);
    const secret = normalizeOptionalText(args.secret);
    const cookies = normalizeOptionalText(args.cookies);

    if (args.recordType === 'USERNAME_PASSWORD') {
        if (!username || !password) {
            throw new Error('Both username and password are required for USERNAME_PASSWORD.');
        }
        return { username, password };
    }

    if (args.recordType === 'SESSION_COOKIE') {
        if (!cookies) {
            throw new Error('Cookies are required for SESSION_COOKIE.');
        }
        return { cookies };
    }

    if (!secret) {
        throw new Error('Secret is required for ACCESS_TOKEN.');
    }

    return { secret };
}

/**
 * Parses store/update wallet payload.
 *
 * @private utility of WALLET commitment
 */
function parseWalletPayload(args: StoreWalletRecordToolArgs): WalletToolRecord {
    const recordType = parseWalletRecordType(args.recordType);
    return {
        recordType,
        service: parseWalletService(args.service),
        key: parseWalletKey(args.key),
        isGlobal: args.isGlobal === true,
        ...parseWalletSecrets({
            recordType,
            username: args.username,
            password: args.password,
            secret: args.secret,
            cookies: args.cookies,
        }),
    };
}

/**
 * Parses retrieve arguments.
 *
 * @private utility of WALLET commitment
 */
function parseWalletRetrieveArgs(args: RetrieveWalletRecordsToolArgs): {
    query?: string;
    recordType?: WalletRecordType;
    service?: string;
    key?: string;
    limit?: number;
} {
    const limit = typeof args.limit === 'number' && Number.isFinite(args.limit) ? Math.floor(args.limit) : undefined;

    return {
        query: normalizeOptionalText(args.query),
        recordType: normalizeOptionalText(args.recordType) ? parseWalletRecordType(args.recordType) : undefined,
        service: normalizeOptionalText(args.service) ? parseWalletService(args.service) : undefined,
        key: normalizeOptionalText(args.key) ? parseWalletKey(args.key) : undefined,
        limit: limit && limit > 0 ? Math.min(limit, 20) : undefined,
    };
}

/**
 * Creates runtime wallet tool function implementations.
 *
 * @private utility of WALLET commitment
 */
function createWalletToolFunctions(): Record<string_javascript_name, ToolFunction> {
    return {
        async [RETRIEVE_WALLET_RECORDS_TOOL_NAME](args: RetrieveWalletRecordsToolArgs): Promise<string> {
            const runtimeContext = resolveWalletRuntimeContext(args);
            if (!runtimeContext.enabled || runtimeContext.isTeamConversation || runtimeContext.isPrivateMode) {
                return JSON.stringify({
                    action: 'retrieve',
                    status: 'disabled',
                    records: [],
                    message: getWalletDisabledMessage(runtimeContext),
                });
            }
            if (!walletToolRuntimeAdapter) {
                return JSON.stringify({
                    action: 'retrieve',
                    status: 'disabled',
                    records: [],
                    message: 'Wallet runtime is not available in this environment.',
                });
            }

            try {
                const parsedArgs = parseWalletRetrieveArgs(args);
                const records = await walletToolRuntimeAdapter.retrieveWalletRecords(parsedArgs, runtimeContext);
                return JSON.stringify({
                    action: 'retrieve',
                    status: 'ok',
                    query: parsedArgs.query,
                    records,
                });
            } catch (error) {
                return JSON.stringify({
                    action: 'retrieve',
                    status: 'error',
                    records: [],
                    message: error instanceof Error ? error.message : String(error),
                });
            }
        },
        async [STORE_WALLET_RECORD_TOOL_NAME](args: StoreWalletRecordToolArgs): Promise<string> {
            const runtimeContext = resolveWalletRuntimeContext(args);
            if (!runtimeContext.enabled || runtimeContext.isTeamConversation || runtimeContext.isPrivateMode) {
                return JSON.stringify({
                    action: 'store',
                    status: 'disabled',
                    message: getWalletDisabledMessage(runtimeContext),
                });
            }
            if (!walletToolRuntimeAdapter) {
                return JSON.stringify({
                    action: 'store',
                    status: 'disabled',
                    message: 'Wallet runtime is not available in this environment.',
                });
            }

            try {
                const parsedArgs = parseWalletPayload(args);
                const record = await walletToolRuntimeAdapter.storeWalletRecord(parsedArgs, runtimeContext);
                return JSON.stringify({
                    action: 'store',
                    status: 'stored',
                    record,
                });
            } catch (error) {
                return JSON.stringify({
                    action: 'store',
                    status: 'error',
                    message: error instanceof Error ? error.message : String(error),
                });
            }
        },
        async [UPDATE_WALLET_RECORD_TOOL_NAME](args: UpdateWalletRecordToolArgs): Promise<string> {
            const runtimeContext = resolveWalletRuntimeContext(args);
            if (!runtimeContext.enabled || runtimeContext.isTeamConversation || runtimeContext.isPrivateMode) {
                return JSON.stringify({
                    action: 'update',
                    status: 'disabled',
                    message: getWalletDisabledMessage(runtimeContext),
                });
            }
            if (!walletToolRuntimeAdapter) {
                return JSON.stringify({
                    action: 'update',
                    status: 'disabled',
                    message: 'Wallet runtime is not available in this environment.',
                });
            }

            try {
                const walletId = parseWalletId(args.walletId);
                const parsedArgs = parseWalletPayload(args);
                const record = await walletToolRuntimeAdapter.updateWalletRecord(
                    { ...parsedArgs, walletId },
                    runtimeContext,
                );
                return JSON.stringify({
                    action: 'update',
                    status: 'updated',
                    record,
                });
            } catch (error) {
                return JSON.stringify({
                    action: 'update',
                    status: 'error',
                    message: error instanceof Error ? error.message : String(error),
                });
            }
        },
        async [DELETE_WALLET_RECORD_TOOL_NAME](args: DeleteWalletRecordToolArgs): Promise<string> {
            const runtimeContext = resolveWalletRuntimeContext(args);
            if (!runtimeContext.enabled || runtimeContext.isTeamConversation || runtimeContext.isPrivateMode) {
                return JSON.stringify({
                    action: 'delete',
                    status: 'disabled',
                    message: getWalletDisabledMessage(runtimeContext),
                });
            }
            if (!walletToolRuntimeAdapter) {
                return JSON.stringify({
                    action: 'delete',
                    status: 'disabled',
                    message: 'Wallet runtime is not available in this environment.',
                });
            }

            try {
                const walletId = parseWalletId(args.walletId);
                const deleted = await walletToolRuntimeAdapter.deleteWalletRecord({ walletId }, runtimeContext);
                return JSON.stringify({
                    action: 'delete',
                    status: 'deleted',
                    walletId: deleted.id,
                });
            } catch (error) {
                return JSON.stringify({
                    action: 'delete',
                    status: 'error',
                    message: error instanceof Error ? error.message : String(error),
                });
            }
        },
        async [REQUEST_WALLET_RECORD_TOOL_NAME](args: RequestWalletRecordToolArgs): Promise<string> {
            const runtimeContext = resolveWalletRuntimeContext(args);
            if (!runtimeContext.enabled || runtimeContext.isTeamConversation || runtimeContext.isPrivateMode) {
                return JSON.stringify({
                    action: 'request',
                    status: 'disabled',
                    message: getWalletDisabledMessage(runtimeContext),
                });
            }

            const request = parseWalletRequestArgs(args);
            return JSON.stringify({
                action: 'request',
                status: 'requested',
                request,
                message:
                    request.message ||
                    `Request user to provide ${request.recordType} credentials for service "${request.service}".`,
            });
        },
    };
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
