import Link from 'next/link';
import { headers } from 'next/headers';
import { AlertTriangle, CheckCircle2, ExternalLink, XCircle } from 'lucide-react';
import { $getTableName } from '../../../../database/$getTableName';
import { $provideSupabaseForServer } from '../../../../database/$provideSupabaseForServer';
import { ForbiddenPage } from '../../../../components/ForbiddenPage/ForbiddenPage';
import { isUserAdmin } from '../../../../utils/isUserAdmin';
import {
    getShibbolethAuthenticationAttemptTableName,
    getShibbolethUserIdentityTableName,
    resolveShibbolethAuthenticationConfiguration,
    type ShibbolethAuthenticationAttemptRow,
    type ShibbolethUserIdentityRow,
} from '../../../../utils/shibbolethAuthentication';

/**
 * User row subset displayed on the Shibboleth dashboard.
 */
type DashboardUserRow = {
    readonly id: number;
    readonly username: string;
    readonly email?: string | null;
    readonly displayName?: string | null;
    readonly authenticationProvider?: string | null;
    readonly isAdmin: boolean;
};

/**
 * Builds an absolute URL for Shibboleth route configuration inside server components.
 */
async function getDashboardRequestUrl(): Promise<string> {
    const headerStore = await headers();
    const forwardedProtocol = headerStore.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'http';
    const forwardedHost = headerStore.get('x-forwarded-host') || headerStore.get('host') || 'localhost';
    return `${forwardedProtocol}://${forwardedHost}/admin/login-methods/shibboleth`;
}

/**
 * Loads recent Shibboleth authentication attempts for the dashboard.
 */
async function loadShibbolethAuthenticationAttempts(): Promise<ReadonlyArray<ShibbolethAuthenticationAttemptRow>> {
    const supabase = $provideSupabaseForServer();
    const { data, error } = await supabase
        .from(await getShibbolethAuthenticationAttemptTableName())
        .select('*')
        .order('createdAt', { ascending: false })
        .limit(100);

    if (error) {
        console.error('Failed to load Shibboleth authentication attempts:', error);
        return [];
    }

    return (data as ShibbolethAuthenticationAttemptRow[] | null) || [];
}

/**
 * Loads Shibboleth identities and their linked users for the dashboard.
 */
async function loadShibbolethIdentitiesWithUsers(): Promise<{
    readonly identities: ReadonlyArray<ShibbolethUserIdentityRow>;
    readonly usersById: ReadonlyMap<number, DashboardUserRow>;
}> {
    const supabase = $provideSupabaseForServer();
    const { data: identities, error } = await supabase
        .from(await getShibbolethUserIdentityTableName())
        .select('*')
        .order('lastLoggedInAt', { ascending: false, nullsFirst: false });

    if (error) {
        console.error('Failed to load Shibboleth identities:', error);
        return {
            identities: [],
            usersById: new Map(),
        };
    }

    const identityRows = (identities as ShibbolethUserIdentityRow[] | null) || [];
    const userIds = Array.from(new Set(identityRows.map((identity) => identity.userId)));

    if (userIds.length === 0) {
        return {
            identities: identityRows,
            usersById: new Map(),
        };
    }

    const { data: users, error: usersError } = await supabase
        .from(await $getTableName('User'))
        .select('*')
        .in('id', userIds);

    if (usersError) {
        console.error('Failed to load Shibboleth users:', usersError);
        return {
            identities: identityRows,
            usersById: new Map(),
        };
    }

    const usersById = new Map<number, DashboardUserRow>();
    for (const user of (users as unknown as DashboardUserRow[] | null) || []) {
        usersById.set(user.id, user);
    }

    return {
        identities: identityRows,
        usersById,
    };
}

/**
 * Formats an optional date-time value for the dashboard.
 */
function formatDashboardDateTime(value: string | null | undefined): string {
    if (!value) {
        return 'Never';
    }

    return new Date(value).toLocaleString();
}

/**
 * Handles Shibboleth login method dashboard page.
 */
