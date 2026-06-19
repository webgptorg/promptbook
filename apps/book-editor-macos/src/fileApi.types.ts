/**
 * File system API exposed to the renderer via Electron's contextBridge.
 *
 * Defined in a separate file so both `preload.ts` (Node/Electron context) and
 * `App.tsx` (browser/renderer context) can import the type without pulling in
 * Electron-specific modules.
 */
export type FileApi = {
    /** Reads the full text content of a file. */
    readFile(filePath: string): Promise<string>;

    /** Writes text content to the given file path, creating it if necessary. */
    writeFile(filePath: string, content: string): Promise<void>;

    /** Shows a native Save As dialog and writes content to the chosen path. Returns the path or null if cancelled. */
    saveFileAs(content: string): Promise<string | null>;

    /** Shows a native Open dialog. Returns the chosen file path or null if cancelled. */
    openFileDialog(): Promise<string | null>;

    /** Updates the native window title. */
    setWindowTitle(title: string): Promise<void>;

    /** Registers a callback for when a file is opened (via menu, dock, or drag-and-drop). */
    onFileOpened(callback: (filePath: string) => void): void;

    /** Registers a callback for the File > New menu action. */
    onMenuNew(callback: () => void): void;

    /** Registers a callback for the File > Save menu action. */
    onMenuSave(callback: () => void): void;

    /** Registers a callback for the File > Save As menu action. */
    onMenuSaveAs(callback: () => void): void;
};
