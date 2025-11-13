'use client';

import { Suspense } from 'react';
// import { RemoteLlmExecutionTools } from '@promptbook-local/remote-client';
import { SelfLearningBook } from './SelfLearningBook';

export default function SelfLearningBookPage() {
    return (
        <Suspense>
            <SelfLearningBook />
        </Suspense>
    );
}
