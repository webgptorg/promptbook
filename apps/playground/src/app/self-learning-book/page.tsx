'use client';

import dynamic from 'next/dynamic';

const SelfLearningBook = dynamic(() => import('./SelfLearningBook').then((module) => module.SelfLearningBook), {
    ssr: false,
});

export default function SelfLearningBookPage() {
    return <SelfLearningBook />;
}