export default async function ShibbolethLoginMethodPage() {
    const isAdmin = await isUserAdmin();

    if (!isAdmin) {
        return <ForbiddenPage />;
    }

    const requestUrl = await getDashboardRequestUrl();
    const [configuration, attempts, identitiesWithUsers] = await Promise.all([
        resolveShibbolethAuthenticationConfiguration({
            requestUrl,
            isIdentityProviderMetadataValidationEnabled: true,
        }),
        loadShibbolethAuthenticationAttempts(),
        loadShibbolethIdentitiesWithUsers(),
    ]);
    const isWarningShown = configuration.isActive && !configuration.isConfigured;

    return (
        <div className="container mx-auto max-w-6xl px-4 py-8 space-y-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500">System / Login Methods</p>
                    <h1 className="text-3xl font-semibold text-gray-950">Shibboleth</h1>
                    <p className="mt-2 max-w-3xl text-sm text-gray-600">
                        Manage Shibboleth SAML login, review authentication attempts, and inspect linked users.
                    </p>
                </div>
                <Link
                    href="/admin/users"
                    className="inline-flex items-center justify-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                    Users
                </Link>
            </div>

            {isWarningShown && (
                <div className="flex gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900">
                    <AlertTriangle className="mt-0.5 h-5 w-5 flex-none" />
                    <div className="space-y-1 text-sm">
                        <p className="font-semibold">
                            Shibboleth authentication is active but not configured correctly.
                        </p>
                        <p>{configuration.errors.join(' ')}</p>
                        <a href="#setup-instructions" className="font-medium underline">
                            Open setup instructions
                        </a>
                    </div>
                </div>
            )}

            <section className="rounded-md border border-gray-200 bg-white p-5">
                <div className="flex items-center gap-2">
                    {configuration.isActive ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                        <XCircle className="h-5 w-5 text-gray-400" />
                    )}
                    <h2 className="text-lg font-semibold text-gray-950">Configuration</h2>
                </div>
                <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                    <div>
                        <dt className="font-medium text-gray-500">Active</dt>
                        <dd className="mt-1 text-gray-900">{configuration.isActive ? 'Yes' : 'No'}</dd>
                    </div>
                    <div>
                        <dt className="font-medium text-gray-500">Configured</dt>
                        <dd className="mt-1 text-gray-900">{configuration.isConfigured ? 'Yes' : 'No'}</dd>
                    </div>
                    <div>
                        <dt className="font-medium text-gray-500">EntityID</dt>
                        <dd className="mt-1 break-all font-mono text-xs text-gray-900">
                            {configuration.serviceProviderUrls.entityId}
                        </dd>
                    </div>
                    <div>
                        <dt className="font-medium text-gray-500">ACS URL</dt>
                        <dd className="mt-1 break-all font-mono text-xs text-gray-900">
                            {configuration.serviceProviderUrls.assertionConsumerServiceUrl}
                        </dd>
                    </div>
                    <div>
                        <dt className="font-medium text-gray-500">SP metadata</dt>
                        <dd className="mt-1 break-all text-xs">
                            <a
                                href={configuration.serviceProviderUrls.metadataUrl}
                                className="inline-flex items-center gap-1 font-mono text-blue-700 hover:text-blue-900"
                            >
                                {configuration.serviceProviderUrls.metadataUrl}
                                <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                        </dd>
                    </div>
                    <div>
                        <dt className="font-medium text-gray-500">IdP metadata source</dt>
                        <dd className="mt-1 break-all text-xs text-gray-900">
                            {configuration.isIdentityProviderMetadataXmlConfigured
                                ? 'Metadata XML is stored directly in metadata configuration.'
                                : configuration.identityProviderMetadataUrl || 'Not set'}
                        </dd>
                    </div>
                </dl>
                {configuration.errors.length > 0 && (
                    <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-amber-800">
                        {configuration.errors.map((error) => (
                            <li key={error}>{error}</li>
                        ))}
                    </ul>
                )}
            </section>

            <section id="setup-instructions" className="rounded-md border border-gray-200 bg-white p-5">
                <h2 className="text-lg font-semibold text-gray-950">Setup Instructions</h2>
                <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-gray-700">
                    <li>
                        In{' '}
                        <Link href="/admin/metadata" className="text-blue-700 underline">
                            Metadata
                        </Link>
                        , set <code>IS_SHIBBOLETH_AUTH_ACTIVE</code> to <code>true</code>.
                    </li>
                    <li>
                        Set <code>SHIBBOLETH_IDP_METADATA_URL</code> to the university Identity Provider metadata URL.
                        For Silesian University use <code>https://idp-cro.slu.cz/idp/shibboleth</code>, or paste the XML
                        into <code>SHIBBOLETH_IDP_METADATA_XML</code>.
                    </li>
                    <li>
                        Send the Service Provider metadata URL above to the IdP administrator, or send the EntityID and
                        ACS URL shown in the configuration panel.
                    </li>
                    <li>
                        Ask the IdP administrator to release <code>mail</code>, <code>displayName</code>, and{' '}
                        <code>unstructuredName</code>. <code>eduPersonPrincipalName</code> can also be used as an
                        institutional identifier.
                    </li>
                </ol>
            </section>

            <section className="rounded-md border border-gray-200 bg-white p-5">
                <h2 className="text-lg font-semibold text-gray-950">Authentication Attempts</h2>
                <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead>
                            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                <th className="py-2 pr-4">Time</th>
                                <th className="py-2 pr-4">Status</th>
                                <th className="py-2 pr-4">Stage</th>
                                <th className="py-2 pr-4">Email</th>
                                <th className="py-2 pr-4">Name</th>
                                <th className="py-2 pr-4">Error</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {attempts.length === 0 ? (
                                <tr>
                                    <td className="py-3 text-gray-500" colSpan={6}>
                                        No Shibboleth authentication attempts recorded yet.
                                    </td>
                                </tr>
                            ) : (
                                attempts.map((attempt) => (
                                    <tr key={attempt.id}>
                                        <td className="whitespace-nowrap py-2 pr-4 text-gray-700">
                                            {formatDashboardDateTime(attempt.createdAt)}
                                        </td>
                                        <td className="py-2 pr-4 font-medium text-gray-900">{attempt.status}</td>
                                        <td className="py-2 pr-4 text-gray-700">{attempt.stage}</td>
                                        <td className="py-2 pr-4 text-gray-700">{attempt.email || '-'}</td>
                                        <td className="py-2 pr-4 text-gray-700">{attempt.displayName || '-'}</td>
                                        <td className="max-w-xs py-2 pr-4 text-gray-600">
                                            {attempt.errorMessage || '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="rounded-md border border-gray-200 bg-white p-5">
                <h2 className="text-lg font-semibold text-gray-950">Shibboleth Users</h2>
                <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead>
                            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                <th className="py-2 pr-4">User</th>
                                <th className="py-2 pr-4">Email</th>
                                <th className="py-2 pr-4">Display Name</th>
                                <th className="py-2 pr-4">Institutional ID</th>
                                <th className="py-2 pr-4">Logins</th>
                                <th className="py-2 pr-4">Last Login</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {identitiesWithUsers.identities.length === 0 ? (
                                <tr>
                                    <td className="py-3 text-gray-500" colSpan={6}>
                                        No Shibboleth users have logged in yet.
                                    </td>
                                </tr>
                            ) : (
                                identitiesWithUsers.identities.map((identity) => {
                                    const user = identitiesWithUsers.usersById.get(identity.userId);
                                    return (
                                        <tr key={identity.id}>
                                            <td className="py-2 pr-4">
                                                {user ? (
                                                    <Link
                                                        href={`/admin/users/${encodeURIComponent(user.username)}`}
                                                        className="font-medium text-blue-700 hover:text-blue-900"
                                                    >
                                                        {user.username}
                                                    </Link>
                                                ) : (
                                                    <span className="text-gray-500">
                                                        Missing user #{identity.userId}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-2 pr-4 text-gray-700">{identity.email}</td>
                                            <td className="py-2 pr-4 text-gray-700">{identity.displayName || '-'}</td>
                                            <td className="py-2 pr-4 text-gray-700">
                                                {identity.unstructuredName || identity.eduPersonPrincipalName || '-'}
                                            </td>
                                            <td className="py-2 pr-4 text-gray-700">{identity.loginCount}</td>
                                            <td className="whitespace-nowrap py-2 pr-4 text-gray-700">
                                                {formatDashboardDateTime(identity.lastLoggedInAt)}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
