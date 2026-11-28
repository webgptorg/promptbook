'use client';

import Link from 'next/link';
import { ShieldCheck, UserRound, UserPlus } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { Card } from '../Homepage/Card';
import { Section } from '../Homepage/Section';
import { useServerLanguage } from '../ServerLanguage/ServerLanguageProvider';
import { isAnonymousUsername } from '../../utils/anonymousUser';
import { formatServerLanguageHumanReadableDate } from '@/src/utils/localization/formatServerLanguageHumanReadableDate';
import { CreateUserDialog } from './CreateUserDialog';
import { PasswordGeneratorDialog } from './PasswordGeneratorDialog';
import { useUsersAdmin } from './useUsersAdmin';

/**
 * Props for users list.
 */
type UsersListProps = {
    /**
     * Whether the UI should allow creating new users.
     *
     * On the main `/` page this should be `false` so that users
     * can only be created from the `/admin/users` page.
     */
    allowCreate?: boolean;
};

/**
 * Handles users list.
 */
export function UsersList({ allowCreate = true }: UsersListProps) {
    const { users, loading, error, createUser, deleteUser, toggleAdmin } = useUsersAdmin();
    const { language, t } = useServerLanguage();

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isPasswordGeneratorOpen, setIsPasswordGeneratorOpen] = useState(false);
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newIsAdmin, setNewIsAdmin] = useState(false);

    const sortedUsers = useMemo(
        () =>
            [...users].sort((userA, userB) => {
                const isUserAAnonymous = isAnonymousUsername(userA.username);
                const isUserBAnonymous = isAnonymousUsername(userB.username);

                if (isUserAAnonymous !== isUserBAnonymous) {
                    return isUserAAnonymous ? 1 : -1;
                }

                if (isUserAAnonymous && isUserBAnonymous) {
                    return Date.parse(userB.createdAt) - Date.parse(userA.createdAt);
                }

                return userA.username.localeCompare(userB.username);
            }),
        [users],
    );

    const resetCreateUserForm = () => {
        setNewUsername('');
        setNewPassword('');
        setNewIsAdmin(false);
    };

    const handleOpenCreateDialog = () => {
        resetCreateUserForm();
        setIsCreateDialogOpen(true);
    };

    const handleCloseCreateDialog = () => {
        if (isCreatingUser) {
            return;
        }

        setIsCreateDialogOpen(false);
        setIsPasswordGeneratorOpen(false);
        resetCreateUserForm();
    };

    const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsCreatingUser(true);

        try {
            await createUser({
                username: newUsername.trim(),
                password: newPassword,
                isAdmin: newIsAdmin,
            });

            setIsCreateDialogOpen(false);
            setIsPasswordGeneratorOpen(false);
            resetCreateUserForm();
        } catch {
            // Error is already handled and exposed via `error` state from the hook
        } finally {
            setIsCreatingUser(false);
        }
    };

    const handleDeleteUser = async (username: string) => {
        await deleteUser(username);
    };

    const handleToggleAdmin = async (username: string, currentIsAdmin: boolean) => {
        await toggleAdmin(username, currentIsAdmin);
    };

    if (loading) return <div>{t('users.loadingUsers')}</div>;

    return (
        <div className="space-y-6">
            {error && <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>}

            <Section
                title={t('users.sectionTitle', { count: users.length })}
                gridClassName="block"
                sectionClassName="mt-4"
            >
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-gray-500">{t('users.tableDescription')}</p>
                    {allowCreate ? (
                        <button
                            type="button"
                            onClick={handleOpenCreateDialog}
                            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                            <UserPlus className="h-4 w-4" />
                            {t('users.addNewUser')}
                        </button>
                    ) : null}
                </div>

                <Card className="overflow-hidden p-0 hover:border-gray-200 hover:shadow-md">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500">
                                        {t('users.userColumn')}
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500">
                                        {t('users.roleColumn')}
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500">
                                        {t('users.createdLabel')}
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500">
                                        {t('users.activityColumn')}
                                    </th>
                                    <th className="px-4 py-3 text-right font-medium text-gray-500">
                                        {t('users.actionsColumn')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {sortedUsers.map((user) => {
                                    const isAnonymous = isAnonymousUsername(user.username);
                                    const userHref = `/admin/users/${encodeURIComponent(user.username)}`;
                                    const chatHistoryHref = `/admin/chat-history?userId=${encodeURIComponent(
                                        String(user.id),
                                    )}`;

                                    return (
                                        <tr key={user.id} className="align-top hover:bg-gray-50">
                                            <td className="px-4 py-4">
                                                <Link href={userHref} className="flex min-w-56 items-start gap-3">
                                                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                                                        {isAnonymous ? (
                                                            <UserRound className="h-4 w-4" />
                                                        ) : (
                                                            user.username.slice(0, 1).toUpperCase()
                                                        )}
                                                    </span>
                                                    <span className="min-w-0">
                                                        <span className="block truncate font-semibold text-gray-900 hover:text-blue-700">
                                                            {isAnonymous
                                                                ? t('users.anonymousUser')
                                                                : user.displayName || user.username}
                                                        </span>
                                                        <span className="mt-1 block truncate font-mono text-xs text-gray-500">
                                                            {user.username}
                                                        </span>
                                                        {user.email ? (
                                                            <span className="mt-1 block truncate text-xs text-gray-500">
                                                                {user.email}
                                                            </span>
                                                        ) : null}
                                                    </span>
                                                </Link>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-4">
                                                <div className="flex flex-wrap gap-2">
                                                    <span
                                                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                                                            user.isAdmin
                                                                ? 'bg-blue-100 text-blue-800'
                                                                : 'bg-gray-100 text-gray-700'
                                                        }`}
                                                    >
                                                        {user.isAdmin ? <ShieldCheck className="h-3.5 w-3.5" /> : null}
                                                        {user.isAdmin ? t('users.adminRole') : t('users.userRole')}
                                                    </span>
                                                    {isAnonymous ? (
                                                        <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                                                            {t('users.anonymousLabel')}
                                                        </span>
                                                    ) : null}
                                                    {user.authenticationProvider?.includes('SHIBBOLETH') ? (
                                                        <Link
                                                            href="/admin/login-methods/shibboleth"
                                                            className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-200"
                                                        >
                                                            Shibboleth
                                                        </Link>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-4 text-gray-600">
                                                {formatServerLanguageHumanReadableDate(user.createdAt, language)}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-4">
                                                <Link
                                                    href={chatHistoryHref}
                                                    className="font-medium text-blue-600 hover:text-blue-800"
                                                >
                                                    {t('users.viewChatHistory')}
                                                </Link>
                                                <Link
                                                    href={userHref}
                                                    className="mt-1 block text-xs text-gray-500 hover:text-blue-700"
                                                >
                                                    {t('users.viewProfile')}
                                                </Link>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-4 text-right text-xs font-medium">
                                                <div className="flex flex-col items-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            void handleToggleAdmin(user.username, user.isAdmin)
                                                        }
                                                        className="text-blue-600 hover:text-blue-800"
                                                    >
                                                        {user.isAdmin ? t('users.removeAdmin') : t('users.makeAdmin')}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleDeleteUser(user.username)}
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        {t('users.delete')}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {sortedUsers.length === 0 ? (
                        <div className="p-8 text-center text-sm text-gray-500">{t('users.noUsers')}</div>
                    ) : null}
                </Card>
            </Section>

            {allowCreate ? (
                <CreateUserDialog
                    isAdmin={newIsAdmin}
                    isDismissible={!isPasswordGeneratorOpen}
                    isOpen={isCreateDialogOpen}
                    isSubmitting={isCreatingUser}
                    onClose={handleCloseCreateDialog}
                    onOpenPasswordGenerator={() => setIsPasswordGeneratorOpen(true)}
                    onSubmit={handleCreateUser}
                    password={newPassword}
                    setIsAdmin={setNewIsAdmin}
                    setPassword={setNewPassword}
                    setUsername={setNewUsername}
                    username={newUsername}
                />
            ) : null}

            {isPasswordGeneratorOpen ? (
                <PasswordGeneratorDialog
                    onClose={() => setIsPasswordGeneratorOpen(false)}
                    onUsePassword={(password) => {
                        setNewPassword(password);
                        setIsPasswordGeneratorOpen(false);
                    }}
                />
            ) : null}
        </div>
    );
}
