'use client';

import { string_book } from '@promptbook-local/types';
import { ThemedBookEditor } from '../../../../components/ThemePreferences/ThemedBookEditor';

/**
 * Read-only client-only wrapper around `<BookEditor/>`.
 *
 * Keeping this in a client component prevents server runtime evaluation
 * of browser-only editor dependencies.
 */
export function SystemMessageBookEditor({ value }: { value: string }) {
    return <ThemedBookEditor isReadonly value={value as string_book} />;
}
