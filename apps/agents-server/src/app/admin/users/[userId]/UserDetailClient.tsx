'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { Card } from '../../../../components/Homepage/Card';
import { Section } from '../../../../components/Homepage/Section';
import { useServerLanguage } from '../../../../components/ServerLanguage/ServerLanguageProvider';
import { useUsersAdmin } from '../../../../components/UsersList/useUsersAdmin';

type UserDetailClientProps = {
    /**
     * User identifier from the URL.
     *
     * In practice this is the username (see Header links), but we also
     * gracefully handle the case where a numeric ID is used.
     */
    userId: string;
};

export function UserDetailClient({ userId }: UserDetailClientProps) {
    const router = useRouter();
    const { t } = useServerLanguage();
    const { users, loading, error, deleteUser, toggleAdmin } = useUsersAdmin();

    const user = useMemo(
        () => users.find((u) => u.username === userId || String(u.id) === userId) ?? null,
        [users, userId],
    );

    const handleDelete = async () => {
        if (!user) return;

        await deleteUser(user.username);
        router.push('/admin/users');
    };

    const handleToggleAdmin = async () => {
        if (!user) return;

        await toggleAdmin(user.username, user.isAdmin);
    };

    if (loading && !user) {
        return <div className="container mx-auto px-4 py-8">{t('users.userDetailLoading')}</div>;
    }

    if (error && !user) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="container mx-auto px-4 py-8">
                <p className="text-gray-600">{t('users.userNotFound')}</p>
                <Link href="/admin/users" className="mt-4 inline-block text-blue-600 hover:text-blue-800 text-sm">
                    &larr; {t('users.backToUsers')}
                </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 space-y-6">
            <Link href="/admin/users" className="text-sm text-blue-600 hover:text-blue-800">
                &larr; {t('users.backToUsers')}
            </Link>

            <Section title={t('users.profileTitle', { username: user.username })}>
                <Card>
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-semibold text-gray-900">{user.username}</h2>
                            {user.isAdmin && (
                                <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mt-1">
                                    {t('users.adminRole')}
                                </span>
                            )}
                            <p className="text-gray-500 text-sm mt-2">
                                {t('users.idLabel')}: {user.id}
                            </p>
                            <p className="text-gray-500 text-sm mt-1">
                                {t('users.createdAtLabel')}:{' '}
                                {user.createdAt
                                    ? new Date(user.createdAt).toLocaleString()
                                    : t('users.unknownValue')}
                            </p>
                            <p className="text-gray-500 text-sm mt-1">
                                {t('users.lastUpdatedLabel')}:{' '}
                                {user.updatedAt
                                    ? new Date(user.updatedAt).toLocaleString()
                                    : t('users.unknownValue')}
                            </p>
                        </div>
                        <div className="space-x-2">
                            <button
                                onClick={handleToggleAdmin}
                                className="text-sm text-blue-600 hover:text-blue-800"
                            >
                                {user.isAdmin ? t('users.removeAdmin') : t('users.makeAdmin')}
                            </button>
                            <button
                                onClick={handleDelete}
                                className="text-sm text-red-600 hover:text-red-800"
                            >
                                {t('users.deleteUserAction')}
                            </button>
                        </div>
                    </div>
                </Card>

                <Card>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('users.createdAgentsTitle')}</h3>
                    <p className="text-gray-600 text-sm">
                        {t('users.createdAgentsDescription')}
                        {/* TODO: [🧠] Once agents are linked to users, show their agents here. */}
                    </p>
                </Card>

                <Card>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('users.activityTitle')}</h3>
                    <p className="text-gray-600 text-sm">
                        {t('users.activityDescription')}
                        {/* TODO: [🧠] Implement user activity timeline once events are stored. */}
                    </p>
                </Card>
            </Section>
        </div>
    );
}
