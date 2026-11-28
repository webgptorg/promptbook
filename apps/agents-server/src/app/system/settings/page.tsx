import { KeybindingsSettingsClient } from './KeybindingsSettingsClient';

/**
 * Shared user-facing settings page.
 */
export default function UserSettingsPage() {
    return (
        <div className="container mx-auto px-4 py-12">
            <div className="mx-auto max-w-5xl">
                <KeybindingsSettingsClient />
            </div>
        </div>
    );
}
