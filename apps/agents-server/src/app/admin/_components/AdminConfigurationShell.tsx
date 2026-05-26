import type { ReactNode } from 'react';
import Link from 'next/link';

/**
 * Supported admin configuration pages shown in the shared sub-navigation.
 *
 * @private admin configuration UI helper
 */
type AdminConfigurationPage = 'environment' | 'metadata' | 'limits';

/**
 * One shared navigation item rendered in the configuration shell.
 *
 * @private admin configuration UI helper
 */
const ADMIN_CONFIGURATION_NAVIGATION_ITEMS: ReadonlyArray<{
    readonly id: AdminConfigurationPage;
    readonly href: '/admin/environment' | '/admin/metadata' | '/admin/limits';
    readonly label: string;
    readonly description: string;
}> = [
    {
        id: 'environment',
        href: '/admin/environment',
        label: 'Environment variables',
        description: 'VPS-wide .env values with secrets masked in the browser.',
    },
    {
        id: 'metadata',
        href: '/admin/metadata',
        label: 'Metadata',
        description: 'Domain-specific feature flags, text settings, and compatibility keys.',
    },
    {
        id: 'limits',
        href: '/admin/limits',
        label: 'Limits',
        description: 'Operational quotas, retry windows, upload caps, and rate limits.',
    },
];

/**
 * Props accepted by the shared admin configuration shell.
 *
 * @private admin configuration UI helper
 */
type AdminConfigurationShellProps = {
    readonly activePage: AdminConfigurationPage;
    readonly children: ReactNode;
};

/**
 * Shared page shell used by the Environment variables, Metadata, and Limits admin pages.
 */
export function AdminConfigurationShell({ activePage, children }: AdminConfigurationShellProps) {
    return (
        <div className="w-full max-w-screen-xl mx-auto px-2 py-8 sm:px-4 md:px-8">
            <div className="mt-20 mb-8 space-y-3">
                <div>
                    <h1 className="text-3xl font-light text-gray-900">Server configuration</h1>
                    <p className="mt-1 max-w-3xl text-sm text-gray-500">
                        Manage VPS-wide environment variables, domain-specific metadata, and dedicated operational
                        limits from one configuration area.
                    </p>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                    {ADMIN_CONFIGURATION_NAVIGATION_ITEMS.map((item) => {
                        const isActive = item.id === activePage;

                        return (
                            <Link
                                key={item.id}
                                href={item.href}
                                className={`rounded-2xl border px-4 py-4 transition ${
                                    isActive
                                        ? 'border-blue-300 bg-blue-50 text-blue-900 shadow-sm'
                                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:shadow-sm'
                                }`}
                            >
                                <div className="text-sm font-semibold">{item.label}</div>
                                <div className={`mt-1 text-sm ${isActive ? 'text-blue-800' : 'text-slate-500'}`}>
                                    {item.description}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {children}
        </div>
    );
}
