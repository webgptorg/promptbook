'use client';

import { ResizablePanelsAuto } from '@common/components/ResizablePanelsAuto/ResizablePanelsAuto';
import { BookEditor } from '@promptbook-local/components';
import { DEFAULT_BOOK } from '@promptbook-local/core';
import type { string_book } from '@promptbook-local/types';
import { useMemo, useState } from 'react';

export default function IdependentEditorsPage() {
    const [book1, setBook1] = useState<string_book>(DEFAULT_BOOK);
    const [book2, setBook2] = useState<string_book>(DEFAULT_BOOK);

    const sync1 = useMemo(
        () => ({
            serverUrl: 'ws://localhost:4461',
            roomName: 'promptbook-sync-room',
        }),
        [],
    );

    const sync2 = useMemo(
        () => ({
            serverUrl: 'ws://localhost:4461',
            roomName: 'promptbook-sync-room',
        }),
        [],
    );

    return (
        <div className="min-h-screen">
            <ResizablePanelsAuto name="two-editors">
                <BookEditor
                    className="w-full h-full"
                    height={null}
                    value={book1}
                    onChange={setBook1}
                    sync={sync1}
                    isVerbose={false}
                    isBorderRadiusDisabled
                    onFileUpload={(file) => {
                        return file.name;
                    }}
                />
                <BookEditor
                    className="w-full h-full"
                    height={null}
                    value={book2}
                    onChange={setBook2}
                    sync={sync2}
                    isVerbose={false}
                    isBorderRadiusDisabled
                    onFileUpload={(file) => {
                        return file.name;
                    }}
                />
            </ResizablePanelsAuto>
        </div>
    );
}
