'use client';

import { BookEditor } from '@promptbook-local/components';
import { DEFAULT_BOOK } from '@promptbook-local/core';
import type { string_book } from '@promptbook-local/types';
import { useState } from 'react';

export default function TwoEditorsPage() {
    const [book, setBook] = useState<string_book>(DEFAULT_BOOK);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <BookEditor
                value={book}
                onChange={setBook}
                // className={styles.BookEditor}
                isVerbose={false}
                onFileUpload={(file) => {
                    return `[${file.name}]`;
                }}
            />
            <BookEditor
                value={book}
                onChange={setBook}
                // className={styles.BookEditor}
                isVerbose={false}
                onFileUpload={(file) => {
                    return `[${file.name}]`;
                }}
            />
        </div>
    );
}
