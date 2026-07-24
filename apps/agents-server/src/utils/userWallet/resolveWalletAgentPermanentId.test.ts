import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { $getTableName } from '../../database/$getTableName';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import { resolveWalletAgentPermanentId } from './resolveWalletAgentPermanentId';

jest.mock('../../database/$getTableName', () => ({
    $getTableName: jest.fn(),
}));

jest.mock('../../database/$provideSupabaseForServer', () => ({
    $provideSupabaseForServer: jest.fn(),
}));

/**
 * Mocked table-name resolver used by wallet-agent-id tests.
 */
const getTableNameMock = $getTableName as jest.MockedFunction<typeof $getTableName>;

/**
 * Mocked Supabase provider used by wallet-agent-id tests.
 */
const provideSupabaseForServerMock = $provideSupabaseForServer as jest.MockedFunction<
    typeof $provideSupabaseForServer
>;

/**
 * Creates one minimal chained Supabase mock for `resolveWalletAgentPermanentId`.
 */
function createSupabaseMock(result: { data: unknown; error: { message: string } | null }) {
    const maybeSingle = jest.fn(async () => result);
    const limit = jest.fn(() => ({ maybeSingle }));
    const order = jest.fn(() => ({ limit }));
    const is = jest.fn(() => ({ order }));
    const or = jest.fn(() => ({ is }));
    const select = jest.fn(() => ({ or }));
    const from = jest.fn(() => ({ select }));

    return {
        from,
        select,
        or,
        is,
        order,
        limit,
        maybeSingle,
    };
}

describe('resolveWalletAgentPermanentId', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('resolves an agent name to the canonical permanent id used by wallet records', async () => {
        const supabaseMock = createSupabaseMock({
            data: {
                permanentId: 'lawyer-123',
            },
            error: null,
        });

        getTableNameMock.mockResolvedValue('server_Agent' as 'Agent');
        provideSupabaseForServerMock.mockReturnValue(supabaseMock as never);

        await expect(resolveWalletAgentPermanentId('Lawyer')).resolves.toBe('lawyer-123');
        expect(supabaseMock.from).toHaveBeenCalledWith('server_Agent');
        expect(supabaseMock.or).toHaveBeenCalledWith('agentName.eq.Lawyer,permanentId.eq.Lawyer');
    });

    it('returns null without querying Supabase when the identifier is empty', async () => {
        await expect(resolveWalletAgentPermanentId('   ')).resolves.toBeNull();
        expect(provideSupabaseForServerMock).not.toHaveBeenCalled();
    });

    it('returns null when the matched agent still has no permanent id', async () => {
        const supabaseMock = createSupabaseMock({
            data: {
                permanentId: null,
            },
            error: null,
        });

        getTableNameMock.mockResolvedValue('server_Agent' as 'Agent');
        provideSupabaseForServerMock.mockReturnValue(supabaseMock as never);

        await expect(resolveWalletAgentPermanentId('Legacy Agent')).resolves.toBeNull();
    });
});

