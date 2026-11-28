'use client';

import type { ServerLanguageCode } from '@/src/languages/ServerLanguageRegistry';
import { formatServerLanguageHumanReadableDate } from '@/src/utils/localization/formatServerLanguageHumanReadableDate';
import type { PublicUser } from '@/src/utils/publicUser';
import type {
    ShibbolethAuthenticationAttemptRow,
    ShibbolethUserIdentityRow,
} from '@/src/utils/shibbolethAuthentication';
import Link from 'next/link';
import { useCallback, useMemo } from 'react';
import { AdminSortableTableHeaderCell } from '../../_components/AdminSortableTableHeaderCell';
import { useAdminTableSorting, type AdminTableSortOrder } from '../../_components/adminTableSorting';

/**
 * Sortable fields in the Shibboleth authentication attempts table.
 *
 * @private internal type of <ShibbolethSortableTables/>
 */
type ShibbolethAuthenticationAttemptSortField =
    | 'createdAt'
    | 'status'
    | 'stage'
    | 'email'
    | 'displayName'
    | 'errorMessage';

/**
 * Sortable fields in the Shibboleth linked users table.
 *
 * @private internal type of <ShibbolethSortableTables/>
 */
type ShibbolethUserSortField =
    | 'username'
    | 'email'
    | 'displayName'
    | 'institutionalId'
    | 'loginCount'
    | 'lastLoggedInAt';

/**
 * Props for Shibboleth dashboard sortable tables.
 *
 * @private internal type of <ShibbolethLoginMethodPage/>
 */
type ShibbolethSortableTablesProps = {
    readonly attempts: ReadonlyArray<ShibbolethAuthenticationAttemptRow>;
    readonly identities: ReadonlyArray<ShibbolethUserIdentityRow>;
    readonly language: ServerLanguageCode;
    readonly users: ReadonlyArray<PublicUser>;
};

/**
 * Renders sortable Shibboleth dashboard tables.
 *
 * @private internal component of <ShibbolethLoginMethodPage/>
 */
