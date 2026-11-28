import type { editor } from 'monaco-editor';
import { useCallback, useEffect, useState } from 'react';
import type { BookEditorTheme } from './BookEditorTheme';
import { ensureBookEditorMonacoLanguage, ensureBookEditorMonacoLanguageForEditor } from './useBookEditorMonacoLanguage';

/**
 * Type describing monaco editor.
 */
type MonacoEditor = typeof import('monaco-editor');

/**
 * Props for use book editor monaco lifecycle.
 */
type UseBookEditorMonacoLifecycleProps = {
    readonly monaco: MonacoEditor | null;
    readonly theme: BookEditorTheme;
};

/**
 * Result of use book editor monaco lifecycle.
 */
type UseBookEditorMonacoLifecycleResult = {
    readonly editor: editor.IStandaloneCodeEditor | null;
    readonly isFocused: boolean;
    readonly isTouchDevice: boolean;
    readonly isSavedShown: boolean;
    readonly handleBeforeMonacoMount: (beforeMountMonaco: MonacoEditor) => void;
    readonly handleMonacoMount: (mountedEditor: editor.IStandaloneCodeEditor, mountedMonaco: MonacoEditor) => void;
};

/**
 * Local storage key that enables BookEditor Monaco lifecycle debug logs in development.
 *
 * @private function of BookEditorMonaco
 */
const BOOK_EDITOR_MONACO_DEBUG_STORAGE_KEY = 'promptbook-debug-book-editor-monaco';

/**
 * Duration of the save notification.
 *
 * @private function of BookEditorMonaco
 */
const SAVE_NOTIFICATION_HIDE_DELAY_MS = 2000;

/**
 * Resolves whether verbose BookEditor Monaco lifecycle logs are enabled.
 *
 * @private function of BookEditorMonaco
 */
function isBookEditorMonacoDebugEnabled(): boolean {
    if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') {
        return false;
    }

    try {
        return window.localStorage.getItem(BOOK_EDITOR_MONACO_DEBUG_STORAGE_KEY) === '1';
    } catch {
        return false;
    }
}

/**
 * Prints one BookEditor Monaco debug line when the dev debug flag is enabled.
 *
 * @param message - Human-readable lifecycle message.
 *
 * @private function of BookEditorMonaco
 */
function logBookEditorMonacoDebug(message: string): void {
    if (!isBookEditorMonacoDebugEnabled()) {
        return;
    }

    console.info(`[BookEditorMonaco] ${message}`);
}

/**
 * Detects whether the current device primarily uses a coarse pointer.
 *
 * @private function of BookEditorMonaco
 */
function detectIsTouchDevice(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    return window.matchMedia('(pointer: coarse)').matches;
}

/**
 * Manages Monaco lifecycle wiring for `BookEditorMonaco`.
 *
 * @private function of BookEditorMonaco
 */
export function useBookEditorMonacoLifecycle({
    monaco,
    theme,
}: UseBookEditorMonacoLifecycleProps): UseBookEditorMonacoLifecycleResult {
    const [editor, setEditor] = useState<editor.IStandaloneCodeEditor | null>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const [isSavedShown, setIsSavedShown] = useState(false);

    /**
     * Re-applies Book language + theme to the currently mounted Monaco model.
     */
    const reapplyBookLanguageAndTheme = useCallback(
        (reason: string) => {
            if (!editor || !monaco) {
                return;
            }

            ensureBookEditorMonacoLanguageForEditor({ monaco, monacoEditor: editor, theme });
            logBookEditorMonacoDebug(`Re-applied Book Monaco language/theme (${reason}).`);
        },
        [editor, monaco, theme],
    );

    /**
     * Re-triggers the transient save toast without preventing the browser save dialog.
     */
    const showSavedNotification = useCallback(() => {
        setIsSavedShown(false);
        setTimeout(() => setIsSavedShown(true), 0);
    }, []);

    useEffect(() => {
        setIsTouchDevice(detectIsTouchDevice());
    }, []);

    useEffect(() => {
        if (!editor || !monaco) {
            return;
        }

        const focusListener = editor.onDidFocusEditorWidget(() => {
            setIsFocused(true);
            reapplyBookLanguageAndTheme('focus');
        });

        const blurListener = editor.onDidBlurEditorWidget(() => {
            setIsFocused(false);
        });

        const saveAction = editor.addAction({
            id: 'save-book',
            label: 'Save',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
            run: () => {
                showSavedNotification();
                // Note: We don't prevent default, so browser's save dialog still opens
            },
        });

        return () => {
            focusListener.dispose();
            blurListener.dispose();
            saveAction.dispose();
        };
    }, [editor, monaco, reapplyBookLanguageAndTheme, showSavedNotification]);

    useEffect(() => {
        reapplyBookLanguageAndTheme('editor-ready');
    }, [reapplyBookLanguageAndTheme]);

    useEffect(() => {
        if (!editor || !monaco) {
            return;
        }

        const handlePopState = () => {
            reapplyBookLanguageAndTheme('history-popstate');
        };
        const handlePageShow = () => {
            reapplyBookLanguageAndTheme('pageshow');
        };
        const handleWindowFocus = () => {
            reapplyBookLanguageAndTheme('window-focus');
        };
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                reapplyBookLanguageAndTheme('visibility-visible');
            }
        };

        window.addEventListener('popstate', handlePopState);
        window.addEventListener('pageshow', handlePageShow);
        window.addEventListener('focus', handleWindowFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('pageshow', handlePageShow);
            window.removeEventListener('focus', handleWindowFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [editor, monaco, reapplyBookLanguageAndTheme]);

    useEffect(() => {
        if (!isSavedShown) {
            return;
        }

        const timer = setTimeout(() => {
            setIsSavedShown(false);
        }, SAVE_NOTIFICATION_HIDE_DELAY_MS);

        return () => {
            clearTimeout(timer);
        };
    }, [isSavedShown]);

    /**
     * Ensures Book language/tokenizer is ready before Monaco creates the editor model.
     */
    const handleBeforeMonacoMount = useCallback(
        (beforeMountMonaco: MonacoEditor) => {
            ensureBookEditorMonacoLanguage(beforeMountMonaco, theme);
        },
        [theme],
    );

    /**
     * Re-applies Book language/theme once Monaco editor is mounted.
     */
    const handleMonacoMount = useCallback(
        (mountedEditor: editor.IStandaloneCodeEditor, mountedMonaco: MonacoEditor) => {
            setEditor(mountedEditor);
            ensureBookEditorMonacoLanguageForEditor({ monaco: mountedMonaco, monacoEditor: mountedEditor, theme });
            logBookEditorMonacoDebug('Mounted Monaco editor and re-applied Book language/theme.');
        },
        [theme],
    );

    return {
        editor,
        isFocused,
        isTouchDevice,
        isSavedShown,
        handleBeforeMonacoMount,
        handleMonacoMount,
    };
}
