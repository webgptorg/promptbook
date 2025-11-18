'use client';

import dynamic from 'next/dynamic';

const SelfLearningBook = dynamic(() => import('./SelfLearningBook').then((module) => module.SelfLearningBook), {
    ssr: false,
});

export default function SelfLearningBookPage() {
    return <SelfLearningBook />;
}

/**
 * TODO: !!! Private / public / open agents
 * TODO: !!! Allow http://localhost:4440/agents/agent-123.book to download the agent book file
 * TODO: !!! BOOK_MIME_TYPE in config
 */
