'use client';

import { useState } from 'react';
import { SecretInput } from '@/src/components/SecretInput/SecretInput';

type AuthControlsProps = {
    initialUser: { username: string; isAdmin: boolean } | null;
};

export function AuthControls({ initialUser }: AuthControlsProps) {
    // const router = useRouter();
    const [user] = useState(initialUser);
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Login failed');
            }

            // Reload page to reflect state
            window.location.reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        }
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.reload();
        } catch (err) {
            console.error('Logout failed', err);
        }
    };

    if (user) {
        return (
            <div className="flex items-center space-x-4">
                <span className="text-gray-600">
                    Logged in as <strong>{user.username}</strong>
                    {user.isAdmin && (
                        <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Admin</span>
                    )}
                </span>
                <button
                    onClick={handleLogout}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition-colors"
                >
                    Logout
                </button>
            </div>
        );
    }

    return (
        <div>
            {!isLoginOpen ? (
                <button
                    onClick={() => setIsLoginOpen(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                >
                    Login
                </button>
            ) : (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-4">Login</h2>
                        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-gray-700 mb-1">Username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded"
                                    required
                                />
                            </div>
                            <div>
                                <SecretInput
                                    label="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    inputClassName="h-auto py-2"
                                />
                            </div>
                            <div className="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    onClick={() => setIsLoginOpen(false)}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    Login
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
