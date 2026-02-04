import { NotFoundPage } from '../components/NotFoundPage/NotFoundPage';

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';

export default function NotFound() {
    return (
        <Suspense>
            <NotFoundPage />
        </Suspense>
    );
}
