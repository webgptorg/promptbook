import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { createUserWalletRecord } from './createUserWalletRecord';
import { findExistingWalletRecord } from './findExistingWalletRecord';
import { mapUserWalletRow } from './mapUserWalletRow';
import { provideUserWalletTable } from './provideUserWalletTable';
import { resolveWalletAgentPermanentId } from './resolveWalletAgentPermanentId';

jest.mock('./findExistingWalletRecord', () => ({
    findExistingWalletRecord: jest.fn(),
}));

jest.mock('./mapUserWalletRow', () => ({
    mapUserWalletRow: jest.fn(),
}));

jest.mock('./provideUserWalletTable', () => ({
    provideUserWalletTable: jest.fn(),
}));

jest.mock('./resolveWalletAgentPermanentId', () => ({
    resolveWalletAgentPermanentId: jest.fn(),
}));

/**
 * Mocked duplicate-check helper used by wallet create tests.
 */
const findExistingWalletRecordMock = findExistingWalletRecord as jest.MockedFunction<typeof findExistingWalletRecord>;

/**
 * Mocked row mapper used by wallet create tests.
 */
const mapUserWalletRowMock = mapUserWalletRow as jest.MockedFunction<typeof mapUserWalletRow>;

/**
 * Mocked table provider used by wallet create tests.
 */
const provideUserWalletTableMock = provideUserWalletTable as jest.MockedFunction<typeof provideUserWalletTable>;

/**
 * Mocked agent-id resolver used by wallet create tests.
 */
const resolveWalletAgentPermanentIdMock = resolveWalletAgentPermanentId as jest.MockedFunction<
    typeof resolveWalletAgentPermanentId
>;

describe('createUserWalletRecord', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('stores agent-scoped wallet records under the canonical agent permanent id', async () => {
        const single = jest.fn(async () => ({
            data: {
                id: 12,
                createdAt: '2026-04-10T00:00:00.000Z',
                updatedAt: '2026-04-10T00:00:00.000Z',
                userId: 7,
                isUserScoped: false,
                agentPermanentId: 'lawyer-123',
                recordType: 'ACCESS_TOKEN',
                service: 'github',
                key: 'use-project-github-token',
                jsonSchema: null,
                username: null,
                password: null,
                secret: 'ghp_secret',
                cookies: null,
                isGlobal: false,
                deletedAt: null,
            },
            error: null,
        }));
        const select = jest.fn(() => ({ single }));
        const insert = jest.fn(() => ({ select }));

        resolveWalletAgentPermanentIdMock.mockResolvedValue('lawyer-123');
        findExistingWalletRecordMock.mockResolvedValue(null);
        provideUserWalletTableMock.mockResolvedValue({ insert } as never);
        mapUserWalletRowMock.mockReturnValue({
            id: 12,
            createdAt: '2026-04-10T00:00:00.000Z',
            updatedAt: '2026-04-10T00:00:00.000Z',
            userId: 7,
            isUserScoped: false,
            agentPermanentId: 'lawyer-123',
            recordType: 'ACCESS_TOKEN',
            service: 'github',
            key: 'use-project-github-token',
            jsonSchema: null,
            username: null,
            password: null,
            secret: 'ghp_secret',
            cookies: null,
            isGlobal: false,
            deletedAt: null,
        });

        await createUserWalletRecord({
            userId: 7,
            agentPermanentId: 'Lawyer',
            isUserScoped: false,
            isGlobal: false,
            recordType: 'ACCESS_TOKEN',
            service: 'github',
            key: 'use-project-github-token',
            secret: 'ghp_secret',
        });

        expect(resolveWalletAgentPermanentIdMock).toHaveBeenCalledWith('Lawyer');
        expect(insert).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: 7,
                agentPermanentId: 'lawyer-123',
                isGlobal: false,
                service: 'github',
                key: 'use-project-github-token',
            }),
        );
    });
});