export function ShibbolethSortableTables({
    attempts,
    identities,
    language,
    users,
}: ShibbolethSortableTablesProps) {
    const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
    const attemptSorting = useAdminTableSorting<
        ShibbolethAuthenticationAttemptRow,
        ShibbolethAuthenticationAttemptSortField
    >({
        rows: attempts,
        defaultSortBy: 'createdAt',
        defaultSortOrder: 'desc',
        resolveDefaultSortOrder: resolveShibbolethAuthenticationAttemptDefaultSortOrder,
        resolveSortValue: resolveShibbolethAuthenticationAttemptSortValue,
    });
    const resolveUserSortValue = useCallback(
        (identity: ShibbolethUserIdentityRow, sortBy: ShibbolethUserSortField) =>
            resolveShibbolethUserSortValue(identity, sortBy, usersById),
        [usersById],
    );
    const userSorting = useAdminTableSorting<ShibbolethUserIdentityRow, ShibbolethUserSortField>({
        rows: identities,
        defaultSortBy: 'lastLoggedInAt',
        defaultSortOrder: 'desc',
        resolveDefaultSortOrder: resolveShibbolethUserDefaultSortOrder,
        resolveSortValue: resolveUserSortValue,
    });

    return (
        <>
            <section className="rounded-md border border-gray-200 bg-white p-5">
                <h2 className="text-lg font-semibold text-gray-950">Authentication Attempts</h2>
                <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead>
                            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                <AdminSortableTableHeaderCell
                                    className="py-2 pr-4"
                                    label="time"
                                    sortBy="createdAt"
                                    activeSortBy={attemptSorting.sortBy}
                                    sortOrder={attemptSorting.sortOrder}
                                    onSortChange={attemptSorting.handleSortChange}
                                >
                                    Time
                                </AdminSortableTableHeaderCell>
                                <AdminSortableTableHeaderCell
                                    className="py-2 pr-4"
                                    label="status"
                                    sortBy="status"
                                    activeSortBy={attemptSorting.sortBy}
                                    sortOrder={attemptSorting.sortOrder}
                                    onSortChange={attemptSorting.handleSortChange}
                                >
                                    Status
                                </AdminSortableTableHeaderCell>
                                <AdminSortableTableHeaderCell
                                    className="py-2 pr-4"
                                    label="stage"
                                    sortBy="stage"
                                    activeSortBy={attemptSorting.sortBy}
                                    sortOrder={attemptSorting.sortOrder}
                                    onSortChange={attemptSorting.handleSortChange}
                                >
                                    Stage
                                </AdminSortableTableHeaderCell>
                                <AdminSortableTableHeaderCell
                                    className="py-2 pr-4"
                                    label="email"
                                    sortBy="email"
                                    activeSortBy={attemptSorting.sortBy}
                                    sortOrder={attemptSorting.sortOrder}
                                    onSortChange={attemptSorting.handleSortChange}
                                >
                                    Email
                                </AdminSortableTableHeaderCell>
                                <AdminSortableTableHeaderCell
                                    className="py-2 pr-4"
                                    label="name"
                                    sortBy="displayName"
                                    activeSortBy={attemptSorting.sortBy}
                                    sortOrder={attemptSorting.sortOrder}
                                    onSortChange={attemptSorting.handleSortChange}
                                >
                                    Name
                                </AdminSortableTableHeaderCell>
                                <AdminSortableTableHeaderCell
                                    className="py-2 pr-4"
                                    label="error"
                                    sortBy="errorMessage"
                                    activeSortBy={attemptSorting.sortBy}
                                    sortOrder={attemptSorting.sortOrder}
                                    onSortChange={attemptSorting.handleSortChange}
                                >
                                    Error
                                </AdminSortableTableHeaderCell>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {attemptSorting.sortedRows.length === 0 ? (
                                <tr>
                                    <td className="py-3 text-gray-500" colSpan={6}>
                                        No Shibboleth authentication attempts recorded yet.
                                    </td>
                                </tr>
                            ) : (
                                attemptSorting.sortedRows.map((attempt) => (
                                    <tr key={attempt.id}>
                                        <td className="whitespace-nowrap py-2 pr-4 text-gray-700">
                                            {formatDashboardDateTime(attempt.createdAt, language)}
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
                                <AdminSortableTableHeaderCell
                                    className="py-2 pr-4"
                                    label="user"
                                    sortBy="username"
                                    activeSortBy={userSorting.sortBy}
                                    sortOrder={userSorting.sortOrder}
                                    onSortChange={userSorting.handleSortChange}
                                >
                                    User
                                </AdminSortableTableHeaderCell>
                                <AdminSortableTableHeaderCell
                                    className="py-2 pr-4"
                                    label="email"
                                    sortBy="email"
                                    activeSortBy={userSorting.sortBy}
                                    sortOrder={userSorting.sortOrder}
                                    onSortChange={userSorting.handleSortChange}
                                >
                                    Email
                                </AdminSortableTableHeaderCell>
                                <AdminSortableTableHeaderCell
                                    className="py-2 pr-4"
                                    label="display name"
                                    sortBy="displayName"
                                    activeSortBy={userSorting.sortBy}
                                    sortOrder={userSorting.sortOrder}
                                    onSortChange={userSorting.handleSortChange}
                                >
                                    Display Name
                                </AdminSortableTableHeaderCell>
                                <AdminSortableTableHeaderCell
                                    className="py-2 pr-4"
                                    label="institutional ID"
                                    sortBy="institutionalId"
                                    activeSortBy={userSorting.sortBy}
                                    sortOrder={userSorting.sortOrder}
                                    onSortChange={userSorting.handleSortChange}
                                >
                                    Institutional ID
                                </AdminSortableTableHeaderCell>
                                <AdminSortableTableHeaderCell
                                    className="py-2 pr-4"
                                    label="logins"
                                    sortBy="loginCount"
                                    activeSortBy={userSorting.sortBy}
                                    sortOrder={userSorting.sortOrder}
                                    onSortChange={userSorting.handleSortChange}
                                >
                                    Logins
                                </AdminSortableTableHeaderCell>
                                <AdminSortableTableHeaderCell
                                    className="py-2 pr-4"
                                    label="last login"
                                    sortBy="lastLoggedInAt"
                                    activeSortBy={userSorting.sortBy}
                                    sortOrder={userSorting.sortOrder}
                                    onSortChange={userSorting.handleSortChange}
                                >
                                    Last Login
                                </AdminSortableTableHeaderCell>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {userSorting.sortedRows.length === 0 ? (
                                <tr>
                                    <td className="py-3 text-gray-500" colSpan={6}>
                                        No Shibboleth users have logged in yet.
                                    </td>
                                </tr>
                            ) : (
                                userSorting.sortedRows.map((identity) => {
                                    const user = usersById.get(identity.userId);
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
                                                {formatDashboardDateTime(identity.lastLoggedInAt, language)}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </>
    );
}

/**
 * Resolves the default sort order for authentication attempt columns.
 *
 * @private internal helper of <ShibbolethSortableTables/>
 */
function resolveShibbolethAuthenticationAttemptDefaultSortOrder(
    sortBy: ShibbolethAuthenticationAttemptSortField,
): AdminTableSortOrder {
    return sortBy === 'createdAt' ? 'desc' : 'asc';
}

/**
 * Resolves the comparable value for one authentication attempt row.
 *
 * @private internal helper of <ShibbolethSortableTables/>
 */
function resolveShibbolethAuthenticationAttemptSortValue(
    attempt: ShibbolethAuthenticationAttemptRow,
    sortBy: ShibbolethAuthenticationAttemptSortField,
) {
    return attempt[sortBy];
}

/**
 * Resolves the default sort order for Shibboleth user columns.
 *
 * @private internal helper of <ShibbolethSortableTables/>
 */
function resolveShibbolethUserDefaultSortOrder(sortBy: ShibbolethUserSortField): AdminTableSortOrder {
    return sortBy === 'loginCount' || sortBy === 'lastLoggedInAt' ? 'desc' : 'asc';
}

/**
 * Resolves the comparable value for one Shibboleth user row.
 *
 * @private internal helper of <ShibbolethSortableTables/>
 */
function resolveShibbolethUserSortValue(
    identity: ShibbolethUserIdentityRow,
    sortBy: ShibbolethUserSortField,
    usersById: ReadonlyMap<number, PublicUser>,
) {
    if (sortBy === 'username') {
        return usersById.get(identity.userId)?.username || '';
    }

    if (sortBy === 'institutionalId') {
        return identity.unstructuredName || identity.eduPersonPrincipalName || '';
    }

    return identity[sortBy];
}

/**
 * Formats an optional Shibboleth date-time value for the dashboard.
 *
 * @private internal helper of <ShibbolethSortableTables/>
 */
function formatDashboardDateTime(value: string | null | undefined, language: ServerLanguageCode): string {
    return formatServerLanguageHumanReadableDate(value, language, { fallbackLabel: 'Never' });
}
