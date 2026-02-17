'use client';

import { FormEvent, useMemo, useState } from 'react';

const MAX_PROFILE_IMAGE_URL_LENGTH = 2048;

type UserProfileClientProps = {
    username: string;
    initialProfileImageUrl: string | null;
};

export function UserProfileClient({ username, initialProfileImageUrl }: UserProfileClientProps) {
    const [profileImageUrl, setProfileImageUrl] = useState(initialProfileImageUrl ?? '');
    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const trimmedUrl = profileImageUrl.trim();
    const hasPreviewImage = trimmedUrl !== '';
    const usernameInitial = useMemo(() => username.slice(0, 1).toUpperCase(), [username]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSuccessMessage(null);
        setErrorMessage(null);

        if (trimmedUrl.length > MAX_PROFILE_IMAGE_URL_LENGTH) {
            setErrorMessage('Profile image URL is too long.');
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profileImageUrl: trimmedUrl || null }),
            });
            const payload = (await response.json()) as { profileImageUrl?: string | null; error?: string };

            if (!response.ok) {
                setErrorMessage(payload.error || 'Unable to update your profile image.');
                return;
            }

            setProfileImageUrl(payload.profileImageUrl ?? '');
            setSuccessMessage('Profile image updated.');
        } catch (error) {
            console.error('Profile update failed:', error);
            setErrorMessage('Unable to reach the server. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleClear = () => {
        setProfileImageUrl('');
        setSuccessMessage(null);
        setErrorMessage(null);
    };

    return (
        <div className="space-y-8">
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="relative">
                        {hasPreviewImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={trimmedUrl}
                                alt="Profile preview"
                                className="h-32 w-32 rounded-full object-cover border border-gray-200 bg-gray-50 shadow-inner"
                            />
                        ) : (
                            <div className="flex h-32 w-32 items-center justify-center rounded-full border border-dashed border-gray-300 bg-gradient-to-br from-blue-50 to-blue-100 text-4xl font-semibold text-blue-700">
                                {usernameInitial}
                            </div>
                        )}
                    </div>
                    <div className="space-y-1">
                        <p className="text-lg font-semibold text-gray-900">{username}</p>
                        <p className="text-sm text-gray-500">
                            This image will appear in the header user menu and control panel situational banners.
                        </p>
                    </div>
                    <p className="text-xs uppercase tracking-[0.35em] text-gray-400">Profile avatar</p>
                </div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                    <label htmlFor="profileImageUrl" className="text-sm font-semibold text-gray-700 block">
                        Profile Image URL
                    </label>
                    <input
                        id="profileImageUrl"
                        name="profileImageUrl"
                        type="url"
                        value={profileImageUrl}
                        maxLength={MAX_PROFILE_IMAGE_URL_LENGTH}
                        onChange={(event) => {
                            setProfileImageUrl(event.target.value);
                            setSuccessMessage(null);
                            setErrorMessage(null);
                        }}
                        placeholder="https://example.com/avatar.png"
                        className="w-full rounded-2xl border border-gray-200 px-4 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring focus-visible:ring-blue-300"
                    />
                    <p className="text-xs text-gray-500">
                        Accepts HTTPS URLs, data URIs, or relative paths (e.g., <code>/static/me.jpg</code>). Leave blank to
                        use your initials.
                    </p>
                </div>

                {errorMessage && (
                    <p className="text-sm text-red-600" role="alert">
                        {errorMessage}
                    </p>
                )}
                {successMessage && (
                    <p className="text-sm text-green-600" role="status">
                        {successMessage}
                    </p>
                )}

                <div className="flex flex-wrap gap-3">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="inline-flex items-center rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isSaving ? 'Saving…' : 'Save profile image'}
                    </button>
                    {hasPreviewImage && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="inline-flex items-center rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400"
                        >
                            Remove image
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}
