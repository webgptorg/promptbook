'use client';

import { useState, useEffect } from 'react';

type User = {
    id: number;
    username: string;
    createdAt: string;
    updatedAt: string;
    isAdmin: boolean;
};

export function UsersList() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newIsAdmin, setNewIsAdmin] = useState(false);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/users');
            if (!response.ok) {
                if (response.status === 401) {
                     // Not authorized, maybe session expired
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
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: newUsername,
                    password: newPassword,
                    isAdmin: newIsAdmin,
                }),
            });

            if (!response.ok) {
                 const data = await response.json();
                 throw new Error(data.error || 'Failed to create user');
            }

            setNewUsername('');
            setNewPassword('');
            setNewIsAdmin(false);
            fetchUsers();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        }
    };

    const handleDeleteUser = async (username: string) => {
        if (!confirm(`Are you sure you want to delete user ${username}?`)) return;

        try {
            const response = await fetch(`/api/users/${username}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete user');
            }
            fetchUsers();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        }
    };

    const handleToggleAdmin = async (username: string, currentIsAdmin: boolean) => {
         try {
            const response = await fetch(`/api/users/${username}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isAdmin: !currentIsAdmin }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update user');
            }
            fetchUsers();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        }
    };

    if (loading) return <div>Loading users...</div>;

    return (
        <div className="space-y-6">
            <h2 className="text-3xl text-gray-900 mt-16 mb-4">Users ({users.length})</h2>
            
            {error && <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {users.map((user) => (
                    <div key={user.id} className="block p-6 bg-white rounded-lg shadow-md border border-gray-200">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900">{user.username}</h3>
                                {user.isAdmin && <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mt-1">Admin</span>}
                                <p className="text-gray-500 text-sm mt-2">Created: {new Date(user.createdAt).toLocaleDateString()}</p>
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
                    </div>
                ))}
                
                {/* Create User Form */}
                <div className="block p-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
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
                            <label htmlFor="newIsAdmin" className="text-gray-700">Is Admin</label>
                        </div>
                        <button 
                            type="submit"
                            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors"
                        >
                            Create User
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
