'use client';

import { BookEditor } from '@promptbook-local/components';
import { string_book } from '@promptbook-local/types';

/**
 * Read-only client-only wrapper around `<BookEditor/>`.
 *
 * Keeping this in a client component prevents server runtime evaluation
 * of browser-only editor dependencies.
 */
export function SystemMessageBookEditor({ value }: { value: string_book }) {
    return <BookEditor isReadonly value={value} />;
}
