import Link from 'next/link';
import { ForbiddenPage } from '@/src/components/ForbiddenPage/ForbiddenPage';
import { getCurrentUser } from '@/src/utils/getCurrentUser';

/**
 * System utilities index page.
 */
export default async function SystemUtilitiesPage() {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return <ForbiddenPage />;
    }

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="mx-auto max-w-5xl space-y-8">
                <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.4em] text-gray-400">System</p>
                    <h1 className="text-3xl font-semibold text-gray-900">Utilities</h1>
                    <p className="max-w-3xl text-sm text-gray-600">
                        Small focused tools for repeatable workflows, recording, and demos.
                    </p>
                </div>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                            <h2 className="text-xl font-semibold text-slate-900">Mocked Chats</h2>
                            <p className="max-w-2xl text-sm leading-6 text-slate-600">
                                Build deterministic scripted chat presets for demos and open them in a dedicated viewer
                                window for recording.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Link
                                href="/system/utilities/mocked-chats"
                                className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                            >
                                Open editor
                            </Link>
                            <Link
                                href="/system/utilities/mocked-chats/view"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
                            >
                                Open viewer
                            </Link>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
