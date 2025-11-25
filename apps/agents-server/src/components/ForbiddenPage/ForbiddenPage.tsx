'use client';

import { useRouter } from 'next/navigation';
import { ErrorPage } from '../ErrorPage/ErrorPage';
import { LoginForm } from '../LoginForm/LoginForm';

export function ForbiddenPage() {
    const router = useRouter();

    return (
        <ErrorPage title="403 Forbidden" message="You do not have permission to access this page.">
            <LoginForm onSuccess={() => router.refresh()} />
        </ErrorPage>
    );
}
