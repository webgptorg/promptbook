import { useCallback, useEffect, useState } from 'react';
import { showConfirm } from '../AsyncDialogs/asyncDialogs';

export type AdminUser = {
    id: number;
    username: string;
    createdAt: string;
    updatedAt: string;
    isAdmin: boolean;
};

type CreateUserPayload = {
    username: string;
    password: string;
    isAdmin: boolean;
};

/**
 * Admin users management hook
 *
 * Centralizes fetching and mutating users so it can be reused
 * from multiple places (homepage, admin pages, header menu, etc.).
 */
export function useUsersAdmin() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/users');
            if (!response.ok) {
                if (response.status === 401) {
                    // Not authorized, maybe session expired or non-admin user
                    return;
                }
                throw new Error('Failed to fetch users');
            }

            const data = await response.json();
            setUsers(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const createUser = useCallback(
        async ({ username, password, isAdmin }: CreateUserPayload) => {
            setError(null);

            try {
                const response = await fetch('/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username,
                        password,
                        isAdmin,
                    }),
                });

                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data.error || 'Failed to create user');
                }

                await fetchUsers();
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
                throw err;
            }
        },
        [fetchUsers],
    );

    const deleteUser = useCallback(
        async (username: string) => {
            const confirmed = await showConfirm({
                title: 'Delete user',
                message: `Are you sure you want to delete user ${username}?`,
                confirmLabel: 'Delete user',
                cancelLabel: 'Cancel',
            }).catch(() => false);

            if (!confirmed) {
                return;
            }

            try {
                const response = await fetch(`/api/users/${username}`, {
                    method: 'DELETE',
                });

                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data.error || 'Failed to delete user');
                }

                await fetchUsers();
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
                throw err;
            }
        },
        [fetchUsers],
    );

    const toggleAdmin = useCallback(
        async (username: string, currentIsAdmin: boolean) => {
            try {
                const response = await fetch(`/api/users/${username}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isAdmin: !currentIsAdmin }),
                });

                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data.error || 'Failed to update user');
                }

                await fetchUsers();
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
                throw err;
            }
        },
        [fetchUsers],
    );

    return {
        users,
        loading,
        error,
        fetchUsers,
        createUser,
        deleteUser,
        toggleAdmin,
    };
}
