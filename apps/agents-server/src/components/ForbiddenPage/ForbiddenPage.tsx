'use client';

import { useRouter } from 'next/navigation';
import { LoginForm } from '../LoginForm/LoginForm';

export function ForbiddenPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
                <h1 className="text-3xl font-bold text-red-600 mb-4 text-center">403 Forbidden</h1>
                <p className="text-gray-700 mb-6 text-center">
                    You do not have permission to access this page.
                </p>

                <LoginForm onSuccess={() => router.refresh()} />
            </div>
        </div>
    );
}
