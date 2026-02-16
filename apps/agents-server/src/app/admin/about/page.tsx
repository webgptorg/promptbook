import os from 'node:os';
import { cookies, headers } from 'next/headers';
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
import { getSession } from '../../../utils/session';
import {
    NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_VERCEL_ENV,
    NEXT_PUBLIC_VERCEL_TARGET_ENV,
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF,
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_MESSAGE,
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_NAME,
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_LOGIN,
    NEXT_PUBLIC_VERCEL_GIT_PROVIDER,
    NEXT_PUBLIC_VERCEL_GIT_REPO_OWNER,
    NEXT_PUBLIC_VERCEL_GIT_REPO_SLUG,
    NEXT_PUBLIC_VERCEL_GIT_REPO_ID,
    NEXT_PUBLIC_VERCEL_GIT_PREVIOUS_SHA,
    NEXT_PUBLIC_VERCEL_GIT_PULL_REQUEST_ID,
    NEXT_PUBLIC_VERCEL_URL,
    NEXT_PUBLIC_VERCEL_BRANCH_URL,
    NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
    SERVERS,
    SUPABASE_TABLE_PREFIX,
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
 * Formats a duration (seconds) into a human-readable string.
 *
 * @param seconds - Duration measured in seconds.
 * @returns String such as "1d 2h 30m 15s".
 */
function formatDuration(seconds: number): string {
    const roundedSeconds = Math.floor(seconds);
    const days = Math.floor(roundedSeconds / 86400);
    const hours = Math.floor((roundedSeconds % 86400) / 3600);
    const minutes = Math.floor((roundedSeconds % 3600) / 60);
    const remainingSeconds = roundedSeconds % 60;
    const parts: string[] = [];

    if (days) {
        parts.push(`${days}d`);
    }
    if (hours) {
        parts.push(`${hours}h`);
    }
    if (minutes) {
        parts.push(`${minutes}m`);
    }
    if (remainingSeconds || parts.length === 0) {
        parts.push(`${remainingSeconds}s`);
    }

    return parts.join(' ');
}

/**
 * Joins a list of strings or falls back to an empty placeholder.
 *
 * @param values - Array of strings that may be missing.
 * @returns A comma separated list or the fallback text.
 */
function formatList(values?: string[] | null): string {
    if (!values || values.length === 0) {
        return 'Not configured';
    }

    return values.join(', ');
}

/**
 * Renders a value in monospace to preserve long or structured data.
 *
 * @param value - Raw string to display.
 * @returns ReactNode styled with monospace font.
 */
function renderMonoValue(value: string): ReactNode {
    return (
        <span className="font-mono text-right break-words block">
            {value}
        </span>
    );
}

/**
 * Renders a value in monospace unless the placeholder text is required.
 *
 * @param value - Possibly missing string.
 * @returns Monospace node or fallback placeholder.
 */
function renderOptionalMonoValue(value?: string | null): ReactNode {
    const formatted = formatOptionalValue(value);
    if (formatted === 'Not configured') {
        return formatted;
    }

    return renderMonoValue(formatted);
}

/**
 * Picks the most accurate client IP that is forwarded through the edge.
 *
 * @param headerStore - Next.js request headers.
 * @returns IPv4/6 address or placeholder text.
 */
function getClientIp(headerStore: Headers): string {
    const forwardedFor = headerStore.get('x-forwarded-for');
    if (forwardedFor) {
        const [ip] = forwardedFor.split(',');
        if (ip) {
            return ip.trim();
        }
    }

    return formatOptionalValue(headerStore.get('x-real-ip'));
}

/**
 * Reads a header and ensures a placeholder is shown when missing.
 *
 * @param headerStore - Next.js request headers.
 * @param name - Header name to read.
 * @returns Header or placeholder.
 */
function readHeaderValue(headerStore: Headers, name: string): string {
    return formatOptionalValue(headerStore.get(name));
}

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

    const requestHeaders = headers();
    const cookieStore = await cookies();
    const session = await getSession();
    const adminTokenCookie = cookieStore.get('adminToken');
    const sessionCookie = cookieStore.get('sessionToken');
    const cookieNames = cookieStore.getAll().map((cookie) => cookie.name);
    const cpuInfo = os.cpus();
    const nextPackageJson = await import('next/package.json');
    const nextVersion = nextPackageJson?.version || 'unknown';
    const memoryUsage = process.memoryUsage();
    const formattedLoadAverage = os.loadavg().map((value) => value.toFixed(2)).join(' / ');
    const systemUptimeSeconds = os.uptime();
    const processUptimeSeconds = process.uptime();
    const systemStartTime = new Date(Date.now() - systemUptimeSeconds * 1000).toISOString();
    const processStartTime = new Date(Date.now() - processUptimeSeconds * 1000).toISOString();
    const serverTime = new Date().toISOString();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const nodeCommandLine = process.argv.join(' ') || 'Not available';
    const nodeFlags = process.execArgv.length > 0 ? process.execArgv.join(' ') : 'None';
    const appPackageVersion = process.env.npm_package_version;
    const nextBuildId = process.env.NEXT_BUILD_ID;
    const nextDistDir = process.env.NEXT_DIST_DIR;
    const npmLifecycleEvent = process.env.npm_lifecycle_event;
    const npmUserAgent = process.env.npm_config_user_agent;
    const adminPasswordConfigured = Boolean(process.env.ADMIN_PASSWORD);
    const legacyAdminTokenMatches =
        Boolean(adminTokenCookie) &&
        Boolean(process.env.ADMIN_PASSWORD) &&
        adminTokenCookie.value === process.env.ADMIN_PASSWORD;
    const headerValue = (name: string) => readHeaderValue(requestHeaders, name);
    const clientIp = getClientIp(requestHeaders);
    const hostHeader = headerValue('host');
    const forwardedHost = headerValue('x-forwarded-host');
    const forwardedProto = headerValue('x-forwarded-proto');
    const forwardedPort = headerValue('x-forwarded-port');
    const forwarded = headerValue('forwarded');
    const xForwardedFor = headerValue('x-forwarded-for');
    const xRealIp = headerValue('x-real-ip');
    const xRequestId = headerValue('x-request-id');
    const xVercelId = headerValue('x-vercel-id');
    const xVercelCache = headerValue('x-vercel-cache');
    const cacheControl = headerValue('cache-control');
    const secFetchSite = headerValue('sec-fetch-site');
    const secFetchMode = headerValue('sec-fetch-mode');
    const secFetchDest = headerValue('sec-fetch-dest');
    const secFetchUser = headerValue('sec-fetch-user');
    const userAgent = headerValue('user-agent');
    const acceptLanguage = headerValue('accept-language');
    const referer = headerValue('referer');
    const secChUa = headerValue('sec-ch-ua');
    const secChUaMobile = headerValue('sec-ch-ua-mobile');
    const secChUaPlatform = headerValue('sec-ch-ua-platform');
    const secChUaPlatformVersion = headerValue('sec-ch-ua-platform-version');
    const secChUaArch = headerValue('sec-ch-ua-arch');
    const secChUaFullVersionList = headerValue('sec-ch-ua-full-version-list');
    const secChUaModel = headerValue('sec-ch-ua-model');

    const systemOverview: InfoListItem[] = [
        { label: 'Node.js version', value: process.version },
        { label: 'Node executable', value: renderMonoValue(process.execPath) },
        { label: 'Hostname', value: os.hostname() },
        { label: 'Operating system', value: `${os.type()} ${os.release()}` },
        { label: 'Architecture', value: os.arch() },
        { label: 'CPU model', value: cpuInfo[0]?.model ?? 'Unknown' },
        { label: 'CPU cores', value: cpuInfo.length },
        { label: 'Load average (1/5/15m)', value: formattedLoadAverage },
    ];

    const versionInfo: InfoListItem[] = [
        { label: 'Promptbook engine', value: PROMPTBOOK_ENGINE_VERSION },
        { label: 'Book language', value: BOOK_LANGUAGE_VERSION },
        { label: 'Next.js version', value: nextVersion },
        { label: 'App release (Git SHA)', value: formatOptionalValue(NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA) },
        { label: 'Repository branch', value: formatOptionalValue(NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF) },
    ];

    const runtimeInfo: InfoListItem[] = [
        { label: 'Process uptime', value: formatDuration(processUptimeSeconds) },
        { label: 'System uptime', value: formatDuration(systemUptimeSeconds) },
        { label: 'Process start time (UTC)', value: processStartTime },
        { label: 'System start time (UTC)', value: systemStartTime },
        { label: 'Server time (UTC)', value: serverTime },
        { label: 'Server timezone', value: timezone },
        { label: 'Node command line', value: renderMonoValue(nodeCommandLine) },
        {
            label: 'Node exec arguments',
            value: nodeFlags === 'None' ? 'None' : renderMonoValue(nodeFlags),
        },
    ];

    const memoryInfo: InfoListItem[] = [
        { label: 'Total memory', value: formatMemory(os.totalmem()) },
        { label: 'Free memory', value: formatMemory(os.freemem()) },
        { label: 'Process memory (RSS)', value: formatMemory(memoryUsage.rss) },
        { label: 'Heap used', value: formatMemory(memoryUsage.heapUsed) },
        { label: 'Heap total', value: formatMemory(memoryUsage.heapTotal) },
        { label: 'External memory', value: formatMemory(memoryUsage.external) },
        {
            label: 'Array buffers',
            value: formatMemory(memoryUsage.arrayBuffers ?? 0),
        },
    ];

    const environmentInfo: InfoListItem[] = [
        { label: 'Site URL', value: formatOptionalValue(NEXT_PUBLIC_SITE_URL) },
        { label: 'Deployment environment', value: formatOptionalValue(NEXT_PUBLIC_VERCEL_ENV) },
        { label: 'Target environment', value: formatOptionalValue(NEXT_PUBLIC_VERCEL_TARGET_ENV) },
        { label: 'Vercel deployment URL', value: formatOptionalValue(NEXT_PUBLIC_VERCEL_URL) },
        { label: 'Branch URL', value: formatOptionalValue(NEXT_PUBLIC_VERCEL_BRANCH_URL) },
        { label: 'Production URL', value: formatOptionalValue(NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL) },
        { label: 'Node environment', value: formatOptionalValue(process.env.NODE_ENV) },
        { label: 'Next runtime (NEXT_RUNTIME)', value: formatOptionalValue(process.env.NEXT_RUNTIME) },
        { label: 'Current working directory', value: renderMonoValue(process.cwd()) },
    ];

    const buildInfo: InfoListItem[] = [
        { label: 'App package version', value: formatOptionalValue(appPackageVersion) },
        { label: 'Next build ID', value: formatOptionalValue(nextBuildId) },
        { label: 'Next dist directory', value: formatOptionalValue(nextDistDir) },
        { label: 'npm lifecycle event', value: formatOptionalValue(npmLifecycleEvent) },
        { label: 'npm user agent', value: renderOptionalMonoValue(npmUserAgent) },
    ];

    const gitInfo: InfoListItem[] = [
        { label: 'Git provider', value: formatOptionalValue(NEXT_PUBLIC_VERCEL_GIT_PROVIDER) },
        { label: 'Repository owner', value: formatOptionalValue(NEXT_PUBLIC_VERCEL_GIT_REPO_OWNER) },
        { label: 'Repository slug', value: formatOptionalValue(NEXT_PUBLIC_VERCEL_GIT_REPO_SLUG) },
        { label: 'Repository ID', value: formatOptionalValue(NEXT_PUBLIC_VERCEL_GIT_REPO_ID) },
        { label: 'Commit SHA', value: formatOptionalValue(NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA) },
        { label: 'Previous commit SHA', value: formatOptionalValue(NEXT_PUBLIC_VERCEL_GIT_PREVIOUS_SHA) },
        { label: 'Branch', value: formatOptionalValue(NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF) },
        { label: 'Commit message', value: formatOptionalValue(NEXT_PUBLIC_VERCEL_GIT_COMMIT_MESSAGE) },
        { label: 'Author name', value: formatOptionalValue(NEXT_PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_NAME) },
        { label: 'Author login', value: formatOptionalValue(NEXT_PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_LOGIN) },
        { label: 'Pull request ID', value: formatOptionalValue(NEXT_PUBLIC_VERCEL_GIT_PULL_REQUEST_ID) },
    ];

    const serverConfigInfo: InfoListItem[] = [
        { label: 'Active SERVERS', value: renderOptionalMonoValue(formatList(SERVERS)) },
        { label: 'Supabase table prefix', value: formatOptionalValue(SUPABASE_TABLE_PREFIX) },
        { label: 'Admin password configured', value: adminPasswordConfigured ? 'Yes' : 'No' },
    ];

    const userInfo: InfoListItem[] = [
        { label: 'Session username', value: session?.username ?? 'Not available' },
        { label: 'Session is admin', value: session?.isAdmin ? 'Yes' : 'No' },
        { label: 'Session cookie present', value: sessionCookie ? 'Yes' : 'No' },
        { label: 'Legacy admin token present', value: adminTokenCookie ? 'Yes' : 'No' },
        {
            label: 'Legacy admin token matches password',
            value: legacyAdminTokenMatches ? 'Yes' : 'No',
        },
        { label: 'Cookie count', value: cookieNames.length },
        {
            label: 'Cookie names',
            value: cookieNames.length > 0 ? renderMonoValue(cookieNames.join(', ')) : 'None',
        },
    ];

    const browserInfo: InfoListItem[] = [
        { label: 'User-Agent', value: renderOptionalMonoValue(userAgent) },
        { label: 'Accept-Language', value: renderOptionalMonoValue(acceptLanguage) },
        { label: 'Referer', value: renderOptionalMonoValue(referer) },
        { label: 'Sec-CH-UA', value: renderOptionalMonoValue(secChUa) },
        { label: 'Sec-CH-UA-Mobile', value: renderOptionalMonoValue(secChUaMobile) },
        { label: 'Sec-CH-UA-Platform', value: renderOptionalMonoValue(secChUaPlatform) },
        {
            label: 'Sec-CH-UA-Platform-Version',
            value: renderOptionalMonoValue(secChUaPlatformVersion),
        },
        { label: 'Sec-CH-UA-Arch', value: renderOptionalMonoValue(secChUaArch) },
        {
            label: 'Sec-CH-UA-Full-Version-List',
            value: renderOptionalMonoValue(secChUaFullVersionList),
        },
        { label: 'Sec-CH-UA-Model', value: renderOptionalMonoValue(secChUaModel) },
    ];

    const connectionInfo: InfoListItem[] = [
        { label: 'Client IP', value: renderOptionalMonoValue(clientIp) },
        { label: 'Host header', value: renderOptionalMonoValue(hostHeader) },
        { label: 'Forwarded host', value: renderOptionalMonoValue(forwardedHost) },
        { label: 'X-Forwarded-Proto', value: forwardedProto },
        { label: 'X-Forwarded-Port', value: forwardedPort },
        { label: 'X-Forwarded-For', value: renderOptionalMonoValue(xForwardedFor) },
        { label: 'X-Real-IP', value: renderOptionalMonoValue(xRealIp) },
        { label: 'Forwarded header', value: renderOptionalMonoValue(forwarded) },
        { label: 'X-Request-ID', value: renderOptionalMonoValue(xRequestId) },
        { label: 'X-Vercel-ID', value: renderOptionalMonoValue(xVercelId) },
        { label: 'X-Vercel-Cache', value: renderOptionalMonoValue(xVercelCache) },
        { label: 'Cache-Control', value: cacheControl },
        { label: 'Sec-Fetch-Site', value: secFetchSite },
        { label: 'Sec-Fetch-Mode', value: secFetchMode },
        { label: 'Sec-Fetch-Dest', value: secFetchDest },
        { label: 'Sec-Fetch-User', value: secFetchUser },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="container mx-auto px-4 py-16">
                <Card className="mb-10 space-y-4">
                    <div>
                        <h1 className="text-3xl font-semibold text-gray-900">About Promptbook</h1>
                        <p className="text-gray-600 mt-2">
                            This admin page keeps Promptbook, system, and deployment metadata in one place.
                            Use it to look up the current build, inspect the runtime, or spot networking oddities.
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
                        <InfoList items={systemOverview} />
                    </Card>

                    <Card>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Version</h2>
                        <InfoList items={versionInfo} />
                    </Card>
                </Section>

                <Section title="Infrastructure & runtime">
                    <Card>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Runtime</h2>
                        <InfoList items={runtimeInfo} />
                    </Card>

                    <Card>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Memory</h2>
                        <InfoList items={memoryInfo} />
                    </Card>

                    <Card>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Environment</h2>
                        <InfoList items={environmentInfo} />
                    </Card>
                </Section>

                <Section title="Deployment & source control">
                    <Card>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Build metadata</h2>
                        <InfoList items={buildInfo} />
                    </Card>

                    <Card>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Git metadata</h2>
                        <InfoList items={gitInfo} />
                    </Card>

                    <Card>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Server config</h2>
                        <InfoList items={serverConfigInfo} />
                    </Card>
                </Section>

                <Section title="Client diagnostics">
                    <Card>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Session</h2>
                        <InfoList items={userInfo} />
                    </Card>

                    <Card>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Browser</h2>
                        <InfoList items={browserInfo} />
                    </Card>

                    <Card>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Connection</h2>
                        <InfoList items={connectionInfo} />
                    </Card>
                </Section>
            </div>
        </div>
    );
}
