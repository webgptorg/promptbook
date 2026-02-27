import { afterEach, describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { createAgentModelRequirementsWithCommitments } from '../../book-2.0/agent-source/createAgentModelRequirementsWithCommitments';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import { TOOL_RUNTIME_CONTEXT_ARGUMENT } from '../_common/toolRuntimeContext';
import {
    setWalletToolRuntimeAdapter,
    WalletCommitmentDefinition,
    type WalletToolRuntimeAdapter,
} from './WALLET';

/**
 * Helper to parse JSON tool results.
 */
function parseJsonResult<TValue>(value: string): TValue {
    return JSON.parse(value) as TValue;
}

describe('WalletCommitmentDefinition', () => {
    afterEach(() => {
        setWalletToolRuntimeAdapter(null);
    });

    it('adds wallet tools and system-message instructions', async () => {
        const agentSource = spaceTrim(`
            Wallet Agent
            WALLET
        `) as string_book;

        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);

        expect(requirements.tools).toContainEqual(expect.objectContaining({ name: 'retrieve_wallet_records' }));
        expect(requirements.tools).toContainEqual(expect.objectContaining({ name: 'store_wallet_record' }));
        expect(requirements.tools).toContainEqual(expect.objectContaining({ name: 'update_wallet_record' }));
        expect(requirements.tools).toContainEqual(expect.objectContaining({ name: 'delete_wallet_record' }));
        expect(requirements.tools).toContainEqual(expect.objectContaining({ name: 'request_wallet_record' }));
        expect(requirements.systemMessage).toContain('retrieve_wallet_records');
        expect(requirements.systemMessage).toContain('request_wallet_record');
    });

    it('returns disabled result when runtime context is missing', async () => {
        const commitment = new WalletCommitmentDefinition();
        const functions = commitment.getToolFunctions();

        const retrieveResultRaw = await functions.retrieve_wallet_records!({});
        const retrieveResult = parseJsonResult<{ status: string; records: unknown[] }>(retrieveResultRaw);
        expect(retrieveResult.status).toBe('disabled');
        expect(retrieveResult.records).toEqual([]);

        const requestResultRaw = await functions.request_wallet_record!({});
        const requestResult = parseJsonResult<{ status: string; action: string }>(requestResultRaw);
        expect(requestResult.action).toBe('request');
        expect(requestResult.status).toBe('disabled');
    });

    it('stores and retrieves wallet records through runtime adapter when enabled', async () => {
        const adapter: WalletToolRuntimeAdapter = {
            async retrieveWalletRecords() {
                return [
                    {
                        id: 'wal-1',
                        recordType: 'ACCESS_TOKEN',
                        service: 'github',
                        key: 'use-project-github-token',
                        secret: 'ghp_secret',
                        isGlobal: false,
                    },
                ];
            },
            async storeWalletRecord(args) {
                return {
                    ...args,
                    id: 'wal-1',
                };
            },
            async updateWalletRecord(args) {
                return {
                    ...args,
                    id: args.walletId,
                };
            },
            async deleteWalletRecord(args) {
                return { id: args.walletId };
            },
        };
        setWalletToolRuntimeAdapter(adapter);

        const commitment = new WalletCommitmentDefinition();
        const functions = commitment.getToolFunctions();
        const runtimeContext = JSON.stringify({
            memory: {
                enabled: true,
                userId: 1,
                username: 'alice',
                agentId: 'agent-1',
                agentName: 'Wallet Agent',
                isTeamConversation: false,
            },
        });

        const storeResultRaw = await functions.store_wallet_record!({
            recordType: 'ACCESS_TOKEN',
            service: 'github',
            key: 'use-project-github-token',
            secret: 'ghp_secret',
            [TOOL_RUNTIME_CONTEXT_ARGUMENT]: runtimeContext,
        });
        const storeResult = parseJsonResult<{
            action: string;
            status: string;
            record?: { id?: string; secret?: string };
        }>(storeResultRaw);
        expect(storeResult.action).toBe('store');
        expect(storeResult.status).toBe('stored');
        expect(storeResult.record?.id).toBe('wal-1');

        const retrieveResultRaw = await functions.retrieve_wallet_records!({
            service: 'github',
            [TOOL_RUNTIME_CONTEXT_ARGUMENT]: runtimeContext,
        });
        const retrieveResult = parseJsonResult<{
            action: string;
            status: string;
            records: Array<{ id?: string; service?: string }>;
        }>(retrieveResultRaw);
        expect(retrieveResult.action).toBe('retrieve');
        expect(retrieveResult.status).toBe('ok');
        expect(retrieveResult.records[0]?.service).toBe('github');

        const updateResultRaw = await functions.update_wallet_record!({
            walletId: 'wal-1',
            recordType: 'ACCESS_TOKEN',
            service: 'github',
            key: 'use-project-github-token',
            secret: 'ghp_secret_2',
            [TOOL_RUNTIME_CONTEXT_ARGUMENT]: runtimeContext,
        });
        const updateResult = parseJsonResult<{ action: string; status: string; record?: { id?: string } }>(
            updateResultRaw,
        );
        expect(updateResult.action).toBe('update');
        expect(updateResult.status).toBe('updated');
        expect(updateResult.record?.id).toBe('wal-1');

        const deleteResultRaw = await functions.delete_wallet_record!({
            walletId: 'wal-1',
            [TOOL_RUNTIME_CONTEXT_ARGUMENT]: runtimeContext,
        });
        const deleteResult = parseJsonResult<{ action: string; status: string; walletId?: string }>(deleteResultRaw);
        expect(deleteResult.action).toBe('delete');
        expect(deleteResult.status).toBe('deleted');
        expect(deleteResult.walletId).toBe('wal-1');
    });

    it('creates request payload for UI popup', async () => {
        const commitment = new WalletCommitmentDefinition();
        const functions = commitment.getToolFunctions();

        const runtimeContext = JSON.stringify({
            memory: {
                enabled: true,
                userId: 1,
                agentId: 'agent-1',
            },
        });

        const requestResultRaw = await functions.request_wallet_record!({
            recordType: 'ACCESS_TOKEN',
            service: 'github',
            key: 'use-project-github-token',
            message: 'Please provide your GitHub token.',
            [TOOL_RUNTIME_CONTEXT_ARGUMENT]: runtimeContext,
        });
        const requestResult = parseJsonResult<{
            action: string;
            status: string;
            request?: {
                recordType?: string;
                service?: string;
                key?: string;
            };
        }>(requestResultRaw);

        expect(requestResult.action).toBe('request');
        expect(requestResult.status).toBe('requested');
        expect(requestResult.request?.recordType).toBe('ACCESS_TOKEN');
        expect(requestResult.request?.service).toBe('github');
    });
});
