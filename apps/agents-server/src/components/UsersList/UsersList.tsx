'use client';

import { FormEvent, useState } from 'react';
import { Card } from '../Homepage/Card';
import { Section } from '../Homepage/Section';
import { useUsersAdmin } from './useUsersAdmin';

type UsersListProps = {
    /**
     * Whether the UI should allow creating new users.
     *
     * On the main `/` page this should be `false` so that users
     * can only be created from the `/admin/users` page.
     */
    allowCreate?: boolean;
};

export function UsersList({ allowCreate = true }: UsersListProps) {
    const { users, loading, error, createUser, deleteUser, toggleAdmin } = useUsersAdmin();

    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newIsAdmin, setNewIsAdmin] = useState(false);

    const handleCreateUser = async (e: FormEvent) => {
        e.preventDefault();

        try {
            await createUser({
                username: newUsername,
                password: newPassword,
                isAdmin: newIsAdmin,
            });

            setNewUsername('');
            setNewPassword('');
            setNewIsAdmin(false);
        } catch {
            // Error is already handled and exposed via `error` state from the hook
        }
    };

    const handleDeleteUser = async (username: string) => {
        await deleteUser(username);
    };

    const handleToggleAdmin = async (username: string, currentIsAdmin: boolean) => {
        await toggleAdmin(username, currentIsAdmin);
    };

    if (loading) return <div>Loading users...</div>;

    return (
        <div className="space-y-6">
            {error && <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>}

            <Section title={`Users (${users.length})`}>
                {users.map((user) => (
                    <Card key={user.id}>
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900">{user.username}</h3>
                                {user.isAdmin && (
                                    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mt-1">
                                        Admin
                                    </span>
                                )}
                                <p className="text-gray-500 text-sm mt-2">
                                    Created: {new Date(user.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="space-x-2">
                                <button
                                    onClick={() => handleToggleAdmin(user.username, user.isAdmin)}
                                    className="text-sm text-blue-600 hover:text-blue-800"
                                >
                                    {user.isAdmin ? 'Remove Admin' : 'Make Admin'}
                                </button>
                                <button
                                    onClick={() => handleDeleteUser(user.username)}
                                    className="text-sm text-red-600 hover:text-red-800"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </Card>
                ))}

                {allowCreate && (
                    <div
                        id="create-user"
                        className="block p-6 bg-gray-50 rounded-lg border border-dashed border-gray-300"
                    >
                        <h3 className="text-lg font-semibold text-gray-700 mb-4">Add New User</h3>
                        <form onSubmit={handleCreateUser} className="space-y-3">
                            <div>
                                <input
                                    type="text"
                                    placeholder="Username"
                                    value={newUsername}
                                    onChange={(e) => setNewUsername(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded"
                                    required
                                />
                            </div>
                            <div>
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded"
                                    required
                                />
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="newIsAdmin"
                                    checked={newIsAdmin}
                                    onChange={(e) => setNewIsAdmin(e.target.checked)}
                                    className="mr-2"
                                />
                                <label htmlFor="newIsAdmin" className="text-gray-700">
                                    Is Admin
                                </label>
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors"
                            >
                                Create User
                            </button>
                        </form>
                    </div>
                )}
            </Section>
        </div>
    );
}
