'use client';
// <- Note: mirrors the `'use client'` convention used in BookEditor source files;
//          harmless in Vite but kept for consistency with the shared component files

import { useCallback, useEffect, useRef, useState } from 'react';
import { BookEditor } from '@promptbook-local/components';
import type { string_book } from '@promptbook-local/types';
import type { FileApi } from '../fileApi.types';

// Extend Window with the fileApi exposed by the Electron preload script
declare global {
    interface Window {
        fileApi: FileApi;
    }
}

/**
 * Default content shown when no file is open.
 */
const DEFAULT_CONTENT = `PERSONA
You are a helpful assistant.

RULE
Always be concise and clear in your responses.
`;

/**
 * Extracts just the filename from a full path for display in the title bar.
 */
function getFileName(filePath: string | null): string {
    if (!filePath) return 'Untitled';
    return filePath.split(/[/\\]/).pop() ?? 'Untitled';
}

/**
 * Root component for the Book Editor macOS app.
 * Manages file state (open/save/save-as) and wraps the shared BookEditor component.
 */
export default function App() {
    const [content, setContent] = useState<string_book>(DEFAULT_CONTENT as string_book);
    const [filePath, setFilePath] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);

    // Stable refs so IPC callbacks registered once always call current handlers
    const handlers = useRef({
        content: DEFAULT_CONTENT as string_book,
        filePath: null as string | null,
        save: async () => {},
        saveAs: async () => {},
        new: () => {},
        openFile: async (_path: string) => {},
    });

    // Keep ref values in sync with current state so IPC handlers always read the latest
    useEffect(() => {
        handlers.current.content = content;
    }, [content]);

    useEffect(() => {
        handlers.current.filePath = filePath;
    }, [filePath]);

    const fileName = getFileName(filePath);

    /**
     * Reads and loads a file by path into the editor.
     */
    const openFileByPath = useCallback(async (path: string) => {
        const fileContent = await window.fileApi.readFile(path);
        setContent(fileContent as string_book);
        setFilePath(path);
        setIsDirty(false);
    }, []);

    /**
     * Saves current content to the current file path, or triggers save-as if no path.
     */
    const handleSave = useCallback(async () => {
        const currentPath = handlers.current.filePath;
        const currentContent = handlers.current.content;

        if (currentPath) {
            await window.fileApi.writeFile(currentPath, currentContent);
            setIsDirty(false);
        } else {
            const newPath = await window.fileApi.saveFileAs(currentContent);
            if (newPath) {
                setFilePath(newPath);
                setIsDirty(false);
            }
        }
    }, []);

    /**
     * Shows a Save As dialog and saves current content to the chosen path.
     */
    const handleSaveAs = useCallback(async () => {
        const newPath = await window.fileApi.saveFileAs(handlers.current.content);
        if (newPath) {
            setFilePath(newPath);
            setIsDirty(false);
        }
    }, []);

    /**
     * Shows the Open dialog and loads the chosen file.
     */
    const handleOpen = useCallback(async () => {
        const path = await window.fileApi.openFileDialog();
        if (path) {
            await openFileByPath(path);
        }
    }, [openFileByPath]);

    /**
     * Resets the editor to a blank document.
     */
    const handleNew = useCallback(() => {
        setContent(DEFAULT_CONTENT as string_book);
        setFilePath(null);
        setIsDirty(false);
    }, []);

    /**
     * Called by BookEditor on every keystroke — marks the document as modified.
     */
    const handleChange = useCallback((newContent: string_book) => {
        setContent(newContent);
        setIsDirty(true);
    }, []);

    // Keep handler refs current so the one-time IPC registrations below always call the latest version
    useEffect(() => {
        handlers.current.save = handleSave;
        handlers.current.saveAs = handleSaveAs;
        handlers.current.new = handleNew;
        handlers.current.openFile = openFileByPath;
    });

    // Register IPC event listeners once on mount
    useEffect(() => {
        if (!window.fileApi) return;
        window.fileApi.onFileOpened((path) => handlers.current.openFile(path));
        window.fileApi.onMenuNew(() => handlers.current.new());
        window.fileApi.onMenuSave(() => handlers.current.save());
        window.fileApi.onMenuSaveAs(() => handlers.current.saveAs());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sync the native window title whenever file name or dirty state changes
    useEffect(() => {
        const title = isDirty ? `${fileName} •` : fileName;
        document.title = title;
        window.fileApi?.setWindowTitle(title);
    }, [fileName, isDirty]);

    return (
        <div className="app-container">
            <div className="title-bar">
                <span className="file-name">
                    {fileName}
                    {isDirty ? ' •' : ''}
                </span>
                <div className="toolbar">
                    <button onClick={handleOpen} title="Open file (⌘O)">
                        Open
                    </button>
                    <button onClick={handleSave} title="Save file (⌘S)">
                        Save
                    </button>
                    <button onClick={handleNew} title="New file (⌘N)">
                        New
                    </button>
                </div>
            </div>
            <div className="editor-container">
                {/* [📖] Reuses the shared BookEditor component from @promptbook/components */}
                <BookEditor
                    value={content}
                    onChange={handleChange}
                    height={null}
                    isBorderRadiusDisabled={true}
                    isDownloadButtonShown={true}
                />
            </div>
        </div>
    );
}
