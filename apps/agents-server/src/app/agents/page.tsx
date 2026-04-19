'use server';

import HomePage from '../page';

/**
 * Handles agents page.
 */
export default async function AgentsPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    return <HomePage searchParams={props.searchParams} />;
}

// TODO: [🐱‍🚀] Distinguish between `/` and `/agents` pages
