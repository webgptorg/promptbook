import os from 'node:os';
import type { ReactNode } from 'react';

import { MarkdownContent } from '@promptbook-local/components';
import {
    BOOK_LANGUAGE_VERSION,
    PROMPTBOOK_ENGINE_VERSION,
    aboutPromptbookInformation,
} from '@promptbook-local/core';

import { Card } from '../../../components/Homepage/Card';
import { Section } from '../../../components/Homepage/Section';
import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import {
    NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_VERCEL_ENV,
    NEXT_PUBLIC_VERCEL_TARGET_ENV,
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF,
} from '../../../../config';

const promptbookAboutText = aboutPromptbookInformation({
    isServersInfoIncluded: false,
    isRuntimeEnvironmentInfoIncluded: false,
});

/**
 * Describes a label/value pair rendered on the info cards.
 */
type InfoListItem = {
    /**
     * Human-friendly label describing the metadata.
     */
    label: string;
    /**
     * Value rendered next to the label.
     */
    value: ReactNode;
};

/**
 * Formats optional strings so the UI never shows `undefined`.
 *
 * @param value - String or URL that may be missing in the environment.
 * @returns The rendered string or a fallback placeholder.
 */
const formatOptionalValue = (value?: string | URL | null): string => {
    if (!value) {
        return 'Not configured';
    }

    if (value instanceof URL) {
        return value.href;
    }

    return value;
};

/**
 * Converts bytes into a human-readable gigabyte string.
 *
 * @param bytes - Memory measured in bytes.
 * @returns Rendered gigabyte string.
 */
const formatMemory = (bytes: number): string => `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;

/**
 * Renders a two-column list of informational rows.
 */
function InfoList({ items }: { items: InfoListItem[] }) {
    return (
        <dl className="space-y-4 text-sm text-gray-600">
            {items.map((item) => (
                <div key={item.label} className="flex justify-between gap-4">
                    <dt className="font-medium text-gray-500">{item.label}</dt>
                    <dd className="text-right text-gray-900">{item.value}</dd>
                </div>
            ))}
        </dl>
    );
}

/**
 * Admin-only page that summarizes Promptbook, system, and app version details.
 */
export default async function AdminAboutPage() {
    if (!(await isUserAdmin())) {
        return <ForbiddenPage />;
    }

    const nextPackageJson = await import('next/package.json');
    const nextVersion = nextPackageJson?.version || 'unknown';

    const systemInfo: InfoListItem[] = [
        { label: 'Node.js version', value: process.version },
        { label: 'Operating system', value: `${os.type()} ${os.release()} (${os.arch()})` },
        { label: 'CPU cores', value: os.cpus().length },
        { label: 'Total memory', value: formatMemory(os.totalmem()) },
        { label: 'Site URL', value: formatOptionalValue(NEXT_PUBLIC_SITE_URL) },
        { label: 'Deployment environment', value: formatOptionalValue(NEXT_PUBLIC_VERCEL_ENV) },
        { label: 'Target environment', value: formatOptionalValue(NEXT_PUBLIC_VERCEL_TARGET_ENV) },
    ];

    const versionInfo: InfoListItem[] = [
        { label: 'Promptbook engine', value: PROMPTBOOK_ENGINE_VERSION },
        { label: 'Book language', value: BOOK_LANGUAGE_VERSION },
        { label: 'Next.js', value: nextVersion },
        { label: 'App release (Git SHA)', value: formatOptionalValue(NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA) },
        { label: 'Repository branch', value: formatOptionalValue(NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF) },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="container mx-auto px-4 py-16">
                <Card className="mb-10 space-y-4">
                    <div>
                        <h1 className="text-3xl font-semibold text-gray-900">About Promptbook</h1>
                        <p className="text-gray-600 mt-2">
                            This admin page keeps Promptbook, system, and deployment metadata in one place.
                            Use it to confirm the current engine release, check the environment, or debug
                            routing issues.
                        </p>
                    </div>
                </Card>

                <Section title="About this installation">
                    <Card className="md:col-span-2 lg:col-span-3">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Promptbook</h2>
                        <article className="prose prose-slate max-w-none">
                            <MarkdownContent content={promptbookAboutText} />
                        </article>
                    </Card>

                    <Card>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">System</h2>
                        <InfoList items={systemInfo} />
                    </Card>

                    <Card>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Version</h2>
                        <InfoList items={versionInfo} />
                    </Card>
                </Section>
            </div>
        </div>
    );
}
