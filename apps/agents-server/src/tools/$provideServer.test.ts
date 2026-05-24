import { headers } from 'next/headers';
import { $provideServer } from './$provideServer';
import { listRegisteredServersUsingServiceRole } from '../utils/serverRegistry';

jest.mock('react', () => ({
    cache: <TFunction extends (...args: Array<never>) => unknown>(callback: TFunction): TFunction => callback,
}));

jest.mock('@/config', () => ({
    NEXT_PUBLIC_SITE_URL: null,
    SUPABASE_TABLE_PREFIX: 'local_',
}));

jest.mock('next/headers', () => ({
    headers: jest.fn(),
}));

jest.mock('../utils/serverRegistry', () => {
    const actual = jest.requireActual('../utils/serverRegistry');

    return {
        ...actual,
        listRegisteredServersUsingServiceRole: jest.fn(),
    };
});

/**
 * Creates a typed header store for `$provideServer` tests.
 *
 * @private test helper
 */
function createHeaderStore(values: Record<string, string>): Awaited<ReturnType<typeof headers>> {
    return new Headers(values) as Awaited<ReturnType<typeof headers>>;
}

describe('$provideServer', () => {
    const headersMock = headers as jest.MockedFunction<typeof headers>;
    const listRegisteredServersUsingServiceRoleMock = listRegisteredServersUsingServiceRole as jest.MockedFunction<
        typeof listRegisteredServersUsingServiceRole
    >;

    beforeEach(() => {
        headersMock.mockResolvedValue(createHeaderStore({ host: 'localhost:4440' }));
        listRegisteredServersUsingServiceRoleMock.mockReset();
    });

    it('uses fallback routing for localhost without loading the global server registry', async () => {
        listRegisteredServersUsingServiceRoleMock.mockRejectedValue(new Error('Registry unavailable'));

        const providedServer = await $provideServer();

        expect(providedServer.id).toBeNull();
        expect(providedServer.tablePrefix).toBe('local_');
        expect(providedServer.publicUrl.href).toBe('http://localhost:4440/');
        expect(listRegisteredServersUsingServiceRoleMock).not.toHaveBeenCalled();
    });

    it('uses the registered server for non-local requests', async () => {
        headersMock.mockResolvedValue(createHeaderStore({ host: 'tenant.example.com' }));
        listRegisteredServersUsingServiceRoleMock.mockResolvedValue([
            {
                id: 7,
                name: 'Tenant',
                environment: 'PREVIEW',
                domain: 'tenant.example.com',
                tablePrefix: 'tenant_',
                createdAt: '2026-05-24T00:00:00.000Z',
                updatedAt: '2026-05-24T00:00:00.000Z',
            },
        ]);

        const providedServer = await $provideServer();

        expect(providedServer.id).toBe(7);
        expect(providedServer.tablePrefix).toBe('tenant_');
        expect(providedServer.publicUrl.href).toBe('https://tenant.example.com/');
        expect(listRegisteredServersUsingServiceRoleMock).toHaveBeenCalledTimes(1);
    });
});
