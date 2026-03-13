import { KeybindingsSettingsClient } from './KeybindingsSettingsClient';

/**
 * Shared user-facing settings page.
 */
export default function UserSettingsPage() {
    return (
        <div className="container mx-auto px-4 py-12">
            <div className="mx-auto max-w-5xl space-y-8">
                <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.4em] text-gray-400">System</p>
                    <h1 className="text-3xl font-semibold text-gray-900">Settings</h1>
                    <p className="max-w-3xl text-sm text-gray-600">
                        Personal browser-side preferences for how the Agents Server feels while you chat.
                    </p>
                </div>

                <KeybindingsSettingsClient />
            </div>
        </div>
    );
}
