import { describe, expect, it } from '@jest/globals';
import type { ToolCall } from '../../../types/ToolCall';
import { buildToolCallChipText, getToolCallChipletInfo } from './getToolCallChipletInfo';
import {
    createDeduplicatedWalletCredentialToolCalls,
    createWalletCredentialToolCall,
    parseWalletCredentialToolCallResult,
    WALLET_CREDENTIAL_TOOL_CALL_NAME,
} from './walletCredentialToolCall';

/**
 * Creates a minimal tool call for credential chip tests.
 */
function createToolCall(partial: Partial<ToolCall>): ToolCall {
    return {
        name: partial.name || 'unknown_tool',
        ...partial,
    };
}

describe('createWalletCredentialToolCall', () => {
    it('creates an SMTP credential chip tool call for successful USE EMAIL runs', () => {
        const originalToolCall = createToolCall({
            name: 'send_email',
            result: JSON.stringify({
                status: 'sent',
            }),
            idempotencyKey: 'mail-1',
        });

        const credentialToolCall = createWalletCredentialToolCall(originalToolCall);

        expect(credentialToolCall).toEqual(
            expect.objectContaining({
                name: WALLET_CREDENTIAL_TOOL_CALL_NAME,
                idempotencyKey: `${WALLET_CREDENTIAL_TOOL_CALL_NAME}:mail-1`,
                result: expect.objectContaining({
                    credentialName: 'SMTP credentials used',
                    service: 'smtp',
                    key: 'use-email-smtp-credentials',
                    sourceToolName: 'send_email',
                    sourceToolNames: ['send_email'],
                }),
            }),
        );
    });

    it('creates a GitHub credential chip tool call for successful USE PROJECT runs', () => {
        const originalToolCall = createToolCall({
            name: 'project_list_files',
            result: JSON.stringify({
                repository: 'https://github.com/example/repo',
            }),
            idempotencyKey: 'project-1',
        });

        const credentialToolCall = createWalletCredentialToolCall(originalToolCall);

        expect(credentialToolCall).toEqual(
            expect.objectContaining({
                name: WALLET_CREDENTIAL_TOOL_CALL_NAME,
                result: expect.objectContaining({
                    credentialName: 'GitHub credentials used',
                    service: 'github',
                    key: 'use-project-github-token',
                    sourceToolName: 'project_list_files',
                    sourceToolNames: ['project_list_files'],
                }),
            }),
        );
    });

    it('does not create a chip when wallet credentials are missing', () => {
        const originalToolCall = createToolCall({
            name: 'send_email',
            result: JSON.stringify({
                status: 'wallet-credential-required',
            }),
        });

        expect(createWalletCredentialToolCall(originalToolCall)).toBeNull();
    });

    it('does not create a chip for unrelated tools', () => {
        const originalToolCall = createToolCall({
            name: 'web_search',
            result: JSON.stringify({
                query: 'Promptbook',
            }),
        });

        expect(createWalletCredentialToolCall(originalToolCall)).toBeNull();
    });
});

describe('parseWalletCredentialToolCallResult', () => {
    it('parses valid credential payloads', () => {
        expect(
            parseWalletCredentialToolCallResult({
                credentialName: 'SMTP credentials used',
                purpose: 'Authenticates mailbox',
                service: 'smtp',
                key: 'use-email-smtp-credentials',
                sourceToolName: 'send_email',
                sourceToolNames: ['send_email'],
            }),
        ).toEqual({
            credentialName: 'SMTP credentials used',
            purpose: 'Authenticates mailbox',
            service: 'smtp',
            key: 'use-email-smtp-credentials',
            sourceToolName: 'send_email',
            sourceToolNames: ['send_email'],
        });
    });

    it('returns null for invalid payloads', () => {
        expect(parseWalletCredentialToolCallResult(null)).toBeNull();
        expect(parseWalletCredentialToolCallResult({ credentialName: 'Missing fields' })).toBeNull();
    });
});

describe('createDeduplicatedWalletCredentialToolCalls', () => {
    it('returns one credential chip per credential type in one message', () => {
        const deduplicatedToolCalls = createDeduplicatedWalletCredentialToolCalls([
            createToolCall({
                name: 'project_list_files',
                result: JSON.stringify({ ok: true }),
                idempotencyKey: 'project-1',
            }),
            createToolCall({
                name: 'project_read_file',
                result: JSON.stringify({ ok: true }),
                idempotencyKey: 'project-2',
            }),
            createToolCall({
                name: 'send_email',
                result: JSON.stringify({ status: 'sent' }),
                idempotencyKey: 'email-1',
            }),
        ]);

        expect(deduplicatedToolCalls).toHaveLength(2);

        const parsedResults = deduplicatedToolCalls
            .map((toolCall) => parseWalletCredentialToolCallResult(toolCall.result))
            .filter((result): result is NonNullable<typeof result> => result !== null);

        expect(parsedResults).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    credentialName: 'GitHub credentials used',
                    service: 'github',
                    sourceToolNames: ['project_list_files', 'project_read_file'],
                }),
                expect.objectContaining({
                    credentialName: 'SMTP credentials used',
                    service: 'smtp',
                    sourceToolNames: ['send_email'],
                }),
            ]),
        );
    });
});

describe('wallet credential chip label', () => {
    it('renders a friendly chip label from synthetic credential tool calls', () => {
        const credentialToolCall = createToolCall({
            name: WALLET_CREDENTIAL_TOOL_CALL_NAME,
            result: {
                credentialName: 'GitHub credentials used',
                purpose: 'Authenticates repository access',
                service: 'github',
                key: 'use-project-github-token',
                sourceToolName: 'project_list_files',
            },
        });

        const chipletInfo = getToolCallChipletInfo(credentialToolCall);
        expect(buildToolCallChipText(chipletInfo)).toBe('🔐 GitHub credentials used');
    });
});
