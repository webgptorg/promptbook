'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { Card } from '../../../../components/Homepage/Card';
import { Section } from '../../../../components/Homepage/Section';
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
        return <div className="container mx-auto px-4 py-8">Loading user...</div>;
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
                <p className="text-gray-600">User not found.</p>
                <Link href="/admin/users" className="mt-4 inline-block text-blue-600 hover:text-blue-800 text-sm">
                    &larr; Back to users
                </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 space-y-6">
            <Link href="/admin/users" className="text-sm text-blue-600 hover:text-blue-800">
                &larr; Back to users
            </Link>

            <Section title={`User profile: ${user.username}`}>
                <Card>
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-semibold text-gray-900">{user.username}</h2>
                            {user.isAdmin && (
                                <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mt-1">
                                    Admin
                                </span>
                            )}
                            <p className="text-gray-500 text-sm mt-2">ID: {user.id}</p>
                            <p className="text-gray-500 text-sm mt-1">
                                Created:{' '}
                                {user.createdAt
                                    ? new Date(user.createdAt).toLocaleString()
                                    : 'Unknown'}
                            </p>
                            <p className="text-gray-500 text-sm mt-1">
                                Last updated:{' '}
                                {user.updatedAt
                                    ? new Date(user.updatedAt).toLocaleString()
                                    : 'Unknown'}
                            </p>
                        </div>
                        <div className="space-x-2">
                            <button
                                onClick={handleToggleAdmin}
                                className="text-sm text-blue-600 hover:text-blue-800"
                            >
                                {user.isAdmin ? 'Remove admin' : 'Make admin'}
                            </button>
                            <button
                                onClick={handleDelete}
                                className="text-sm text-red-600 hover:text-red-800"
                            >
                                Delete user
                            </button>
                        </div>
                    </div>
                </Card>

                <Card>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Created agents</h3>
                    <p className="text-gray-600 text-sm">
                        Listing agents created by users is not wired to the data model yet.
                        {/* TODO: [🧠] Once agents are linked to users, show their agents here. */}
                    </p>
                </Card>

                <Card>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Activity</h3>
                    <p className="text-gray-600 text-sm">
                        Detailed activity tracking is not implemented yet. For now, you can use the
                        created/updated timestamps above as a basic signal of recent changes.
                        {/* TODO: [🧠] Implement user activity timeline once events are stored. */}
                    </p>
                </Card>
            </Section>
        </div>
    );
}
