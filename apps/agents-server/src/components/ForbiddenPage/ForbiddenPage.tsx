'use client';

import { loginAction } from '../../app/actions';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ForbiddenPage() {
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
                <h1 className="text-3xl font-bold text-red-600 mb-4 text-center">403 Forbidden</h1>
                <p className="text-gray-700 mb-6 text-center">
                    You do not have permission to access this page.
                </p>

                <form
                    action={async (formData) => {
                        setError(null);
                        const result = await loginAction(formData);
                        if (result.success) {
                            router.refresh();
                        } else {
                            setError(result.message || 'Login failed');
                        }
                    }}
                    className="space-y-4"
                >
                    <div>
                        <label
                            htmlFor="password"
                            className="block text-sm font-medium text-gray-700 mb-1"
                        >
                            Admin Password
                        </label>
                        <input
                            type="password"
                            name="password"
                            id="password"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm text-center">{error}</div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                    >
                        Login as Admin
                    </button>
                </form>
            </div>
        </div>
    );
}
